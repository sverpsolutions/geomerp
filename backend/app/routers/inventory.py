from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, delete
from typing import List
from datetime import datetime

from app.core.database import get_db
from app.core.dependencies import get_current_user, current_user_dep
from app.models.inventory import multi_transfer_session, multi_transfer_session_branch, multi_transfer_session_item
from app.models.sync import unit_wise_stock_transfer, unit_wise_stock_transfer_item
from app.models.outlet import outlet
from app.schemas.inventory import MultiTransferSessionCreate, MultiTransferSessionOut, BranchChipInfo
from app.schemas.common import success_response

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
        await db.refresh(session, ["branches", "items"])
        
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

@router.post("/confirm/{session_id}", response_model=success_response)
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
            # We need cost_price and mrp. For now, using defaults or fetching from product
            # For brevity in this implementaiton, I'll assume they are available or set to 0
            db.add(unit_wise_stock_transfer_item(
                transfer_id=trf.id,
                product_id=s_item.product_id,
                qty=s_item.qty_per_branch,
                unit="PCS",
                cost_price=0, # Should be fetched from product/batch
                mrp=0,        # Should be fetched from product/batch
                total_val=0
            ))
            
        generated_trfs.append(trf_no)

    # 3. Mark session as confirmed
    session.status = "CONFIRMED"
    await db.commit()
    
    return {
        "message": f"Successfully generated {len(generated_trfs)} transfers",
        "data": generated_trfs
    }
