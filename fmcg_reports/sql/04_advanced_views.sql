-- ================================================================
-- ADVANCED SALES / PURCHASE / STOCK TRANSFER REPORTING VIEWS
-- Version  : 1.0
-- Safe to re-run — DROP existing before CREATE
-- Apply on your active reporting database (MBGUR03 or similar)
-- ================================================================

PRINT '== STEP 1: Drop dependent views first =='
GO
IF OBJECT_ID('dbo.VW_ADV_SALES_SUMMARY',   'V') IS NOT NULL DROP VIEW dbo.VW_ADV_SALES_SUMMARY
GO
IF OBJECT_ID('dbo.VW_ADV_SALES_DETAIL',    'V') IS NOT NULL DROP VIEW dbo.VW_ADV_SALES_DETAIL
GO
IF OBJECT_ID('dbo.VW_ADV_SALES_BASE',      'V') IS NOT NULL DROP VIEW dbo.VW_ADV_SALES_BASE
GO
IF OBJECT_ID('dbo.VW_ADV_PURCHASE_SUMMARY','V') IS NOT NULL DROP VIEW dbo.VW_ADV_PURCHASE_SUMMARY
GO
IF OBJECT_ID('dbo.VW_ADV_PURCHASE_DETAIL', 'V') IS NOT NULL DROP VIEW dbo.VW_ADV_PURCHASE_DETAIL
GO
IF OBJECT_ID('dbo.VW_ADV_PURCHASE_BASE',   'V') IS NOT NULL DROP VIEW dbo.VW_ADV_PURCHASE_BASE
GO
IF OBJECT_ID('dbo.VW_ADV_STOCK_TRANSFER',  'V') IS NOT NULL DROP VIEW dbo.VW_ADV_STOCK_TRANSFER
GO

PRINT '== STEP 2: VW_ADV_SALES_BASE =='
GO

-- ================================================================
-- VW_ADV_SALES_BASE
-- UNION: Normal sales (SALES_HDR/DTL) + Refunds (SALES_RETURN_HDR/DTL)
--
-- Financial logic:
--   SALES  → SALES_VALUE = (AMOUNT - DISC)  positive
--             REFUND_VALUE = 0
--             NET_VALUE    = (AMOUNT - DISC)  positive
--
--   REFUND → SALES_VALUE  = 0
--             REFUND_VALUE = AMOUNT           positive (report positive)
--             NET_VALUE    = -AMOUNT          negative (deducted from net)
--
-- Performance: all masters resolved via LEFT JOIN, zero subqueries.
-- ================================================================
CREATE VIEW dbo.VW_ADV_SALES_BASE AS

-- ──────────────────── SALES (Normal Bills) ────────────────────────
SELECT
    H.SH_DEPT_CODE                                   AS DEPT_CODE,
    CAST(H.BILL_NO AS VARCHAR(50))                   AS TRANS_NO,
    CONVERT(DATE, H.BILL_DATE)                       AS TRANS_DATE,
    DATEPART(YEAR,  H.BILL_DATE)                     AS TRANS_YEAR,
    DATEPART(MONTH, H.BILL_DATE)                     AS TRANS_MONTH,
    DATENAME(MONTH, H.BILL_DATE)                     AS MONTH_NAME,
    'SALES'                                          AS TRAN_TYPE,
    H.CUSTOMER_CODE,
    ISNULL(H.CUSTOMER,         '')                   AS CUSTOMER_NAME,
    D.SERVICEORPRODUCTCODE                           AS ITEM_CODE,
    ISNULL(I.ITEM_NAME,        '')                   AS ITEM_NAME,
    ISNULL(CAT.Category_Code,  '')                   AS CATEGORY_CODE,
    ISNULL(CAT.Category_Desc,  'Uncategorized')      AS CATEGORY,
    ISNULL(BRD.Brand_Code,     '')                   AS BRAND_CODE,
    ISNULL(BRD.Brand_Name,     'Unbranded')          AS BRAND,
    ISNULL(S.SUPPLIER_NAME,    '')                   AS SUPPLIER_NAME,
    ISNULL(D.QTY,          0)                        AS QTY,
    ISNULL(D.RATE,         0)                        AS RATE,
    ISNULL(D.ITM_MRP,      0)                        AS MRP,
    ISNULL(D.AMOUNT,       0)                        AS AMOUNT,
    ISNULL(D.DISC_AMOUNT,  0)                        AS DISC_AMOUNT,
    -- ── Calculated financial columns ──
    ISNULL(D.AMOUNT, 0) - ISNULL(D.DISC_AMOUNT, 0)  AS SALES_VALUE,
    0.0                                              AS REFUND_VALUE,
    ISNULL(D.AMOUNT, 0) - ISNULL(D.DISC_AMOUNT, 0)  AS NET_VALUE,
    ISNULL(D.ORG_CP, 0)                              AS COST_PRICE,
    (ISNULL(D.AMOUNT, 0) - ISNULL(D.DISC_AMOUNT, 0))
        - ISNULL(D.ORG_CP, 0) * ISNULL(D.QTY, 0)   AS GROSS_PROFIT
FROM dbo.SALES_HDR H
INNER JOIN dbo.SALES_DTL    D   ON H.BILL_NO           = D.BILL_NO      AND H.SH_DEPT_CODE = D.SD_DEPT_CODE
LEFT  JOIN dbo.ITEM_MST     I   ON D.SERVICEORPRODUCTCODE = I.ITEM_CODE
LEFT  JOIN dbo.Category_Mst CAT ON I.CATEGORY_CODE     = CAT.Category_Code
LEFT  JOIN dbo.Brand_Master BRD ON I.BRAND_CODE        = BRD.Brand_Code
LEFT  JOIN dbo.SUPPLIER_MST S   ON I.SUPPLIER_CODE     = S.SUPPLIER_CODE
WHERE ISNULL(H.ISCANCELLED, 0) = 0
  AND D.SALES_ITEM_TYPE = 'P'

UNION ALL

-- ──────────────────── REFUNDS (Sales Returns) ────────────────────
-- SALES_RETURN_HDR has no direct CUSTOMER_CODE.
-- Customer is resolved via AGAINST_BILL_NO → SALES_HDR → CUSTOMER_MST
SELECT
    RH.SRH_DEPT_CODE                                 AS DEPT_CODE,
    CAST(RH.BILL_RTN_NO AS VARCHAR(50))              AS TRANS_NO,
    CONVERT(DATE, RH.BILL_RTN_DATE)                  AS TRANS_DATE,
    DATEPART(YEAR,  RH.BILL_RTN_DATE)                AS TRANS_YEAR,
    DATEPART(MONTH, RH.BILL_RTN_DATE)                AS TRANS_MONTH,
    DATENAME(MONTH, RH.BILL_RTN_DATE)                AS MONTH_NAME,
    'REFUND'                                         AS TRAN_TYPE,
    SH.CUSTOMER_CODE,                                -- from original SALES_HDR
    ISNULL(CM.CUSTOMER_NAME, '')                     AS CUSTOMER_NAME,
    RD.SERVICEORPRODUCTCODE                          AS ITEM_CODE,
    ISNULL(I.ITEM_NAME,       '')                    AS ITEM_NAME,
    ISNULL(CAT.Category_Code, '')                    AS CATEGORY_CODE,
    ISNULL(CAT.Category_Desc, 'Uncategorized')       AS CATEGORY,
    ISNULL(BRD.Brand_Code,    '')                    AS BRAND_CODE,
    ISNULL(BRD.Brand_Name,    'Unbranded')           AS BRAND,
    ISNULL(S.SUPPLIER_NAME,   '')                    AS SUPPLIER_NAME,
    ISNULL(RD.QTY,    0)                             AS QTY,
    ISNULL(RD.RATE,   0)                             AS RATE,
    ISNULL(I.MRP,     0)                             AS MRP,
    ISNULL(RD.AMOUNT, 0)                             AS AMOUNT,
    0.0                                              AS DISC_AMOUNT,
    -- Refund rows: SALES_VALUE=0, REFUND is positive, NET is negative
    0.0                                              AS SALES_VALUE,
    ISNULL(RD.AMOUNT, 0)                             AS REFUND_VALUE,
    -ISNULL(RD.AMOUNT, 0)                            AS NET_VALUE,
    ISNULL(I.CP, 0)                                  AS COST_PRICE,
    0.0                                              AS GROSS_PROFIT
FROM dbo.SALES_RETURN_HDR       RH
INNER JOIN dbo.SALES_RETURN_DTL RD  ON RH.BILL_RTN_NO         = RD.BILL_RTN_NO
                                   AND RH.SRH_DEPT_CODE        = RD.SRD_DEPT_CODE
-- Resolve customer: join original bill header via AGAINST_BILL_NO
LEFT  JOIN dbo.SALES_HDR        SH  ON RH.AGAINST_BILL_NO      = SH.BILL_NO
                                   AND RH.SRH_DEPT_CODE         = SH.SH_DEPT_CODE
LEFT  JOIN dbo.CUSTOMER_MST     CM  ON SH.CUSTOMER_CODE         = CM.CUSTOMER_CODE
LEFT  JOIN dbo.ITEM_MST         I   ON RD.SERVICEORPRODUCTCODE  = I.ITEM_CODE
LEFT  JOIN dbo.Category_Mst     CAT ON I.CATEGORY_CODE          = CAT.Category_Code
LEFT  JOIN dbo.Brand_Master     BRD ON I.BRAND_CODE             = BRD.Brand_Code
LEFT  JOIN dbo.SUPPLIER_MST     S   ON I.SUPPLIER_CODE          = S.SUPPLIER_CODE
GO

PRINT '== STEP 3: VW_ADV_SALES_SUMMARY =='
GO

-- ================================================================
-- VW_ADV_SALES_SUMMARY
-- Daily × Category × Brand aggregation from VW_ADV_SALES_BASE.
-- Filters applied in Flask route — not in view.
-- ================================================================
CREATE VIEW dbo.VW_ADV_SALES_SUMMARY AS
SELECT
    DEPT_CODE,
    TRANS_DATE                                         AS BILL_DATE,
    TRANS_YEAR                                         AS BILL_YEAR,
    TRANS_MONTH                                        AS BILL_MONTH,
    MONTH_NAME,
    CATEGORY_CODE,
    CATEGORY,
    BRAND_CODE,
    BRAND,
    SUPPLIER_NAME,
    -- Quantities
    SUM(CASE WHEN TRAN_TYPE = 'SALES'  THEN QTY ELSE 0 END)  AS SALES_QTY,
    SUM(CASE WHEN TRAN_TYPE = 'REFUND' THEN QTY ELSE 0 END)  AS REFUND_QTY,
    COUNT(CASE WHEN TRAN_TYPE = 'SALES' THEN 1 END)           AS BILL_COUNT,
    -- Values
    ROUND(SUM(SALES_VALUE),  2)                               AS TOTAL_SALES,
    ROUND(SUM(REFUND_VALUE), 2)                               AS TOTAL_REFUND,
    ROUND(SUM(NET_VALUE),    2)                               AS NET_SALES,
    ROUND(SUM(GROSS_PROFIT), 2)                               AS GROSS_PROFIT,
    -- Margin %
    CASE
        WHEN SUM(SALES_VALUE) > 0
        THEN ROUND(SUM(GROSS_PROFIT) / SUM(SALES_VALUE) * 100, 2)
        ELSE 0
    END                                                        AS MARGIN_PCT
FROM dbo.VW_ADV_SALES_BASE
GROUP BY
    DEPT_CODE, TRANS_DATE, TRANS_YEAR, TRANS_MONTH, MONTH_NAME,
    CATEGORY_CODE, CATEGORY, BRAND_CODE, BRAND, SUPPLIER_NAME
GO

PRINT '== STEP 4: VW_ADV_SALES_DETAIL =='
GO

-- ================================================================
-- VW_ADV_SALES_DETAIL
-- Transaction-level detail — each sale or refund line item.
-- ================================================================
CREATE VIEW dbo.VW_ADV_SALES_DETAIL AS
SELECT
    DEPT_CODE,
    TRANS_NO,
    TRANS_DATE,
    TRANS_YEAR,
    TRANS_MONTH,
    MONTH_NAME,
    TRAN_TYPE,
    CUSTOMER_CODE,
    CUSTOMER_NAME,
    ITEM_CODE,
    ITEM_NAME,
    CATEGORY_CODE,
    CATEGORY,
    BRAND_CODE,
    BRAND,
    SUPPLIER_NAME,
    QTY,
    RATE,
    MRP,
    AMOUNT,
    DISC_AMOUNT,
    SALES_VALUE,
    REFUND_VALUE,
    NET_VALUE,
    COST_PRICE,
    GROSS_PROFIT
FROM dbo.VW_ADV_SALES_BASE
GO

-- ================================================================
PRINT '== STEP 5: VW_ADV_PURCHASE_BASE =='
GO

-- ================================================================
-- VW_ADV_PURCHASE_BASE
-- UNION: GRN (Purchases) + PRN (Purchase Returns)
--
-- Financial logic:
--   PURCHASE        → PURCHASE_VALUE = AMOUNT, RETURN_VALUE = 0, NET = +AMOUNT
--   PURCHASE_RETURN → PURCHASE_VALUE = 0,      RETURN_VALUE = AMOUNT, NET = -AMOUNT
-- ================================================================
CREATE VIEW dbo.VW_ADV_PURCHASE_BASE AS

-- ──────────────────── GRN (Purchase / Goods Received) ────────────
SELECT
    H.GH_DEPT_CODE                                   AS DEPT_CODE,
    CAST(H.GRN_NO AS VARCHAR(50))                    AS TRANS_NO,
    CONVERT(DATE, H.GRN_DATE)                        AS TRANS_DATE,
    DATEPART(YEAR,  H.GRN_DATE)                      AS TRANS_YEAR,
    DATEPART(MONTH, H.GRN_DATE)                      AS TRANS_MONTH,
    DATENAME(MONTH, H.GRN_DATE)                      AS MONTH_NAME,
    'PURCHASE'                                       AS TRAN_TYPE,
    H.SUPPLIERCODE,
    ISNULL(S.SUPPLIER_NAME, '')                      AS SUPPLIER_NAME,
    D.ITEM_CODE,
    ISNULL(I.ITEM_NAME,        '')                   AS ITEM_NAME,
    ISNULL(CAT.Category_Code,  '')                   AS CATEGORY_CODE,
    ISNULL(CAT.Category_Desc,  'Uncategorized')      AS CATEGORY,
    ISNULL(BRD.Brand_Code,     '')                   AS BRAND_CODE,
    ISNULL(BRD.Brand_Name,     'Unbranded')          AS BRAND,
    ISNULL(D.REC_QTY,          0)                    AS QTY,
    ISNULL(D.BASIC_COST,       0)                    AS RATE,
    ISNULL(D.CP,               0)                    AS COST_PRICE,
    ISNULL(D.MRP,              0)                    AS MRP,
    ISNULL(D.AMOUNT,           0)                    AS AMOUNT,
    ISNULL(D.ITEM_DISC_AMOUNT, 0)
        + ISNULL(D.BILL_DISC_AMOUNT, 0)              AS DISC_AMOUNT,
    ISNULL(D.TAX_AMOUNT,       0)                    AS TAX_AMOUNT,
    -- Financial
    ISNULL(D.AMOUNT, 0)                              AS PURCHASE_VALUE,
    0.0                                              AS RETURN_VALUE,
    ISNULL(D.AMOUNT, 0)                              AS NET_VALUE
FROM dbo.GRN_HDR H
INNER JOIN dbo.GRN_DTL      D   ON H.GRN_NO         = D.GRN_NO        AND H.GH_DEPT_CODE = D.GD_DEPT_CODE
LEFT  JOIN dbo.SUPPLIER_MST S   ON H.SUPPLIERCODE   = S.SUPPLIER_CODE
LEFT  JOIN dbo.ITEM_MST     I   ON D.ITEM_CODE       = I.ITEM_CODE
LEFT  JOIN dbo.Category_Mst CAT ON I.CATEGORY_CODE  = CAT.Category_Code
LEFT  JOIN dbo.Brand_Master BRD ON I.BRAND_CODE     = BRD.Brand_Code
WHERE ISNULL(H.ISCANCELLED, 0) = 0

UNION ALL

-- ──────────────────── PRN (Purchase Returns) ─────────────────────
SELECT
    H.PH_DEPT_CODE                                   AS DEPT_CODE,
    CAST(H.PRN_NO AS VARCHAR(50))                    AS TRANS_NO,
    CONVERT(DATE, H.PRN_DATE)                        AS TRANS_DATE,
    DATEPART(YEAR,  H.PRN_DATE)                      AS TRANS_YEAR,
    DATEPART(MONTH, H.PRN_DATE)                      AS TRANS_MONTH,
    DATENAME(MONTH, H.PRN_DATE)                      AS MONTH_NAME,
    'PURCHASE_RETURN'                                AS TRAN_TYPE,
    H.SUPPLIERCODE,
    ISNULL(S.SUPPLIER_NAME, '')                      AS SUPPLIER_NAME,
    D.ITEM_CODE,
    ISNULL(I.ITEM_NAME,       '')                    AS ITEM_NAME,
    ISNULL(CAT.Category_Code, '')                    AS CATEGORY_CODE,
    ISNULL(CAT.Category_Desc, 'Uncategorized')       AS CATEGORY,
    ISNULL(BRD.Brand_Code,    '')                    AS BRAND_CODE,
    ISNULL(BRD.Brand_Name,    'Unbranded')           AS BRAND,
    ISNULL(D.RTN_QTY,  0)                            AS QTY,
    ISNULL(D.CP,       0)                            AS RATE,
    ISNULL(D.CP,       0)                            AS COST_PRICE,
    ISNULL(D.MRP,      0)                            AS MRP,
    ISNULL(D.AMOUNT,   0)                            AS AMOUNT,
    0.0                                              AS DISC_AMOUNT,
    ISNULL(D.TAX_AMOUNT, 0)                          AS TAX_AMOUNT,
    -- Financial
    0.0                                              AS PURCHASE_VALUE,
    ISNULL(D.AMOUNT, 0)                              AS RETURN_VALUE,
    -ISNULL(D.AMOUNT, 0)                             AS NET_VALUE
FROM dbo.PRN_HDR H
INNER JOIN dbo.PRN_DTL      D   ON H.PRN_NO         = D.PRN_NO        AND H.PH_DEPT_CODE = D.PD_DEPT_CODE
LEFT  JOIN dbo.SUPPLIER_MST S   ON H.SUPPLIERCODE   = S.SUPPLIER_CODE
LEFT  JOIN dbo.ITEM_MST     I   ON D.ITEM_CODE       = I.ITEM_CODE
LEFT  JOIN dbo.Category_Mst CAT ON I.CATEGORY_CODE  = CAT.Category_Code
LEFT  JOIN dbo.Brand_Master BRD ON I.BRAND_CODE     = BRD.Brand_Code
GO

PRINT '== STEP 6: VW_ADV_PURCHASE_SUMMARY =='
GO

-- ================================================================
-- VW_ADV_PURCHASE_SUMMARY
-- Daily × Supplier × Category × Brand aggregation
-- ================================================================
CREATE VIEW dbo.VW_ADV_PURCHASE_SUMMARY AS
SELECT
    DEPT_CODE,
    TRANS_DATE                                         AS GRN_DATE,
    TRANS_YEAR,
    TRANS_MONTH,
    MONTH_NAME,
    SUPPLIERCODE,
    SUPPLIER_NAME,
    CATEGORY_CODE,
    CATEGORY,
    BRAND_CODE,
    BRAND,
    -- Quantities
    SUM(CASE WHEN TRAN_TYPE = 'PURCHASE'        THEN QTY ELSE 0 END)  AS PURCHASE_QTY,
    SUM(CASE WHEN TRAN_TYPE = 'PURCHASE_RETURN' THEN QTY ELSE 0 END)  AS RETURN_QTY,
    COUNT(CASE WHEN TRAN_TYPE = 'PURCHASE' THEN 1 END)                 AS GRN_COUNT,
    -- Values
    ROUND(SUM(PURCHASE_VALUE), 2)                                      AS TOTAL_PURCHASE,
    ROUND(SUM(RETURN_VALUE),   2)                                      AS TOTAL_RETURN,
    ROUND(SUM(NET_VALUE),      2)                                      AS NET_PURCHASE,
    ROUND(SUM(TAX_AMOUNT),     2)                                      AS TOTAL_TAX
FROM dbo.VW_ADV_PURCHASE_BASE
GROUP BY
    DEPT_CODE, TRANS_DATE, TRANS_YEAR, TRANS_MONTH, MONTH_NAME,
    SUPPLIERCODE, SUPPLIER_NAME, CATEGORY_CODE, CATEGORY, BRAND_CODE, BRAND
GO

PRINT '== STEP 7: VW_ADV_PURCHASE_DETAIL =='
GO

-- ================================================================
-- VW_ADV_PURCHASE_DETAIL
-- Transaction-level detail for purchase and returns
-- ================================================================
CREATE VIEW dbo.VW_ADV_PURCHASE_DETAIL AS
SELECT
    DEPT_CODE,
    TRANS_NO,
    TRANS_DATE,
    TRANS_YEAR,
    TRANS_MONTH,
    MONTH_NAME,
    TRAN_TYPE,
    SUPPLIERCODE,
    SUPPLIER_NAME,
    ITEM_CODE,
    ITEM_NAME,
    CATEGORY_CODE,
    CATEGORY,
    BRAND_CODE,
    BRAND,
    QTY,
    RATE,
    COST_PRICE,
    MRP,
    AMOUNT,
    DISC_AMOUNT,
    TAX_AMOUNT,
    PURCHASE_VALUE,
    RETURN_VALUE,
    NET_VALUE
FROM dbo.VW_ADV_PURCHASE_BASE
GO

PRINT '== STEP 8: VW_ADV_STOCK_TRANSFER =='
GO

-- ================================================================
-- VW_ADV_STOCK_TRANSFER
-- Enhanced stock transfer with STOCK_IN / STOCK_OUT separation.
--   MTN_TYPE='I' → Transfer In  → STOCK_IN  = QTY, STOCK_OUT = 0
--   MTN_TYPE='O' → Transfer Out → STOCK_OUT = QTY, STOCK_IN  = 0
-- ================================================================
CREATE VIEW dbo.VW_ADV_STOCK_TRANSFER AS
SELECT
    H.MH_DEPT_CODE                                               AS DEPT_CODE,
    H.MTN_NO,
    CONVERT(DATE, H.MTN_DATE)                                    AS TRANS_DATE,
    DATEPART(YEAR,  H.MTN_DATE)                                  AS TRANS_YEAR,
    DATEPART(MONTH, H.MTN_DATE)                                  AS TRANS_MONTH,
    DATENAME(MONTH, H.MTN_DATE)                                  AS MONTH_NAME,
    H.MTN_TYPE,
    CASE H.MTN_TYPE
        WHEN 'I' THEN 'Transfer In'
        WHEN 'O' THEN 'Transfer Out'
        ELSE H.MTN_TYPE
    END                                                          AS TRANSFER_TYPE,
    ISNULL(H.FROM_LOCATION, '')                                  AS FROM_LOCATION,
    ISNULL(H.TO_LOCATION,   '')                                  AS TO_LOCATION,
    D.ITEM_CODE,
    ISNULL(I.ITEM_NAME,        '')                               AS ITEM_NAME,
    ISNULL(CAT.Category_Desc,  'Uncategorized')                  AS CATEGORY,
    ISNULL(BRD.Brand_Name,     '')                               AS BRAND,
    ISNULL(D.QTY,   0)                                           AS QTY,
    ISNULL(D.CP,    0)                                           AS COST_PRICE,
    ISNULL(D.SP,    0)                                           AS SALE_PRICE,
    ISNULL(D.MRP,   0)                                           AS MRP,
    ISNULL(D.AMOUNT,0)                                           AS AMOUNT,
    -- ── STOCK IN / OUT split ──────────────────────────────────────
    CASE WHEN H.MTN_TYPE = 'I' THEN ISNULL(D.QTY,    0) ELSE 0 END  AS STOCK_IN,
    CASE WHEN H.MTN_TYPE = 'O' THEN ISNULL(D.QTY,    0) ELSE 0 END  AS STOCK_OUT,
    CASE WHEN H.MTN_TYPE = 'I' THEN ISNULL(D.AMOUNT, 0) ELSE 0 END  AS VALUE_IN,
    CASE WHEN H.MTN_TYPE = 'O' THEN ISNULL(D.AMOUNT, 0) ELSE 0 END  AS VALUE_OUT,
    ISNULL(H.VEHICLE_NO,  '')                                    AS VEHICLE_NO,
    ISNULL(H.REMARKS,     '')                                    AS REMARKS,
    ISNULL(H.AUTH_STATUS, '')                                    AS AUTH_STATUS
FROM dbo.MTN_HDR H
INNER JOIN dbo.MTN_DTL      D   ON H.MTN_NO         = D.MTN_NO        AND H.MH_DEPT_CODE = D.MD_DEPT_CODE
LEFT  JOIN dbo.ITEM_MST     I   ON D.ITEM_CODE       = I.ITEM_CODE
LEFT  JOIN dbo.Category_Mst CAT ON I.CATEGORY_CODE  = CAT.Category_Code
LEFT  JOIN dbo.Brand_Master BRD ON I.BRAND_CODE     = BRD.Brand_Code
GO

-- ================================================================
-- VERIFY
-- ================================================================
PRINT '== ALL ADVANCED VIEWS CREATED SUCCESSFULLY =='
PRINT 'Views: VW_ADV_SALES_BASE, VW_ADV_SALES_SUMMARY, VW_ADV_SALES_DETAIL'
PRINT 'Views: VW_ADV_PURCHASE_BASE, VW_ADV_PURCHASE_SUMMARY, VW_ADV_PURCHASE_DETAIL'
PRINT 'Views: VW_ADV_STOCK_TRANSFER'
GO

-- Quick row-count check (uncomment to verify after running)
-- SELECT 'VW_ADV_SALES_BASE',      COUNT(*) FROM dbo.VW_ADV_SALES_BASE
-- SELECT 'VW_ADV_PURCHASE_BASE',   COUNT(*) FROM dbo.VW_ADV_PURCHASE_BASE
-- SELECT 'VW_ADV_STOCK_TRANSFER',  COUNT(*) FROM dbo.VW_ADV_STOCK_TRANSFER
