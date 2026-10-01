from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select, update, text
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from app.core.database import get_db
from app.core.config import get_settings
from sqlalchemy.engine import make_url
from app.core.dependencies import get_current_user, current_user_dep
from app.models.outlet import outlet
from app.schemas.common import success_response
from app.schemas.outlet import OutletCreate, OutletOut
import asyncio
from urllib.parse import quote_plus

router = APIRouter(prefix="/outlets", tags=["outlets"])

@router.get("", response_model=list[OutletOut])
async def list_outlets(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(outlet))
    return result.scalars().all()

@router.post("", response_model=dict, status_code=201)
async def create_outlet(body: OutletCreate, db: AsyncSession = Depends(get_db)):
    print(f"DEBUG: Received request to create outlet: {body.model_dump()}")
    try:
        # Explicitly map fields to avoid any hidden issues
        data = body.model_dump()
        new_outlet = outlet(**data)
        new_outlet.is_connected = False # Initial state
        db.add(new_outlet)
        await db.commit()
        await db.refresh(new_outlet)
        print(f"DEBUG: Successfully created outlet ID: {new_outlet.id}")
        return {"message": "Outlet registered successfully", "id": new_outlet.id}
    except Exception as e:
        await db.rollback()
        error_msg = str(e)
        print(f"ERROR: Failed to create outlet: {error_msg}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=error_msg)

@router.put("/{id}")
async def update_outlet(id: int, body: OutletCreate, db: AsyncSession = Depends(get_db)):
    row = (await db.execute(select(outlet).where(outlet.id == id))).scalar_one_or_none()
    if not row:
        raise HTTPException(status_code=404, detail="Outlet not found")
    
    data = body.model_dump()
    for key, value in data.items():
        setattr(row, key, value)
    
    await db.commit()
    return {"message": "Outlet updated successfully"}

@router.delete("/{id}")
async def delete_outlet(id: int, db: AsyncSession = Depends(get_db)):
    row = (await db.execute(select(outlet).where(outlet.id == id))).scalar_one_or_none()
    if not row:
        raise HTTPException(status_code=404, detail="Outlet not found")
    
    await db.delete(row)
    await db.commit()
    return {"message": "Outlet deleted successfully"}

@router.post("/test-connection/{id}")
async def test_connection(id: int, db: AsyncSession = Depends(get_db)):
    # 1. Get outlet info
    row = (await db.execute(select(outlet).where(outlet.id == id))).scalar_one_or_none()
    if not row:
        raise HTTPException(status_code=404, detail="Outlet not found")
    
    if not row.server_name or not row.database_name:
        return {"success": False, "error": "Incomplete connection details"}

    host = row.server_name
    dbname = row.database_name
    user = row.db_username or "sysuser" # Legacy SQL Server user
    password = row.db_password or get_settings().legacy_mssql_password # Legacy SQL Server password
    
    # Check if this is a SQL Server instance (contains backslash) or if it's an outlet
    is_sql_server = "\\" in host or row.type == "O"
    
    if is_sql_server:
        # SQL Server Connection using pymssql (Sync, run in thread)
        # lazy import — only needed when connecting to SQL Server outlets
        def check_mssql():
            try:
                import pymssql  # noqa: PLC0415
                conn = pymssql.connect(
                    server=host,
                    user=user,
                    password=password,
                    database=dbname,
                    login_timeout=5,
                    timeout=5
                )
                cursor = conn.cursor()

                # ── Step 1: Fetch grp_code from sysfile ──────────────────────
                grp_code = None
                try:
                    cursor.execute("SELECT TOP 1 grp_code FROM sysfile")
                    res = cursor.fetchone()
                    if res and res[0]:
                        grp_code = str(res[0]).strip()
                except Exception:
                    pass

                # ── Step 2: Count invoices from SALES_HDR ────────────────────
                invoice_count = 0
                for tbl in ['SALES_HDR', 'BILL_HDR', 'unit_wise_invoices']:
                    try:
                        cursor.execute(f"SELECT COUNT(*) FROM [{tbl}]")
                        invoice_count = cursor.fetchone()[0]
                        break
                    except Exception:
                        continue

                conn.close()
                msg = f"Connected to {dbname}. Invoices: {invoice_count}."
                if grp_code:
                    msg += f" Group Code: {grp_code}"
                return True, msg, invoice_count, grp_code
            except Exception as e:
                return False, str(e), 0, None

        success, message, count, grp_code = await asyncio.to_thread(check_mssql)

        if success:
            update_data = {"is_connected": True}
            if grp_code:
                update_data["grp_code"] = grp_code

            await db.execute(update(outlet).where(outlet.id == id).values(**update_data))
            await db.commit()
            return {
                "success": True,
                "is_connected": 1,
                "server": host,
                "data": {
                    "sample_info": message,
                    "invoice_count": count,
                    "grp_code": grp_code,
                }
            }
        else:
            await db.execute(update(outlet).where(outlet.id == id).values(is_connected=False))
            await db.commit()
            return {"success": False, "is_connected": 0, "error": message}

    else:
        # PostgreSQL Connection (for Head Office)
        user = row.db_username or "postgres"
        password = quote_plus(row.db_password or make_url(get_settings().database_url).password or "")
        host = "127.0.0.1" if row.server_name == "localhost" else row.server_name
        conn_url = f"postgresql+asyncpg://{user}:{password}@{host}/{dbname}"
        
        try:
            engine_test = create_async_engine(conn_url)
            async with engine_test.connect() as conn:
                await conn.execute(text("SELECT 1"))
                
                # Check for grp_cde in sysfile (unlikely in HO but possible)
                grp_code = None
                try:
                    res = await conn.execute(text("SELECT grp_cde FROM sysfile LIMIT 1"))
                    row_data = res.fetchone()
                    if row_data:
                        grp_code = str(row_data[0])
                except:
                    pass
                
                # Check for invoices count in HO
                invoice_count = 0
                try:
                    res = await conn.execute(text("SELECT COUNT(*) FROM unit_wise_invoices"))
                    invoice_count = res.scalar() or 0
                except:
                    invoice_count = "N/A"
                
                update_data = {"is_connected": True}
                message = f"PostgreSQL Connection Successful. Found {invoice_count} invoices."
                if grp_code:
                    update_data["grp_code"] = grp_code
                    message += f" Group Code: {grp_code}"
                
                await db.execute(update(outlet).where(outlet.id == id).values(**update_data))
                await db.commit()
                
                await engine_test.dispose()
                
                return {
                    "success": True,
                    "is_connected": 1,
                    "server": host,
                    "data": {
                        "sample_info": message,
                        "grp_code": grp_code,
                        "invoice_count": invoice_count
                    }
                }
        except Exception as e:
            await db.execute(update(outlet).where(outlet.id == id).values(is_connected=False))
            await db.commit()
            return {"success": False, "is_connected": 0, "error": str(e)}
