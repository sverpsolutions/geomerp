# Changelog

Versions follow `MAJOR.MINOR.PATCH`. New work lands on the `testing` branch as `-beta.N` tags; once verified it is merged to `main` and tagged without the suffix.

## v1.2.0-beta.1 — 2026-10-01 (testing) — Sales Return Phase 1

### Added
- **Sales Return / Credit Note** (Billing → Sales Return): find any bill (outlet POS or HO), enter return qty per item, reason, refund method (cash / adjust against bill due). Rules follow NCG `SalesReturns`: stock back to HO + `stock_ledger` `sale_return`, credit note `CN-HO-YYYY-NNNN`, GST-inclusive rate with taxable/GST extracted backwards.
- Hardening beyond NCG: server computes all amounts (client sends only product + qty); returnable qty = sold − already returned, row-locked (HTTP 409 on over-return); refunds never exceed what was paid; cancel reverses stock via ledger and restores bill due; admin/manager only for create/cancel.
- **Credit Notes** list (Billing → Credit Notes): HO credit notes + 123 synced outlet POS returns, date/source/search filters, print, cancel (HO only).
- **Credit note print**: port of NCG `sales_returns/print.php` — A4 "Refund Bill", against-bill bar, reason, parties, HSN-wise GST summary, amount in words (Lakh/Crore), signatory stamp.
- Company Profile: **GSTIN** and **State** fields (printed on credit notes).
- Migration `c3d9e1a2b4f5`: `unit_wise_invoices.ref_invoice_no / return_reason / refund_method / adjusted_amount`; `company_settings.gstin / company_state`.

### Fixed
- Creating invoices, payments, invoice cancel, delete requests and estimate create/convert/close crashed: routers read `current_user.id`, which did not exist (`core/dependencies.py`).

### Notes
- Outlet POS lines store the outlet item code in `product_id`; HO stock is resolved by `item_code` (99% match). Unmatched lines get a credit note but no stock movement (flagged on screen).
- Outlet POS returns (`RTN_*`) carry no original bill number, so a bill returned at the outlet cannot be detected — the screen warns the user.

## v1.1.0-beta.4 — 2026-10-01 (testing)

### Tooling
- Added SuperCharge v4 project skill (`.claude/skills/supercharge/`); runs only on `supercharge ...` / `/supercharge ...`.

## v1.1.0-beta.3 — 2026-10-01 (testing)

### Fixed
- 15 sidebar links did nothing because pages open as tabs and the tab table (`routes/config.tsx`) lacked them: GRN — Inward, Bill Entry, Schemes, Bulk Discount, Processing, Receive Lot, BOM Recipes, Production Batches, HR Dashboard, Leave Requests, Salary Slips, and all 5 Online Shop pages.
- 5 sidebar links point to modules that were never built (Sales Return, Credit Notes, Purchase Return, Physical Audit, Barcode Printing); they now show a "not built yet" page instead of nothing.

## v1.1.0-beta.2 — 2026-10-01 (testing)

### Changed
- All searches are word-based: every word must match, in any order ("maggi noodles" finds "MAGGI ATTA NOODLES"). One helper each side — `backend/app/utils/search.py` (`word_match`, `word_match_sql`) and `frontend/src/utils/search.ts` (`matchesSearch`) — used by products, shop, customers, suppliers, users, states, HSN, stock & channel reports, billing product picker, all masters pages, vendor pages, logistics list, command palette, help.

### Fixed
- HSN master search was ignored unless a code type was also selected.

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
