-- ============================================================
-- FMCG REPORTING TOOL - SQL VIEWS
-- Database: RetailWizard (RWMBSERVER)
-- Created for: RetailWizard Reporting System
-- ============================================================

USE [RetailWizard]
GO

-- ============================================================
-- 1. SALES SUMMARY VIEW (Daily/Weekly/Monthly)
-- ============================================================
IF OBJECT_ID('dbo.VW_RPT_SALES_SUMMARY', 'V') IS NOT NULL DROP VIEW dbo.VW_RPT_SALES_SUMMARY
GO
CREATE VIEW dbo.VW_RPT_SALES_SUMMARY AS
SELECT
    H.SH_DEPT_CODE                          AS DEPT_CODE,
    H.BILL_NO,
    CONVERT(DATE, H.BILL_DATE)              AS BILL_DATE,
    DATEPART(YEAR,  H.BILL_DATE)            AS BILL_YEAR,
    DATEPART(MONTH, H.BILL_DATE)            AS BILL_MONTH,
    DATEPART(DAY,   H.BILL_DATE)            AS BILL_DAY,
    DATENAME(WEEKDAY, H.BILL_DATE)          AS DAY_NAME,
    H.CUSTOMER_CODE,
    H.CUSTOMER                              AS CUSTOMER_NAME,
    ISNULL(H.SUBTOTAL_AMOUNT, 0)            AS SUBTOTAL,
    ISNULL(H.DISC_AMOUNT, 0)                AS DISCOUNT,
    ISNULL(H.GRAND_TOTAL, 0)                AS GRAND_TOTAL,
    ISNULL(H.TENDERED_AMOUNT, 0)            AS TENDERED,
    ISNULL(H.RedeemAmt, 0)                  AS REDEEM_AMOUNT,
    ISNULL(H.RoundOffBillAmount, 0)         AS ROUND_OFF,
    ISNULL(H.ISCANCELLED, 0)                AS IS_CANCELLED,
    H.ENT_USERID                            AS CASHIER_ID,
    H.POSID                                 AS POS_ID,
    H.Shift_ID,
    H.INVOICE_TPE                           AS INVOICE_TYPE,
    H.TRANSACTION_TYPE
FROM dbo.SALES_HDR H
WHERE ISNULL(H.ISCANCELLED, 0) = 0
GO

-- ============================================================
-- 2. SALES DETAIL VIEW (Item-wise sales)
-- ============================================================
IF OBJECT_ID('dbo.VW_RPT_SALES_DETAIL', 'V') IS NOT NULL DROP VIEW dbo.VW_RPT_SALES_DETAIL
GO
CREATE VIEW dbo.VW_RPT_SALES_DETAIL AS
SELECT
    H.SH_DEPT_CODE                          AS DEPT_CODE,
    H.BILL_NO,
    CONVERT(DATE, H.BILL_DATE)              AS BILL_DATE,
    DATEPART(YEAR,  H.BILL_DATE)            AS BILL_YEAR,
    DATEPART(MONTH, H.BILL_DATE)            AS BILL_MONTH,
    H.CUSTOMER_CODE,
    H.CUSTOMER                              AS CUSTOMER_NAME,
    D.SERVICEORPRODUCTCODE                  AS ITEM_CODE,
    I.ITEM_NAME,
    CAT.Category_Desc                       AS CATEGORY,
    BRD.Brand_Name                          AS BRAND,
    ISNULL(D.QTY, 0)                        AS QTY,
    ISNULL(D.RATE, 0)                       AS RATE,
    ISNULL(D.ITM_MRP, 0)                    AS MRP,
    ISNULL(D.ORG_CP, 0)                     AS COST_PRICE,
    ISNULL(D.AMOUNT, 0)                     AS AMOUNT,
    ISNULL(D.DISC_AMOUNT, 0)                AS DISC_AMOUNT,
    ISNULL(D.Line_Disc_Amount, 0)           AS LINE_DISC,
    ISNULL(D.TOTAL, 0)                      AS TOTAL,
    ISNULL(D.AMOUNT, 0) - ISNULL(D.ORG_CP, 0) * ISNULL(D.QTY, 0) AS GROSS_PROFIT,
    CASE WHEN ISNULL(D.AMOUNT,0)>0
         THEN ((ISNULL(D.AMOUNT,0) - ISNULL(D.ORG_CP,0)*ISNULL(D.QTY,0)) / ISNULL(D.AMOUNT,0)) * 100
         ELSE 0 END                         AS MARGIN_PCT,
    D.HSNSACCODE                            AS HSN_CODE,
    ISNULL(H.ISCANCELLED, 0)               AS IS_CANCELLED
FROM dbo.SALES_HDR H
INNER JOIN dbo.SALES_DTL D ON H.BILL_NO = D.BILL_NO AND H.SH_DEPT_CODE = D.SD_DEPT_CODE
LEFT  JOIN dbo.ITEM_MST  I ON D.SERVICEORPRODUCTCODE = I.ITEM_CODE
LEFT  JOIN dbo.Category_Mst CAT ON I.CATEGORY_CODE = CAT.Category_Code
LEFT  JOIN dbo.Brand_Master BRD ON I.BRAND_CODE = BRD.Brand_Code
WHERE ISNULL(H.ISCANCELLED, 0) = 0
  AND D.SALES_ITEM_TYPE = 'P'   -- Products only
GO

-- ============================================================
-- 3. PAYMENT MODE COLLECTION VIEW
-- ============================================================
IF OBJECT_ID('dbo.VW_RPT_PAYMENT_COLLECTION', 'V') IS NOT NULL DROP VIEW dbo.VW_RPT_PAYMENT_COLLECTION
GO
CREATE VIEW dbo.VW_RPT_PAYMENT_COLLECTION AS
SELECT
    H.SH_DEPT_CODE                          AS DEPT_CODE,
    H.BILL_NO,
    CONVERT(DATE, H.BILL_DATE)              AS BILL_DATE,
    DATEPART(YEAR,  H.BILL_DATE)            AS BILL_YEAR,
    DATEPART(MONTH, H.BILL_DATE)            AS BILL_MONTH,
    P.PAY_CODE,
    PM.PayMode                              AS PAYMENT_MODE,
    ISNULL(P.PAY_AMOUNT, 0)                AS PAY_AMOUNT,
    H.GRAND_TOTAL
FROM dbo.SALES_HDR H
INNER JOIN dbo.SALES_PAYMENT_DTL P  ON H.BILL_NO = P.BILL_NO AND H.SH_DEPT_CODE = P.SPD_DEPT_CODE
LEFT  JOIN dbo.Payment_Mode         PM ON P.PAY_CODE = PM.PayCode
WHERE ISNULL(H.ISCANCELLED, 0) = 0
GO

-- ============================================================
-- 4. SALES RETURN VIEW
-- ============================================================
IF OBJECT_ID('dbo.VW_RPT_SALES_RETURN', 'V') IS NOT NULL DROP VIEW dbo.VW_RPT_SALES_RETURN
GO
CREATE VIEW dbo.VW_RPT_SALES_RETURN AS
SELECT
    RH.SRH_DEPT_CODE                        AS DEPT_CODE,
    RH.BILL_RTN_NO,
    CONVERT(DATE, RH.BILL_RTN_DATE)         AS RETURN_DATE,
    DATEPART(YEAR,  RH.BILL_RTN_DATE)       AS RTN_YEAR,
    DATEPART(MONTH, RH.BILL_RTN_DATE)       AS RTN_MONTH,
    RH.AGAINST_BILL_NO,
    RD.SERVICEORPRODUCTCODE                 AS ITEM_CODE,
    I.ITEM_NAME,
    CAT.Category_Desc                       AS CATEGORY,
    ISNULL(RD.QTY, 0)                       AS RTN_QTY,
    ISNULL(RD.RATE, 0)                      AS RATE,
    ISNULL(RD.AMOUNT, 0)                    AS AMOUNT,
    ISNULL(RH.GRAND_TOTAL, 0)              AS GRAND_TOTAL,
    RH.REASON_FOR_REFUND,
    PM.PayMode                              AS REFUND_MODE,
    ISNULL(RP.PAY_AMOUNT, 0)               AS REFUND_AMOUNT
FROM dbo.SALES_RETURN_HDR RH
INNER JOIN dbo.SALES_RETURN_DTL  RD ON RH.BILL_RTN_NO = RD.BILL_RTN_NO AND RH.SRH_DEPT_CODE = RD.SRD_DEPT_CODE
LEFT  JOIN dbo.ITEM_MST          I  ON RD.SERVICEORPRODUCTCODE = I.ITEM_CODE
LEFT  JOIN dbo.Category_Mst      CAT ON I.CATEGORY_CODE = CAT.Category_Code
LEFT  JOIN dbo.SALES_RTN_PAYMENT_DTL RP ON RH.BILL_RTN_NO = RP.BILL_RTN_NO AND RH.SRH_DEPT_CODE = RP.SRPD_DEPT_CODE
LEFT  JOIN dbo.Payment_Mode      PM ON RP.PAY_CODE = PM.PayCode
GO

-- ============================================================
-- 5. CUSTOMER MASTER VIEW
-- ============================================================
IF OBJECT_ID('dbo.VW_RPT_CUSTOMER', 'V') IS NOT NULL DROP VIEW dbo.VW_RPT_CUSTOMER
GO
CREATE VIEW dbo.VW_RPT_CUSTOMER AS
SELECT
    C.CUSTOMER_CODE,
    C.CUSTOMER_NAME,
    C.GENDER,
    CONVERT(DATE, C.DATEOFBIRTH)            AS DATE_OF_BIRTH,
    ISNULL(C.VIP_CUSTOMER, 0)              AS IS_VIP,
    C.CARD_TYPE,
    C.CARD_NUMBER,
    CONVERT(DATE, C.CARD_ISSUE_DATE)        AS CARD_ISSUE_DATE,
    CONVERT(DATE, C.CARD_EXPIRY_DATE)       AS CARD_EXPIRY_DATE,
    ISNULL(C.NO_OF_TRANSACTIONS, 0)        AS TOTAL_TRANSACTIONS,
    ISNULL(C.TRANSACTION_VALUE, 0)         AS TOTAL_VALUE,
    ISNULL(C.TOTAL_POINTS, 0)             AS TOTAL_POINTS,
    ISNULL(C.POINTS_REDEEM, 0)            AS POINTS_REDEEMED,
    ISNULL(C.BALANCE_POINTS, 0)           AS BALANCE_POINTS,
    C.OFFICE1_PHONE                        AS MOBILE,
    C.OFFICE1_EMAIL_ID                     AS EMAIL,
    C.OFFICE1_ADDRESS1                     AS ADDRESS,
    C.OFFICE1_CITY                         AS CITY,
    C.OFFICE1_STATE                        AS STATE,
    CONVERT(DATE, C.First_Visit)           AS FIRST_VISIT,
    CONVERT(DATE, C.Last_Visit)            AS LAST_VISIT,
    ISNULL(C.No_of_Visits, 0)             AS NO_OF_VISITS,
    ISNULL(C.Avg_Bill_Amount, 0)           AS AVG_BILL_AMOUNT,
    ISNULL(C.IsCredit_Customer, 0)         AS IS_CREDIT_CUSTOMER,
    ISNULL(C.Credit_Limit, 0)             AS CREDIT_LIMIT,
    ISNULL(C.Credit_Transactions_Value, 0) AS CREDIT_USED,
    ISNULL(C.Credit_Payment_Received, 0)  AS CREDIT_PAID
FROM dbo.CUSTOMER_MST C
GO

-- ============================================================
-- 6. CUSTOMER SALES LEDGER VIEW
-- ============================================================
IF OBJECT_ID('dbo.VW_RPT_CUSTOMER_LEDGER', 'V') IS NOT NULL DROP VIEW dbo.VW_RPT_CUSTOMER_LEDGER
GO
CREATE VIEW dbo.VW_RPT_CUSTOMER_LEDGER AS
SELECT
    H.CUSTOMER_CODE,
    CM.CUSTOMER_NAME,
    CM.OFFICE1_PHONE                        AS MOBILE,
    H.SH_DEPT_CODE                          AS DEPT_CODE,
    H.BILL_NO,
    CONVERT(DATE, H.BILL_DATE)             AS BILL_DATE,
    ISNULL(H.GRAND_TOTAL, 0)              AS BILL_AMOUNT,
    ISNULL(H.DISC_AMOUNT, 0)              AS DISCOUNT,
    ISNULL(H.RedeemAmt, 0)                AS REDEEM_AMOUNT,
    PM.PayMode                              AS PAYMENT_MODE,
    ISNULL(P.PAY_AMOUNT, 0)              AS PAID_AMOUNT,
    ISNULL(H.BALANCE_AMOUNT, 0)          AS BALANCE,
    'SALE'                                  AS TXN_TYPE
FROM dbo.SALES_HDR H
INNER JOIN dbo.CUSTOMER_MST CM ON H.CUSTOMER_CODE = CM.CUSTOMER_CODE
LEFT  JOIN dbo.SALES_PAYMENT_DTL P ON H.BILL_NO = P.BILL_NO AND H.SH_DEPT_CODE = P.SPD_DEPT_CODE
LEFT  JOIN dbo.Payment_Mode PM ON P.PAY_CODE = PM.PayCode
WHERE ISNULL(H.ISCANCELLED, 0) = 0
  AND H.CUSTOMER_CODE IS NOT NULL
  AND H.CUSTOMER_CODE > 0
GO

-- ============================================================
-- 7. CUSTOMER LOYALTY POINTS LEDGER
-- ============================================================
IF OBJECT_ID('dbo.VW_RPT_LOYALTY_LEDGER', 'V') IS NOT NULL DROP VIEW dbo.VW_RPT_LOYALTY_LEDGER
GO
CREATE VIEW dbo.VW_RPT_LOYALTY_LEDGER AS
SELECT
    LP.CUSTOMER_CODE,
    CM.CUSTOMER_NAME,
    CM.OFFICE1_PHONE                       AS MOBILE,
    LP.TRANSACTION_NO,
    CONVERT(DATE, LP.TRANSACTION_DATE)    AS TXN_DATE,
    LP.TRANSACTION_TYPE                    AS TXN_TYPE,
    ISNULL(LP.POINTSCOLLECTED, 0)         AS POINTS_EARNED,
    ISNULL(LP.COLLECTEDVALUE, 0)          AS EARN_VALUE,
    ISNULL(LP.POINTSDEDUCTED, 0)         AS POINTS_REDEEMED,
    ISNULL(LP.DEDUCTEDVALUE, 0)          AS REDEEM_VALUE,
    ISNULL(LP.BillValue, 0)              AS BILL_VALUE,
    ISNULL(LP.SinglePointValue, 0)       AS POINT_VALUE,
    LP.CLP_DEPT_CODE                      AS DEPT_CODE
FROM dbo.CUST_LOYALTY_POINTS LP
LEFT JOIN dbo.CUSTOMER_MST CM ON LP.CUSTOMER_CODE = CM.CUSTOMER_CODE
GO

-- ============================================================
-- 8. PURCHASE (GRN) SUMMARY VIEW
-- ============================================================
IF OBJECT_ID('dbo.VW_RPT_PURCHASE_SUMMARY', 'V') IS NOT NULL DROP VIEW dbo.VW_RPT_PURCHASE_SUMMARY
GO
CREATE VIEW dbo.VW_RPT_PURCHASE_SUMMARY AS
SELECT
    H.GH_DEPT_CODE                         AS DEPT_CODE,
    H.GRN_NO,
    CONVERT(DATE, H.GRN_DATE)             AS GRN_DATE,
    DATEPART(YEAR,  H.GRN_DATE)           AS GRN_YEAR,
    DATEPART(MONTH, H.GRN_DATE)           AS GRN_MONTH,
    H.INVOICENO                            AS SUPPLIER_INVOICE_NO,
    CONVERT(DATE, H.INVOICE_DATE)         AS INVOICE_DATE,
    H.SUPPLIERCODE,
    S.SUPPLIER_NAME,
    S.OFFICE1_PHONE                        AS SUPPLIER_PHONE,
    ISNULL(H.SUBTOTAL, 0)                 AS SUBTOTAL,
    ISNULL(H.TOTALLINEDISCAMOUNT, 0)     AS TOTAL_DISCOUNT,
    ISNULL(H.TOTALTAXAMOUNT, 0)          AS TOTAL_TAX,
    ISNULL(H.GRANDTOTAL, 0)             AS GRAND_TOTAL,
    ISNULL(H.TOTALQTY, 0)               AS TOTAL_QTY,
    ISNULL(H.FRIEGHT, 0)                AS FREIGHT,
    ISNULL(H.OTHERCHARGES, 0)           AS OTHER_CHARGES,
    ISNULL(H.ISCANCELLED, 0)            AS IS_CANCELLED,
    H.REMARKS,
    H.AUTH_STATUS,
    H.PO_NO
FROM dbo.GRN_HDR H
LEFT JOIN dbo.SUPPLIER_MST S ON H.SUPPLIERCODE = S.SUPPLIER_CODE
WHERE ISNULL(H.ISCANCELLED, 0) = 0
GO

-- ============================================================
-- 9. PURCHASE DETAIL VIEW (Item-wise GRN)
-- ============================================================
IF OBJECT_ID('dbo.VW_RPT_PURCHASE_DETAIL', 'V') IS NOT NULL DROP VIEW dbo.VW_RPT_PURCHASE_DETAIL
GO
CREATE VIEW dbo.VW_RPT_PURCHASE_DETAIL AS
SELECT
    H.GH_DEPT_CODE                         AS DEPT_CODE,
    H.GRN_NO,
    CONVERT(DATE, H.GRN_DATE)             AS GRN_DATE,
    DATEPART(YEAR,  H.GRN_DATE)           AS GRN_YEAR,
    DATEPART(MONTH, H.GRN_DATE)           AS GRN_MONTH,
    H.SUPPLIERCODE,
    S.SUPPLIER_NAME,
    D.ITEM_CODE,
    I.ITEM_NAME,
    CAT.Category_Desc                      AS CATEGORY,
    BRD.Brand_Name                         AS BRAND,
    ISNULL(D.REC_QTY, 0)                 AS RECEIVED_QTY,
    ISNULL(D.FREE_QTY, 0)               AS FREE_QTY,
    ISNULL(D.BASIC_COST, 0)             AS BASIC_COST,
    ISNULL(D.CP, 0)                     AS COST_PRICE,
    ISNULL(D.SP, 0)                     AS SALE_PRICE,
    ISNULL(D.MRP, 0)                    AS MRP,
    ISNULL(D.AMOUNT, 0)                 AS AMOUNT,
    ISNULL(D.ITEM_DISC_AMOUNT, 0)       AS ITEM_DISC,
    ISNULL(D.BILL_DISC_AMOUNT, 0)       AS BILL_DISC,
    ISNULL(D.TAX_AMOUNT, 0)            AS TAX_AMOUNT,
    D.HSNSACCODE                         AS HSN_CODE,
    D.EANCODE                            AS EAN_CODE
FROM dbo.GRN_HDR H
INNER JOIN dbo.GRN_DTL D    ON H.GRN_NO = D.GRN_NO AND H.GH_DEPT_CODE = D.GD_DEPT_CODE
LEFT  JOIN dbo.SUPPLIER_MST S   ON H.SUPPLIERCODE = S.SUPPLIER_CODE
LEFT  JOIN dbo.ITEM_MST I       ON D.ITEM_CODE = I.ITEM_CODE
LEFT  JOIN dbo.Category_Mst CAT ON I.CATEGORY_CODE = CAT.Category_Code
LEFT  JOIN dbo.Brand_Master BRD ON I.BRAND_CODE = BRD.Brand_Code
WHERE ISNULL(H.ISCANCELLED, 0) = 0
GO

-- ============================================================
-- 10. PURCHASE RETURN VIEW
-- ============================================================
IF OBJECT_ID('dbo.VW_RPT_PURCHASE_RETURN', 'V') IS NOT NULL DROP VIEW dbo.VW_RPT_PURCHASE_RETURN
GO
CREATE VIEW dbo.VW_RPT_PURCHASE_RETURN AS
SELECT
    H.PH_DEPT_CODE                         AS DEPT_CODE,
    H.PRN_NO,
    CONVERT(DATE, H.PRN_DATE)             AS PRN_DATE,
    DATEPART(YEAR,  H.PRN_DATE)           AS PRN_YEAR,
    DATEPART(MONTH, H.PRN_DATE)           AS PRN_MONTH,
    H.SUPPLIERCODE,
    S.SUPPLIER_NAME,
    D.ITEM_CODE,
    I.ITEM_NAME,
    CAT.Category_Desc                      AS CATEGORY,
    ISNULL(D.RTN_QTY, 0)                 AS RETURN_QTY,
    ISNULL(D.CP, 0)                      AS COST_PRICE,
    ISNULL(D.MRP, 0)                     AS MRP,
    ISNULL(D.AMOUNT, 0)                  AS AMOUNT,
    ISNULL(D.TAX_AMOUNT, 0)             AS TAX_AMOUNT,
    ISNULL(H.GRANDTOTAL, 0)            AS GRAND_TOTAL,
    H.REMARKS,
    D.GRN_NO                              AS AGAINST_GRN
FROM dbo.PRN_HDR H
INNER JOIN dbo.PRN_DTL D     ON H.PRN_NO = D.PRN_NO AND H.PH_DEPT_CODE = D.PD_DEPT_CODE
LEFT  JOIN dbo.SUPPLIER_MST S   ON H.SUPPLIERCODE = S.SUPPLIER_CODE
LEFT  JOIN dbo.ITEM_MST I       ON D.ITEM_CODE = I.ITEM_CODE
LEFT  JOIN dbo.Category_Mst CAT ON I.CATEGORY_CODE = CAT.Category_Code
GO

-- ============================================================
-- 11. STOCK TRANSFER VIEW (MTN)
-- ============================================================
IF OBJECT_ID('dbo.VW_RPT_STOCK_TRANSFER', 'V') IS NOT NULL DROP VIEW dbo.VW_RPT_STOCK_TRANSFER
GO
CREATE VIEW dbo.VW_RPT_STOCK_TRANSFER AS
SELECT
    H.MH_DEPT_CODE                         AS DEPT_CODE,
    H.MTN_NO,
    CONVERT(DATE, H.MTN_DATE)             AS TRANSFER_DATE,
    DATEPART(YEAR,  H.MTN_DATE)           AS TRANSFER_YEAR,
    DATEPART(MONTH, H.MTN_DATE)           AS TRANSFER_MONTH,
    H.MTN_TYPE,
    CASE H.MTN_TYPE WHEN 'O' THEN 'Transfer Out' WHEN 'I' THEN 'Transfer In' ELSE H.MTN_TYPE END AS TRANSFER_TYPE,
    H.FROM_LOCATION,
    H.TO_LOCATION,
    D.ITEM_CODE,
    I.ITEM_NAME,
    CAT.Category_Desc                      AS CATEGORY,
    BRD.Brand_Name                         AS BRAND,
    ISNULL(D.QTY, 0)                      AS QTY,
    ISNULL(D.CP, 0)                       AS COST_PRICE,
    ISNULL(D.SP, 0)                       AS SALE_PRICE,
    ISNULL(D.MRP, 0)                      AS MRP,
    ISNULL(D.AMOUNT, 0)                  AS AMOUNT,
    H.VEHICLE_NO,
    H.REMARKS,
    H.AUTH_STATUS
FROM dbo.MTN_HDR H
INNER JOIN dbo.MTN_DTL D     ON H.MTN_NO = D.MTN_NO AND H.MH_DEPT_CODE = D.MD_DEPT_CODE
LEFT  JOIN dbo.ITEM_MST I       ON D.ITEM_CODE = I.ITEM_CODE
LEFT  JOIN dbo.Category_Mst CAT ON I.CATEGORY_CODE = CAT.Category_Code
LEFT  JOIN dbo.Brand_Master BRD ON I.BRAND_CODE = BRD.Brand_Code
GO

-- ============================================================
-- 12. INVENTORY / STOCK STATUS VIEW
-- ============================================================
IF OBJECT_ID('dbo.VW_RPT_STOCK_STATUS', 'V') IS NOT NULL DROP VIEW dbo.VW_RPT_STOCK_STATUS
GO
CREATE VIEW dbo.VW_RPT_STOCK_STATUS AS
SELECT
    I.ITEM_CODE,
    I.ITEM_NAME,
    I.EAN_CODE,
    CAT.Category_Desc                      AS CATEGORY,
    BRD.Brand_Name                         AS BRAND,
    S.SUPPLIER_NAME,
    ISNULL(I.QOH, 0)                      AS QTY_ON_HAND,
    ISNULL(I.REORDER_LVL, 0)             AS REORDER_LEVEL,
    ISNULL(I.MIN_STOCK_LVL, 0)          AS MIN_STOCK,
    ISNULL(I.MAX_STOCK_LVL, 0)          AS MAX_STOCK,
    ISNULL(I.CP, 0)                       AS COST_PRICE,
    ISNULL(I.MRP, 0)                      AS MRP,
    ISNULL(I.SP, 0)                       AS SALE_PRICE,
    ISNULL(I.WSP, 0)                      AS WHOLESALE_PRICE,
    ISNULL(I.QOH, 0) * ISNULL(I.CP, 0)  AS STOCK_VALUE_CP,
    ISNULL(I.QOH, 0) * ISNULL(I.MRP, 0) AS STOCK_VALUE_MRP,
    I.HSN_CODE,
    I.PUR_UOM                              AS PURCHASE_UOM,
    I.CONS_UOM                             AS SALE_UOM,
    ISNULL(I.Discontinue, 0)             AS IS_DISCONTINUED,
    ISNULL(I.ISNONSALEABLEITEM, 0)       AS IS_NON_SALEABLE,
    CASE 
        WHEN ISNULL(I.QOH, 0) <= 0 THEN 'OUT OF STOCK'
        WHEN ISNULL(I.QOH, 0) <= ISNULL(I.REORDER_LVL, 0) THEN 'REORDER REQUIRED'
        WHEN ISNULL(I.QOH, 0) <= ISNULL(I.MIN_STOCK_LVL, 0) THEN 'LOW STOCK'
        ELSE 'NORMAL'
    END AS STOCK_STATUS,
    I.EXP_DATE                            AS EXPIRY_DATE,
    CASE WHEN I.EXP_DATE IS NOT NULL AND I.EXP_DATE < GETDATE() THEN 'EXPIRED'
         WHEN I.EXP_DATE IS NOT NULL AND I.EXP_DATE < DATEADD(DAY,30,GETDATE()) THEN 'EXPIRING SOON'
         ELSE 'OK' END AS EXPIRY_STATUS
FROM dbo.ITEM_MST I
LEFT JOIN dbo.Category_Mst  CAT ON I.CATEGORY_CODE = CAT.Category_Code
LEFT JOIN dbo.Brand_Master  BRD ON I.BRAND_CODE = BRD.Brand_Code
LEFT JOIN dbo.SUPPLIER_MST  S   ON I.SUPPLIER_CODE = S.SUPPLIER_CODE
WHERE ISNULL(I.Discontinue, 0) = 0
GO

-- ============================================================
-- 13. ANALYTICS - DAILY SALES TREND
-- ============================================================
IF OBJECT_ID('dbo.VW_RPT_DAILY_TREND', 'V') IS NOT NULL DROP VIEW dbo.VW_RPT_DAILY_TREND
GO
CREATE VIEW dbo.VW_RPT_DAILY_TREND AS
SELECT
    SH_DEPT_CODE                                         AS DEPT_CODE,
    CONVERT(DATE, BILL_DATE)                             AS SALE_DATE,
    DATEPART(YEAR,  BILL_DATE)                          AS YEAR,
    DATEPART(MONTH, BILL_DATE)                          AS MONTH,
    DATENAME(MONTH, BILL_DATE)                          AS MONTH_NAME,
    DATEPART(DAY,   BILL_DATE)                          AS DAY,
    DATENAME(WEEKDAY, BILL_DATE)                        AS WEEKDAY,
    COUNT(BILL_NO)                                       AS BILL_COUNT,
    SUM(ISNULL(GRAND_TOTAL, 0))                        AS TOTAL_SALES,
    SUM(ISNULL(DISC_AMOUNT, 0))                        AS TOTAL_DISCOUNT,
    SUM(ISNULL(SUBTOTAL_AMOUNT, 0))                    AS SUBTOTAL,
    AVG(ISNULL(GRAND_TOTAL, 0))                        AS AVG_BILL_VALUE,
    MAX(ISNULL(GRAND_TOTAL, 0))                        AS MAX_BILL_VALUE,
    MIN(ISNULL(GRAND_TOTAL, 0))                        AS MIN_BILL_VALUE,
    SUM(ISNULL(RedeemAmt, 0))                         AS TOTAL_REDEEMED
FROM dbo.SALES_HDR
WHERE ISNULL(ISCANCELLED, 0) = 0
GROUP BY SH_DEPT_CODE, CONVERT(DATE, BILL_DATE),
         DATEPART(YEAR, BILL_DATE), DATEPART(MONTH, BILL_DATE),
         DATENAME(MONTH, BILL_DATE), DATEPART(DAY, BILL_DATE),
         DATENAME(WEEKDAY, BILL_DATE)
GO

-- ============================================================
-- 14. ANALYTICS - TOP SELLING ITEMS
-- ============================================================
IF OBJECT_ID('dbo.VW_RPT_TOP_ITEMS', 'V') IS NOT NULL DROP VIEW dbo.VW_RPT_TOP_ITEMS
GO
CREATE VIEW dbo.VW_RPT_TOP_ITEMS AS
SELECT
    D.SD_DEPT_CODE                                      AS DEPT_CODE,
    D.SERVICEORPRODUCTCODE                              AS ITEM_CODE,
    I.ITEM_NAME,
    CAT.Category_Desc                                   AS CATEGORY,
    BRD.Brand_Name                                      AS BRAND,
    COUNT(DISTINCT D.BILL_NO)                          AS BILL_COUNT,
    SUM(ISNULL(D.QTY, 0))                             AS TOTAL_QTY_SOLD,
    SUM(ISNULL(D.AMOUNT, 0))                          AS TOTAL_SALES,
    SUM(ISNULL(D.DISC_AMOUNT, 0))                    AS TOTAL_DISCOUNT,
    AVG(ISNULL(D.RATE, 0))                            AS AVG_RATE,
    SUM(ISNULL(D.AMOUNT,0) - ISNULL(D.ORG_CP,0)*ISNULL(D.QTY,0)) AS GROSS_PROFIT
FROM dbo.SALES_DTL D
INNER JOIN dbo.SALES_HDR H ON D.BILL_NO = H.BILL_NO AND D.SD_DEPT_CODE = H.SH_DEPT_CODE
LEFT  JOIN dbo.ITEM_MST I       ON D.SERVICEORPRODUCTCODE = I.ITEM_CODE
LEFT  JOIN dbo.Category_Mst CAT ON I.CATEGORY_CODE = CAT.Category_Code
LEFT  JOIN dbo.Brand_Master BRD ON I.BRAND_CODE = BRD.Brand_Code
WHERE ISNULL(H.ISCANCELLED, 0) = 0
  AND D.SALES_ITEM_TYPE = 'P'
GROUP BY D.SD_DEPT_CODE, D.SERVICEORPRODUCTCODE, I.ITEM_NAME, CAT.Category_Desc, BRD.Brand_Name
GO

-- ============================================================
-- 15. ANALYTICS - CATEGORY PERFORMANCE
-- ============================================================
IF OBJECT_ID('dbo.VW_RPT_CATEGORY_SALES', 'V') IS NOT NULL DROP VIEW dbo.VW_RPT_CATEGORY_SALES
GO
CREATE VIEW dbo.VW_RPT_CATEGORY_SALES AS
SELECT
    D.SD_DEPT_CODE                                      AS DEPT_CODE,
    DATEPART(YEAR,  H.BILL_DATE)                       AS YEAR,
    DATEPART(MONTH, H.BILL_DATE)                       AS MONTH,
    DATENAME(MONTH, H.BILL_DATE)                       AS MONTH_NAME,
    CAT.Category_Code,
    CAT.Category_Desc                                   AS CATEGORY,
    COUNT(DISTINCT H.BILL_NO)                          AS BILL_COUNT,
    SUM(ISNULL(D.QTY, 0))                             AS TOTAL_QTY,
    SUM(ISNULL(D.AMOUNT, 0))                          AS TOTAL_SALES,
    SUM(ISNULL(D.DISC_AMOUNT, 0))                    AS TOTAL_DISCOUNT,
    SUM(ISNULL(D.AMOUNT,0) - ISNULL(D.ORG_CP,0)*ISNULL(D.QTY,0)) AS GROSS_PROFIT
FROM dbo.SALES_DTL D
INNER JOIN dbo.SALES_HDR H      ON D.BILL_NO = H.BILL_NO AND D.SD_DEPT_CODE = H.SH_DEPT_CODE
LEFT  JOIN dbo.ITEM_MST I       ON D.SERVICEORPRODUCTCODE = I.ITEM_CODE
LEFT  JOIN dbo.Category_Mst CAT ON I.CATEGORY_CODE = CAT.Category_Code
WHERE ISNULL(H.ISCANCELLED, 0) = 0
  AND D.SALES_ITEM_TYPE = 'P'
GROUP BY D.SD_DEPT_CODE, DATEPART(YEAR, H.BILL_DATE), DATEPART(MONTH, H.BILL_DATE),
         DATENAME(MONTH, H.BILL_DATE), CAT.Category_Code, CAT.Category_Desc
GO

-- ============================================================
-- 16. SUPPLIER PERFORMANCE VIEW
-- ============================================================
IF OBJECT_ID('dbo.VW_RPT_SUPPLIER_PERFORMANCE', 'V') IS NOT NULL DROP VIEW dbo.VW_RPT_SUPPLIER_PERFORMANCE
GO
CREATE VIEW dbo.VW_RPT_SUPPLIER_PERFORMANCE AS
SELECT
    S.SUPPLIER_CODE,
    S.SUPPLIER_NAME,
    S.OFFICE1_PHONE                                     AS PHONE,
    S.OFFICE1_EMAIL_ID                                  AS EMAIL,
    DATEPART(YEAR,  H.GRN_DATE)                        AS YEAR,
    DATEPART(MONTH, H.GRN_DATE)                        AS MONTH,
    DATENAME(MONTH, H.GRN_DATE)                        AS MONTH_NAME,
    COUNT(DISTINCT H.GRN_NO)                           AS TOTAL_GRNS,
    SUM(ISNULL(H.TOTALQTY, 0))                        AS TOTAL_QTY,
    SUM(ISNULL(H.GRANDTOTAL, 0))                     AS TOTAL_PURCHASE_VALUE,
    SUM(ISNULL(H.TOTALLINEDISCAMOUNT, 0))            AS TOTAL_DISCOUNT,
    COUNT(DISTINCT PR.PRN_NO)                          AS TOTAL_RETURNS,
    ISNULL(SUM(PR.GRANDTOTAL), 0)                    AS TOTAL_RETURN_VALUE
FROM dbo.SUPPLIER_MST S
LEFT JOIN dbo.GRN_HDR H  ON S.SUPPLIER_CODE = H.SUPPLIERCODE AND ISNULL(H.ISCANCELLED,0)=0
LEFT JOIN dbo.PRN_HDR PR ON S.SUPPLIER_CODE = PR.SUPPLIERCODE
GROUP BY S.SUPPLIER_CODE, S.SUPPLIER_NAME, S.OFFICE1_PHONE, S.OFFICE1_EMAIL_ID,
         DATEPART(YEAR, H.GRN_DATE), DATEPART(MONTH, H.GRN_DATE), DATENAME(MONTH, H.GRN_DATE)
GO

PRINT 'All 16 Report Views Created Successfully!'
GO
