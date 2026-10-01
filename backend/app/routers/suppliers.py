import math
import uuid
from datetime import datetime, date as date_type
from decimal import Decimal
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, select, text, update, delete, insert
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.core.dependencies import get_current_user, require_role, current_user_dep
from sqlalchemy.orm import selectinload
from app.models.party import (
    supplier as supplier_model,
    supplier_address, supplier_legal, supplier_contact,
    supplier_director, supplier_auth_person, supplier_brand,
    supplier_financial, supplier_document, supplier_note,
    supplier_terms as supplier_terms_model,
    supplier_challan, supplier_challan_item,
    supplier_approval_log,
)
from app.models.state import supplier_gstin as supplier_gstin_model
from app.schemas.party import (
    supplier_create, supplier_update, supplier_out, supplier_list_out,
    supplier_terms_create, supplier_terms_out, ledger_row,
    approval_action_body,
)
from app.schemas.common import paginated_response, success_response
from app.services.auth_service import write_audit
from app.utils.search import word_match

router = APIRouter(prefix="/suppliers", tags=["suppliers"])


# ── helpers ───────────────────────────────────────────────────────────────────

def _all_selects(q):
    """Add all relationship selectinloads to a query on supplier_model."""
    return q.options(
        selectinload(supplier_model.addresses),
        selectinload(supplier_model.legal),
        selectinload(supplier_model.contacts),
        selectinload(supplier_model.directors),
        selectinload(supplier_model.auth_persons),
        selectinload(supplier_model.brands),
        selectinload(supplier_model.financial),
        selectinload(supplier_model.documents),
        selectinload(supplier_model.internal_notes),
        selectinload(supplier_model.gstins),
        selectinload(supplier_model.approval_logs),
    )


async def _log_action(
    db: AsyncSession,
    supplier_id: int,
    action: str,
    from_status: str | None,
    to_status: str | None,
    remarks: str | None,
    performed_by: int | None,
    performed_by_name: str | None,
):
    """Insert one row into supplier_approval_logs (pure core SQL – no ORM object)."""
    await db.execute(
        insert(supplier_approval_log).values(
            supplier_id=supplier_id,
            action=action,
            from_status=from_status,
            to_status=to_status,
            remarks=remarks or None,
            performed_by=performed_by,
            performed_by_name=performed_by_name,
        )
    )


# ── CRUD ──────────────────────────────────────────────────────────────────────

@router.get("", response_model=paginated_response[supplier_list_out])
async def list_suppliers(
    page: int = Query(1, ge=1),
    per_page: int = Query(25, ge=1, le=2000),
    search: str = Query(""),
    registration_status: str = Query("approved"),
    pending_review: bool = Query(False),     # shortcut: shows all non-approved/non-draft
    current_user: current_user_dep = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    q = select(supplier_model).where(supplier_model.status == True)

    if pending_review:
        # Show everything that needs admin attention
        q = q.where(supplier_model.registration_status.in_(
            ["submitted", "under_review", "correction_pending", "hold"]
        ))
    elif registration_status:
        q = q.where(supplier_model.registration_status == registration_status)

    if search:
        q = q.where(word_match(search, supplier_model.name, supplier_model.phone,
                               supplier_model.gst_number, supplier_model.supplier_code))
    total = (await db.execute(select(func.count()).select_from(q.subquery()))).scalar_one()
    rows = (await db.execute(
        q.order_by(supplier_model.name).offset((page - 1) * per_page).limit(per_page)
    )).scalars().all()
    return {
        "data": rows, "total": total, "page": page, "per_page": per_page,
        "total_pages": math.ceil(total / per_page) if per_page else 1,
    }


@router.post("", response_model=supplier_out, status_code=status.HTTP_201_CREATED)
async def create_supplier(
    body: supplier_create,
    current_user: current_user_dep = Depends(require_role("admin", "manager")),
    db: AsyncSession = Depends(get_db),
):
    try:
        if not body.supplier_code:
            last_sup = (await db.execute(
                select(supplier_model).order_by(supplier_model.id.desc()).limit(1)
            )).scalar_one_or_none()
            next_id = (last_sup.id + 1) if last_sup else 1
            body.supplier_code = f"SUP-{next_id:04d}"

        exclude = {"addresses", "legal", "contacts", "directors", "auth_persons", "brands", "financial", "documents", "gstins"}
        data = {k: v for k, v in body.model_dump(exclude=exclude).items()
                if hasattr(supplier_model, k)}
        obj = supplier_model(**data)

        if body.addresses:
            obj.addresses = [supplier_address(**a.model_dump()) for a in body.addresses]
        if body.legal:
            obj.legal = supplier_legal(**body.legal.model_dump())
        if body.contacts:
            obj.contacts = [supplier_contact(**{k: v for k, v in c.model_dump().items() if hasattr(supplier_contact, k)}) for c in body.contacts]
        if body.directors:
            obj.directors = [supplier_director(**d.model_dump()) for d in body.directors]
        if body.auth_persons:
            obj.auth_persons = [supplier_auth_person(**ap.model_dump()) for ap in body.auth_persons]
        if body.brands:
            obj.brands = [supplier_brand(brand_id=b.brand_id, credit_days=b.credit_days) for b in body.brands]
        if body.financial:
            obj.financial = supplier_financial(**body.financial.model_dump())
        if body.documents:
            obj.documents = [supplier_document(**doc.model_dump()) for doc in body.documents]
        if body.gstins:
            obj.gstins = [supplier_gstin_model(**{k: v for k, v in g.model_dump().items() if k != 'id'}) for g in body.gstins]

        db.add(obj)
        await db.flush()
        await write_audit(db=db, module="suppliers", action="create", record_id=obj.id,
                          description=f"supplier '{obj.name}' created with code {obj.supplier_code}",
                          user_id=current_user.user_id, user_name=current_user.username)
        await db.commit()
        return await get_supplier(obj.id, current_user, db)
    except HTTPException:
        raise
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{supplier_id}", response_model=supplier_out)
async def get_supplier(
    supplier_id: int,
    current_user: current_user_dep = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    q = _all_selects(select(supplier_model).where(supplier_model.id == supplier_id))
    row = (await db.execute(q)).scalar_one_or_none()
    if not row:
        raise HTTPException(status_code=404, detail="supplier not found")
    return row


@router.put("/{supplier_id}", response_model=supplier_out)
async def update_supplier(
    supplier_id: int,
    body: supplier_create,
    current_user: current_user_dep = Depends(require_role("admin", "manager")),
    db: AsyncSession = Depends(get_db),
):
    try:
        q = _all_selects(select(supplier_model).where(supplier_model.id == supplier_id))
        obj = (await db.execute(q)).scalar_one_or_none()
        if not obj:
            raise HTTPException(status_code=404, detail="supplier not found")

        db.expire(obj, ['updated_at', 'created_at'])

        exclude_nested = {"addresses", "legal", "contacts", "directors", "auth_persons", "brands", "financial", "documents", "gstins"}
        for key, value in body.model_dump(exclude=exclude_nested).items():
            if hasattr(obj, key):
                setattr(obj, key, value)

        obj.updated_at = datetime.utcnow()

        if body.legal:
            if not obj.legal:
                obj.legal = supplier_legal(supplier_id=obj.id, **body.legal.model_dump())
            else:
                for k, v in body.legal.model_dump().items():
                    setattr(obj.legal, k, v)
        if body.financial:
            if not obj.financial:
                obj.financial = supplier_financial(supplier_id=obj.id, **body.financial.model_dump())
            else:
                for k, v in body.financial.model_dump().items():
                    setattr(obj.financial, k, v)
        if body.addresses is not None:
            obj.addresses = [supplier_address(**a.model_dump()) for a in body.addresses]
        if body.contacts is not None:
            obj.contacts = [supplier_contact(**{k: v for k, v in c.model_dump().items() if hasattr(supplier_contact, k)}) for c in body.contacts]
        if body.directors is not None:
            obj.directors = [supplier_director(**d.model_dump()) for d in body.directors]
        if body.auth_persons is not None:
            obj.auth_persons = [supplier_auth_person(**ap.model_dump()) for ap in body.auth_persons]
        if body.brands is not None:
            obj.brands = [supplier_brand(brand_id=b.brand_id, credit_days=b.credit_days) for b in body.brands]
        if body.documents is not None:
            obj.documents = [supplier_document(**doc.model_dump()) for doc in body.documents]
        if body.gstins is not None:
            obj.gstins = [supplier_gstin_model(**{k: v for k, v in g.model_dump().items() if k != 'id'}) for g in body.gstins]

        await write_audit(db=db, module="suppliers", action="update", record_id=supplier_id,
                          description=f"supplier '{obj.name}' updated",
                          user_id=current_user.user_id, user_name=current_user.username)
        await db.commit()
        return await get_supplier(supplier_id, current_user, db)
    except HTTPException:
        raise
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/{supplier_id}", response_model=success_response)
async def delete_supplier(
    supplier_id: int,
    current_user: current_user_dep = Depends(require_role("admin")),
    db: AsyncSession = Depends(get_db),
):
    await db.execute(
        update(supplier_model).where(supplier_model.id == supplier_id)
        .values(status=False, updated_at=func.now())
    )
    await write_audit(db=db, module="suppliers", action="deactivate", record_id=supplier_id,
                      user_id=current_user.user_id, user_name=current_user.username)
    await db.commit()
    return {"message": "supplier deactivated", "id": supplier_id}


# ── Ledger ────────────────────────────────────────────────────────────────────

@router.get("/{supplier_id}/ledger", response_model=list[ledger_row])
async def supplier_ledger(
    supplier_id: int,
    current_user: current_user_dep = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    sup = (await db.execute(
        select(supplier_model).where(supplier_model.id == supplier_id)
    )).scalar_one_or_none()
    if not sup:
        raise HTTPException(status_code=404, detail="supplier not found")

    ledger: list[ledger_row] = []
    running = Decimal("0.00")

    if sup.opening_balance != 0:
        running += Decimal(str(sup.opening_balance))
        ledger.append(ledger_row(
            date=sup.created_at.date(),
            ref_no="OPEN",
            type="opening",
            description="Opening Balance",
            debit=Decimal(str(sup.opening_balance)) if sup.opening_balance > 0 else Decimal("0"),
            credit=abs(Decimal(str(sup.opening_balance))) if sup.opening_balance < 0 else Decimal("0"),
            balance=running,
        ))

    try:
        pur_result = await db.execute(text("""
            SELECT purchase_no, purchase_date, total_amount
            FROM unit_wise_purchases
            WHERE supplier_id = :sid AND status != 'cancelled'
            ORDER BY purchase_date, id
        """), {"sid": supplier_id})
        for p in pur_result.fetchall():
            running += Decimal(str(p.total_amount))
            ledger.append(ledger_row(
                date=p.purchase_date,
                ref_no=p.purchase_no,
                type="purchase",
                description=f"Purchase {p.purchase_no}",
                debit=Decimal(str(p.total_amount)),
                credit=Decimal("0"),
                balance=running,
            ))
    except Exception:
        pass

    ledger.sort(key=lambda x: x.date)
    return ledger


# ── Terms ─────────────────────────────────────────────────────────────────────

@router.get("/{supplier_id}/terms", response_model=list[supplier_terms_out])
async def get_terms(
    supplier_id: int,
    current_user: current_user_dep = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    rows = (await db.execute(
        select(supplier_terms_model)
        .where(supplier_terms_model.supplier_id == supplier_id,
               supplier_terms_model.is_active == True)
    )).scalars().all()
    return rows


@router.post("/{supplier_id}/terms", response_model=supplier_terms_out, status_code=201)
async def add_terms(
    supplier_id: int,
    body: supplier_terms_create,
    current_user: current_user_dep = Depends(require_role("admin", "manager")),
    db: AsyncSession = Depends(get_db),
):
    obj = supplier_terms_model(supplier_id=supplier_id, terms_text=body.terms_text)
    db.add(obj)
    await db.flush()
    await db.commit()
    await db.refresh(obj)
    return obj


@router.delete("/{supplier_id}/terms/{term_id}", response_model=success_response)
async def delete_terms(
    supplier_id: int,
    term_id: int,
    current_user: current_user_dep = Depends(require_role("admin", "manager")),
    db: AsyncSession = Depends(get_db),
):
    await db.execute(
        update(supplier_terms_model)
        .where(supplier_terms_model.id == term_id,
               supplier_terms_model.supplier_id == supplier_id)
        .values(is_active=False, updated_at=func.now())
    )
    await db.commit()
    return {"message": "term deactivated", "id": term_id}


# ── Challans ──────────────────────────────────────────────────────────────────

@router.get("/{supplier_id}/challans", response_model=list[dict])
async def list_challans(
    supplier_id: int,
    current_user: current_user_dep = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    rows = (await db.execute(
        select(supplier_challan)
        .where(supplier_challan.supplier_id == supplier_id)
        .order_by(supplier_challan.challan_date.desc())
    )).scalars().all()
    return [
        {
            "id": r.id, "challan_no": r.challan_no,
            "challan_date": r.challan_date.isoformat(),
            "status": r.status, "total_qty": float(r.total_qty),
            "notes": r.notes,
        }
        for r in rows
    ]


@router.post("/{supplier_id}/challans", response_model=success_response, status_code=201)
async def create_challan(
    supplier_id: int,
    body: dict,
    current_user: current_user_dep = Depends(require_role("admin", "manager", "staff")),
    db: AsyncSession = Depends(get_db),
):
    challan_date = date_type.fromisoformat(body.get("challan_date", str(date_type.today())))
    obj = supplier_challan(
        challan_no=body["challan_no"],
        supplier_id=supplier_id,
        challan_date=challan_date,
        total_qty=Decimal(str(body.get("total_qty", 0))),
        notes=body.get("notes"),
        created_by=current_user.user_id,
    )
    db.add(obj)
    await db.flush()
    await db.commit()
    return {"message": "challan created", "id": obj.id}


# ── Notes ─────────────────────────────────────────────────────────────────────

@router.post("/{supplier_id}/notes", response_model=success_response, status_code=201)
async def add_supplier_note(
    supplier_id: int,
    body: dict,
    current_user: current_user_dep = Depends(require_role("admin", "manager")),
    db: AsyncSession = Depends(get_db),
):
    note_text = body.get("note", "").strip()
    if not note_text:
        raise HTTPException(400, "Note text is required")
    await db.execute(
        insert(supplier_note).values(
            supplier_id=supplier_id,
            note=note_text,
            note_type=body.get("note_type", "internal"),
            created_by=current_user.user_id,
        )
    )
    await db.commit()
    return {"message": "note added", "id": supplier_id}


# ── Approval Logs ─────────────────────────────────────────────────────────────

@router.get("/{supplier_id}/approval-logs")
async def get_approval_logs(
    supplier_id: int,
    current_user: current_user_dep = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    rows = (await db.execute(
        select(supplier_approval_log)
        .where(supplier_approval_log.supplier_id == supplier_id)
        .order_by(supplier_approval_log.created_at.desc())
    )).scalars().all()
    return [
        {
            "id": r.id,
            "action": r.action,
            "from_status": r.from_status,
            "to_status": r.to_status,
            "remarks": r.remarks,
            "performed_by_name": r.performed_by_name,
            "created_at": r.created_at.isoformat() if r.created_at else None,
        }
        for r in rows
    ]


# ── Vendor Onboarding & Approvals ─────────────────────────────────────────────

@router.post("/onboarding/link", response_model=supplier_out)
async def generate_onboarding_link(
    phone: str,
    name: str = "Pending Vendor",
    current_user: current_user_dep = Depends(require_role("admin", "manager")),
    db: AsyncSession = Depends(get_db),
):
    token = str(uuid.uuid4())
    obj = supplier_model(
        name=name,
        phone=phone,
        registration_status="pending",
        onboarding_token=token,
        status=True,
        supplier_type="Distributor",
    )
    db.add(obj)
    await db.flush()
    await db.commit()
    return await get_supplier(obj.id, current_user, db)


@router.get("/public/registration/{token}", response_model=supplier_out)
async def get_public_registration(
    token: str,
    db: AsyncSession = Depends(get_db),
):
    q = _all_selects(select(supplier_model).where(supplier_model.onboarding_token == token))
    obj = (await db.execute(q)).scalar_one_or_none()
    if not obj:
        raise HTTPException(404, "Invalid or expired token")
    return obj


@router.post("/public/registration/{token}", response_model=supplier_out)
async def submit_public_registration(
    token: str,
    body: supplier_create,
    db: AsyncSession = Depends(get_db),
):
    try:
        # ── 1. Verify token — select ONLY id/status, NOT full ORM object ──────
        #    Loading the full ORM object causes SQLAlchemy synchronize_session to
        #    find it in identity map & taint it with tz-aware datetimes from asyncpg.
        verify_q = select(supplier_model.id, supplier_model.registration_status).where(
            supplier_model.onboarding_token == token
        )
        row = (await db.execute(verify_q)).one_or_none()
        if not row:
            raise HTTPException(404, "Invalid or expired token")
        supplier_id, reg_status = row

        if reg_status == "approved":
            raise HTTPException(400, "This registration has already been approved and cannot be modified.")

        # ── 2. Build scalar UPDATE values ──────────────────────────────────────
        exclude_nested = {"addresses", "legal", "contacts", "directors", "auth_persons", "brands", "financial", "documents", "gstins"}
        exclude_protected = {"supplier_code", "onboarding_token", "registration_status"}
        scalar_vals: dict = {
            "registration_status": "submitted",
            "updated_at": func.now(),
        }
        for key, value in body.model_dump(exclude=exclude_nested | exclude_protected).items():
            if hasattr(supplier_model, key):
                scalar_vals[key] = value

        # ── 3. UPDATE suppliers — pure core SQL ────────────────────────────────
        await db.execute(
            update(supplier_model)
            .where(supplier_model.id == supplier_id)
            .values(**scalar_vals)
        )

        # ── 4. Relationships: DELETE old, INSERT new (core SQL only) ──────────
        await db.execute(delete(supplier_legal).where(supplier_legal.supplier_id == supplier_id))
        if body.legal:
            await db.execute(insert(supplier_legal).values(supplier_id=supplier_id, **body.legal.model_dump()))

        await db.execute(delete(supplier_financial).where(supplier_financial.supplier_id == supplier_id))
        if body.financial:
            await db.execute(insert(supplier_financial).values(supplier_id=supplier_id, **body.financial.model_dump()))

        await db.execute(delete(supplier_address).where(supplier_address.supplier_id == supplier_id))
        for addr in body.addresses or []:
            await db.execute(insert(supplier_address).values(supplier_id=supplier_id, **addr.model_dump()))

        await db.execute(delete(supplier_contact).where(supplier_contact.supplier_id == supplier_id))
        for contact in body.contacts or []:
            cd = {k: v for k, v in contact.model_dump().items() if hasattr(supplier_contact, k) and k != "id"}
            await db.execute(insert(supplier_contact).values(supplier_id=supplier_id, **cd))

        await db.execute(delete(supplier_director).where(supplier_director.supplier_id == supplier_id))
        for director in body.directors or []:
            await db.execute(insert(supplier_director).values(supplier_id=supplier_id, **director.model_dump()))

        await db.execute(delete(supplier_auth_person).where(supplier_auth_person.supplier_id == supplier_id))
        for ap in body.auth_persons or []:
            await db.execute(insert(supplier_auth_person).values(supplier_id=supplier_id, **ap.model_dump()))

        await db.execute(delete(supplier_gstin_model).where(supplier_gstin_model.supplier_id == supplier_id))
        for g in body.gstins or []:
            gd = {k: v for k, v in g.model_dump().items() if k not in ("id",)}
            await db.execute(insert(supplier_gstin_model).values(supplier_id=supplier_id, **gd))

        await db.execute(delete(supplier_document).where(supplier_document.supplier_id == supplier_id))
        for doc in body.documents or []:
            await db.execute(insert(supplier_document).values(supplier_id=supplier_id, **doc.model_dump()))

        # ── 5. Log the submission ──────────────────────────────────────────────
        await _log_action(db, supplier_id, "submitted", reg_status, "submitted",
                          "Vendor submitted registration form", None, "vendor")

        await db.commit()
        from collections import namedtuple
        MockUser = namedtuple("MockUser", ["user_id", "username"])
        return await get_supplier(supplier_id, MockUser(0, "public"), db)

    except HTTPException:
        raise
    except Exception as e:
        await db.rollback()
        import traceback
        print("submit_public_registration ERROR:", traceback.format_exc())
        raise HTTPException(status_code=500, detail=str(e))


# ── Approval Actions ──────────────────────────────────────────────────────────
# All use pure core SQL — never load the full ORM supplier object.
# Reason: asyncpg returns TIMESTAMP WITHOUT TIME ZONE as tz-aware Python datetimes;
# SQLAlchemy synchronize_session="evaluate" would then push a tz-aware value
# back into the TIMESTAMP column, raising asyncpg.DataError.

@router.post("/{supplier_id}/approve", response_model=supplier_out)
async def approve_supplier(
    supplier_id: int,
    body: approval_action_body = approval_action_body(),
    current_user: current_user_dep = Depends(require_role("admin", "manager")),
    db: AsyncSession = Depends(get_db),
):
    try:
        # ── 1. Fetch minimal info (no ORM object in identity map) ──────────────
        row = (await db.execute(
            select(
                supplier_model.id,
                supplier_model.registration_status,
                supplier_model.supplier_code,
                supplier_model.gst_number,
                supplier_model.pan_number,
                supplier_model.name,
            ).where(supplier_model.id == supplier_id)
        )).one_or_none()

        if not row:
            raise HTTPException(404, "Supplier not found")

        s_id, reg_status, sup_code, gst_num, pan_num, sup_name = row

        if reg_status == "approved":
            raise HTTPException(400, "Vendor is already approved.")

        # ── 2. Duplicate checks before approval ────────────────────────────────
        if gst_num:
            dup = (await db.execute(
                select(supplier_model.id, supplier_model.name)
                .where(
                    supplier_model.gst_number == gst_num,
                    supplier_model.registration_status == "approved",
                    supplier_model.id != supplier_id,
                    supplier_model.status == True,
                )
            )).one_or_none()
            if dup:
                raise HTTPException(409, f"GST {gst_num} already exists in approved supplier '{dup[1]}' (ID {dup[0]}). Resolve the duplicate before approving.")

        if pan_num:
            dup = (await db.execute(
                select(supplier_model.id, supplier_model.name)
                .where(
                    supplier_model.pan_number == pan_num,
                    supplier_model.registration_status == "approved",
                    supplier_model.id != supplier_id,
                    supplier_model.status == True,
                )
            )).one_or_none()
            if dup:
                raise HTTPException(409, f"PAN {pan_num} already exists in approved supplier '{dup[1]}' (ID {dup[0]}). Resolve the duplicate before approving.")

        # ── 3. Generate unique supplier code if missing ────────────────────────
        if not sup_code:
            res_last = (await db.execute(
                text("""
                    SELECT COALESCE(MAX(CAST(NULLIF(REGEXP_REPLACE(supplier_code,'[^0-9]','','g'),'') AS INT)), 0)
                    FROM suppliers
                    WHERE supplier_code LIKE 'SUP-%' AND status = TRUE
                """)
            )).scalar()
            next_num = (res_last or 0) + 1
            sup_code = f"SUP-{next_num:04d}"

        # ── 4. UPDATE suppliers — pure core SQL ────────────────────────────────
        await db.execute(
            update(supplier_model)
            .where(supplier_model.id == supplier_id)
            .values(
                registration_status="approved",
                supplier_code=sup_code,
                approved_by=current_user.user_id,
                approved_at=func.now(),
                rejection_reason=None,
                correction_notes=None,
                updated_at=func.now(),
            )
        )

        # ── 5. Log the action ──────────────────────────────────────────────────
        await _log_action(db, supplier_id, "approved", reg_status, "approved",
                          body.remarks or f"Approved by {current_user.username}",
                          current_user.user_id, current_user.username)

        await write_audit(db=db, module="suppliers", action="approve", record_id=supplier_id,
                          description=f"vendor '{sup_name}' approved with code {sup_code}",
                          user_id=current_user.user_id, user_name=current_user.username)
        await db.commit()
        return await get_supplier(supplier_id, current_user, db)

    except HTTPException:
        raise
    except Exception as e:
        await db.rollback()
        import traceback
        print("approve_supplier ERROR:", traceback.format_exc())
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/{supplier_id}/reject", response_model=supplier_out)
async def reject_supplier(
    supplier_id: int,
    body: approval_action_body,
    current_user: current_user_dep = Depends(require_role("admin", "manager")),
    db: AsyncSession = Depends(get_db),
):
    try:
        if not body.remarks.strip():
            raise HTTPException(400, "Rejection reason / remarks is required.")

        row = (await db.execute(
            select(supplier_model.id, supplier_model.registration_status, supplier_model.name)
            .where(supplier_model.id == supplier_id)
        )).one_or_none()
        if not row:
            raise HTTPException(404, "Supplier not found")

        s_id, reg_status, sup_name = row

        await db.execute(
            update(supplier_model)
            .where(supplier_model.id == supplier_id)
            .values(
                registration_status="rejected",
                rejection_reason=body.remarks.strip(),
                updated_at=func.now(),
            )
        )
        await _log_action(db, supplier_id, "rejected", reg_status, "rejected",
                          body.remarks.strip(), current_user.user_id, current_user.username)
        await write_audit(db=db, module="suppliers", action="reject", record_id=supplier_id,
                          description=f"vendor '{sup_name}' rejected: {body.remarks[:100]}",
                          user_id=current_user.user_id, user_name=current_user.username)
        await db.commit()
        return await get_supplier(supplier_id, current_user, db)

    except HTTPException:
        raise
    except Exception as e:
        await db.rollback()
        import traceback
        print("reject_supplier ERROR:", traceback.format_exc())
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/{supplier_id}/hold", response_model=supplier_out)
async def hold_supplier(
    supplier_id: int,
    body: approval_action_body,
    current_user: current_user_dep = Depends(require_role("admin", "manager")),
    db: AsyncSession = Depends(get_db),
):
    try:
        row = (await db.execute(
            select(supplier_model.id, supplier_model.registration_status, supplier_model.name)
            .where(supplier_model.id == supplier_id)
        )).one_or_none()
        if not row:
            raise HTTPException(404, "Supplier not found")

        s_id, reg_status, sup_name = row

        await db.execute(
            update(supplier_model)
            .where(supplier_model.id == supplier_id)
            .values(registration_status="hold", updated_at=func.now())
        )
        await _log_action(db, supplier_id, "hold", reg_status, "hold",
                          body.remarks.strip() or None, current_user.user_id, current_user.username)
        await write_audit(db=db, module="suppliers", action="hold", record_id=supplier_id,
                          description=f"vendor '{sup_name}' placed on hold",
                          user_id=current_user.user_id, user_name=current_user.username)
        await db.commit()
        return await get_supplier(supplier_id, current_user, db)

    except HTTPException:
        raise
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/{supplier_id}/request-correction", response_model=supplier_out)
async def request_correction(
    supplier_id: int,
    body: approval_action_body,
    current_user: current_user_dep = Depends(require_role("admin", "manager")),
    db: AsyncSession = Depends(get_db),
):
    try:
        if not body.remarks.strip():
            raise HTTPException(400, "Please describe what corrections are needed.")

        row = (await db.execute(
            select(supplier_model.id, supplier_model.registration_status, supplier_model.name)
            .where(supplier_model.id == supplier_id)
        )).one_or_none()
        if not row:
            raise HTTPException(404, "Supplier not found")

        s_id, reg_status, sup_name = row

        correction_text = body.remarks.strip()
        if body.correction_fields:
            correction_text += "\n\nFields requiring correction:\n" + "\n".join(f"• {f}" for f in body.correction_fields)

        await db.execute(
            update(supplier_model)
            .where(supplier_model.id == supplier_id)
            .values(
                registration_status="correction_pending",
                correction_notes=correction_text,
                updated_at=func.now(),
            )
        )
        await _log_action(db, supplier_id, "correction_requested", reg_status, "correction_pending",
                          correction_text, current_user.user_id, current_user.username)
        await write_audit(db=db, module="suppliers", action="correction_request", record_id=supplier_id,
                          description=f"vendor '{sup_name}' sent for correction: {body.remarks[:100]}",
                          user_id=current_user.user_id, user_name=current_user.username)
        await db.commit()
        return await get_supplier(supplier_id, current_user, db)

    except HTTPException:
        raise
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/{supplier_id}/under-review", response_model=supplier_out)
async def mark_under_review(
    supplier_id: int,
    body: approval_action_body = approval_action_body(),
    current_user: current_user_dep = Depends(require_role("admin", "manager")),
    db: AsyncSession = Depends(get_db),
):
    try:
        row = (await db.execute(
            select(supplier_model.id, supplier_model.registration_status)
            .where(supplier_model.id == supplier_id)
        )).one_or_none()
        if not row:
            raise HTTPException(404, "Supplier not found")

        s_id, reg_status = row
        await db.execute(
            update(supplier_model)
            .where(supplier_model.id == supplier_id)
            .values(registration_status="under_review", updated_at=func.now())
        )
        await _log_action(db, supplier_id, "under_review", reg_status, "under_review",
                          body.remarks.strip() or "Moved to Under Review",
                          current_user.user_id, current_user.username)
        await db.commit()
        return await get_supplier(supplier_id, current_user, db)

    except HTTPException:
        raise
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=500, detail=str(e))
