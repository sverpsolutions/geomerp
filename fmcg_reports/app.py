"""
Business Reporting Suite — Main Flask Application
Supports any business type. Role-based access with company branding.
"""
from flask import (Flask, render_template, request, redirect,
                   url_for, send_file, flash, jsonify, session)
import pyodbc, pandas as pd, json, io, os
from datetime import datetime, date, timedelta
from werkzeug.security import generate_password_hash
from db_config import get_secret
from exports.pdf_export  import generate_pdf
from exports.excel_export import generate_excel
from exports.email_send   import send_report_email

app = Flask(__name__)
app.secret_key    = get_secret('FLASK_SECRET_KEY') or os.urandom(24)
app.permanent_session_lifetime = timedelta(hours=8)

from db_config import load_config
DB_SERVER, DB_NAME, DB_USER, DB_PASSWORD = load_config()


# ═════════════════════════════════════════════════════════════════════════════
# DATABASE
# ═════════════════════════════════════════════════════════════════════════════

def get_conn():
    server, name, user, password = load_config()
    return pyodbc.connect(
        f"DRIVER={{ODBC Driver 17 for SQL Server}};SERVER={server};"
        f"DATABASE={name};UID={user};PWD={password};TrustServerCertificate=yes;",
        timeout=30)


def run_query(sql, params=None):
    try:
        conn = get_conn()
        df   = pd.read_sql(sql, conn, params=params)
        conn.close()
        return df, None
    except Exception as e:
        return pd.DataFrame(), str(e)


def fmt_date(d):
    try:    return datetime.strptime(str(d), '%Y-%m-%d').strftime('%d/%m/%Y')
    except: return str(d) if d else ''


# ═════════════════════════════════════════════════════════════════════════════
# DB INITIALISATION — seed company_master, reports_master, SuperAdmin
# ═════════════════════════════════════════════════════════════════════════════

REPORTS_SEED = [
    ('Sales Summary',      'sales_summary',      'Sales'),
    ('Sales Detail',       'sales_detail',        'Sales'),
    ('Smart Sales Report', 'smart_sales',         'Sales'),
    ('Payment Collection', 'payment_collection',  'Sales'),
    ('Sales Returns',      'sales_returns',        'Sales'),
    ('Customer List',      'customer_list',        'Customer'),
    ('Customer Ledger',    'customer_ledger',      'Customer'),
    ('Loyalty Points',     'customer_loyalty',     'Customer'),
    ('Segments (RFM)',     'customer_segments',    'Customer'),
    ('Purchase Trend',     'customer_trend',       'Customer'),
    ('Smart Promotions',   'customer_promotions',  'Customer'),
    ('Purchase Summary',   'purchase_summary',     'Purchase'),
    ('Purchase Detail',    'purchase_detail',      'Purchase'),
    ('Purchase Returns',   'purchase_returns',     'Purchase'),
    ('Stock Status',       'inventory_stock',      'Inventory'),
    ('Stock Transfer',     'stock_transfer',       'Inventory'),
    ('Stock Valuation',    'stock_valuation',      'Inventory'),
    ('Live Dashboard',     'dashboard_live',       'Analytics'),
    ('Sales Trend',        'sales_trend',          'Analytics'),
    ('Top Items',          'top_items',            'Analytics'),
    ('Category Sales',     'category_sales',       'Analytics'),
    ('Supplier Report',    'supplier_report',      'Analytics'),
    ('Item Velocity',      'item_velocity',        'Analytics'),
    ('Profitability',      'profitability',        'Analytics'),
    ('Sales vs Purchase',  'sales_vs_purchase',    'Analytics'),
    ('Exceptions',         'exceptions',           'Analytics'),
    ('HSN Sales',          'gst_hsn_sales',        'GST'),
    ('HSN Purchase',       'gst_hsn_purchase',     'GST'),
    ('HSN Comparison',     'hsn_comparison',       'GST'),
    ('GSTR-1',             'gstr1',                'GST'),
    ('GSTR-3B',            'gstr3b',               'GST'),
    ('ITC Report',         'itc_report',           'GST'),
    ('Credit Notes',       'credit_notes',         'GST'),
    # Advanced reports
    ('Adv Sales Report',   'adv_sales',            'Advanced'),
    ('Adv Purchase Report','adv_purchase',          'Advanced'),
    ('Adv Stock Transfer', 'adv_stock_transfer',   'Advanced'),
    ('View Scripts',       'adv_view_scripts',     'Advanced'),
]


def init_db():
    """Ensure seed data exists. Tables must already exist (run sql/03_auth_company_tables.sql)."""
    try:
        conn   = get_conn()
        cursor = conn.cursor()

        # -- Company default row
        cursor.execute("SELECT COUNT(*) FROM dbo.company_master")
        if cursor.fetchone()[0] == 0:
            cursor.execute(
                "INSERT INTO dbo.company_master (company_name, footer) VALUES (?, ?)",
                ('My Company', 'Thank you for your business.'))

        # -- Reports master: insert any missing report_key
        cursor.execute("SELECT report_key FROM dbo.reports_master")
        existing_keys = {r[0] for r in cursor.fetchall()}
        for name, key, cat in REPORTS_SEED:
            if key not in existing_keys:
                cursor.execute(
                    "INSERT INTO dbo.reports_master (report_name, report_key, category) VALUES (?, ?, ?)",
                    (name, key, cat))

        # -- SuperAdmin (only if none exists)
        cursor.execute("SELECT COUNT(*) FROM dbo.app_users WHERE role='superadmin'")
        if cursor.fetchone()[0] == 0:
            pw = generate_password_hash(get_secret('SUPERADMIN_PASSWORD', 'ChangeMe@123'))
            cursor.execute(
                "INSERT INTO dbo.app_users (username, password, role) VALUES (?, ?, ?)",
                ('SuperAdmin', pw, 'superadmin'))
            print("[init_db] SuperAdmin created: username=SuperAdmin (password from SUPERADMIN_PASSWORD)")

        conn.commit()
        conn.close()
    except Exception as e:
        print(f"[init_db] Warning: {e}")


# ═════════════════════════════════════════════════════════════════════════════
# BLUEPRINTS
# ═════════════════════════════════════════════════════════════════════════════

from routes_phase2 import phase2_bp
from admin_routes  import admin_bp
from routes_adv    import adv_bp
from setup_routes  import setup_bp

app.register_blueprint(phase2_bp)
app.register_blueprint(admin_bp)
app.register_blueprint(adv_bp)
app.register_blueprint(setup_bp)


# ═════════════════════════════════════════════════════════════════════════════
# CONTEXT PROCESSOR — inject company + user info into every template
# ═════════════════════════════════════════════════════════════════════════════

@app.context_processor
def inject_globals():
    # Load company info
    company = {'company_name': 'My Company', 'logo_path': None,
               'address': '', 'mobile': '', 'email': '', 'gst': '', 'footer': ''}
    try:
        conn   = get_conn()
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM dbo.company_master")
        row = cursor.fetchone()
        if row:
            company = dict(zip([d[0] for d in cursor.description], row))
        conn.close()
    except Exception:
        pass

    from auth import get_allowed_reports, is_superadmin
    current_user = {
        'user_id':  session.get('user_id'),
        'username': session.get('username', ''),
        'role':     session.get('role', ''),
    }
    return dict(
        company         = company,
        current_user    = current_user,
        allowed_reports = get_allowed_reports(),
        is_superadmin   = is_superadmin(),
    )


# ═════════════════════════════════════════════════════════════════════════════
# AUTHENTICATION GATE — before every request
# ═════════════════════════════════════════════════════════════════════════════

from auth import URL_REPORT_MAP, PUBLIC_PATHS, PUBLIC_PREFIXES, can_access_report

@app.before_request
def auth_gate():
    path = request.path

    # Always allow public paths and static files
    if path in PUBLIC_PATHS or any(path.startswith(p) for p in PUBLIC_PREFIXES):
        return None

    # Must be logged in for everything else
    if 'user_id' not in session:
        return redirect(url_for('admin.login'))

    # Check report-level access
    if path in URL_REPORT_MAP:
        report_key = URL_REPORT_MAP[path]
        if not can_access_report(report_key):
            flash('You do not have access to this report.', 'warning')
            return redirect(url_for('index'))

    # Admin routes require superadmin (handled inside admin_routes.py too)
    if path.startswith('/admin/') and session.get('role') != 'superadmin':
        flash('SuperAdmin access required.', 'danger')
        return redirect(url_for('index'))


# ═════════════════════════════════════════════════════════════════════════════
# DASHBOARD
# ═════════════════════════════════════════════════════════════════════════════

@app.route('/')
def index():
    kpis = {}
    for label, sql in [
        ('today', "SELECT COUNT(BILL_NO) AS BILLS, ISNULL(SUM(GRAND_TOTAL),0) AS SALES, ISNULL(SUM(DISC_AMOUNT),0) AS DISC, ISNULL(AVG(GRAND_TOTAL),0) AS AVG_BILL FROM dbo.SALES_HDR WHERE CONVERT(DATE,BILL_DATE)=CONVERT(DATE,GETDATE()) AND ISNULL(ISCANCELLED,0)=0"),
        ('mtd',   "SELECT ISNULL(SUM(GRAND_TOTAL),0) AS SALES, COUNT(BILL_NO) AS BILLS FROM dbo.SALES_HDR WHERE MONTH(BILL_DATE)=MONTH(GETDATE()) AND YEAR(BILL_DATE)=YEAR(GETDATE()) AND ISNULL(ISCANCELLED,0)=0"),
        ('low',   "SELECT COUNT(*) AS CNT FROM dbo.ITEM_MST WHERE ISNULL(QOH,0)<=ISNULL(REORDER_LVL,0) AND ISNULL(Discontinue,0)=0"),
    ]:
        df, _ = run_query(sql)
        if not df.empty:
            row = df.iloc[0]
            kpis[label] = {c: (int(v) if 'BILLS' in c or 'CNT' in c else float(v)) for c, v in row.items()}
    return render_template('index.html', kpis=kpis)


# ═════════════════════════════════════════════════════════════════════════════
# SALES
# ═════════════════════════════════════════════════════════════════════════════

@app.route('/sales/summary')
def sales_summary():
    fd   = request.args.get('from_date', date.today().replace(day=1).isoformat())
    td   = request.args.get('to_date',   date.today().isoformat())
    dept = request.args.get('dept', '')
    sql  = f"""SELECT BILL_DATE,DEPT_CODE,COUNT(BILL_NO) BILLS,SUM(GRAND_TOTAL) SALES,
                      SUM(DISCOUNT) DISCOUNT,AVG(GRAND_TOTAL) AVG_BILL
               FROM dbo.VW_RPT_SALES_SUMMARY
               WHERE BILL_DATE BETWEEN ? AND ? {"AND DEPT_CODE=?" if dept else ""}
               GROUP BY BILL_DATE,DEPT_CODE ORDER BY BILL_DATE DESC"""
    df, err = run_query(sql, [fd, td] + ([dept] if dept else []))
    if err: flash(f'DB Error: {err}', 'danger')
    exp   = request.args.get('export')
    title = f'Sales Summary: {fmt_date(fd)} to {fmt_date(td)}'
    if exp == 'pdf':   return generate_pdf(df, title, 'sales_summary')
    if exp == 'excel': return generate_excel(df, title, 'sales_summary')
    return render_template('sales/summary.html', df=df, from_date=fd, to_date=td, dept=dept, title=title)


@app.route('/sales/detail')
def sales_detail():
    fd   = request.args.get('from_date', date.today().isoformat())
    td   = request.args.get('to_date',   date.today().isoformat())
    cat  = request.args.get('category', '')
    dept = request.args.get('dept', '')
    sql  = f"""SELECT BILL_DATE,BILL_NO,DEPT_CODE,CUSTOMER_NAME,ITEM_CODE,ITEM_NAME,CATEGORY,BRAND,
                      QTY,RATE,MRP,COST_PRICE,AMOUNT,DISC_AMOUNT,GROSS_PROFIT,MARGIN_PCT
               FROM dbo.VW_RPT_SALES_DETAIL
               WHERE BILL_DATE BETWEEN ? AND ?
               {"AND CATEGORY=?" if cat else ""} {"AND DEPT_CODE=?" if dept else ""}
               ORDER BY BILL_DATE DESC,BILL_NO"""
    df, err = run_query(sql, [fd, td] + ([cat] if cat else []) + ([dept] if dept else []))
    if err: flash(f'DB Error: {err}', 'danger')
    exp   = request.args.get('export')
    title = f'Sales Detail: {fmt_date(fd)} to {fmt_date(td)}'
    if exp == 'pdf':   return generate_pdf(df, title, 'sales_detail')
    if exp == 'excel': return generate_excel(df, title, 'sales_detail')
    return render_template('sales/detail.html', df=df, from_date=fd, to_date=td, title=title)


@app.route('/sales/payment')
def sales_payment():
    fd  = request.args.get('from_date', date.today().isoformat())
    td  = request.args.get('to_date',   date.today().isoformat())
    df, err = run_query(
        "SELECT BILL_DATE,DEPT_CODE,PAYMENT_MODE,COUNT(BILL_NO) BILLS,SUM(PAY_AMOUNT) COLLECTED "
        "FROM dbo.VW_RPT_PAYMENT_COLLECTION WHERE BILL_DATE BETWEEN ? AND ? "
        "GROUP BY BILL_DATE,DEPT_CODE,PAYMENT_MODE ORDER BY BILL_DATE DESC", [fd, td])
    if err: flash(f'DB Error: {err}', 'danger')
    exp   = request.args.get('export')
    title = f'Payment Collection: {fmt_date(fd)} to {fmt_date(td)}'
    if exp == 'pdf':   return generate_pdf(df, title, 'payment')
    if exp == 'excel': return generate_excel(df, title, 'payment')
    return render_template('sales/payment.html', df=df, from_date=fd, to_date=td, title=title)


@app.route('/sales/returns')
def sales_returns():
    fd  = request.args.get('from_date', date.today().replace(day=1).isoformat())
    td  = request.args.get('to_date',   date.today().isoformat())
    df, err = run_query(
        "SELECT RETURN_DATE,DEPT_CODE,BILL_RTN_NO,AGAINST_BILL_NO,ITEM_NAME,CATEGORY,RTN_QTY,"
        "RATE,AMOUNT,GRAND_TOTAL,REASON_FOR_REFUND,REFUND_MODE,REFUND_AMOUNT "
        "FROM dbo.VW_RPT_SALES_RETURN WHERE RETURN_DATE BETWEEN ? AND ? ORDER BY RETURN_DATE DESC", [fd, td])
    if err: flash(f'DB Error: {err}', 'danger')
    exp   = request.args.get('export')
    title = f'Sales Returns: {fmt_date(fd)} to {fmt_date(td)}'
    if exp == 'pdf':   return generate_pdf(df, title, 'sales_returns')
    if exp == 'excel': return generate_excel(df, title, 'sales_returns')
    return render_template('sales/returns.html', df=df, from_date=fd, to_date=td, title=title)


# ═════════════════════════════════════════════════════════════════════════════
# CUSTOMER
# ═════════════════════════════════════════════════════════════════════════════

@app.route('/customer/list')
def customer_list():
    city = request.args.get('city', '')
    vip  = request.args.get('vip', '')
    sql  = (f"SELECT CUSTOMER_CODE,CUSTOMER_NAME,GENDER,MOBILE,EMAIL,CITY,IS_VIP,CARD_TYPE,"
            f"TOTAL_TRANSACTIONS,TOTAL_VALUE,BALANCE_POINTS,FIRST_VISIT,LAST_VISIT,AVG_BILL_AMOUNT "
            f"FROM dbo.VW_RPT_CUSTOMER WHERE 1=1 "
            f"{'AND CITY=?' if city else ''} {'AND IS_VIP=1' if vip=='1' else ''} ORDER BY TOTAL_VALUE DESC")
    df, err = run_query(sql, [city] if city else None)
    if err: flash(f'DB Error: {err}', 'danger')
    if not df.empty:
        df['MOBILE'] = df['MOBILE'].replace(['', 'nan', 'None', None], pd.NA).fillna(df['CUSTOMER_NAME'])
    exp   = request.args.get('export')
    title = 'Customer Master List'
    if exp == 'pdf':   return generate_pdf(df, title, 'customer_list')
    if exp == 'excel': return generate_excel(df, title, 'customer_list')
    return render_template('customer/list.html', df=df, city=city, vip=vip, title=title)


@app.route('/customer/ledger')
def customer_ledger():
    mobile = request.args.get('mobile', '').strip()
    fd  = request.args.get('from_date', date.today().replace(day=1).isoformat())
    td  = request.args.get('to_date',   date.today().isoformat())
    df  = pd.DataFrame()
    if mobile:
        df, err = run_query(
            "SELECT BILL_DATE,BILL_NO,DEPT_CODE,CUSTOMER_NAME,MOBILE,BILL_AMOUNT,DISCOUNT,"
            "REDEEM_AMOUNT,PAYMENT_MODE,PAID_AMOUNT,BALANCE,TXN_TYPE "
            "FROM dbo.VW_RPT_CUSTOMER_LEDGER WHERE (MOBILE=? OR CUSTOMER_NAME=?) AND BILL_DATE BETWEEN ? AND ? ORDER BY BILL_DATE",
            [mobile, mobile, fd, td])
        if err: flash(f'DB Error: {err}', 'danger')
    if not df.empty:
        df['MOBILE'] = df['MOBILE'].replace(['', 'nan', 'None', None], pd.NA).fillna(df['CUSTOMER_NAME'])
    exp   = request.args.get('export')
    title = 'Customer Ledger'
    if exp == 'pdf':   return generate_pdf(df, title, 'cust_ledger')
    if exp == 'excel': return generate_excel(df, title, 'cust_ledger')
    return render_template('customer/ledger.html', df=df, mobile=mobile, from_date=fd, to_date=td, title=title)


@app.route('/customer/loyalty')
def customer_loyalty():
    mobile = request.args.get('mobile', '').strip()
    fd  = request.args.get('from_date', date.today().replace(day=1).isoformat())
    td  = request.args.get('to_date',   date.today().isoformat())
    sql = (f"SELECT TXN_DATE,CUSTOMER_CODE,CUSTOMER_NAME,MOBILE,TXN_TYPE,POINTS_EARNED,EARN_VALUE,"
           f"POINTS_REDEEMED,REDEEM_VALUE,BILL_VALUE,DEPT_CODE "
           f"FROM dbo.VW_RPT_LOYALTY_LEDGER WHERE TXN_DATE BETWEEN ? AND ? "
           f"{'AND (MOBILE=? OR CUSTOMER_NAME=?)' if mobile else ''} ORDER BY TXN_DATE DESC")
    df, err = run_query(sql, [fd, td] + ([mobile, mobile] if mobile else []))
    if err: flash(f'DB Error: {err}', 'danger')
    if not df.empty:
        df['MOBILE'] = df['MOBILE'].replace(['', 'nan', 'None', None], pd.NA).fillna(df['CUSTOMER_NAME'])
    exp   = request.args.get('export')
    title = 'Loyalty Points Ledger'
    if exp == 'excel': return generate_excel(df, title, 'loyalty')
    return render_template('customer/loyalty.html', df=df, mobile=mobile, from_date=fd, to_date=td, title=title)


# ═════════════════════════════════════════════════════════════════════════════
# PURCHASE
# ═════════════════════════════════════════════════════════════════════════════

@app.route('/purchase/summary')
def purchase_summary():
    fd  = request.args.get('from_date', date.today().replace(day=1).isoformat())
    td  = request.args.get('to_date',   date.today().isoformat())
    sup = request.args.get('supplier', '')
    sql = (f"SELECT GRN_DATE,DEPT_CODE,GRN_NO,SUPPLIER_INVOICE_NO,SUPPLIER_NAME,SUPPLIER_PHONE,"
           f"SUBTOTAL,TOTAL_DISCOUNT,TOTAL_TAX,GRAND_TOTAL,TOTAL_QTY,FREIGHT,OTHER_CHARGES,REMARKS "
           f"FROM dbo.VW_RPT_PURCHASE_SUMMARY WHERE GRN_DATE BETWEEN ? AND ? "
           f"{'AND SUPPLIER_NAME LIKE ?' if sup else ''} ORDER BY GRN_DATE DESC")
    df, err = run_query(sql, [fd, td] + ([f'%{sup}%'] if sup else []))
    if err: flash(f'DB Error: {err}', 'danger')
    exp   = request.args.get('export')
    title = f'Purchase Summary: {fmt_date(fd)} to {fmt_date(td)}'
    if exp == 'pdf':   return generate_pdf(df, title, 'pur_summary')
    if exp == 'excel': return generate_excel(df, title, 'pur_summary')
    return render_template('purchase/summary.html', df=df, from_date=fd, to_date=td, supplier=sup, title=title)


@app.route('/purchase/detail')
def purchase_detail():
    fd  = request.args.get('from_date', date.today().replace(day=1).isoformat())
    td  = request.args.get('to_date',   date.today().isoformat())
    df, err = run_query(
        "SELECT GRN_DATE,GRN_NO,DEPT_CODE,SUPPLIER_NAME,ITEM_CODE,ITEM_NAME,CATEGORY,BRAND,"
        "RECEIVED_QTY,FREE_QTY,COST_PRICE,SALE_PRICE,MRP,AMOUNT,ITEM_DISC,BILL_DISC,TAX_AMOUNT,HSN_CODE "
        "FROM dbo.VW_RPT_PURCHASE_DETAIL WHERE GRN_DATE BETWEEN ? AND ? ORDER BY GRN_DATE DESC,GRN_NO",
        [fd, td])
    if err: flash(f'DB Error: {err}', 'danger')
    exp   = request.args.get('export')
    title = f'Purchase Detail: {fmt_date(fd)} to {fmt_date(td)}'
    if exp == 'pdf':   return generate_pdf(df, title, 'pur_detail')
    if exp == 'excel': return generate_excel(df, title, 'pur_detail')
    return render_template('purchase/detail.html', df=df, from_date=fd, to_date=td, title=title)


@app.route('/purchase/returns')
def purchase_returns():
    fd  = request.args.get('from_date', date.today().replace(day=1).isoformat())
    td  = request.args.get('to_date',   date.today().isoformat())
    df, err = run_query(
        "SELECT PRN_DATE,PRN_NO,DEPT_CODE,SUPPLIER_NAME,ITEM_NAME,CATEGORY,RETURN_QTY,"
        "COST_PRICE,MRP,AMOUNT,TAX_AMOUNT,GRAND_TOTAL,AGAINST_GRN,REMARKS "
        "FROM dbo.VW_RPT_PURCHASE_RETURN WHERE PRN_DATE BETWEEN ? AND ? ORDER BY PRN_DATE DESC",
        [fd, td])
    if err: flash(f'DB Error: {err}', 'danger')
    exp   = request.args.get('export')
    title = f'Purchase Returns: {fmt_date(fd)} to {fmt_date(td)}'
    if exp == 'pdf':   return generate_pdf(df, title, 'pur_returns')
    if exp == 'excel': return generate_excel(df, title, 'pur_returns')
    return render_template('purchase/returns.html', df=df, from_date=fd, to_date=td, title=title)


# ═════════════════════════════════════════════════════════════════════════════
# INVENTORY
# ═════════════════════════════════════════════════════════════════════════════

@app.route('/inventory/stock')
def inventory_stock():
    cat = request.args.get('category', '')
    sts = request.args.get('status', '')
    sql = (f"SELECT ITEM_CODE,ITEM_NAME,EAN_CODE,CATEGORY,BRAND,SUPPLIER_NAME,QTY_ON_HAND,"
           f"REORDER_LEVEL,MIN_STOCK,MAX_STOCK,COST_PRICE,MRP,SALE_PRICE,STOCK_VALUE_CP,"
           f"STOCK_VALUE_MRP,STOCK_STATUS,EXPIRY_STATUS "
           f"FROM dbo.VW_RPT_STOCK_STATUS WHERE 1=1 "
           f"{'AND CATEGORY=?' if cat else ''} {'AND STOCK_STATUS=?' if sts else ''} ORDER BY CATEGORY,ITEM_NAME")
    df, err = run_query(sql, ([cat] if cat else []) + ([sts] if sts else []) or None)
    if err: flash(f'DB Error: {err}', 'danger')
    exp   = request.args.get('export')
    title = 'Stock Status Report'
    if exp == 'pdf':   return generate_pdf(df, title, 'stock')
    if exp == 'excel': return generate_excel(df, title, 'stock')
    return render_template('inventory/stock.html', df=df, category=cat, status=sts, title=title)


@app.route('/inventory/transfer')
def stock_transfer():
    fd  = request.args.get('from_date', date.today().replace(day=1).isoformat())
    td  = request.args.get('to_date',   date.today().isoformat())
    mt  = request.args.get('mtn_type', '')
    sql = (f"SELECT TRANSFER_DATE,MTN_NO,DEPT_CODE,TRANSFER_TYPE,FROM_LOCATION,TO_LOCATION,"
           f"ITEM_NAME,CATEGORY,QTY,COST_PRICE,MRP,AMOUNT,VEHICLE_NO,REMARKS "
           f"FROM dbo.VW_RPT_STOCK_TRANSFER WHERE TRANSFER_DATE BETWEEN ? AND ? "
           f"{'AND MTN_TYPE=?' if mt else ''} ORDER BY TRANSFER_DATE DESC")
    df, err = run_query(sql, [fd, td] + ([mt] if mt else []))
    if err: flash(f'DB Error: {err}', 'danger')
    exp   = request.args.get('export')
    title = f'Stock Transfer: {fmt_date(fd)} to {fmt_date(td)}'
    if exp == 'pdf':   return generate_pdf(df, title, 'transfer')
    if exp == 'excel': return generate_excel(df, title, 'transfer')
    return render_template('inventory/transfer.html', df=df, from_date=fd, to_date=td, mtn_type=mt, title=title)


# ═════════════════════════════════════════════════════════════════════════════
# ANALYTICS
# ═════════════════════════════════════════════════════════════════════════════

@app.route('/analytics/trend')
def analytics_trend():
    fd  = request.args.get('from_date', date.today().replace(month=1, day=1).isoformat())
    td  = request.args.get('to_date',   date.today().isoformat())
    df, err = run_query(
        """SELECT CONVERT(DATE,BILL_DATE) SALE_DATE,DATENAME(WEEKDAY,BILL_DATE) WEEKDAY,
                  DATENAME(MONTH,BILL_DATE) MONTH_NAME,COUNT(BILL_NO) BILL_COUNT,
                  SUM(ISNULL(GRAND_TOTAL,0)) TOTAL_SALES,SUM(ISNULL(DISC_AMOUNT,0)) TOTAL_DISCOUNT,
                  AVG(ISNULL(GRAND_TOTAL,0)) AVG_BILL_VALUE,SH_DEPT_CODE DEPT_CODE
           FROM dbo.SALES_HDR WHERE CONVERT(DATE,BILL_DATE) BETWEEN ? AND ? AND ISNULL(ISCANCELLED,0)=0
           GROUP BY CONVERT(DATE,BILL_DATE),DATENAME(WEEKDAY,BILL_DATE),DATENAME(MONTH,BILL_DATE),SH_DEPT_CODE
           ORDER BY SALE_DATE""", [fd, td])
    if err: flash(f'DB Error: {err}', 'danger')
    chart_data = []
    if not df.empty:
        tmp = df[['SALE_DATE', 'TOTAL_SALES', 'BILL_COUNT']].copy()
        tmp['SALE_DATE'] = tmp['SALE_DATE'].astype(str)
        chart_data = tmp.to_dict('records')
    exp   = request.args.get('export')
    title = 'Sales Trend Analysis'
    if exp == 'excel': return generate_excel(df, title, 'trend')
    return render_template('analytics/trend.html', df=df, chart_data=json.dumps(chart_data),
                           from_date=fd, to_date=td, title=title)


@app.route('/analytics/top_items')
def top_items():
    top_n = int(request.args.get('top_n', 20))
    df, err = run_query(
        f"SELECT TOP({top_n}) ITEM_CODE,ITEM_NAME,CATEGORY,BRAND,BILL_COUNT,TOTAL_QTY_SOLD,"
        f"TOTAL_SALES,TOTAL_DISCOUNT,GROSS_PROFIT,AVG_RATE FROM dbo.VW_RPT_TOP_ITEMS ORDER BY TOTAL_SALES DESC")
    if err: flash(f'DB Error: {err}', 'danger')
    exp   = request.args.get('export')
    title = f'Top {top_n} Selling Items'
    if exp == 'pdf':   return generate_pdf(df, title, 'top_items')
    if exp == 'excel': return generate_excel(df, title, 'top_items')
    return render_template('analytics/top_items.html', df=df, top_n=top_n, title=title)


@app.route('/analytics/category')
def category_performance():
    fd  = request.args.get('from_date', date.today().replace(month=1, day=1).isoformat())
    td  = request.args.get('to_date',   date.today().isoformat())
    df, err = run_query(
        "SELECT YEAR,MONTH,MONTH_NAME,CATEGORY,BILL_COUNT,TOTAL_QTY,TOTAL_SALES,TOTAL_DISCOUNT,GROSS_PROFIT "
        "FROM dbo.VW_RPT_CATEGORY_SALES "
        "WHERE YEAR*100+MONTH BETWEEN YEAR(?)*100+MONTH(?) AND YEAR(?)*100+MONTH(?) "
        "ORDER BY YEAR,MONTH,TOTAL_SALES DESC", [fd, fd, td, td])
    if err: flash(f'DB Error: {err}', 'danger')
    exp   = request.args.get('export')
    title = 'Category Performance'
    if exp == 'pdf':   return generate_pdf(df, title, 'category')
    if exp == 'excel': return generate_excel(df, title, 'category')
    return render_template('analytics/category.html', df=df, from_date=fd, to_date=td, title=title)


@app.route('/analytics/supplier')
def supplier_performance():
    year = request.args.get('year', str(date.today().year))
    df, err = run_query(
        "SELECT SUPPLIER_NAME,PHONE,MONTH_NAME,MONTH,TOTAL_GRNS,TOTAL_QTY,TOTAL_PURCHASE_VALUE,"
        "TOTAL_DISCOUNT,TOTAL_RETURNS,TOTAL_RETURN_VALUE "
        "FROM dbo.VW_RPT_SUPPLIER_PERFORMANCE WHERE YEAR=? ORDER BY TOTAL_PURCHASE_VALUE DESC", [year])
    if err: flash(f'DB Error: {err}', 'danger')
    exp   = request.args.get('export')
    title = f'Supplier Performance – {year}'
    if exp == 'pdf':   return generate_pdf(df, title, 'supplier')
    if exp == 'excel': return generate_excel(df, title, 'supplier')
    return render_template('analytics/supplier.html', df=df, year=year, title=title)


# ═════════════════════════════════════════════════════════════════════════════
# UTILITIES
# ═════════════════════════════════════════════════════════════════════════════

@app.route('/email_report', methods=['POST'])
def email_report():
    result = send_report_email(
        request.form.get('to_email'),
        request.form.get('report_name', 'Report'))
    flash(result, 'success' if 'sent' in result.lower() else 'danger')
    return redirect(request.referrer or url_for('index'))


@app.route('/health')
def health_check():
    return jsonify({'status': 'ok', 'version': '3.0'})


@app.errorhandler(404)
def page_not_found(e):
    return render_template('errors/404.html', path=request.path), 404


@app.errorhandler(500)
def server_error(e):
    return render_template('errors/500.html', error=str(e)), 500


# ═════════════════════════════════════════════════════════════════════════════
# ENTRY POINT
# ═════════════════════════════════════════════════════════════════════════════

if __name__ == '__main__':
    import threading
    threading.Thread(target=init_db, daemon=True).start()
    app.run(debug=True, host='0.0.0.0', port=5000)
