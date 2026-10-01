# Changelog

Versions follow `MAJOR.MINOR.PATCH`. New work lands on the `testing` branch as `-beta.N` tags; once verified it is merged to `main` and tagged without the suffix.

## v1.3.0-beta.1 — 2026-10-01 (testing) — POS billing (NCG v2 style)

### Changed
- **Billing → New Invoice** is a new POS screen modelled on NCG `billing/create_v2.php` (POS beta): navy top bar (invoice/cashier/clock), customer phone/name search, Retail/Wholesale, date, **Search & Scan** (barcode/item code exact match adds instantly; word search dropdown with ↑/↓/Enter; same item again = qty + 1), dense items grid (Qty, MRP struck through, Disc%, Rate, EAN, GST%, Total), fixed totals footer (Items, Qty, MRP Total, You Save, Grand Total, **Pay & Save F4**), shortcut bar F1 Search · F2 Qty · F3 Price Check · F4 Pay · F5 Hold · F6 Recall · F7 Reprint · F8 Price · F11 Fullscreen, and a two-column Pay & Save dialog ([Cash] [Card] [UPI] [Credit], CD %, round off, cash received → change).
- Prices are GST-inclusive shelf prices (`selling_price` = MRP); sent to the API as GST-exclusive rates; new `round_off` flag on invoice create keeps the bill total equal to the shelf total.
- After save: 80 mm thermal receipt, port of NCG `billing/print.php` (thermal-3in): MRP / S.D per line, You Saved, cash tendered / change, GST summary, PAID stamp.

### Removed
- Old `Billing.tsx` "New Invoice" page — it used hard-coded mock products/customers and never saved.

### Notes
- Held bills (F5) are kept per counter in the browser.
- Split payment is not offered: the invoice API records one payment mode per bill.

## v1.2.0-beta.2 — 2026-10-01 (testing) — Purchase Return Phase 2

### Added
- **Purchase Return / Debit Note** (Purchases → Purchase Return), two modes:
  - *Against GRN*: qty limited to received − already returned (row-locked, HTTP 409); rate = GRN taxable per unit incl. line + header discount; GRN payable reduced by the debit note.
  - *Direct (no GRN)*, NCG's default flow: supplier + items (word search), rate defaults to item-master purchase/cost price.
  - NCG rules: GST-exclusive rate, GST on top; CGST+SGST vs IGST from company state vs supplier state; stock leaves HO with `stock_ledger` `purchase_return`; number `DN-HO-YYYY-NNNN`; cancel reverses stock and GRN payable; admin/manager only.
  - HO stock is not enforced (all products show 0 HO stock today) — the screen warns when a return takes it negative.
- **Debit Notes** list (Purchases → Debit Notes): HO debit notes + outlet PRNs, filters, print, cancel.
- **Debit note print**: port of NCG `purchase_returns/print.php` — landscape "PURCHASE RETURN NOTE", supplier/return boxes, MRP/SP columns, GST summary, ITC-reversal note (GSTR-3B 4(B)(2)), amount in words, supplier acknowledgement + signatory.
- GRN now writes `stock_ledger` `purchase` rows.

### Fixed
- **GRN Inward could never save**: ORM wrote `total_qty` / item `basic_amount…` columns missing in the DB (0 GRNs ever recorded). Migration `d5e8f2a3c6b7` adds them.
- `unit_wise_purchase_returns` tables had an old shape matching neither outlet PRN sync nor debit notes (empty) — rebuilt to one schema; HO numbers unique, outlet PRN numbers may repeat across outlets.
- Pages under paths with no `App.tsx` route (Purchase Return, Physical Audit, Barcode Printing) rendered blank: added a catch-all inside the app shell so `routes/config.tsx` decides.

### Known
- GRN computes GST before the header discount, so GRN GST is slightly overstated when a header discount is used (debit notes use the discounted value).

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
