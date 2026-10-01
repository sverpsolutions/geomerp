"""
Phase 2 Routes - GST, Advanced Analytics, Customer Intelligence
All column names matched exactly to COMPLETE_ALL_VIEWS_RUN_THIS.sql
"""
from flask import Blueprint, render_template, request, send_file, flash, redirect, url_for, jsonify
import pandas as pd
from datetime import datetime, date
import json, io

phase2_bp = Blueprint('phase2', __name__)

from db_config import load_config
DB_SERVER, DB_NAME, DB_USER, DB_PASSWORD = load_config()



def run_query(sql, params=None):
    import pyodbc
    server, name, user, password = load_config()
    conn_str = (f"DRIVER={{ODBC Driver 17 for SQL Server}};SERVER={server};"
                f"DATABASE={name};UID={user};PWD={password};TrustServerCertificate=yes;")
    try:
        conn = pyodbc.connect(conn_str, timeout=30)
        df = pd.read_sql(sql, conn, params=params)
        conn.close()
        return df, None
    except Exception as e:
        return pd.DataFrame(), str(e)

def _year_month_params(request):
    y = request.args.get('year',  str(date.today().year))
    m = request.args.get('month', str(date.today().month))
    return y, m

def _month_label(y, m):
    try:    return datetime(int(y), int(m), 1).strftime('%B %Y')
    except: return f'{m}/{y}'


@phase2_bp.route('/gst/hsn_sales')
def gst_hsn_sales():
    from exports.excel_export import generate_excel
    from exports.pdf_export   import generate_pdf
    year, month = _year_month_params(request)
    dept = request.args.get('dept', '')
    sql = """
        SELECT FIN_YEAR, TAX_MONTH, MONTH_NAME, HSN_CODE, UOM,
               BILL_COUNT, TOTAL_QTY, TAXABLE_VALUE, TOTAL_DISCOUNT,
               NET_TAXABLE_VALUE, IGST_AMT, CGST_AMT, SGST_AMT,
               CESS_AMT, TOTAL_TAX, TOTAL_VALUE, GST_RATE, DEPT_CODE
        FROM dbo.VW_GST_HSN_SALES
        WHERE FIN_YEAR=? AND TAX_MONTH=? {dept}
        ORDER BY NET_TAXABLE_VALUE DESC
    """.format(dept="AND DEPT_CODE=?" if dept else "")
    params = [year, month] + ([dept] if dept else [])
    df, err = run_query(sql, params)
    if err: flash(f'DB Error: {err}', 'danger')
    title  = f'HSN Wise Sales - {_month_label(year, month)}'
    export = request.args.get('export')
    if export == 'pdf':   return generate_pdf(df, title, 'hsn_sales')
    if export == 'excel': return generate_excel(df, title, 'hsn_sales')
    return render_template('gst/hsn_sales.html', df=df, year=year, month=month, dept=dept, title=title)


@phase2_bp.route('/gst/hsn_comparison')
def gst_hsn_comparison():
    from exports.excel_export import generate_excel
    year, month = _year_month_params(request)
    sql_s = """
        SELECT HSN_CODE,
               MAX(GST_RATE)              AS GST_RATE,
               SUM(TOTAL_QTY)            AS S_QTY,
               SUM(NET_TAXABLE_VALUE)    AS S_TAXABLE,
               SUM(CGST_AMT)             AS S_CGST,
               SUM(SGST_AMT)             AS S_SGST,
               SUM(TOTAL_TAX)            AS S_TAX,
               SUM(TOTAL_VALUE)          AS S_TOTAL
        FROM dbo.VW_GST_HSN_SALES
        WHERE FIN_YEAR=? AND TAX_MONTH=?
        GROUP BY HSN_CODE
    """
    sql_p = """
        SELECT HSN_CODE,
               SUM(TOTAL_QTY)            AS P_QTY,
               SUM(TAXABLE_VALUE)        AS P_TAXABLE,
               SUM(CGST_AMT)             AS P_CGST,
               SUM(SGST_AMT)             AS P_SGST,
               SUM(TOTAL_TAX)            AS P_TAX,
               SUM(TOTAL_VALUE)          AS P_TOTAL
        FROM dbo.VW_GST_HSN_PURCHASE
        WHERE FIN_YEAR=? AND TAX_MONTH=?
        GROUP BY HSN_CODE
    """
    df_s, err1 = run_query(sql_s, [year, month])
    df_p, err2 = run_query(sql_p, [year, month])
    if err1: flash(f'Sales DB Error: {err1}', 'danger')
    if err2: flash(f'Purchase DB Error: {err2}', 'danger')

    if df_s.empty and df_p.empty:
        df = pd.DataFrame()
    else:
        df_s = df_s if not df_s.empty else pd.DataFrame(columns=['HSN_CODE','GST_RATE','S_QTY','S_TAXABLE','S_CGST','S_SGST','S_TAX','S_TOTAL'])
        df_p = df_p if not df_p.empty else pd.DataFrame(columns=['HSN_CODE','P_QTY','P_TAXABLE','P_CGST','P_SGST','P_TAX','P_TOTAL'])
        df = pd.merge(df_s, df_p, on='HSN_CODE', how='outer').fillna(0)
        df['QTY_DIFF']     = df['S_QTY']     - df['P_QTY']
        df['TAXABLE_DIFF'] = df['S_TAXABLE'] - df['P_TAXABLE']
        df['TAX_DIFF']     = df['S_TAX']     - df['P_TAX']
        df = df.sort_values('S_TAXABLE', ascending=False)

    title  = f'HSN Comparison Sales vs Purchase - {_month_label(year, month)}'
    export = request.args.get('export')
    if export == 'excel': return generate_excel(df, title, 'hsn_comparison')
    return render_template('gst/hsn_comparison.html', df=df, year=year, month=month, title=title)


@phase2_bp.route('/gst/hsn_purchase')
def gst_hsn_purchase():
    from exports.excel_export import generate_excel
    year, month = _year_month_params(request)
    sql = """
        SELECT FIN_YEAR, TAX_MONTH, MONTH_NAME, HSN_CODE, UOM,
               SUPPLIER_NAME, SUPPLIER_GSTIN,
               GRN_COUNT, TOTAL_QTY, TAXABLE_VALUE,
               TOTAL_TAX, CGST_AMT, SGST_AMT, CESS_AMT,
               TOTAL_VALUE, GST_RATE, ITC_STATUS, DEPT_CODE
        FROM dbo.VW_GST_HSN_PURCHASE
        WHERE FIN_YEAR=? AND TAX_MONTH=?
        ORDER BY TAXABLE_VALUE DESC
    """
    df, err = run_query(sql, [year, month])
    if err: flash(f'DB Error: {err}', 'danger')
    title  = f'HSN Wise Purchase - {_month_label(year, month)}'
    export = request.args.get('export')
    if export == 'excel': return generate_excel(df, title, 'hsn_purchase')
    return render_template('gst/hsn_purchase.html', df=df, year=year, month=month, title=title)


@phase2_bp.route('/gst/gstr1')
def gst_gstr1():
    from exports.excel_export import generate_excel
    from exports.gst_json     import generate_gstr1_json
    year, month = _year_month_params(request)
    dept = request.args.get('dept', '')
    sql = """
        SELECT FIN_YEAR, TAX_MONTH, MONTH_NAME, DEPT_CODE,
               BILL_NO, BILL_DATE, GST_INVOICE_NO, INVOICE_TYPE,
               CUSTOMER_CODE, CUSTOMER_NAME, INVOICE_CATEGORY,
               TAXABLE_VALUE, IGST_AMT, CGST_AMT, SGST_AMT, CESS_AMT,
               TOTAL_TAX, INVOICE_VALUE
        FROM dbo.VW_GST_GSTR1
        WHERE FIN_YEAR=? AND TAX_MONTH=? {dept}
        ORDER BY BILL_DATE, BILL_NO
    """.format(dept="AND DEPT_CODE=?" if dept else "")
    params = [year, month] + ([dept] if dept else [])
    df, err = run_query(sql, params)
    if err: flash(f'DB Error: {err}', 'danger')
    title  = f'GSTR-1 - {_month_label(year, month)}'
    export = request.args.get('export')
    if export == 'excel':
        return generate_excel(df, title, 'gstr1')
    if export == 'json':  return generate_gstr1_json(df, year, month)
    return render_template('gst/gstr1.html', df=df, year=year, month=month, dept=dept, title=title)


@phase2_bp.route('/gst/gstr1/export/<filename>')
def gst_gstr1_export(filename):
    from exports.gstr1_template_export import generate_gstr1_template_excel
    year, month = _year_month_params(request)
    dept = request.args.get('dept', '')
    return generate_gstr1_template_excel(year, month, dept)



@phase2_bp.route('/gst/gstr3b')
def gst_gstr3b():
    from exports.excel_export import generate_excel
    year, month = _year_month_params(request)
    dept = request.args.get('dept', '')
    sql = """
        SELECT FIN_YEAR, TAX_MONTH, MONTH_NAME, DEPT_CODE,
               TAXABLE_OUTWARD,
               OUT_IGST  AS IGST_SALES,
               OUT_CGST  AS CGST_SALES,
               OUT_SGST  AS SGST_SALES,
               OUT_CESS  AS CESS_SALES,
               TOTAL_TAX_LIABILITY  AS TOTAL_OUTPUT_TAX,
               NIL_RATED_SUPPLY     AS NIL_RATED_SALES,
               TOTAL_INVOICE_VALUE,
               0 AS RETURN_VALUE, 0 AS RETURN_TAX_CREDIT,
               0 AS ITC_ELIGIBLE,  0 AS ITC_INELIGIBLE,
               0 AS ITC_CGST,      0 AS ITC_SGST,
               TOTAL_TAX_LIABILITY  AS NET_TAX_LIABILITY
        FROM dbo.VW_GST_GSTR3B
        WHERE FIN_YEAR=? AND TAX_MONTH=? {dept}
    """.format(dept="AND DEPT_CODE=?" if dept else "")
    params = [year, month] + ([dept] if dept else [])
    df, err = run_query(sql, params)
    if err: flash(f'DB Error: {err}', 'danger')
    itc = {}
    title  = f'GSTR-3B Summary - {_month_label(year, month)}'
    export = request.args.get('export')
    if export == 'excel': return generate_excel(df, title, 'gstr3b')
    return render_template('gst/gstr3b.html', df=df, itc=itc,
                           year=year, month=month, dept=dept, title=title)


@phase2_bp.route('/gst/itc')
def gst_itc():
    from exports.excel_export import generate_excel
    year, month = _year_month_params(request)
    sql = """
        SELECT FIN_YEAR, TAX_MONTH, MONTH_NAME, DEPT_CODE,
               GRN_NO, GRN_DATE, SUPPLIER_INVOICE, INVOICE_DATE,
               SUPPLIERCODE, SUPPLIER_NAME, SUPPLIER_GSTIN, SUPPLIER_PAN,
               TAXABLE_VALUE, TOTAL_TAX, CGST_ITC, SGST_ITC, CESS_ITC,
               ITC_ELIGIBILITY, ELIGIBLE_ITC, INELIGIBLE_ITC
        FROM dbo.VW_GST_ITC_DETAIL
        WHERE FIN_YEAR=? AND TAX_MONTH=?
        ORDER BY GRN_DATE DESC
    """
    df, err = run_query(sql, [year, month])
    if err: flash(f'DB Error: {err}', 'danger')
    title  = f'ITC Report - {_month_label(year, month)}'
    export = request.args.get('export')
    if export == 'excel': return generate_excel(df, title, 'itc')
    return render_template('gst/itc.html', df=df, year=year, month=month, title=title)


@phase2_bp.route('/gst/cdnr')
def gst_cdnr():
    from exports.excel_export import generate_excel
    year, month = _year_month_params(request)
    sql = """
        SELECT FIN_YEAR, TAX_MONTH, MONTH_NAME, DEPT_CODE,
               NOTE_NUMBER, NOTE_DATE, ORIGINAL_INVOICE, NOTE_TYPE,
               TAXABLE_VALUE, TOTAL_TAX, CGST_AMT, SGST_AMT,
               NOTE_VALUE, REASON
        FROM dbo.VW_GST_CDNR
        WHERE FIN_YEAR=? AND TAX_MONTH=?
        ORDER BY NOTE_DATE DESC
    """
    df, err = run_query(sql, [year, month])
    if err: flash(f'DB Error: {err}', 'danger')
    title  = f'Credit Notes (CDNR) - {_month_label(year, month)}'
    export = request.args.get('export')
    if export == 'excel': return generate_excel(df, title, 'cdnr')
    return render_template('gst/cdnr.html', df=df, year=year, month=month, title=title)


@phase2_bp.route('/analytics/profitability')
def analytics_profitability():
    from exports.excel_export import generate_excel
    from exports.pdf_export   import generate_pdf
    from_date = request.args.get('from_date', date.today().replace(month=1, day=1).isoformat())
    to_date   = request.args.get('to_date',   date.today().isoformat())
    group_by  = request.args.get('group_by', 'item')
    if group_by == 'category':
        sel = "DEPT_CODE, YEAR, MONTH, MONTH_NAME, CATEGORY, '' AS ITEM_NAME, '' AS BRAND, '' AS CUSTOMER_NAME"
        grp = "DEPT_CODE, YEAR, MONTH, MONTH_NAME, CATEGORY"
    elif group_by == 'customer':
        sel = "DEPT_CODE, YEAR, MONTH, MONTH_NAME, '' AS CATEGORY, '' AS ITEM_NAME, '' AS BRAND, CUSTOMER_NAME"
        grp = "DEPT_CODE, YEAR, MONTH, MONTH_NAME, CUSTOMER_NAME"
    else:
        sel = "DEPT_CODE, YEAR, MONTH, MONTH_NAME, CATEGORY, ITEM_NAME, '' AS BRAND, '' AS CUSTOMER_NAME"
        grp = "DEPT_CODE, YEAR, MONTH, MONTH_NAME, CATEGORY, ITEM_NAME"
    sql = f"""
        SELECT {sel},
               SUM(QTY_SOLD) AS QTY_SOLD, SUM(REVENUE) AS REVENUE,
               SUM(COST_OF_GOODS) AS COST_OF_GOODS,
               SUM(DISCOUNT_GIVEN) AS DISCOUNT_GIVEN,
               SUM(GROSS_PROFIT) AS GROSS_PROFIT,
               CASE WHEN SUM(REVENUE)>0 THEN SUM(GROSS_PROFIT)/SUM(REVENUE)*100 ELSE 0 END AS MARGIN_PCT
        FROM dbo.VW_RPT_PROFITABILITY
        WHERE YEAR*100+MONTH BETWEEN YEAR(?)*100+MONTH(?) AND YEAR(?)*100+MONTH(?)
        GROUP BY {grp}
        ORDER BY SUM(GROSS_PROFIT) DESC
    """
    df, err = run_query(sql, [from_date, from_date, to_date, to_date])
    if err: flash(f'DB Error: {err}', 'danger')
    title  = f'Profitability - {from_date} to {to_date}'
    export = request.args.get('export')
    if export == 'pdf':   return generate_pdf(df, title, 'profitability')
    if export == 'excel': return generate_excel(df, title, 'profitability')
    return render_template('analytics/profitability.html', df=df,
                           from_date=from_date, to_date=to_date,
                           group_by=group_by, title=title)


@phase2_bp.route('/analytics/velocity')
def analytics_velocity():
    from exports.excel_export import generate_excel
    velocity = request.args.get('velocity', '')
    sql = """
        SELECT ITEM_CODE, ITEM_NAME, EAN_CODE,
               CATEGORY, BRAND, SUPPLIER_NAME,
               CURRENT_STOCK            AS STOCK_QTY,
               0                        AS STOCK_VALUE,
               TOTAL_QTY_SOLD           AS QTY_SOLD_90D,
               BILLS_COUNT              AS BILLS_90D,
               TOTAL_REVENUE            AS SALES_VALUE_90D,
               LAST_SOLD_DATE,
               DAYS_SINCE_SOLD          AS DAYS_SINCE_LAST_SOLD,
               VELOCITY,
               CASE WHEN DAILY_AVG_SALES > 0
                    THEN CURRENT_STOCK / DAILY_AVG_SALES
                    ELSE 9999 END        AS DAYS_STOCK_REMAINING
        FROM dbo.VW_RPT_ITEM_VELOCITY
        {where}
        ORDER BY TOTAL_REVENUE DESC
    """.format(where="WHERE VELOCITY=?" if velocity else "")
    params = [velocity] if velocity else None
    df, err = run_query(sql, params)
    if err: flash(f'DB Error: {err}', 'danger')
    title  = f'Item Velocity - {velocity or "All Items"}'
    export = request.args.get('export')
    if export == 'excel': return generate_excel(df, title, 'velocity')
    return render_template('analytics/velocity.html', df=df, velocity=velocity, title=title)


@phase2_bp.route('/analytics/sales_vs_purchase')
def sales_vs_purchase():
    from exports.excel_export import generate_excel
    year = request.args.get('year', str(date.today().year))
    sql_s = """
        SELECT YEAR, MONTH, MONTH_NAME, DEPT_CODE,
               TOTAL_SALES      AS SALES_VALUE,
               SALES_BILLS,
               0                AS PURCHASE_VALUE,
               0                AS PURCHASE_GRNS,
               0                AS RETURN_VALUE,
               0                AS NET_MARGIN,
               TOTAL_SALES      AS NET_SALES,
               0.0              AS GROSS_MARGIN_PCT
        FROM dbo.VW_RPT_SALES_VS_PURCHASE
        WHERE YEAR=? ORDER BY MONTH
    """
    df, err = run_query(sql_s, [year])
    if err: flash(f'Sales Error: {err}', 'danger')
    df_s = df

    title  = f'Sales vs Purchase - {year}'
    export = request.args.get('export')
    if export == 'excel': return generate_excel(df, title, 'sales_vs_purchase')
    chart_data = []
    if not df.empty:
        agg = df.groupby('MONTH_NAME')[['SALES_VALUE','PURCHASE_VALUE','NET_MARGIN']].sum().reset_index()
        chart_data = agg.to_dict('records')
    return render_template('analytics/sales_vs_purchase.html', df=df, year=year,
                           chart_data=json.dumps(chart_data), title=title)


@phase2_bp.route('/analytics/exceptions')
def analytics_exceptions():
    sql = """
        SELECT EXCEPTION_TYPE, SEVERITY, REFERENCE_NO,
               DESCRIPTION                          AS EXCEPTION_DETAIL,
               TRY_CAST(AMOUNT_STR AS DECIMAL(18,2)) AS AMOUNT,
               EXCEPTION_DATE                       AS TXN_DATE,
               DEPT_CODE
        FROM dbo.VW_RPT_EXCEPTIONS
        ORDER BY CASE SEVERITY WHEN 'HIGH' THEN 1 WHEN 'MEDIUM' THEN 2 ELSE 3 END,
                 EXCEPTION_DATE DESC
    """
    df, err = run_query(sql)
    if err: flash(f'DB Error: {err}', 'danger')
    return render_template('analytics/exceptions.html', df=df,
                           title='Exception Report - Alerts & Anomalies')


@phase2_bp.route('/analytics/stock_valuation')
def analytics_stock_valuation():
    from exports.excel_export import generate_excel
    from exports.pdf_export   import generate_pdf
    category = request.args.get('category', '')
    sql = """
        SELECT ITEM_CODE, ITEM_NAME, EAN_CODE, CATEGORY, BRAND,
               SUPPLIER_NAME, QTY_ON_HAND, COST_PRICE, MRP, SALE_PRICE,
               VALUE_AT_COST, VALUE_AT_MRP, VALUE_AT_SP,
               POTENTIAL_PROFIT, EXPIRY_DATE, EXPIRY_STATUS
        FROM dbo.VW_RPT_STOCK_VALUATION
        {where}
        ORDER BY VALUE_AT_COST DESC
    """.format(where="WHERE CATEGORY=?" if category else "")
    params = [category] if category else None
    df, err = run_query(sql, params)
    if err: flash(f'DB Error: {err}', 'danger')
    title  = 'Stock Valuation Report'
    export = request.args.get('export')
    if export == 'pdf':   return generate_pdf(df, title, 'stock_valuation')
    if export == 'excel': return generate_excel(df, title, 'stock_valuation')
    return render_template('analytics/stock_valuation.html', df=df, category=category, title=title)


@phase2_bp.route('/analytics/dashboard_live')
def dashboard_live():
    sql = "SELECT * FROM dbo.VW_RPT_DASHBOARD"
    df, err = run_query(sql)
    if err: flash(f'DB Error: {err}', 'danger')
    kpi = df.iloc[0].to_dict() if not df.empty else {}
    sql_trend = """
        SELECT CONVERT(DATE,BILL_DATE) AS D,
               COUNT(*) AS BILLS,
               SUM(ISNULL(GRAND_TOTAL,0)) AS SALES
        FROM dbo.SALES_HDR
        WHERE BILL_DATE >= DATEADD(DAY,-7,GETDATE())
          AND ISNULL(ISCANCELLED,0)=0
        GROUP BY CONVERT(DATE,BILL_DATE)
        ORDER BY D
    """
    df_trend, _ = run_query(sql_trend)
    trend_data = []
    if not df_trend.empty:
        df_trend['D'] = df_trend['D'].astype(str)
        trend_data = df_trend.to_dict('records')
    return render_template('analytics/dashboard_live.html',
                           kpi=kpi, trend_data=json.dumps(trend_data),
                           title='Live Business Dashboard')


@phase2_bp.route('/customer/segments')
def customer_segments():
    from exports.excel_export import generate_excel
    segment = request.args.get('segment', '')
    sql = """
        SELECT CUSTOMER_CODE, CUSTOMER_NAME, MOBILE, EMAIL,
               CITY, IS_VIP, LOYALTY_POINTS, TOTAL_VISITS,
               LIFETIME_VALUE, AVG_BILL_VALUE, LAST_VISIT, FIRST_VISIT,
               DAYS_INACTIVE, CUSTOMER_SEGMENT
        FROM dbo.VW_RPT_CUSTOMER_SEGMENTS
        {where}
        ORDER BY LIFETIME_VALUE DESC
    """.format(where="WHERE CUSTOMER_SEGMENT=?" if segment else "")
    params = [segment] if segment else None
    df, err = run_query(sql, params)
    if err: flash(f'DB Error: {err}', 'danger')
    if not df.empty:
        df['MOBILE'] = df['MOBILE'].replace(['', 'nan', 'None', None], pd.NA).fillna(df['CUSTOMER_NAME'])
        # Compute RFM scores in Python (view doesn't store them)
        def _score(series, thresholds, ascending=True):
            import numpy as np
            pcts = series.rank(pct=True)
            if ascending:
                return pd.cut(pcts, bins=[0,.2,.4,.6,.8,1.0001], labels=[1,2,3,4,5]).astype(int)
            else:
                return pd.cut(pcts, bins=[0,.2,.4,.6,.8,1.0001], labels=[5,4,3,2,1]).astype(int)
        df['R_SCORE'] = _score(df['DAYS_INACTIVE'], None, ascending=False)
        df['F_SCORE'] = _score(df['TOTAL_VISITS'],  None, ascending=True)
        df['M_SCORE'] = _score(df['LIFETIME_VALUE'], None, ascending=True)
        _promo_map = {
            'CHAMPION':'VIP exclusive offer','LOYAL':'Loyalty bonus points',
            'HIGH VALUE':'Premium category discount','NEW CUSTOMER':'Welcome 10% off',
            'AT RISK':'Win-back: 15% off','LOST':'Re-engage special deal',
            'INACTIVE':'Come back offer','REGULAR':'General promotion'
        }
        df['PROMO_SUGGESTION'] = df['CUSTOMER_SEGMENT'].map(_promo_map).fillna('General promotion')
        df['BIRTHDAY_THIS_WEEK'] = False
    # Build summary: segment -> count from full data
    sum_sql = """SELECT CUSTOMER_SEGMENT, COUNT(*) AS CNT
                 FROM dbo.VW_RPT_CUSTOMER_SEGMENTS
                 GROUP BY CUSTOMER_SEGMENT ORDER BY CNT DESC"""
    df_sum, _ = run_query(sum_sql)
    summary = dict(zip(df_sum['CUSTOMER_SEGMENT'], df_sum['CNT'])) if not df_sum.empty else {}
    title  = f'Customer Segments - {segment or "All"}'
    export = request.args.get('export')
    if export == 'excel': return generate_excel(df, title, 'segments')
    return render_template('customer/segments.html', df=df, segment=segment,
                           summary=summary, title=title)


@phase2_bp.route('/customer/trend')
def customer_trend():
    from exports.excel_export import generate_excel
    mobile    = request.args.get('mobile', '').strip()
    from_date = request.args.get('from_date', date.today().replace(day=1).isoformat())
    to_date   = request.args.get('to_date',   date.today().isoformat())
    sql = """
        SELECT CUSTOMER_CODE, CUSTOMER_NAME, MOBILE, IS_VIP,
               YEAR  AS SALE_YEAR, MONTH AS SALE_MONTH, MONTH_NAME, DEPT_CODE,
               VISIT_COUNT        AS BILL_COUNT,
               TOTAL_SPENT, AVG_BILL, MAX_BILL,
               TOTAL_DISCOUNT,
               TOTAL_REDEEMED     AS POINTS_REDEEMED_VALUE
        FROM dbo.VW_RPT_CUSTOMER_TREND
        WHERE DATEFROMPARTS(YEAR, MONTH, 1) BETWEEN ? AND ?
        {cust}
        ORDER BY YEAR, MONTH, TOTAL_SPENT DESC
    """.format(cust="AND (MOBILE=? OR CUSTOMER_NAME=?)" if mobile else "")
    params = [from_date, to_date] + ([mobile, mobile] if mobile else [])
    df, err = run_query(sql, params)
    if err: flash(f'DB Error: {err}', 'danger')
    if not df.empty:
        df['MOBILE'] = df['MOBILE'].replace(['', 'nan', 'None', None], pd.NA).fillna(df['CUSTOMER_NAME'])
    title  = 'Customer Purchase Trend'
    export = request.args.get('export')
    if export == 'excel': return generate_excel(df, title, 'customer_trend')
    chart_data = []
    if not df.empty:
        agg = df.groupby(['SALE_YEAR','SALE_MONTH','MONTH_NAME'])['TOTAL_SPENT'].sum().reset_index()
        agg['LABEL'] = agg['MONTH_NAME'].astype(str) + ' ' + agg['SALE_YEAR'].astype(str)
        chart_data   = agg[['LABEL','TOTAL_SPENT']].to_dict('records')
    return render_template('customer/trend.html', df=df,
                           from_date=from_date, to_date=to_date,
                           mobile=mobile,
                           chart_data=json.dumps(chart_data), title=title)


@phase2_bp.route('/customer/promotions')
def customer_promotions():
    from exports.customer_intelligence import bulk_generate_messages
    channel  = request.args.get('channel', 'whatsapp')
    segment  = request.args.get('segment', 'AT RISK')
    festival = request.args.get('festival', '')
    sql = """
        SELECT TOP(500) CUSTOMER_CODE, CUSTOMER_NAME, MOBILE, EMAIL,
               CITY, LOYALTY_POINTS, DAYS_INACTIVE,
               LIFETIME_VALUE AS TOTAL_SPENT, CUSTOMER_SEGMENT
        FROM dbo.VW_RPT_CUSTOMER_SEGMENTS
        {where}
        ORDER BY DAYS_INACTIVE DESC
    """.format(where="WHERE CUSTOMER_SEGMENT=?" if segment else "")
    params = [segment] if segment else None
    df, err = run_query(sql, params)
    if err: flash(f'DB Error: {err}', 'danger')
    messages = bulk_generate_messages(df, channel, festival or None) if not df.empty else []
    return render_template('customer/promotions.html',
                           messages=messages, df=df,
                           channel=channel, segment=segment,
                           festival=festival, title='Smart Promotions Generator')


# ── JSON APIs ─────────────────────────────────────────────────────
@phase2_bp.route('/api/dashboard')
def api_dashboard():
    df, err = run_query("SELECT * FROM dbo.VW_RPT_DASHBOARD")
    if err: return jsonify({"error": err}), 500
    return jsonify(df.to_dict('records'))

@phase2_bp.route('/api/stock_alerts')
def api_stock_alerts():
    sql = """SELECT ITEM_CODE, ITEM_NAME, QTY_ON_HAND, REORDER_LEVEL,
                    STOCK_STATUS, EXPIRY_STATUS
             FROM dbo.VW_RPT_STOCK_STATUS
             WHERE STOCK_STATUS IN ('REORDER REQUIRED','OUT OF STOCK')
             ORDER BY QTY_ON_HAND"""
    df, err = run_query(sql)
    if err: return jsonify({"error": err}), 500
    return jsonify(df.to_dict('records'))

@phase2_bp.route('/api/gstr3b_summary')
def api_gstr3b():
    y = request.args.get('year',  str(date.today().year))
    m = request.args.get('month', str(date.today().month))
    df, err = run_query("SELECT * FROM dbo.VW_GST_GSTR3B WHERE FIN_YEAR=? AND TAX_MONTH=?", [y,m])
    if err: return jsonify({"error": err}), 500
    return jsonify(df.to_dict('records'))

@phase2_bp.route('/api/customer_segments_summary')
def api_segments():
    sql = """SELECT CUSTOMER_SEGMENT, COUNT(*) AS CUSTOMER_COUNT,
                    SUM(LIFETIME_VALUE) AS TOTAL_VALUE, AVG(AVG_BILL_VALUE) AS AVG_BILL
             FROM dbo.VW_RPT_CUSTOMER_SEGMENTS
             GROUP BY CUSTOMER_SEGMENT ORDER BY TOTAL_VALUE DESC"""
    df, err = run_query(sql)
    if err: return jsonify({"error": err}), 500
    return jsonify(df.to_dict('records'))

@phase2_bp.route('/api/exceptions_count')
def api_exceptions():
    sql = """SELECT EXCEPTION_TYPE, SEVERITY, COUNT(*) AS EXCEPTION_COUNT
             FROM dbo.VW_RPT_EXCEPTIONS
             GROUP BY EXCEPTION_TYPE, SEVERITY
             ORDER BY CASE SEVERITY WHEN 'HIGH' THEN 1 WHEN 'MEDIUM' THEN 2 ELSE 3 END"""
    df, err = run_query(sql)
    if err: return jsonify({"error": err}), 500
    return jsonify(df.to_dict('records'))

@phase2_bp.route('/api/top_items_today')
def api_top_items_today():
    sql = """SELECT TOP(10) D.SERVICEORPRODUCTCODE AS ITEM_CODE, I.ITEM_NAME,
                    SUM(D.QTY) AS QTY_SOLD, SUM(D.AMOUNT) AS SALES_VALUE
             FROM dbo.SALES_DTL D
             INNER JOIN dbo.SALES_HDR H ON D.BILL_NO=H.BILL_NO AND D.SD_DEPT_CODE=H.SH_DEPT_CODE
             LEFT  JOIN dbo.ITEM_MST I  ON D.SERVICEORPRODUCTCODE=I.ITEM_CODE
             WHERE CONVERT(DATE,H.BILL_DATE)=CAST(GETDATE() AS DATE)
               AND ISNULL(H.ISCANCELLED,0)=0
             GROUP BY D.SERVICEORPRODUCTCODE, I.ITEM_NAME
             ORDER BY SUM(D.AMOUNT) DESC"""
    df, err = run_query(sql)
    if err: return jsonify({"error": err}), 500
    return jsonify(df.to_dict('records'))


# ── Smart Sales Report (Summary + Detail) ─────────────────────────────────────
@phase2_bp.route('/sales/smart_report')
def sales_smart_report():
    from exports.excel_export import generate_excel
    today = date.today()
    from_date = request.args.get('from_date', today.replace(day=1).strftime('%Y-%m-%d'))
    to_date   = request.args.get('to_date',   today.strftime('%Y-%m-%d'))
    dept      = request.args.get('dept', '').strip()
    category  = request.args.get('category', '').strip()
    brand     = request.args.get('brand', '').strip()
    mobile    = request.args.get('mobile', '').strip()
    mode      = request.args.get('mode', 'summary')   # 'summary' or 'detail'

    where_parts = ["IS_CANCELLED=0", "BILL_DATE BETWEEN ? AND ?"]
    params      = [from_date, to_date]

    if dept:
        where_parts.append("DEPT_CODE=?")
        params.append(dept)
    if category:
        where_parts.append("CATEGORY=?")
        params.append(category)
    if brand:
        where_parts.append("BRAND=?")
        params.append(brand)
    if mobile:
        where_parts.append("(CUSTOMER_CODE=? OR CUSTOMER_NAME=?)")
        params += [mobile, mobile]

    where_sql = " AND ".join(where_parts)

    if mode == 'detail':
        sql = f"""
            SELECT DEPT_CODE, BILL_NO,
                   CONVERT(VARCHAR(10), BILL_DATE, 23) AS BILL_DATE,
                   CUSTOMER_CODE, CUSTOMER_NAME,
                   ITEM_CODE, ITEM_NAME, CATEGORY, BRAND,
                   QTY, RATE, MRP, AMOUNT, DISC_AMOUNT, TOTAL,
                   GROSS_PROFIT, MARGIN_PCT, HSN_CODE
            FROM dbo.VW_RPT_SALES_DETAIL
            WHERE {where_sql}
            ORDER BY BILL_DATE, BILL_NO, ITEM_CODE
        """
    else:
        sql = f"""
            SELECT DEPT_CODE, CATEGORY, CUSTOMER_CODE, CUSTOMER_NAME,
                   COUNT(DISTINCT BILL_NO)  AS BILL_COUNT,
                   SUM(QTY)                 AS TOTAL_QTY,
                   SUM(AMOUNT)              AS GROSS_AMOUNT,
                   SUM(DISC_AMOUNT)         AS TOTAL_DISC,
                   SUM(TOTAL)               AS NET_AMOUNT,
                   SUM(GROSS_PROFIT)        AS GROSS_PROFIT,
                   CASE WHEN SUM(TOTAL) > 0
                        THEN ROUND(SUM(GROSS_PROFIT)*100.0/SUM(TOTAL),2)
                        ELSE 0 END          AS AVG_MARGIN
            FROM dbo.VW_RPT_SALES_DETAIL
            WHERE {where_sql}
            GROUP BY DEPT_CODE, CATEGORY, CUSTOMER_CODE, CUSTOMER_NAME
            ORDER BY DEPT_CODE, CATEGORY, NET_AMOUNT DESC
        """

    df, err = run_query(sql, params)
    if err:
        flash(f'DB Error: {err}', 'danger')
        df = pd.DataFrame()

    if not df.empty and 'CUSTOMER_NAME' in df.columns:
        df['CUSTOMER_NAME'] = (df['CUSTOMER_NAME']
                               .replace(['', 'nan', 'None', None], pd.NA)
                               .fillna('—'))

    title = f'Smart Sales Report ({mode.title()}) — {from_date} to {to_date}'
    export = request.args.get('export')
    if export == 'excel':
        return generate_excel(df, title, 'smart_sales')

    cats_sql   = "SELECT DISTINCT CATEGORY  FROM dbo.VW_RPT_SALES_DETAIL WHERE CATEGORY  IS NOT NULL ORDER BY CATEGORY"
    brands_sql = "SELECT DISTINCT BRAND     FROM dbo.VW_RPT_SALES_DETAIL WHERE BRAND     IS NOT NULL ORDER BY BRAND"
    depts_sql  = "SELECT DISTINCT DEPT_CODE FROM dbo.VW_RPT_SALES_DETAIL WHERE DEPT_CODE IS NOT NULL ORDER BY DEPT_CODE"

    df_cats,  _ = run_query(cats_sql)
    df_brands, _ = run_query(brands_sql)
    df_depts, _  = run_query(depts_sql)

    categories  = df_cats['CATEGORY'].tolist()   if not df_cats.empty   else []
    brands_list = df_brands['BRAND'].tolist()    if not df_brands.empty else []
    depts_list  = df_depts['DEPT_CODE'].tolist() if not df_depts.empty  else []

    return render_template(
        'sales/smart_report.html',
        df=df, mode=mode, title=title,
        from_date=from_date, to_date=to_date,
        dept=dept, category=category, brand=brand, mobile=mobile,
        categories=categories, brands_list=brands_list, depts_list=depts_list,
    )
