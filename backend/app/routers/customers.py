import math
from datetime import datetime
from decimal import Decimal
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, select, text, update
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.core.dependencies import get_current_user, require_role, current_user_dep
from app.models.party import customer as customer_model
from app.schemas.party import (
    customer_create, customer_update, customer_out, customer_list_out, ledger_row,
)
from app.schemas.common import paginated_response, success_response
from app.services.auth_service import write_audit
from app.utils.search import word_match

router = APIRouter(prefix="/customers", tags=["customers"])


@router.get("", response_model=paginated_response[customer_list_out])
async def list_customers(
    page: int = Query(1, ge=1),
    per_page: int = Query(25, ge=1, le=200),
    search: str = Query(""),
    type: str | None = Query(None),
    current_user: current_user_dep = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    q = select(customer_model).where(customer_model.status == True)
    if search:
        q = q.where(word_match(search, customer_model.name, customer_model.phone, customer_model.gst_number))
    if type:
        q = q.where(customer_model.type == type)

    total = (await db.execute(select(func.count()).select_from(q.subquery()))).scalar_one()
    rows = (await db.execute(
        q.order_by(customer_model.name).offset((page - 1) * per_page).limit(per_page)
    )).scalars().all()

    return {
        "data": rows, "total": total, "page": page,
        "per_page": per_page,
        "total_pages": math.ceil(total / per_page) if per_page else 1,
    }


@router.post("", response_model=customer_out, status_code=status.HTTP_201_CREATED)
async def create_customer(
    body: customer_create,
    current_user: current_user_dep = Depends(require_role("admin", "manager", "staff")),
    db: AsyncSession = Depends(get_db),
):
    obj = customer_model(**body.model_dump(), balance=body.opening_balance)
    db.add(obj)
    await db.flush()
    await write_audit(db=db, module="customers", action="create",
                      record_id=obj.id, description=f"customer '{obj.name}' created",
                      user_id=current_user.user_id, user_name=current_user.username)
    await db.commit()
    await db.refresh(obj)
    return obj


@router.get("/{customer_id}", response_model=customer_out)
async def get_customer(
    customer_id: int,
    current_user: current_user_dep = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    row = (await db.execute(
        select(customer_model).where(customer_model.id == customer_id)
    )).scalar_one_or_none()
    if not row:
        raise HTTPException(status_code=404, detail="customer not found")
    return row


@router.put("/{customer_id}", response_model=customer_out)
async def update_customer(
    customer_id: int,
    body: customer_update,
    current_user: current_user_dep = Depends(require_role("admin", "manager")),
    db: AsyncSession = Depends(get_db),
):
    row = (await db.execute(
        select(customer_model).where(customer_model.id == customer_id)
    )).scalar_one_or_none()
    if not row:
        raise HTTPException(status_code=404, detail="customer not found")

    data = body.model_dump(exclude_none=True)
    data["updated_at"] = datetime.utcnow()
    await db.execute(update(customer_model).where(customer_model.id == customer_id).values(**data))
    await write_audit(db=db, module="customers", action="update", record_id=customer_id,
                      user_id=current_user.user_id, user_name=current_user.username)
    await db.commit()
    await db.refresh(row)
    return row


@router.delete("/{customer_id}", response_model=success_response)
async def delete_customer(
    customer_id: int,
    current_user: current_user_dep = Depends(require_role("admin")),
    db: AsyncSession = Depends(get_db),
):
    await db.execute(
        update(customer_model)
        .where(customer_model.id == customer_id)
        .values(status=False, updated_at=datetime.utcnow())
    )
    await write_audit(db=db, module="customers", action="deactivate", record_id=customer_id,
                      user_id=current_user.user_id, user_name=current_user.username)
    await db.commit()
    return {"message": "customer deactivated", "id": customer_id}


@router.get("/{customer_id}/ledger", response_model=list[ledger_row])
async def customer_ledger(
    customer_id: int,
    current_user: current_user_dep = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    # verify customer exists
    cust = (await db.execute(
        select(customer_model).where(customer_model.id == customer_id)
    )).scalar_one_or_none()
    if not cust:
        raise HTTPException(status_code=404, detail="customer not found")

    ledger: list[ledger_row] = []
    running = Decimal("0.00")

    # opening balance row
    if cust.opening_balance != 0:
        running += cust.opening_balance
        ledger.append(ledger_row(
            date=cust.created_at.date(),
            ref_no="OPEN",
            type="opening",
            description="Opening Balance",
            debit=cust.opening_balance if cust.opening_balance > 0 else Decimal("0"),
            credit=abs(cust.opening_balance) if cust.opening_balance < 0 else Decimal("0"),
            balance=running,
        ))

    # invoices
    inv_result = await db.execute(text("""
        SELECT invoice_no, invoice_date, total_amount, due_amount, status
        FROM unit_wise_invoices
        WHERE customer_id = :cid AND status != 'cancelled'
        ORDER BY invoice_date, id
    """), {"cid": customer_id})
    for inv in inv_result.fetchall():
        running += Decimal(str(inv.total_amount))
        ledger.append(ledger_row(
            date=inv.invoice_date,
            ref_no=inv.invoice_no,
            type="invoice",
            description=f"Invoice {inv.invoice_no}",
            debit=Decimal(str(inv.total_amount)),
            credit=Decimal("0"),
            balance=running,
        ))

    # payments
    pay_result = await db.execute(text("""
        SELECT payment_no, payment_date, amount, payment_mode
        FROM unit_wise_payments
        WHERE customer_id = :cid
        ORDER BY payment_date, id
    """), {"cid": customer_id})
    for pay in pay_result.fetchall():
        running -= Decimal(str(pay.amount))
        ledger.append(ledger_row(
            date=pay.payment_date,
            ref_no=pay.payment_no,
            type="payment",
            description=f"Payment ({pay.payment_mode})",
            debit=Decimal("0"),
            credit=Decimal(str(pay.amount)),
            balance=running,
        ))

    # sort by date
    ledger.sort(key=lambda x: x.date)
    return ledger
