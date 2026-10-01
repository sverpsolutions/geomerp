"""
Billing Service — Phase 5
Handles: invoice CRUD, GST calc, stock ledger, invoice numbering, estimates
"""
from datetime import date, datetime
from decimal import Decimal, ROUND_HALF_UP
from typing import Optional

from sqlalchemy import select, func, update
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.invoice import (
    invoice, invoice_item, invoice_payment,
    stock_ledger, estimate, estimate_item,
)
from app.models.product import product as product_model
from app.schemas.invoice import (
    invoice_create, payment_in,
    estimate_create, estimate_item_in, invoice_item_in,
)

# ─── Number Generators ────────────────────────────────────────────────────────

async def _next_invoice_no(db: AsyncSession, outlet_id: Optional[int]) -> str:
    """Generate invoice number: INV-YYYYMMDD-NNNN"""
    today = date.today().strftime("%Y%m%d")
    prefix = f"INV-{today}-"
    result = await db.execute(
        select(func.count()).select_from(invoice)
        .where(invoice.invoice_no.like(f"{prefix}%"))
    )
    count = result.scalar() or 0
    return f"{prefix}{count + 1:04d}"


async def _next_payment_no(db: AsyncSession) -> str:
    today = date.today().strftime("%Y%m%d")
    prefix = f"PAY-{today}-"
    result = await db.execute(
        select(func.count()).select_from(invoice_payment)
        .where(invoice_payment.payment_no.like(f"{prefix}%"))
    )
    count = result.scalar() or 0
    return f"{prefix}{count + 1:04d}"


async def _next_estimate_no(db: AsyncSession) -> str:
    today = date.today().strftime("%Y%m%d")
    prefix = f"EST-{today}-"
    result = await db.execute(
        select(func.count()).select_from(estimate)
        .where(estimate.estimate_no.like(f"{prefix}%"))
    )
    count = result.scalar() or 0
    return f"{prefix}{count + 1:04d}"


# ─── GST Calculation Helpers ──────────────────────────────────────────────────

def _two(val: Decimal) -> Decimal:
    return val.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)


def _calc_item(item_in, is_interstate: bool):
    """
    Returns dict of computed fields for one invoice line item.
    GST rule: is_interstate=False → CGST+SGST; True → IGST only
    """
    qty = item_in.qty
    rate = item_in.rate
    disc_val = item_in.disc_val
    disc_type = item_in.disc_type
    gst_pct = item_in.gst_percent

    gross = _two(qty * rate)

    if disc_type == "%":
        disc_amt = _two(gross * disc_val / Decimal("100"))
    else:
        disc_amt = _two(disc_val * qty)

    taxable = _two(gross - disc_amt)
    half_gst = _two(gst_pct / Decimal("2"))

    if is_interstate:
        cgst_pct = Decimal("0.00")
        sgst_pct = Decimal("0.00")
        igst_pct = gst_pct
        cgst_amt = Decimal("0.00")
        sgst_amt = Decimal("0.00")
        igst_amt = _two(taxable * igst_pct / Decimal("100"))
    else:
        cgst_pct = half_gst
        sgst_pct = half_gst
        igst_pct = Decimal("0.00")
        cgst_amt = _two(taxable * cgst_pct / Decimal("100"))
        sgst_amt = _two(taxable * sgst_pct / Decimal("100"))
        igst_amt = Decimal("0.00")

    total = _two(taxable + cgst_amt + sgst_amt + igst_amt)

    return {
        "taxable_amt": taxable,
        "cgst_percent": cgst_pct,
        "sgst_percent": sgst_pct,
        "igst_percent": igst_pct,
        "cgst_amount": cgst_amt,
        "sgst_amount": sgst_amt,
        "igst_amount": igst_amt,
        "total": total,
    }


def _calc_invoice_totals(items_data: list[dict], cd_percent: Decimal):
    """Aggregate item totals + apply cash-discount on taxable amount."""
    subtotal     = sum(i["taxable_amt"] for i in items_data)
    discount     = sum(
        (i["qty"] * i["rate"] * i["disc_val"] / Decimal("100")
         if i["disc_type"] == "%" else i["disc_val"] * i["qty"])
        for i in items_data
    )
    taxable      = sum(i["taxable_amt"] for i in items_data)
    cgst_amount  = sum(i["cgst_amount"] for i in items_data)
    sgst_amount  = sum(i["sgst_amount"] for i in items_data)
    igst_amount  = sum(i["igst_amount"] for i in items_data)
    total_gst    = _two(cgst_amount + sgst_amount + igst_amount)

    cd_amount    = _two(taxable * cd_percent / Decimal("100"))
    total_amount = _two(taxable - cd_amount + total_gst)

    return {
        "subtotal":      _two(subtotal),
        "discount":      _two(discount),
        "taxable_amount": _two(taxable),
        "cgst_amount":   _two(cgst_amount),
        "sgst_amount":   _two(sgst_amount),
        "igst_amount":   _two(igst_amount),
        "total_gst":     total_gst,
        "cd_amount":     cd_amount,
        "total_amount":  total_amount,
    }


# ─── Stock Ledger ─────────────────────────────────────────────────────────────

async def _write_stock_ledger(
    db: AsyncSession,
    product_id: int,
    txn_type: str,
    qty: Decimal,
    ref_id: int,
    ref_type: str,
    outlet_id: Optional[int],
    notes: Optional[str],
    user_id: Optional[int],
):
    entry = stock_ledger(
        product_id=product_id,
        txn_type=txn_type,
        qty=qty,
        ref_id=ref_id,
        ref_type=ref_type,
        outlet_id=outlet_id,
        notes=notes,
        created_by=user_id,
    )
    db.add(entry)


async def _update_product_stock(db: AsyncSession, product_id: int, delta: Decimal):
    """Add delta (negative = deduction) to products.stock_qty."""
    await db.execute(
        update(product_model)
        .where(product_model.id == product_id)
        .values(stock_qty=product_model.stock_qty + delta)
    )


# ─── Invoice Service ──────────────────────────────────────────────────────────

async def create_invoice(
    db: AsyncSession,
    data: invoice_create,
    user_id: Optional[int],
) -> invoice:
    invoice_no = await _next_invoice_no(db, data.outlet_id)

    # build item rows + collect computed dicts for totalling
    item_rows = []
    items_data = []
    for item_in in data.items:
        # Fetch product to check lifecycle status
        prod_q = await db.execute(select(product_model).where(product_model.id == item_in.product_id))
        prod_obj = prod_q.scalar_one_or_none()
        
        if not prod_obj:
            raise ValueError(f"Product ID {item_in.product_id} not found")
        
        if not prod_obj.allow_sale:
            raise ValueError(f"Item '{prod_obj.name}' is not allowed for sale (Status: {prod_obj.status})")
            
        if prod_obj.is_expired:
            raise ValueError(f"Item '{prod_obj.name}' has expired and cannot be sold")

        calc = _calc_item(item_in, data.is_interstate)
        row = invoice_item(
            product_id=item_in.product_id,
            item_code=item_in.item_code,
            name=item_in.name,
            qty=item_in.qty,
            pcs=item_in.pcs,
            unit=item_in.unit,
            rate=item_in.rate,
            disc_val=item_in.disc_val,
            disc_type=item_in.disc_type,
            gst_percent=item_in.gst_percent,
            hsn_code=item_in.hsn_code,
            challan_item_id=item_in.challan_item_id,
            **calc,
        )
        item_rows.append(row)
        items_data.append({**item_in.__dict__, **calc})

    totals = _calc_invoice_totals(items_data, data.cd_percent)
    if data.round_off:
        rounded = totals["total_amount"].quantize(Decimal("1"), rounding=ROUND_HALF_UP)
        totals["round_off"] = rounded - totals["total_amount"]
        totals["total_amount"] = rounded

    paid = data.paid_amount
    due  = _two(totals["total_amount"] - paid)
    status = "paid" if due <= Decimal("0") else ("partial" if paid > Decimal("0") else "unpaid")

    inv = invoice(
        outlet_id=data.outlet_id,
        invoice_no=invoice_no,
        customer_id=data.customer_id,
        invoice_type=data.invoice_type,
        invoice_date=data.invoice_date,
        invoice_datetime=data.invoice_datetime,
        payment_mode=data.payment_mode,
        is_interstate=data.is_interstate,
        cd_percent=data.cd_percent,
        notes=data.notes,
        paid_amount=paid,
        due_amount=due,
        status=status,
        created_by=user_id,
        **totals,
    )
    inv.items = item_rows
    db.add(inv)
    await db.flush()  # get inv.id

    # stock ledger — write FIRST, then update qty
    for item_in in data.items:
        await _write_stock_ledger(
            db=db,
            product_id=item_in.product_id,
            txn_type="sale",
            qty=-item_in.qty,          # negative = outgoing
            ref_id=inv.id,
            ref_type="invoice",
            outlet_id=data.outlet_id,
            notes=f"Invoice {invoice_no}",
            user_id=user_id,
        )
        await _update_product_stock(db, item_in.product_id, -item_in.qty)

    # record payment if paid_amount > 0
    if paid > Decimal("0"):
        pay_no = await _next_payment_no(db)
        pay = invoice_payment(
            payment_no=pay_no,
            outlet_id=data.outlet_id,
            customer_id=data.customer_id,
            invoice_id=inv.id,
            amount=paid,
            payment_date=data.invoice_date,
            payment_mode=data.payment_mode,
            created_by=user_id,
        )
        db.add(pay)

    await db.commit()
    await db.refresh(inv)
    
    # Audit log
    from app.services.auth_service import write_audit
    await write_audit(
        db=db,
        module="billing",
        action="create_invoice",
        record_id=inv.id,
        record_no=inv.invoice_no,
        description=f"Invoice {inv.invoice_no} created for {totals['total_amount']}",
        user_id=user_id,
        user_name=None, # will be fetched in write_audit if missing or we can pass it if we have it
    )

    # reload with relationships
    result = await db.execute(
        select(invoice)
        .options(selectinload(invoice.items), selectinload(invoice.payments))
        .where(invoice.id == inv.id)
    )
    return result.scalar_one()


async def get_invoice(db: AsyncSession, invoice_id: int) -> Optional[invoice]:
    result = await db.execute(
        select(invoice)
        .options(selectinload(invoice.items), selectinload(invoice.payments))
        .where(invoice.id == invoice_id)
    )
    return result.scalar_one_or_none()


async def list_invoices(
    db: AsyncSession,
    customer_id: Optional[int] = None,
    status: Optional[str] = None,
    from_date: Optional[date] = None,
    to_date: Optional[date] = None,
    page: int = 1,
    per_page: int = 25,
):
    q = select(invoice).order_by(invoice.id.desc())
    if customer_id:
        q = q.where(invoice.customer_id == customer_id)
    if status:
        q = q.where(invoice.status == status)
    if from_date:
        q = q.where(invoice.invoice_date >= from_date)
    if to_date:
        q = q.where(invoice.invoice_date <= to_date)

    total_res = await db.execute(select(func.count()).select_from(q.subquery()))
    total = total_res.scalar() or 0

    q = q.offset((page - 1) * per_page).limit(per_page)
    rows = await db.execute(q)
    items = rows.scalars().all()
    return items, total


async def add_payment(
    db: AsyncSession,
    invoice_id: int,
    data: payment_in,
    user_id: Optional[int],
) -> invoice:
    inv = await db.get(invoice, invoice_id)
    if not inv:
        raise ValueError("Invoice not found")

    pay_no = await _next_payment_no(db)
    pay = invoice_payment(
        payment_no=pay_no,
        outlet_id=inv.outlet_id,
        customer_id=inv.customer_id,
        invoice_id=invoice_id,
        amount=data.amount,
        payment_date=data.payment_date,
        payment_mode=data.payment_mode,
        reference_no=data.reference_no,
        notes=data.notes,
        created_by=user_id,
    )
    db.add(pay)

    new_paid = _two(inv.paid_amount + data.amount)
    new_due  = _two(inv.total_amount - new_paid)
    new_status = "paid" if new_due <= Decimal("0") else "partial"

    inv.paid_amount = new_paid
    inv.due_amount  = new_due
    inv.status      = new_status

    await db.commit()
    await db.refresh(inv)

    from app.services.auth_service import write_audit
    await write_audit(
        db=db,
        module="billing",
        action="add_payment",
        record_id=inv.id,
        record_no=inv.invoice_no,
        description=f"Payment of {data.amount} added to invoice {inv.invoice_no}",
        user_id=user_id,
    )

    result = await db.execute(
        select(invoice)
        .options(selectinload(invoice.items), selectinload(invoice.payments))
        .where(invoice.id == invoice_id)
    )
    return result.scalar_one()


async def cancel_invoice(
    db: AsyncSession,
    invoice_id: int,
    reason: str,
    user_id: Optional[int],
) -> invoice:
    inv = await db.get(invoice, invoice_id)
    if not inv:
        raise ValueError("Invoice not found")
    if inv.status == "cancelled":
        raise ValueError("Invoice already cancelled")

    # restore stock
    items_res = await db.execute(
        select(invoice_item).where(invoice_item.invoice_id == invoice_id)
    )
    for it in items_res.scalars().all():
        await _write_stock_ledger(
            db=db,
            product_id=it.product_id,
            txn_type="sale_cancel",
            qty=it.qty,               # positive = restoring
            ref_id=invoice_id,
            ref_type="invoice_cancel",
            outlet_id=inv.outlet_id,
            notes=f"Cancel {inv.invoice_no}: {reason}",
            user_id=user_id,
        )
        await _update_product_stock(db, it.product_id, it.qty)

    inv.status = "cancelled"
    await db.commit()
    await db.refresh(inv)

    from app.services.auth_service import write_audit
    await write_audit(
        db=db,
        module="billing",
        action="cancel_invoice",
        record_id=inv.id,
        record_no=inv.invoice_no,
        description=f"Invoice {inv.invoice_no} cancelled. Reason: {reason}",
        user_id=user_id,
    )

    return inv


# ─── Estimate Service ─────────────────────────────────────────────────────────

def _calc_estimate_item(item_in: estimate_item_in):
    gross    = _two(item_in.qty * item_in.rate)
    disc_amt = _two(item_in.discount)
    taxable  = _two(gross - disc_amt)
    tax_amt  = _two(taxable * item_in.tax_percent / Decimal("100"))
    total    = _two(taxable + tax_amt)
    return {"tax_amount": tax_amt, "total": total}


async def create_estimate(
    db: AsyncSession,
    data: estimate_create,
    user_id: Optional[int],
) -> estimate:
    est_no = await _next_estimate_no(db)
    item_rows = []
    subtotal = Decimal("0")
    total_discount = Decimal("0")
    total_tax = Decimal("0")
    total_amount = Decimal("0")

    for item_in in data.items:
        calc = _calc_estimate_item(item_in)
        row = estimate_item(
            product_id=item_in.product_id,
            item_code=item_in.item_code,
            description=item_in.description,
            qty=item_in.qty,
            unit=item_in.unit,
            rate=item_in.rate,
            discount=item_in.discount,
            tax_percent=item_in.tax_percent,
            cost_price=item_in.cost_price,
            **calc,
        )
        item_rows.append(row)
        gross = _two(item_in.qty * item_in.rate)
        subtotal       += gross
        total_discount += item_in.discount
        total_tax      += calc["tax_amount"]
        total_amount   += calc["total"]

    est = estimate(
        estimate_no=est_no,
        customer_id=data.customer_id,
        customer_name=data.customer_name,
        customer_mobile=data.customer_mobile,
        estimate_date=data.estimate_date,
        valid_until=data.valid_until,
        notes=data.notes,
        subtotal=_two(subtotal),
        total_discount=_two(total_discount),
        total_tax=_two(total_tax),
        total_amount=_two(total_amount),
        created_by=user_id,
    )
    est.items = item_rows
    db.add(est)
    await db.commit()
    await db.refresh(est)
    result = await db.execute(
        select(estimate)
        .options(selectinload(estimate.items))
        .where(estimate.id == est.id)
    )
    return result.scalar_one()


async def get_estimate(db: AsyncSession, est_id: int) -> Optional[estimate]:
    result = await db.execute(
        select(estimate)
        .options(selectinload(estimate.items))
        .where(estimate.id == est_id)
    )
    return result.scalar_one_or_none()


async def list_estimates(
    db: AsyncSession,
    customer_id: Optional[int] = None,
    status: Optional[str] = None,
    page: int = 1,
    per_page: int = 25,
):
    q = select(estimate).order_by(estimate.id.desc())
    if customer_id:
        q = q.where(estimate.customer_id == customer_id)
    if status:
        q = q.where(estimate.status == status)

    total_res = await db.execute(select(func.count()).select_from(q.subquery()))
    total = total_res.scalar() or 0

    q = q.offset((page - 1) * per_page).limit(per_page)
    rows = await db.execute(q)
    return rows.scalars().all(), total


async def convert_estimate_to_invoice(
    db: AsyncSession,
    est_id: int,
    payment_mode: str,
    paid_amount: Decimal,
    user_id: Optional[int],
) -> invoice:
    est = await get_estimate(db, est_id)
    if not est:
        raise ValueError("Estimate not found")
    if est.status != "pending":
        raise ValueError("Only pending estimates can be converted")

    # build invoice_create from estimate
    items = [
        invoice_item_in(
            product_id=it.product_id or 0,
            item_code=it.item_code,
            name=it.description,
            qty=it.qty,
            unit=it.unit,
            rate=it.rate,
            disc_val=it.discount,
            disc_type="₹",
            gst_percent=it.tax_percent,
        )
        for it in est.items
    ]

    from app.schemas.invoice import invoice_create as _ic
    inv_data = _ic(
        customer_id=est.customer_id,
        invoice_date=est.estimate_date,
        payment_mode=payment_mode,
        paid_amount=paid_amount,
        items=items,
    )
    inv = await create_invoice(db, inv_data, user_id)

    # mark estimate as converted
    est.status = "converted"
    est.converted_to = inv.id
    await db.commit()
    return inv

