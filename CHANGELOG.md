# Changelog

Versions follow `MAJOR.MINOR.PATCH`. New work lands on the `testing` branch as `-beta.N` tags; once verified it is merged to `main` and tagged without the suffix.

## v1.1.0-beta.1 — 2026-10-01 (testing)

### Security
- Login required on `/reports`, `/sync`, `/wms`, `/outlets`, `/shop/admin/*`, `/shop/reports/*`, `/shop/customers*`, `/stock-reports/email`; DB backup is admin-only.

### Fixed
- 28 pages called `axios` directly with no token and a hard-coded `http://localhost:8000`; all now use the shared client (`api/axios.ts`) with token refresh.
- WMS pages called `/api/wms/*` (404); now `/api/v1/wms/*`.
- `/shop/banners` 500: added migration `b7e2c4d1f0a3` creating `shop_banners`.
- Outlet Excel import sends `multipart/form-data`.

### Removed
- Duplicate API client `frontend/src/services/api.ts`; unused `createOrGetCustomer` / `searchCustomers` wrappers.

### Docs
- `ARCHITECTURE.md` generated from the graphify code graph.

## v1.0.0 — 2026-10-01

- Initial import: FastAPI backend, React frontend, fmcg_reports; secrets moved to `.env` / `db_config.json`.
