import math
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, select, update
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.core.dependencies import get_current_user, current_user_dep, require_role
from app.core.security import hash_password
from app.models.user import user as user_model
from app.schemas.user import user_create, user_list_out, user_update, user_password_change
from app.schemas.common import paginated_response, success_response
from app.services.auth_service import write_audit

router = APIRouter(prefix="/users", tags=["users"])


@router.get("", response_model=paginated_response[user_list_out])
async def list_users(
    page: int = Query(1, ge=1),
    per_page: int = Query(25, ge=1, le=200),
    search: str = Query(""),
    current_user: current_user_dep = Depends(require_role("admin", "manager")),
    db: AsyncSession = Depends(get_db),
):
    q = select(user_model)
    if search:
        q = q.where(
            user_model.name.ilike(f"%{search}%") | user_model.username.ilike(f"%{search}%")
        )

    total_result = await db.execute(select(func.count()).select_from(q.subquery()))
    total = total_result.scalar_one()

    rows = await db.execute(q.offset((page - 1) * per_page).limit(per_page))
    users = rows.scalars().all()

    return {
        "data": users,
        "total": total,
        "page": page,
        "per_page": per_page,
        "total_pages": math.ceil(total / per_page),
    }


@router.post("", response_model=success_response, status_code=status.HTTP_201_CREATED)
async def create_user(
    body: user_create,
    current_user: current_user_dep = Depends(require_role("admin")),
    db: AsyncSession = Depends(get_db),
):
    exists = await db.execute(select(user_model).where(user_model.username == body.username))
    if exists.scalar_one_or_none():
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="username already exists")

    new_user = user_model(
        name=body.name,
        username=body.username,
        password=hash_password(body.password),
        email=body.email,
        role=body.role,
        role_id=body.role_id,
        outlet_id=body.outlet_id,
        hht_login_id=body.hht_login_id,
        device_permission=body.device_permission,
        warehouse_permission=body.warehouse_permission,
        putaway_rights=body.putaway_rights,
        rack_transfer_rights=body.rack_transfer_rights,
    )
    db.add(new_user)
    await db.flush()

    await write_audit(
        db=db,
        module="users",
        action="create",
        record_id=new_user.id,
        description=f"user {new_user.username} created",
        user_id=current_user.user_id,
        user_name=current_user.username,
    )
    await db.commit()
    return {"message": "user created", "id": new_user.id}


@router.get("/{user_id}", response_model=user_list_out)
async def get_user(
    user_id: int,
    current_user: current_user_dep = Depends(require_role("admin", "manager")),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(user_model).where(user_model.id == user_id))
    db_user = result.scalar_one_or_none()
    if not db_user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="user not found")
    return db_user


@router.put("/{user_id}", response_model=success_response)
async def update_user(
    user_id: int,
    body: user_update,
    current_user: current_user_dep = Depends(require_role("admin")),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(user_model).where(user_model.id == user_id))
    db_user = result.scalar_one_or_none()
    if not db_user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="user not found")

    update_data = body.model_dump(exclude_none=True)
    if update_data:
        await db.execute(update(user_model).where(user_model.id == user_id).values(**update_data))
        await write_audit(
            db=db,
            module="users",
            action="update",
            record_id=user_id,
            description=f"user {user_id} updated",
            user_id=current_user.user_id,
            user_name=current_user.username,
        )
        await db.commit()
    return {"message": "user updated", "id": user_id}


@router.delete("/{user_id}", response_model=success_response)
async def delete_user(
    user_id: int,
    current_user: current_user_dep = Depends(require_role("admin")),
    db: AsyncSession = Depends(get_db),
):
    if user_id == current_user.user_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="cannot deactivate yourself")

    result = await db.execute(select(user_model).where(user_model.id == user_id))
    db_user = result.scalar_one_or_none()
    if not db_user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="user not found")

    await db.execute(update(user_model).where(user_model.id == user_id).values(status=False))
    await write_audit(
        db=db,
        module="users",
        action="deactivate",
        record_id=user_id,
        description=f"user {user_id} deactivated (soft delete)",
        user_id=current_user.user_id,
        user_name=current_user.username,
    )
    await db.commit()
    return {"message": "user deactivated", "id": user_id}


@router.post("/{user_id}/change-password", response_model=success_response)
async def change_password(
    user_id: int,
    body: user_password_change,
    current_user: current_user_dep = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if current_user.user_id != user_id and current_user.role != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="cannot change another user's password")

    result = await db.execute(select(user_model).where(user_model.id == user_id))
    db_user = result.scalar_one_or_none()
    if not db_user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="user not found")

    from app.core.security import verify_password
    if not verify_password(body.old_password, db_user.password):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="old password is incorrect")

    await db.execute(
        update(user_model).where(user_model.id == user_id).values(password=hash_password(body.new_password))
    )
    await write_audit(
        db=db,
        module="users",
        action="change_password",
        record_id=user_id,
        user_id=current_user.user_id,
        user_name=current_user.username,
    )
    await db.commit()
    return {"message": "password changed", "id": user_id}
