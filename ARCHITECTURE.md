# ModernBazaarHO — Architecture

Head-office ERP / WMS for a multi-outlet fish & FMCG retail chain. Built from the code knowledge graph in `graphify-out/` (2,480 nodes · 7,401 edges · 103 communities · no import cycles).

## Stack

| Layer | Tech | Where |
|---|---|---|
| Frontend | React 18 + Vite + TypeScript, Tailwind, zustand, axios | `frontend/` |
| Backend API | FastAPI + SQLAlchemy 2 (async, asyncpg) | `backend/app/` |
| Main database | PostgreSQL 16 (cloud: `modernbazaar`) | set by `database_url` in `backend/.env` |
| Migrations | Alembic | `backend/migrations/` |
| Outlet POS data | SQL Server per store, pulled with `pymssql` | `backend/app/routers/sync.py` |
| Legacy data | MySQL `bombayfishries_db` (read-only, migration source) | `legacy_engine` in `core/database.py` |
| Reporting app | Flask + pyodbc on SQL Server (separate app) | `fmcg_reports/` |

## Request flow

```
Browser (React page)
  └─ api client  frontend/src/api/axios.ts      baseURL /api/v1, adds Bearer token, auto-refresh on 401
       └─ Vite proxy /api → :8000  (dev)  |  same origin behind reverse proxy (prod)
            └─ FastAPI  backend/app/main.py  → routers/*  (prefix /api/v1)
                 ├─ Depends(get_current_user)   core/dependencies.py   (JWT check)
                 ├─ services/*                  business logic
                 └─ models/*  → PostgreSQL       via core/database.py get_db()
```

Every page must call the backend through `api` from `frontend/src/api/axios.ts` — never raw `axios` and never a hard-coded host.

## Backend modules (`backend/app/routers`, endpoint count)

| Area | Routers |
|---|---|
| Auth & users | `auth` 4 · `users` 6 · `roles` 7 · `audit_logs` 2 |
| Masters | `masters` 55 (groups, categories, brands, HSN, GST, units…) · `states` 5 · `company` 2 · `channels` 8 |
| Products | `products` 13 · `packaging` 8 · `import_export` 6 |
| Parties | `customers` 6 · `suppliers` 21 |
| Sales | `billing` 8 · `estimates` 5 |
| Purchasing | `purchases` 19 (PO, GRN, returns) |
| Stock | `inventory` 3 · `warehouse` 20 · `wms` 6 · `logistic` 10 |
| Outlets & sync | `outlets` 5 · `sync` 16 |
| Reports | `reports` 30 · `stock_reports` 5 |
| Online shop | `shop` 19 (storefront public, `/shop/admin/*` + `/shop/reports/*` need login) |

Services: `auth_service` (login, tokens, `write_audit`), `billing_service`, `product_service`, `import_service`, `location_import_service`.

### Core hubs (most-connected nodes in the graph)

| Node | Edges | Role |
|---|---|---|
| `current_user_dep` | 189 | Auth dependency injected into protected endpoints |
| `_get()` in `routers/sync.py` | 144 | Case-insensitive dict lookup used when mapping SQL Server rows (edge count inflated: graph links every `_get` name match) |
| `base` | 123 | SQLAlchemy declarative base — every model |
| `App()` | 81 | Frontend route table (`frontend/src/App.tsx`, 107 routes) |
| `write_audit()` | 76 | Audit-log writer called from 12 modules |
| `PageHeader()` | 55 | Shared page header component |
| `api` | 53 | The single frontend HTTP client |

Change any of these carefully — they fan out across the codebase. Check impact first:

```bash
graphify-8/.venv/Scripts/graphify.exe affected "write_audit()"
```

## Outlet sync

`routers/sync.py` connects to each outlet's SQL Server (`outlets.server_name`, `db_username`, `db_password`; fallback password = `legacy_mssql_password` in `.env`) and pulls sales, payments, purchases, purchase returns, stock and stock transfers into PostgreSQL `unit_wise_*` tables (`unit_wise_invoices`, `unit_wise_payments`, `unit_wise_purchases`, `unit_wise_stock`, `unit_wise_stock_transfers`, `unit_wise_tax_summary`, …). `backend/global_sync_worker.py` runs the same sync every 2 hours (started by `run_server.bat`). UI: Inventory → Global Store Sync / Synchronization Monitor.

## Frontend (`frontend/src`)

- `App.tsx` — routes; `layouts/AppLayout.tsx` (admin shell), `layouts/ShopLayout.tsx` (storefront), `layouts/HHTLayout.tsx` (handheld scanner).
- `components/Layout/Sidebar.tsx` — menu; `routes/config.tsx` — page metadata for tabs / command palette.
- `api/*.ts` — typed API modules, all built on `api/axios.ts`.
- `store/` — zustand: `authStore` (tokens, user), `brandingStore`, `syncStore`.
- `pages/` — reports 29 · masters 20 · shop 7 · billing 6 · suppliers 6 · products 5 · purchases 5 · hr 5 · inventory 4 · processing 4 · wms 3 · accounts 3 · …
- Icons: Font Awesome 5 bundled from npm (`main.tsx`), not CDN.

## fmcg_reports (separate Flask app)

Reporting portal (GSTR-1, sales, stock) reading SQL Server views (`SQL_VIEWS_ALL_REPORTS.sql`). Entry `app.py`, blueprints `routes_phase2.py`, `routes_adv.py`, `admin_routes.py`, `setup_routes.py`; exports in `exports/` (PDF, Excel, email). Credentials come from `fmcg_reports/db_config.json` or env vars via `db_config.get_secret()` — the JSON is git-ignored.

## Configuration & secrets

| File | Holds | In git |
|---|---|---|
| `backend/.env` | `database_url`, `secret_key`, `legacy_mssql_password` | no (`.env.example` is) |
| `fmcg_reports/db_config.json` | SQL Server, Flask key, SMTP, SuperAdmin password | no |
| `frontend/.env` | `VITE_*` vars (unused by the API client) | no |

Never hard-code a password; read `get_settings()` (backend) or `get_secret()` (fmcg_reports).

## Run locally

```bash
run_server.bat
```

Starts backend `:8000`, sync worker, frontend `:5173`. API docs: http://localhost:8000/docs. Migrations: `cd backend && venv/Scripts/alembic upgrade head`.

## Knowledge graph

```bash
graphify-8/.venv/Scripts/graphify.exe update .                 # rebuild after code changes (free, no LLM)
graphify-8/.venv/Scripts/graphify.exe query "how does billing post stock"
graphify-8/.venv/Scripts/graphify.exe explain "billing_service.py"
graphify-8/.venv/Scripts/graphify.exe path "outlet" "unit_wise_invoices"
```

Outputs: `graphify-out/graph.html` (interactive map), `GRAPH_REPORT.md` (communities, hubs, questions), `graph.json`. Scope is code only; `.claude/` is excluded via `.graphifyignore`.
