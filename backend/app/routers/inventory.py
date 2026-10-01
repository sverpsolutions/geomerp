from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, delete
from typing import List
from datetime import date, datetime
from sqlalchemy.orm import aliased

from app.core.database import get_db
from app.core.dependencies import get_current_user, current_user_dep
from app.models.inventory import multi_transfer_session, multi_transfer_session_branch, multi_transfer_session_item
from app.models.sync import unit_wise_stock_transfer, unit_wise_stock_transfer_item
from app.models.outlet import outlet
from app.models.product import product
from app.schemas.inventory import MultiTransferSessionCreate, MultiTransferSessionOut, BranchChipInfo

router = APIRouter(prefix="/inventory/multi-transfer", tags=["inventory"])

@router.get("/branches", response_model=List[BranchChipInfo])
async def get_transfer_branches(db: AsyncSession = Depends(get_db)):
    """List active outlets that can be targets for multi-branch transfer."""
    result = await db.execute(
        select(outlet).where(outlet.is_active == True, outlet.type == 'O')
    )
    return result.scalars().all()

@router.post("/save", response_model=MultiTransferSessionOut)
async def save_multi_transfer_draft(
    body: MultiTransferSessionCreate,
    current_user: current_user_dep = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Save or update a multi-branch transfer draft."""
    try:
        # Create session header
        session = multi_transfer_session(
            from_location_id=body.from_location_id,
            remarks=body.remarks,
            status="DRAFT",
            created_by=current_user.user_id
        )
        
        # Generate draft ref number
        now = datetime.now()
        count_res = await db.execute(select(func.count(multi_transfer_session.id)))
        count = count_res.scalar() or 0
        session.draft_ref_number = f"DRAFT-{now.year}-{count + 1:04d}"
        
        db.add(session)
        await db.flush() # Get session.id
        
        # Add branches
        for b_id in body.branch_ids:
            db.add(multi_transfer_session_branch(session_id=session.id, branch_id=b_id))
            
        # Add items
        for item in body.items:
            db.add(multi_transfer_session_item(
                session_id=session.id,
                product_id=item.product_id,
                barcode=item.barcode,
                qty_per_branch=item.qty_per_branch
            ))
            
        await db.commit()
        await db.refresh(session)
        
        # Map for response - manually construct to avoid _sa_instance_state serialization issues
        return {
            "id": session.id,
            "from_location_id": session.from_location_id,
            "status": session.status,
            "draft_ref_number": session.draft_ref_number,
            "remarks": session.remarks,
            "created_at": session.created_at,
            "branch_ids": [b.branch_id for b in session.branches],
            "items": [
                {
                    "id": i.id,
                    "session_id": i.session_id,
                    "product_id": i.product_id,
                    "barcode": i.barcode,
                    "qty_per_branch": i.qty_per_branch
                } for i in session.items
            ]
        }
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=400, detail=f"Database error: {str(e)}")

# no response_model: success_response would strip "data", and the page crashed reading it
@router.post("/confirm/{session_id}")
async def confirm_multi_transfer(
    session_id: int,
    current_user: current_user_dep = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Finalize multi-branch transfer and generate individual TRF records."""
    # 1. Load session with relationships
    result = await db.execute(
        select(multi_transfer_session).where(multi_transfer_session.id == session_id)
    )
    session = result.scalar_one_or_none()
    
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    if session.status == "CONFIRMED":
        raise HTTPException(status_code=400, detail="Session already confirmed")

    # Load branches and items
    branches = (await db.execute(select(multi_transfer_session_branch).where(multi_transfer_session_branch.session_id == session_id))).scalars().all()
    items = (await db.execute(select(multi_transfer_session_item).where(multi_transfer_session_item.session_id == session_id))).scalars().all()
    
    if not branches or not items:
        raise HTTPException(status_code=400, detail="Session must have at least one branch and one item")

    now = datetime.now()
    generated_trfs = []
    generated_ids = []
    prices = {r.id: r for r in (await db.execute(
        select(product.id, product.cost_price, product.mrp).where(product.id.in_({i.product_id for i in items}))
    )).all()}

    # 2. Loop through branches and create TRF records
    for b_link in branches:
        # Generate TRF number
        # In a real system, we'd use a more robust counter, but for now:
        trf_count = (await db.execute(select(func.count(unit_wise_stock_transfer.id)))).scalar() or 0
        trf_no = f"TRF-{now.year}-{trf_count + 1:04d}"
        
        trf = unit_wise_stock_transfer(
            transfer_no=trf_no,
            from_outlet_id=session.from_location_id,
            to_outlet_id=b_link.branch_id,
            transfer_date=now.date(),
            type="OUT",
            status="pending",
            remarks=session.remarks,
            created_by=current_user.user_id
        )
        db.add(trf)
        await db.flush() # Get trf.id
        
        # Add items to this TRF
        for s_item in items:
            p = prices.get(s_item.product_id)
            cost = (p.cost_price if p else 0) or 0
            db.add(unit_wise_stock_transfer_item(
                transfer_id=trf.id,
                product_id=s_item.product_id,
                qty=s_item.qty_per_branch,
                unit="PCS",
                cost_price=cost,
                mrp=(p.mrp if p else 0) or 0,
                total_val=cost * s_item.qty_per_branch,
            ))
            
        generated_trfs.append(trf_no)
        generated_ids.append(trf.id)

    # 3. Mark session as confirmed
    session.status = "CONFIRMED"
    await db.commit()
    
    return {
        "message": f"Successfully generated {len(generated_trfs)} transfers",
        "data": generated_trfs,
        "ids": generated_ids,
    }


@router.get("/transfer/{trf_id}/print")
async def get_transfer_for_print(
    trf_id: int,
    current_user: current_user_dep = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Transfer-out note: header, both locations and item lines with names."""
    trf = await db.get(unit_wise_stock_transfer, trf_id)
    if not trf:
        raise HTTPException(status_code=404, detail="Transfer not found")
    locs = {o.id: o for o in (await db.execute(
        select(outlet).where(outlet.id.in_([trf.from_outlet_id, trf.to_outlet_id]))
    )).scalars().all()}
    rows = (await db.execute(
        select(unit_wise_stock_transfer_item, product.name, product.item_code, product.barcode, product.hsn_code)
        .join(product, unit_wise_stock_transfer_item.product_id == product.id)
        .where(unit_wise_stock_transfer_item.transfer_id == trf_id)
        .order_by(unit_wise_stock_transfer_item.id)
    )).all()
    loc = lambda o: o and {"name": o.outlet_name, "code": o.unit_code, "address": o.address,
                           "city": o.city, "state": o.state, "gst_number": o.gst_number}
    return {
        "id": trf.id, "transfer_no": trf.transfer_no, "transfer_date": trf.transfer_date,
        "status": trf.status, "remarks": trf.remarks,
        "from": loc(locs.get(trf.from_outlet_id)), "to": loc(locs.get(trf.to_outlet_id)),
        "items": [{"name": n, "item_code": c, "barcode": b, "hsn_code": h, "qty": i.qty, "unit": i.unit,
                   "cost_price": i.cost_price, "mrp": i.mrp, "total_val": i.total_val}
                  for i, n, c, b, h in rows],
    }


@router.get("/transfers")
async def list_stock_transfers(
    direction: str = Query("out", pattern="^(out|in)$"),
    location_id: int | None = Query(None, description="OUT = sent from it, IN = received by it; empty = all"),
    date_from: date | None = None,
    date_to: date | None = None,
    status_filter: str | None = Query(None, alias="status"),
    q: str | None = None,
    page: int = Query(1, ge=1),
    per_page: int = Query(50, ge=1, le=200),
    current_user: current_user_dep = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Stock transfer register with per-transfer item count, qty, cost and MRP value."""
    t, i = unit_wise_stock_transfer, unit_wise_stock_transfer_item
    frm, to = aliased(outlet), aliased(outlet)
    agg = (
        select(i.transfer_id,
               func.count(i.id).label("item_count"),
               func.coalesce(func.sum(i.qty), 0).label("total_qty"),
               func.coalesce(func.sum(i.total_val), 0).label("cost_value"),
               func.coalesce(func.sum(i.qty * i.mrp), 0).label("mrp_value"))
        .group_by(i.transfer_id).subquery()
    )
    conds = []
    if location_id:
        conds.append((t.from_outlet_id if direction == "out" else t.to_outlet_id) == location_id)
    if date_from:
        conds.append(t.transfer_date >= date_from)
    if date_to:
        conds.append(t.transfer_date <= date_to)
    if status_filter:
        conds.append(t.status == status_filter)
    if q:
        conds.append(t.transfer_no.ilike(f"%{q.strip()}%"))

    base = (
        select(t.id, t.transfer_no, t.transfer_date, t.type, t.status, t.remarks,
               t.from_outlet_id, frm.outlet_name.label("from_name"),
               t.to_outlet_id, to.outlet_name.label("to_name"),
               func.coalesce(agg.c.item_count, 0).label("item_count"),
               func.coalesce(agg.c.total_qty, 0).label("total_qty"),
               func.coalesce(agg.c.cost_value, 0).label("cost_value"),
               func.coalesce(agg.c.mrp_value, 0).label("mrp_value"))
        .outerjoin(agg, agg.c.transfer_id == t.id)
        .outerjoin(frm, frm.id == t.from_outlet_id)
        .outerjoin(to, to.id == t.to_outlet_id)
        .where(*conds)
    )
    sub = base.subquery()
    totals = (await db.execute(select(
        func.count(), func.coalesce(func.sum(sub.c.total_qty), 0),
        func.coalesce(func.sum(sub.c.cost_value), 0), func.coalesce(func.sum(sub.c.mrp_value), 0),
    ).select_from(sub))).one()
    rows = (await db.execute(
        base.order_by(t.transfer_date.desc().nullslast(), t.id.desc())
        .offset((page - 1) * per_page).limit(per_page)
    )).mappings().all()
    return {
        "items": [dict(r) for r in rows],
        "total": totals[0],
        "page": page,
        "per_page": per_page,
        "totals": {"total_qty": totals[1], "cost_value": totals[2], "mrp_value": totals[3]},
    }
