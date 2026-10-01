USE [RetailWizard]
GO

-- ============================================================
--  FMCG REPORTING TOOL - ALL SQL VIEWS
--  Database: RetailWizard (SQL Server)
--  Created for: RetailWizard FMCG Reporting Tool
-- ============================================================


-- ============================================================
--  1. SALES REPORTS
-- ============================================================

-- 1.1 Daily Sales Summary
IF OBJECT_ID('dbo.vw_RPT_DailySalesSummary', 'V') IS NOT NULL DROP VIEW dbo.vw_RPT_DailySalesSummary;
GO
CREATE VIEW dbo.vw_RPT_DailySalesSummary AS
SELECT
    CAST(h.BILL_DATE AS DATE)           AS Bill_Date,
    h.SH_DEPT_CODE                      AS Dept_Code,
    COUNT(DISTINCT h.BILL_NO)           AS Total_Bills,
    SUM(h.GRAND_TOTAL)                  AS Gross_Sales,
    SUM(h.DISC_AMOUNT)                  AS Total_Discount,
    SUM(h.GRAND_TOTAL - ISNULL(h.DISC_AMOUNT,0)) AS Net_Sales,
    SUM(h.SALES_TAX_AMOUNT)             AS Tax_Amount,
    COUNT(DISTINCT h.CUSTOMER_CODE)     AS Unique_Customers,
    SUM(h.RedeemAmt)                    AS Loyalty_Redeemed
FROM SALES_HDR h
WHERE h.ISCANCELLED = 0
GROUP BY CAST(h.BILL_DATE AS DATE), h.SH_DEPT_CODE;
GO

-- 1.2 Bill-Wise Sales Detail
IF OBJECT_ID('dbo.vw_RPT_BillWiseSalesDetail', 'V') IS NOT NULL DROP VIEW dbo.vw_RPT_BillWiseSalesDetail;
GO
CREATE VIEW dbo.vw_RPT_BillWiseSalesDetail AS
SELECT
    h.BILL_NO,
    h.BILL_DATE,
    h.GSTBILLNO,
    h.SH_DEPT_CODE                      AS Dept_Code,
    h.CUSTOMER_CODE,
    h.CUSTOMER                          AS Customer_Name,
    cm.MobileNo                         AS Mobile,
    h.SUBTOTAL_AMOUNT,
    h.DISC_AMOUNT,
    h.SALES_TAX_AMOUNT,
    h.GRAND_TOTAL,
    h.TENDERED_AMOUNT,
    h.CHANGE,
    h.BALANCE_AMOUNT,
    h.RedeemAmt                         AS Loyalty_Redeemed,
    h.RoundOffBillAmount,
    h.INVOICE_TPE                       AS Invoice_Type,
    h.POSID,
    h.ISCANCELLED,
    mu.UserName                         AS Billed_By
FROM SALES_HDR h
LEFT JOIN CUSTOMER_MST cm  ON h.CUSTOMER_CODE = cm.CUSTOMER_CODE
LEFT JOIN Master_User  mu  ON h.ENT_USERID     = mu.UserID;
GO

-- 1.3 Item-Wise Sales Detail
IF OBJECT_ID('dbo.vw_RPT_ItemWiseSalesDetail', 'V') IS NOT NULL DROP VIEW dbo.vw_RPT_ItemWiseSalesDetail;
GO
CREATE VIEW dbo.vw_RPT_ItemWiseSalesDetail AS
SELECT
    h.BILL_NO,
    CAST(h.BILL_DATE AS DATE)           AS Bill_Date,
    h.SH_DEPT_CODE                      AS Dept_Code,
    h.CUSTOMER,
    d.Sno,
    d.SERVICEORPRODUCTCODE              AS Item_Code,
    im.ITEM_NAME,
    im.EAN_CODE,
    cat.CategoryName,
    br.BrandName,
    d.QTY,
    d.RATE,
    d.ITM_MRP                           AS MRP,
    d.DISC_AMOUNT,
    d.Line_Disc_per                     AS Disc_Pct,
    d.AMOUNT,
    d.TAX_PERCENT,
    d.TAX_AMOUNT,
    d.TOTAL,
    d.ORG_CP                            AS Cost_Price,
    (d.AMOUNT - ISNULL(d.ORG_CP,0)*d.QTY) AS Gross_Profit,
    em.EMP_NAME                         AS Salesman,
    h.ISCANCELLED
FROM SALES_HDR h
INNER JOIN SALES_DTL d ON h.BILL_NO = d.BILL_NO
LEFT JOIN  ITEM_MST  im  ON d.SERVICEORPRODUCTCODE = im.ITEM_CODE
LEFT JOIN  Category_Mst  cat ON im.CATEGORY_CODE = cat.CategoryCode
LEFT JOIN  Brand_Master  br  ON im.BRAND_CODE    = br.BrandCode
LEFT JOIN  EMPLOYEE_MST  em  ON d.EMP_CODE       = em.EMP_CODE
WHERE h.ISCANCELLED = 0;
GO

-- 1.4 Payment Mode Wise Sales
IF OBJECT_ID('dbo.vw_RPT_PaymentModeSales', 'V') IS NOT NULL DROP VIEW dbo.vw_RPT_PaymentModeSales;
GO
CREATE VIEW dbo.vw_RPT_PaymentModeSales AS
SELECT
    CAST(h.BILL_DATE AS DATE)           AS Bill_Date,
    h.SH_DEPT_CODE                      AS Dept_Code,
    pm.PayMode                          AS Payment_Mode,
    COUNT(DISTINCT p.BILL_NO)           AS Bill_Count,
    SUM(p.PAY_AMOUNT)                   AS Total_Amount
FROM SALES_PAYMENT_DTL p
INNER JOIN SALES_HDR h   ON p.BILL_NO  = h.BILL_NO
INNER JOIN Payment_Mode pm ON p.PAY_CODE = pm.PayCode
WHERE h.ISCANCELLED = 0
GROUP BY CAST(h.BILL_DATE AS DATE), h.SH_DEPT_CODE, pm.PayMode;
GO

-- 1.5 Category-Wise Sales Summary
IF OBJECT_ID('dbo.vw_RPT_CategoryWiseSales', 'V') IS NOT NULL DROP VIEW dbo.vw_RPT_CategoryWiseSales;
GO
CREATE VIEW dbo.vw_RPT_CategoryWiseSales AS
SELECT
    CAST(h.BILL_DATE AS DATE)           AS Bill_Date,
    h.SH_DEPT_CODE                      AS Dept_Code,
    cat.CategoryName,
    sub.SubCategoryName,
    br.BrandName,
    SUM(d.QTY)                          AS Total_Qty,
    SUM(d.AMOUNT)                       AS Gross_Amount,
    SUM(d.DISC_AMOUNT)                  AS Disc_Amount,
    SUM(d.TOTAL)                        AS Net_Amount,
    SUM(d.TAX_AMOUNT)                   AS Tax_Amount
FROM SALES_HDR h
INNER JOIN SALES_DTL d      ON h.BILL_NO       = d.BILL_NO
LEFT JOIN  ITEM_MST  im     ON d.SERVICEORPRODUCTCODE = im.ITEM_CODE
LEFT JOIN  Category_Mst cat ON im.CATEGORY_CODE = cat.CategoryCode
LEFT JOIN  SubCategory_Mst sub ON im.SubCategory_Code = sub.SubCategoryCode
LEFT JOIN  Brand_Master br  ON im.BRAND_CODE   = br.BrandCode
WHERE h.ISCANCELLED = 0
GROUP BY CAST(h.BILL_DATE AS DATE), h.SH_DEPT_CODE, cat.CategoryName, sub.SubCategoryName, br.BrandName;
GO

-- 1.6 Top Selling Items
IF OBJECT_ID('dbo.vw_RPT_TopSellingItems', 'V') IS NOT NULL DROP VIEW dbo.vw_RPT_TopSellingItems;
GO
CREATE VIEW dbo.vw_RPT_TopSellingItems AS
SELECT
    d.SERVICEORPRODUCTCODE              AS Item_Code,
    im.ITEM_NAME,
    im.EAN_CODE,
    cat.CategoryName,
    br.BrandName,
    SUM(d.QTY)                          AS Total_Qty_Sold,
    SUM(d.AMOUNT)                       AS Total_Sales,
    SUM(d.DISC_AMOUNT)                  AS Total_Discount,
    SUM(d.TAX_AMOUNT)                   AS Total_Tax,
    SUM(d.TOTAL)                        AS Net_Revenue,
    SUM(d.ORG_CP * d.QTY)              AS Total_Cost,
    SUM(d.TOTAL - ISNULL(d.ORG_CP,0)*d.QTY) AS Gross_Profit,
    COUNT(DISTINCT h.BILL_NO)           AS No_Of_Bills
FROM SALES_DTL d
INNER JOIN SALES_HDR h    ON d.BILL_NO = h.BILL_NO
LEFT JOIN  ITEM_MST im    ON d.SERVICEORPRODUCTCODE = im.ITEM_CODE
LEFT JOIN  Category_Mst cat ON im.CATEGORY_CODE = cat.CategoryCode
LEFT JOIN  Brand_Master br  ON im.BRAND_CODE    = br.BrandCode
WHERE h.ISCANCELLED = 0
GROUP BY d.SERVICEORPRODUCTCODE, im.ITEM_NAME, im.EAN_CODE, cat.CategoryName, br.BrandName;
GO

-- 1.7 Hourly Sales Analysis
IF OBJECT_ID('dbo.vw_RPT_HourlySales', 'V') IS NOT NULL DROP VIEW dbo.vw_RPT_HourlySales;
GO
CREATE VIEW dbo.vw_RPT_HourlySales AS
SELECT
    CAST(h.BILL_DATE AS DATE)           AS Bill_Date,
    DATEPART(HOUR, h.BILL_DATE)         AS Hour_Of_Day,
    h.SH_DEPT_CODE                      AS Dept_Code,
    COUNT(DISTINCT h.BILL_NO)           AS Bill_Count,
    SUM(h.GRAND_TOTAL)                  AS Total_Sales,
    AVG(h.GRAND_TOTAL)                  AS Avg_Bill_Value
FROM SALES_HDR h
WHERE h.ISCANCELLED = 0
GROUP BY CAST(h.BILL_DATE AS DATE), DATEPART(HOUR, h.BILL_DATE), h.SH_DEPT_CODE;
GO

-- 1.8 Salesman-Wise Sales
IF OBJECT_ID('dbo.vw_RPT_SalesmanWiseSales', 'V') IS NOT NULL DROP VIEW dbo.vw_RPT_SalesmanWiseSales;
GO
CREATE VIEW dbo.vw_RPT_SalesmanWiseSales AS
SELECT
    CAST(h.BILL_DATE AS DATE)           AS Bill_Date,
    d.EMP_CODE,
    em.EMP_NAME                         AS Salesman_Name,
    h.SH_DEPT_CODE                      AS Dept_Code,
    COUNT(DISTINCT h.BILL_NO)           AS Bill_Count,
    SUM(d.QTY)                          AS Total_Qty,
    SUM(d.AMOUNT)                       AS Gross_Sales,
    SUM(d.DISC_AMOUNT)                  AS Total_Discount,
    SUM(d.TOTAL)                        AS Net_Sales
FROM SALES_DTL d
INNER JOIN SALES_HDR h   ON d.BILL_NO   = h.BILL_NO
LEFT JOIN  EMPLOYEE_MST em ON d.EMP_CODE = em.EMP_CODE
WHERE h.ISCANCELLED = 0
GROUP BY CAST(h.BILL_DATE AS DATE), d.EMP_CODE, em.EMP_NAME, h.SH_DEPT_CODE;
GO

-- 1.9 Cancelled Bills
IF OBJECT_ID('dbo.vw_RPT_CancelledBills', 'V') IS NOT NULL DROP VIEW dbo.vw_RPT_CancelledBills;
GO
CREATE VIEW dbo.vw_RPT_CancelledBills AS
SELECT
    h.BILL_NO,
    h.BILL_DATE,
    h.SH_DEPT_CODE                      AS Dept_Code,
    h.CUSTOMER,
    h.GRAND_TOTAL,
    h.CANCELLED_DATE,
    h.REASON_FOR_CANCELLATION,
    mu.UserName                         AS Cancelled_By
FROM SALES_HDR h
LEFT JOIN Master_User mu ON h.CANCELLEDBY = mu.UserID
WHERE h.ISCANCELLED = 1;
GO

-- 1.10 GST Sales Register
IF OBJECT_ID('dbo.vw_RPT_GSTSalesRegister', 'V') IS NOT NULL DROP VIEW dbo.vw_RPT_GSTSalesRegister;
GO
CREATE VIEW dbo.vw_RPT_GSTSalesRegister AS
SELECT
    h.BILL_NO,
    h.GSTBILLNO,
    CAST(h.BILL_DATE AS DATE)           AS Bill_Date,
    h.CUSTOMER,
    cm.GSTIN_NO                         AS Customer_GSTIN,
    h.SH_DEPT_CODE                      AS Dept_Code,
    d.SERVICEORPRODUCTCODE              AS Item_Code,
    im.ITEM_NAME,
    im.HSN_CODE,
    d.QTY,
    d.RATE,
    d.AMOUNT                            AS Taxable_Amount,
    d.TAX_PERCENT                       AS Tax_Pct,
    d.TAX_AMOUNT,
    d.CESS_PERCENT,
    d.CESS_AMOUNT,
    d.TOTAL                             AS Total_Amount
FROM SALES_HDR h
INNER JOIN SALES_DTL d    ON h.BILL_NO = d.BILL_NO
LEFT JOIN  ITEM_MST im    ON d.SERVICEORPRODUCTCODE = im.ITEM_CODE
LEFT JOIN  CUSTOMER_MST cm ON h.CUSTOMER_CODE = cm.CUSTOMER_CODE
WHERE h.ISCANCELLED = 0;
GO


-- ============================================================
--  2. SALES RETURN / REFUND REPORTS
-- ============================================================

-- 2.1 Sales Return Summary
IF OBJECT_ID('dbo.vw_RPT_SalesReturnSummary', 'V') IS NOT NULL DROP VIEW dbo.vw_RPT_SalesReturnSummary;
GO
CREATE VIEW dbo.vw_RPT_SalesReturnSummary AS
SELECT
    CAST(r.BILL_RTN_DATE AS DATE)       AS Return_Date,
    r.SRH_DEPT_CODE                     AS Dept_Code,
    r.BILL_RTN_NO,
    r.AGAINST_BILL_NO,
    h.BILL_DATE                         AS Original_Bill_Date,
    r.GRAND_TOTAL                       AS Return_Amount,
    r.DISC_AMOUNT,
    r.REASON_FOR_REFUND,
    pm.PayMode                          AS Refund_Mode,
    rp.PAY_AMOUNT                       AS Refund_Amount
FROM SALES_RETURN_HDR r
LEFT JOIN SALES_HDR h              ON r.AGAINST_BILL_NO = h.BILL_NO
LEFT JOIN SALES_RTN_PAYMENT_DTL rp ON r.BILL_RTN_NO    = rp.BILL_RTN_NO
LEFT JOIN Payment_Mode pm          ON rp.PAY_CODE       = pm.PayCode;
GO

-- 2.2 Sales Return Detail (Item Level)
IF OBJECT_ID('dbo.vw_RPT_SalesReturnDetail', 'V') IS NOT NULL DROP VIEW dbo.vw_RPT_SalesReturnDetail;
GO
CREATE VIEW dbo.vw_RPT_SalesReturnDetail AS
SELECT
    r.BILL_RTN_NO,
    CAST(r.BILL_RTN_DATE AS DATE)       AS Return_Date,
    r.AGAINST_BILL_NO,
    r.SRH_DEPT_CODE                     AS Dept_Code,
    d.SERVICEORPRODUCTCODE              AS Item_Code,
    im.ITEM_NAME,
    im.EAN_CODE,
    d.QTY                               AS Return_Qty,
    d.RATE,
    d.AMOUNT,
    d.DISC_AMOUNT,
    d.TOTAL,
    r.REASON_FOR_REFUND
FROM SALES_RETURN_HDR r
INNER JOIN SALES_RETURN_DTL d ON r.BILL_RTN_NO = d.BILL_RTN_NO
LEFT JOIN  ITEM_MST im        ON d.SERVICEORPRODUCTCODE = im.ITEM_CODE;
GO


-- ============================================================
--  3. CUSTOMER REPORTS
-- ============================================================

-- 3.1 Customer Master List
IF OBJECT_ID('dbo.vw_RPT_CustomerMaster', 'V') IS NOT NULL DROP VIEW dbo.vw_RPT_CustomerMaster;
GO
CREATE VIEW dbo.vw_RPT_CustomerMaster AS
SELECT
    cm.CUSTOMER_CODE,
    cm.CUSTOMER_NAME,
    cm.GENDER,
    cm.MobileNo,
    cm.OFFICE1_EMAIL_ID                 AS Email,
    cm.DATEOFBIRTH,
    cm.CARD_TYPE,
    cm.CARD_NUMBER,
    cm.CARD_EXPIRY_DATE,
    cm.VIP_CUSTOMER,
    cm.First_Visit,
    cm.Last_Visit,
    cm.No_of_Visits,
    cm.NO_OF_TRANSACTIONS,
    cm.TRANSACTION_VALUE,
    cm.Avg_Bill_Amount,
    cm.TOTAL_POINTS,
    cm.POINTS_REDEEM,
    cm.BALANCE_POINTS,
    cm.IsCredit_Customer,
    cm.Credit_Limit,
    cm.Credit_Balance,
    cm.GSTIN_NO,
    cm.isactive                         AS Is_Active,
    cm.OFFICE1_CITY                     AS City,
    cm.OFFICE1_STATE                    AS State
FROM CUSTOMER_MST cm;
GO

-- 3.2 Customer Purchase History
IF OBJECT_ID('dbo.vw_RPT_CustomerPurchaseHistory', 'V') IS NOT NULL DROP VIEW dbo.vw_RPT_CustomerPurchaseHistory;
GO
CREATE VIEW dbo.vw_RPT_CustomerPurchaseHistory AS
SELECT
    h.CUSTOMER_CODE,
    cm.CUSTOMER_NAME,
    cm.MobileNo,
    h.BILL_NO,
    CAST(h.BILL_DATE AS DATE)           AS Bill_Date,
    h.SH_DEPT_CODE                      AS Dept_Code,
    h.SUBTOTAL_AMOUNT,
    h.DISC_AMOUNT,
    h.GRAND_TOTAL,
    h.RedeemAmt                         AS Points_Redeemed_Amt,
    pm.PayMode                          AS Payment_Mode
FROM SALES_HDR h
INNER JOIN CUSTOMER_MST cm         ON h.CUSTOMER_CODE = cm.CUSTOMER_CODE
LEFT JOIN  SALES_PAYMENT_DTL spd   ON h.BILL_NO       = spd.BILL_NO
LEFT JOIN  Payment_Mode pm         ON spd.PAY_CODE     = pm.PayCode
WHERE h.ISCANCELLED = 0;
GO

-- 3.3 Customer Loyalty Points Ledger
IF OBJECT_ID('dbo.vw_RPT_LoyaltyPointsLedger', 'V') IS NOT NULL DROP VIEW dbo.vw_RPT_LoyaltyPointsLedger;
GO
CREATE VIEW dbo.vw_RPT_LoyaltyPointsLedger AS
SELECT
    lp.TRANSACTION_NO,
    CAST(lp.TRANSACTION_DATE AS DATE)   AS Trans_Date,
    lp.TRANSACTION_TYPE,
    lp.CUSTOMER_CODE,
    cm.CUSTOMER_NAME,
    cm.MobileNo,
    lp.POINTSCOLLECTED,
    lp.COLLECTEDVALUE,
    lp.POINTSDEDUCTED,
    lp.DEDUCTEDVALUE,
    lp.SinglePointValue,
    lp.BillValue,
    lp.CLP_DEPT_CODE                    AS Dept_Code,
    cm.BALANCE_POINTS
FROM CUST_LOYALTY_POINTS lp
LEFT JOIN CUSTOMER_MST cm ON lp.CUSTOMER_CODE = cm.CUSTOMER_CODE;
GO

-- 3.4 Top Customers by Sales
IF OBJECT_ID('dbo.vw_RPT_TopCustomers', 'V') IS NOT NULL DROP VIEW dbo.vw_RPT_TopCustomers;
GO
CREATE VIEW dbo.vw_RPT_TopCustomers AS
SELECT
    h.CUSTOMER_CODE,
    cm.CUSTOMER_NAME,
    cm.MobileNo,
    cm.CARD_TYPE,
    cm.VIP_CUSTOMER,
    cm.BALANCE_POINTS,
    COUNT(DISTINCT h.BILL_NO)           AS Total_Visits,
    SUM(h.GRAND_TOTAL)                  AS Total_Spent,
    AVG(h.GRAND_TOTAL)                  AS Avg_Bill,
    MAX(CAST(h.BILL_DATE AS DATE))      AS Last_Visit,
    MIN(CAST(h.BILL_DATE AS DATE))      AS First_Visit
FROM SALES_HDR h
INNER JOIN CUSTOMER_MST cm ON h.CUSTOMER_CODE = cm.CUSTOMER_CODE
WHERE h.ISCANCELLED = 0
  AND h.CUSTOMER_CODE IS NOT NULL
GROUP BY h.CUSTOMER_CODE, cm.CUSTOMER_NAME, cm.MobileNo, cm.CARD_TYPE, cm.VIP_CUSTOMER, cm.BALANCE_POINTS;
GO

-- 3.5 Customer Credit Ledger
IF OBJECT_ID('dbo.vw_RPT_CustomerCreditLedger', 'V') IS NOT NULL DROP VIEW dbo.vw_RPT_CustomerCreditLedger;
GO
CREATE VIEW dbo.vw_RPT_CustomerCreditLedger AS
SELECT
    cm.CUSTOMER_CODE,
    cm.CUSTOMER_NAME,
    cm.MobileNo,
    cm.IsCredit_Customer,
    cm.Credit_Limit,
    cm.CREDIT_OPENING,
    cm.Credit_Transactions_Value,
    cm.Credit_Payment_Received,
    cm.Credit_Balance,
    cm.isactive                         AS Is_Active
FROM CUSTOMER_MST cm
WHERE cm.IsCredit_Customer = 1;
GO

-- 3.6 Dormant / Inactive Customers
IF OBJECT_ID('dbo.vw_RPT_DormantCustomers', 'V') IS NOT NULL DROP VIEW dbo.vw_RPT_DormantCustomers;
GO
CREATE VIEW dbo.vw_RPT_DormantCustomers AS
SELECT
    cm.CUSTOMER_CODE,
    cm.CUSTOMER_NAME,
    cm.MobileNo,
    cm.OFFICE1_EMAIL_ID                 AS Email,
    cm.Last_Visit,
    cm.No_of_Visits,
    cm.TRANSACTION_VALUE,
    cm.BALANCE_POINTS,
    DATEDIFF(DAY, cm.Last_Visit, GETDATE()) AS Days_Since_Last_Visit
FROM CUSTOMER_MST cm
WHERE cm.isactive = 1
  AND (cm.Last_Visit IS NULL OR DATEDIFF(DAY, cm.Last_Visit, GETDATE()) > 90);
GO


-- ============================================================
--  4. PURCHASE (GRN) REPORTS
-- ============================================================

-- 4.1 GRN Summary
IF OBJECT_ID('dbo.vw_RPT_GRNSummary', 'V') IS NOT NULL DROP VIEW dbo.vw_RPT_GRNSummary;
GO
CREATE VIEW dbo.vw_RPT_GRNSummary AS
SELECT
    g.GRN_NO,
    CAST(g.GRN_DATE AS DATE)            AS GRN_Date,
    g.GH_DEPT_CODE                      AS Dept_Code,
    g.INVOICENO                         AS Supplier_Invoice,
    g.INVOICE_DATE,
    g.SUPPLIERCODE,
    s.SUPPLIER_NAME,
    s.MobileNo                          AS Supplier_Mobile,
    g.TOTALQTY,
    g.SUBTOTAL,
    g.TOTALLINEDISCAMOUNT               AS Total_Disc,
    g.TOTALTAXAMOUNT,
    g.WHOLEDISCAMOUNT,
    g.GRANDTOTAL,
    g.ISCANCELLED,
    g.REMARKS,
    g.AUTH_STATUS,
    mu.UserName                         AS Created_By
FROM GRN_HDR g
LEFT JOIN SUPPLIER_MST s ON g.SUPPLIERCODE = s.SUPPLIER_CODE
LEFT JOIN Master_User mu ON g.ENT_USERID   = mu.UserID;
GO

-- 4.2 GRN Item Detail
IF OBJECT_ID('dbo.vw_RPT_GRNItemDetail', 'V') IS NOT NULL DROP VIEW dbo.vw_RPT_GRNItemDetail;
GO
CREATE VIEW dbo.vw_RPT_GRNItemDetail AS
SELECT
    g.GRN_NO,
    CAST(g.GRN_DATE AS DATE)            AS GRN_Date,
    g.GH_DEPT_CODE                      AS Dept_Code,
    g.SUPPLIERCODE,
    s.SUPPLIER_NAME,
    g.INVOICENO,
    d.ITEM_CODE,
    im.ITEM_NAME,
    im.EAN_CODE,
    cat.CategoryName,
    br.BrandName,
    d.REC_QTY,
    d.FREE_QTY,
    d.BASIC_COST,
    d.CP                                AS Cost_Price,
    d.SP                                AS Sale_Price,
    d.MRP,
    d.ITEM_DISC_PER,
    d.ITEM_DISC_AMOUNT,
    d.TAX_PERCENT,
    d.TAX_AMOUNT,
    d.AMOUNT,
    d.STOCK_QTY
FROM GRN_HDR g
INNER JOIN GRN_DTL d      ON g.GRN_NO         = d.GRN_NO
LEFT JOIN  SUPPLIER_MST s ON g.SUPPLIERCODE    = s.SUPPLIER_CODE
LEFT JOIN  ITEM_MST im    ON d.ITEM_CODE       = im.ITEM_CODE
LEFT JOIN  Category_Mst cat ON im.CATEGORY_CODE = cat.CategoryCode
LEFT JOIN  Brand_Master br  ON im.BRAND_CODE   = br.BrandCode
WHERE g.ISCANCELLED = 0;
GO

-- 4.3 Supplier-Wise Purchase Summary
IF OBJECT_ID('dbo.vw_RPT_SupplierWisePurchase', 'V') IS NOT NULL DROP VIEW dbo.vw_RPT_SupplierWisePurchase;
GO
CREATE VIEW dbo.vw_RPT_SupplierWisePurchase AS
SELECT
    g.SUPPLIERCODE,
    s.SUPPLIER_NAME,
    s.MobileNo,
    s.GSTIN_NO,
    COUNT(DISTINCT g.GRN_NO)            AS Total_GRNs,
    SUM(d.REC_QTY)                      AS Total_Qty,
    SUM(d.AMOUNT)                       AS Total_Purchase_Value,
    SUM(d.TAX_AMOUNT)                   AS Total_Tax,
    SUM(g.GRANDTOTAL)                   AS Net_Purchase_Value,
    MAX(CAST(g.GRN_DATE AS DATE))       AS Last_Purchase_Date
FROM GRN_HDR g
INNER JOIN GRN_DTL d      ON g.GRN_NO      = d.GRN_NO
LEFT JOIN  SUPPLIER_MST s ON g.SUPPLIERCODE = s.SUPPLIER_CODE
WHERE g.ISCANCELLED = 0
GROUP BY g.SUPPLIERCODE, s.SUPPLIER_NAME, s.MobileNo, s.GSTIN_NO;
GO

-- 4.4 Purchase Return (PRN) Summary
IF OBJECT_ID('dbo.vw_RPT_PurchaseReturnSummary', 'V') IS NOT NULL DROP VIEW dbo.vw_RPT_PurchaseReturnSummary;
GO
CREATE VIEW dbo.vw_RPT_PurchaseReturnSummary AS
SELECT
    p.PRN_NO,
    CAST(p.PRN_DATE AS DATE)            AS PRN_Date,
    p.PH_DEPT_CODE                      AS Dept_Code,
    p.SUPPLIERCODE,
    s.SUPPLIER_NAME,
    p.TOTALQTY,
    p.SUBTOTAL,
    p.GRANDTOTAL,
    p.REMARKS,
    p.AUTH_STATUS,
    mu.UserName                         AS Created_By
FROM PRN_HDR p
LEFT JOIN SUPPLIER_MST s ON p.SUPPLIERCODE = s.SUPPLIER_CODE
LEFT JOIN Master_User mu ON p.ENT_USERID   = mu.UserID;
GO

-- 4.5 Purchase Return Item Detail
IF OBJECT_ID('dbo.vw_RPT_PurchaseReturnDetail', 'V') IS NOT NULL DROP VIEW dbo.vw_RPT_PurchaseReturnDetail;
GO
CREATE VIEW dbo.vw_RPT_PurchaseReturnDetail AS
SELECT
    p.PRN_NO,
    CAST(p.PRN_DATE AS DATE)            AS PRN_Date,
    p.PH_DEPT_CODE                      AS Dept_Code,
    p.SUPPLIERCODE,
    s.SUPPLIER_NAME,
    pd.ITEM_CODE,
    im.ITEM_NAME,
    im.EAN_CODE,
    pd.GRN_NO                           AS Against_GRN,
    pd.RTN_QTY,
    pd.CP                               AS Cost_Price,
    pd.SP                               AS Sale_Price,
    pd.MRP,
    pd.TAX_AMOUNT,
    pd.AMOUNT
FROM PRN_HDR p
INNER JOIN PRN_DTL pd     ON p.PRN_NO         = pd.PRN_NO
LEFT JOIN  SUPPLIER_MST s ON p.SUPPLIERCODE   = s.SUPPLIER_CODE
LEFT JOIN  ITEM_MST im    ON pd.ITEM_CODE      = im.ITEM_CODE;
GO


-- ============================================================
--  5. INVENTORY / STOCK REPORTS
-- ============================================================

-- 5.1 Current Stock Position
IF OBJECT_ID('dbo.vw_RPT_CurrentStockPosition', 'V') IS NOT NULL DROP VIEW dbo.vw_RPT_CurrentStockPosition;
GO
CREATE VIEW dbo.vw_RPT_CurrentStockPosition AS
SELECT
    im.ITEM_CODE,
    im.ITEM_NAME,
    im.EAN_CODE,
    cat.CategoryName,
    sub.SubCategoryName,
    br.BrandName,
    mfg.ManufacturerName,
    im.CP                               AS Cost_Price,
    im.SP                               AS Sale_Price,
    im.MRP,
    im.QOH                              AS Stock_On_Hand,
    im.QOH * im.CP                      AS Stock_Value_At_Cost,
    im.QOH * im.MRP                     AS Stock_Value_At_MRP,
    im.REORDER_LVL,
    im.MIN_STOCK_LVL,
    im.MAX_STOCK_LVL,
    im.EXP_DATE,
    CASE 
        WHEN im.QOH <= 0               THEN 'Out of Stock'
        WHEN im.QOH <= im.REORDER_LVL THEN 'Reorder Required'
        WHEN im.QOH > im.MAX_STOCK_LVL THEN 'Overstock'
        ELSE 'Normal'
    END                                 AS Stock_Status,
    im.Discontinue,
    im.ISNONSALEABLEITEM
FROM ITEM_MST im
LEFT JOIN Category_Mst cat          ON im.CATEGORY_CODE    = cat.CategoryCode
LEFT JOIN SubCategory_Mst sub       ON im.SubCategory_Code = sub.SubCategoryCode
LEFT JOIN Brand_Master br           ON im.BRAND_CODE       = br.BrandCode
LEFT JOIN Manufacturer_Master mfg   ON im.MANUFACTURER_CODE = mfg.ManufacturerCode
WHERE im.Discontinue = 0;
GO

-- 5.2 Reorder Level Report
IF OBJECT_ID('dbo.vw_RPT_ReorderItems', 'V') IS NOT NULL DROP VIEW dbo.vw_RPT_ReorderItems;
GO
CREATE VIEW dbo.vw_RPT_ReorderItems AS
SELECT
    im.ITEM_CODE,
    im.ITEM_NAME,
    im.EAN_CODE,
    cat.CategoryName,
    s.SUPPLIER_NAME,
    im.QOH                              AS Current_Stock,
    im.REORDER_LVL,
    im.MIN_STOCK_LVL,
    im.MAX_STOCK_LVL,
    im.CP                               AS Cost_Price,
    im.MRP,
    (im.MAX_STOCK_LVL - im.QOH)        AS Qty_To_Order
FROM ITEM_MST im
LEFT JOIN Category_Mst cat ON im.CATEGORY_CODE = cat.CategoryCode
LEFT JOIN SUPPLIER_MST s   ON im.SUPPLIER_CODE = s.SUPPLIER_CODE
WHERE im.QOH <= im.REORDER_LVL
  AND im.Discontinue = 0
  AND im.ISNONSALEABLEITEM = 0;
GO

-- 5.3 Near Expiry Items
IF OBJECT_ID('dbo.vw_RPT_NearExpiryItems', 'V') IS NOT NULL DROP VIEW dbo.vw_RPT_NearExpiryItems;
GO
CREATE VIEW dbo.vw_RPT_NearExpiryItems AS
SELECT
    im.ITEM_CODE,
    im.ITEM_NAME,
    im.EAN_CODE,
    cat.CategoryName,
    im.QOH                              AS Current_Stock,
    im.EXP_DATE,
    DATEDIFF(DAY, GETDATE(), im.EXP_DATE) AS Days_To_Expiry,
    im.CP                               AS Cost_Price,
    im.MRP,
    im.QOH * im.CP                      AS At_Risk_Stock_Value
FROM ITEM_MST im
LEFT JOIN Category_Mst cat ON im.CATEGORY_CODE = cat.CategoryCode
WHERE im.EXP_DATE IS NOT NULL
  AND im.EXP_DATE > GETDATE()
  AND DATEDIFF(DAY, GETDATE(), im.EXP_DATE) <= 90
  AND im.QOH > 0
  AND im.Discontinue = 0;
GO

-- 5.4 Stock Adjustment Report
IF OBJECT_ID('dbo.vw_RPT_StockAdjustment', 'V') IS NOT NULL DROP VIEW dbo.vw_RPT_StockAdjustment;
GO
CREATE VIEW dbo.vw_RPT_StockAdjustment AS
SELECT
    sa.DOC_NO,
    sa.SAD_DEPT_CODE                    AS Dept_Code,
    sa.ITEM_CODE,
    im.ITEM_NAME,
    im.EAN_CODE,
    cat.CategoryName,
    sa.STOCK_QTY                        AS Physical_Qty,
    sa.SAN_QTY                          AS System_Qty,
    sa.ADJUSTMENT                       AS Adjustment_Qty,
    sa.CP                               AS Cost_Price,
    sa.Value                            AS Adjustment_Value
FROM STCKADJST_DTL sa
LEFT JOIN ITEM_MST im      ON sa.ITEM_CODE     = im.ITEM_CODE
LEFT JOIN Category_Mst cat ON im.CATEGORY_CODE = cat.CategoryCode;
GO

-- 5.5 Stock Transfer (MTN) Report
IF OBJECT_ID('dbo.vw_RPT_StockTransfer', 'V') IS NOT NULL DROP VIEW dbo.vw_RPT_StockTransfer;
GO
CREATE VIEW dbo.vw_RPT_StockTransfer AS
SELECT
    m.MTN_NO,
    m.MD_DEPT_CODE                      AS From_Dept,
    m.ITEM_CODE,
    im.ITEM_NAME,
    im.EAN_CODE,
    cat.CategoryName,
    m.QTY,
    m.CP                                AS Cost_Price,
    m.SP                                AS Sale_Price,
    m.MRP,
    m.AMOUNT,
    m.SNO
FROM MTN_DTL m
LEFT JOIN ITEM_MST im      ON m.ITEM_CODE      = im.ITEM_CODE
LEFT JOIN Category_Mst cat ON im.CATEGORY_CODE = cat.CategoryCode;
GO

-- 5.6 Item Wise Sales vs Stock (Movement Analysis)
IF OBJECT_ID('dbo.vw_RPT_ItemMovement', 'V') IS NOT NULL DROP VIEW dbo.vw_RPT_ItemMovement;
GO
CREATE VIEW dbo.vw_RPT_ItemMovement AS
SELECT
    im.ITEM_CODE,
    im.ITEM_NAME,
    im.EAN_CODE,
    cat.CategoryName,
    im.QOH                              AS Current_Stock,
    im.CP                               AS Cost_Price,
    im.SP                               AS Sale_Price,
    im.MRP,
    ISNULL(sales.Total_Sold_Qty, 0)     AS Total_Sold_Qty,
    ISNULL(sales.Total_Sales_Value, 0)  AS Total_Sales_Value,
    ISNULL(grn.Total_Received_Qty, 0)   AS Total_Received_Qty,
    ISNULL(grn.Total_Purchase_Value, 0) AS Total_Purchase_Value
FROM ITEM_MST im
LEFT JOIN Category_Mst cat ON im.CATEGORY_CODE = cat.CategoryCode
LEFT JOIN (
    SELECT d.SERVICEORPRODUCTCODE, SUM(d.QTY) AS Total_Sold_Qty, SUM(d.TOTAL) AS Total_Sales_Value
    FROM SALES_DTL d
    INNER JOIN SALES_HDR h ON d.BILL_NO = h.BILL_NO
    WHERE h.ISCANCELLED = 0
    GROUP BY d.SERVICEORPRODUCTCODE
) sales ON im.ITEM_CODE = sales.SERVICEORPRODUCTCODE
LEFT JOIN (
    SELECT d.ITEM_CODE, SUM(d.REC_QTY) AS Total_Received_Qty, SUM(d.AMOUNT) AS Total_Purchase_Value
    FROM GRN_DTL d
    INNER JOIN GRN_HDR g ON d.GRN_NO = g.GRN_NO
    WHERE g.ISCANCELLED = 0
    GROUP BY d.ITEM_CODE
) grn ON im.ITEM_CODE = grn.ITEM_CODE;
GO


-- ============================================================
--  6. ANALYTICS / PROFIT REPORTS
-- ============================================================

-- 6.1 Gross Profit by Item
IF OBJECT_ID('dbo.vw_RPT_GrossProfitByItem', 'V') IS NOT NULL DROP VIEW dbo.vw_RPT_GrossProfitByItem;
GO
CREATE VIEW dbo.vw_RPT_GrossProfitByItem AS
SELECT
    CAST(h.BILL_DATE AS DATE)           AS Bill_Date,
    h.SH_DEPT_CODE                      AS Dept_Code,
    d.SERVICEORPRODUCTCODE              AS Item_Code,
    im.ITEM_NAME,
    cat.CategoryName,
    SUM(d.QTY)                          AS Qty_Sold,
    SUM(d.ORG_CP * d.QTY)              AS Total_Cost,
    SUM(d.TOTAL)                        AS Total_Revenue,
    SUM(d.TOTAL - ISNULL(d.ORG_CP,0)*d.QTY) AS Gross_Profit,
    CASE
        WHEN SUM(d.TOTAL) > 0
        THEN ROUND(SUM(d.TOTAL - ISNULL(d.ORG_CP,0)*d.QTY) / SUM(d.TOTAL) * 100, 2)
        ELSE 0
    END                                 AS Profit_Margin_Pct
FROM SALES_DTL d
INNER JOIN SALES_HDR h    ON d.BILL_NO = h.BILL_NO
LEFT JOIN  ITEM_MST im    ON d.SERVICEORPRODUCTCODE = im.ITEM_CODE
LEFT JOIN  Category_Mst cat ON im.CATEGORY_CODE = cat.CategoryCode
WHERE h.ISCANCELLED = 0
GROUP BY CAST(h.BILL_DATE AS DATE), h.SH_DEPT_CODE, d.SERVICEORPRODUCTCODE, im.ITEM_NAME, cat.CategoryName;
GO

-- 6.2 Monthly Sales Trend
IF OBJECT_ID('dbo.vw_RPT_MonthlySalesTrend', 'V') IS NOT NULL DROP VIEW dbo.vw_RPT_MonthlySalesTrend;
GO
CREATE VIEW dbo.vw_RPT_MonthlySalesTrend AS
SELECT
    YEAR(h.BILL_DATE)                   AS Sales_Year,
    MONTH(h.BILL_DATE)                  AS Sales_Month,
    DATENAME(MONTH, h.BILL_DATE)        AS Month_Name,
    h.SH_DEPT_CODE                      AS Dept_Code,
    COUNT(DISTINCT h.BILL_NO)           AS Total_Bills,
    COUNT(DISTINCT h.CUSTOMER_CODE)     AS Unique_Customers,
    SUM(h.GRAND_TOTAL)                  AS Gross_Sales,
    SUM(h.DISC_AMOUNT)                  AS Total_Discount,
    SUM(h.RedeemAmt)                    AS Points_Redeemed,
    SUM(h.GRAND_TOTAL - ISNULL(h.DISC_AMOUNT,0)) AS Net_Sales,
    AVG(h.GRAND_TOTAL)                  AS Avg_Bill_Value
FROM SALES_HDR h
WHERE h.ISCANCELLED = 0
GROUP BY YEAR(h.BILL_DATE), MONTH(h.BILL_DATE), DATENAME(MONTH, h.BILL_DATE), h.SH_DEPT_CODE;
GO

-- 6.3 Day-Wise Weekly Analysis
IF OBJECT_ID('dbo.vw_RPT_DayOfWeekSales', 'V') IS NOT NULL DROP VIEW dbo.vw_RPT_DayOfWeekSales;
GO
CREATE VIEW dbo.vw_RPT_DayOfWeekSales AS
SELECT
    DATENAME(WEEKDAY, h.BILL_DATE)      AS Day_Name,
    DATEPART(WEEKDAY, h.BILL_DATE)      AS Day_Number,
    h.SH_DEPT_CODE                      AS Dept_Code,
    COUNT(DISTINCT h.BILL_NO)           AS Bill_Count,
    SUM(h.GRAND_TOTAL)                  AS Total_Sales,
    AVG(h.GRAND_TOTAL)                  AS Avg_Bill
FROM SALES_HDR h
WHERE h.ISCANCELLED = 0
GROUP BY DATENAME(WEEKDAY, h.BILL_DATE), DATEPART(WEEKDAY, h.BILL_DATE), h.SH_DEPT_CODE;
GO

-- 6.4 Purchase vs Sales Comparison
IF OBJECT_ID('dbo.vw_RPT_PurchaseVsSalesComparison', 'V') IS NOT NULL DROP VIEW dbo.vw_RPT_PurchaseVsSalesComparison;
GO
CREATE VIEW dbo.vw_RPT_PurchaseVsSalesComparison AS
SELECT
    im.ITEM_CODE,
    im.ITEM_NAME,
    im.EAN_CODE,
    cat.CategoryName,
    ISNULL(grn.Total_Purchased, 0)      AS Total_Purchased_Qty,
    ISNULL(grn.Purchase_Value, 0)       AS Purchase_Value,
    ISNULL(sales.Total_Sold, 0)         AS Total_Sold_Qty,
    ISNULL(sales.Sales_Value, 0)        AS Sales_Value,
    ISNULL(sales.Sales_Value,0) - ISNULL(grn.Purchase_Value,0) AS Gross_Profit
FROM ITEM_MST im
LEFT JOIN Category_Mst cat ON im.CATEGORY_CODE = cat.CategoryCode
LEFT JOIN (
    SELECT ITEM_CODE, SUM(REC_QTY) AS Total_Purchased, SUM(AMOUNT) AS Purchase_Value
    FROM GRN_DTL GROUP BY ITEM_CODE
) grn ON im.ITEM_CODE = grn.ITEM_CODE
LEFT JOIN (
    SELECT SERVICEORPRODUCTCODE, SUM(QTY) AS Total_Sold, SUM(TOTAL) AS Sales_Value
    FROM SALES_DTL d
    INNER JOIN SALES_HDR h ON d.BILL_NO = h.BILL_NO
    WHERE h.ISCANCELLED = 0
    GROUP BY SERVICEORPRODUCTCODE
) sales ON im.ITEM_CODE = sales.SERVICEORPRODUCTCODE;
GO

-- 6.5 Discount Analysis
IF OBJECT_ID('dbo.vw_RPT_DiscountAnalysis', 'V') IS NOT NULL DROP VIEW dbo.vw_RPT_DiscountAnalysis;
GO
CREATE VIEW dbo.vw_RPT_DiscountAnalysis AS
SELECT
    CAST(h.BILL_DATE AS DATE)           AS Bill_Date,
    h.SH_DEPT_CODE                      AS Dept_Code,
    COUNT(DISTINCT h.BILL_NO)           AS Bills_With_Discount,
    SUM(h.GRAND_TOTAL)                  AS Gross_Sales,
    SUM(h.DISC_AMOUNT)                  AS Total_Bill_Discount,
    SUM(d.Line_Disc_Amount)             AS Total_Line_Discount,
    SUM(h.DISC_AMOUNT) + SUM(d.Line_Disc_Amount) AS Total_Discount,
    CASE
        WHEN SUM(h.GRAND_TOTAL) > 0
        THEN ROUND((SUM(h.DISC_AMOUNT)/SUM(h.GRAND_TOTAL))*100, 2)
        ELSE 0
    END                                 AS Discount_Pct
FROM SALES_HDR h
INNER JOIN SALES_DTL d ON h.BILL_NO = d.BILL_NO
WHERE h.ISCANCELLED = 0
GROUP BY CAST(h.BILL_DATE AS DATE), h.SH_DEPT_CODE;
GO


-- ============================================================
--  END OF ALL VIEWS
-- ============================================================
PRINT 'All Reporting Views Created Successfully!'
GO
