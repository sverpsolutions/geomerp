import os
from datetime import datetime
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import get_settings
from app.core.database import engine
from app.routers import (
    auth, users, roles, masters, products, customers, suppliers,
    billing, estimates, outlets, sync, reports, company, states,
    warehouse, packaging, import_export, wms, purchases, channels,
    audit_logs, inventory, logistic, stock_reports, shop, returns, purchase_returns, dashboard, shifts
)

_settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Start background scheduler
    from app.core.scheduler import start_scheduler
    start_scheduler()
    
    yield
    await engine.dispose()


app = FastAPI(
    title=_settings.app_name,
    version=_settings.app_version,
    debug=_settings.debug,
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=_settings.origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

API_PREFIX = "/api/v1"

# phase 2
app.include_router(auth.router,    prefix=API_PREFIX)
app.include_router(users.router,   prefix=API_PREFIX)
app.include_router(roles.router,   prefix=API_PREFIX)

# phase 3
app.include_router(masters.router,   prefix=API_PREFIX)
app.include_router(products.router,  prefix=API_PREFIX)

# phase 4
app.include_router(customers.router, prefix=API_PREFIX)
app.include_router(suppliers.router, prefix=API_PREFIX)

# phase 5
app.include_router(billing.router,   prefix=API_PREFIX)
app.include_router(estimates.router, prefix=API_PREFIX)
app.include_router(outlets.router,   prefix=API_PREFIX)
app.include_router(sync.router,      prefix=API_PREFIX)
app.include_router(reports.router,   prefix=API_PREFIX)
app.include_router(company.router,   prefix=API_PREFIX)
app.include_router(states.router,    prefix=API_PREFIX)
app.include_router(warehouse.router, prefix=API_PREFIX)
app.include_router(wms.router,       prefix=API_PREFIX)
app.include_router(packaging.router,     prefix=API_PREFIX)
app.include_router(import_export.router, prefix=API_PREFIX)
app.include_router(purchases.router,     prefix=API_PREFIX)
# Phase 6 — Channel Partner Pricing Engine
app.include_router(channels.router,      prefix=API_PREFIX)
app.include_router(audit_logs.router,    prefix=API_PREFIX)
app.include_router(inventory.router,     prefix=API_PREFIX)
app.include_router(logistic.router,      prefix=API_PREFIX)
app.include_router(stock_reports.router, prefix=API_PREFIX)
app.include_router(returns.router,       prefix=API_PREFIX)
app.include_router(purchase_returns.router, prefix=API_PREFIX)
app.include_router(shop.router,          prefix=API_PREFIX)
app.include_router(dashboard.router,     prefix=API_PREFIX)
app.include_router(shifts.router,        prefix=API_PREFIX)

from fastapi.staticfiles import StaticFiles
if not os.path.exists("uploads"):
    os.makedirs("uploads")
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")


@app.get("/health", tags=["health"])
async def health_check():
    return {"status": "ok", "app": _settings.app_name, "version": _settings.app_version}


from fastapi import Request
from fastapi.responses import JSONResponse
import traceback
import os

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    # Log to file
    with open("BACKEND_CRASH_LOG.txt", "a") as f:
        f.write(f"\n{'='*50}\n")
        f.write(f"TIMESTAMP: {datetime.now()}\n")
        f.write(f"PATH: {request.url.path}\n")
        f.write(f"ERROR: {str(exc)}\n")
        f.write(traceback.format_exc())
        f.write(f"{'='*50}\n")
    
    return JSONResponse(
        status_code=500,
        content={"detail": f"Internal Server Error: {str(exc)}"}
    )

from fastapi.exceptions import RequestValidationError
@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    with open("BACKEND_CRASH_LOG.txt", "a") as f:
        f.write(f"\n{'='*50}\n")
        f.write(f"TIMESTAMP: {datetime.now()}\n")
        f.write(f"PATH: {request.url.path}\n")
        f.write(f"VALIDATION ERROR: {exc.errors()}\n")
        f.write(f"{'='*50}\n")
    return JSONResponse(
        status_code=422,
        content={"detail": f"VALIDATION ERROR: {exc.errors()}"}
    )

