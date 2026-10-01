from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update
from typing import List
from app.core.database import get_db
from app.models.company import CompanySetting
from app.schemas.company import CompanySettingOut, CompanySettingUpdate
from app.core.dependencies import get_current_user

router = APIRouter(prefix="/company", tags=["company"])

@router.get("/settings", response_model=CompanySettingOut)
async def get_company_settings(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(CompanySetting))
    settings = result.scalars().first()
    if not settings:
        # Create default if not exists
        settings = CompanySetting(key_name='general', brand_name="Modern Bazaar HO", logo_path="/logo.jpg")
        db.add(settings)
        await db.commit()
        await db.refresh(settings)
    return settings

@router.post("/settings", response_model=CompanySettingOut)
async def update_company_settings(
    data: CompanySettingUpdate, 
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    result = await db.execute(select(CompanySetting))
    settings = result.scalars().first()
    if not settings:
        settings = CompanySetting()
        db.add(settings)
    
    update_data = data.model_dump()
    await db.execute(update(CompanySetting).where(CompanySetting.id == settings.id).values(**update_data))
    await db.commit()
    
    result = await db.execute(select(CompanySetting))
    settings = result.scalars().first()
    return settings
