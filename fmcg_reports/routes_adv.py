"""
Advanced Sales, Purchase & Stock Transfer Routes
Blueprint: adv_bp  (prefix /adv)
API JSON:  /api/sales, /api/purchase, /api/stock-transfer
"""
from flask import Blueprint, render_template, request, jsonify, flash
import pandas as pd
from datetime import date, datetime

adv_bp = Blueprint('adv', __name__)

# ── DB Config (mirrors app.py / routes_phase2.py) ─────────────────
from db_config import load_config
DB_SERVER, DB_NAME, DB_USER, DB_PASSWORD = load_config()



def run_query(sql, params=None):
    import pyodbc
    server, name, user, password = load_config()
    conn_str = (
        f"DRIVER={{ODBC Driver 17 for SQL Server}};SERVER={server};"
        f"DATABASE={name};UID={user};PWD={password};TrustServerCertificate=yes;"
    )
    try:
        conn = pyodbc.connect(conn_str, timeout=30)
        df   = pd.read_sql(sql, conn, params=params)
        conn.close()
        return df, None
    except Exception as e:
        return pd.DataFrame(), str(e)


# ── Defaults ───────────────────────────────────────────────────────
def _month_start():
    return date.today().replace(day=1).isoformat()

def _today():
    return date.today().isoformat()


# ── Filter helpers ─────────────────────────────────────────────────
def _get_filter_lists():
    """Load distinct Category and Brand lists for dropdown menus."""
    cats, err1 = run_query("SELECT DISTINCT Category_Desc FROM dbo.Category_Mst WHERE Category_Desc IS NOT NULL ORDER BY Category_Desc")
    brds, err2 = run_query("SELECT DISTINCT Brand_Name   FROM dbo.Brand_Master   WHERE Brand_Name   IS NOT NULL ORDER BY Brand_Name")
    sups, err3 = run_query("SELECT DISTINCT SUPPLIER_NAME FROM dbo.SUPPLIER_MST  WHERE SUPPLIER_NAME IS NOT NULL ORDER BY SUPPLIER_NAME")
    categories = cats['Category_Desc'].tolist() if not cats.empty else []
    brands     = brds['Brand_Name'].tolist()    if not brds.empty else []
    suppliers  = sups['SUPPLIER_NAME'].tolist() if not sups.empty else []
    return categories, brands, suppliers


def _sales_where(from_date, to_date, category, brand, item_search, dept):
    """Build WHERE fragments for VW_ADV_SALES_BASE queries."""
    clauses = ["TRANS_DATE BETWEEN ? AND ?"]
    params  = [from_date, to_date]
    if category:    clauses.append("CATEGORY = ?");         params.append(category)
    if brand:       clauses.append("BRAND = ?");            params.append(brand)
    if dept:        clauses.append("DEPT_CODE = ?");        params.append(dept)
    if item_search:
        clauses.append("(ITEM_CODE LIKE ? OR ITEM_NAME LIKE ?)")
        params.extend([f'%{item_search}%', f'%{item_search}%'])
    return ' AND '.join(clauses), params


def _purchase_where(from_date, to_date, category, brand, supplier, item_search, dept):
    """Build WHERE fragments for VW_ADV_PURCHASE_BASE queries."""
    clauses = ["TRANS_DATE BETWEEN ? AND ?"]
    params  = [from_date, to_date]
    if category:    clauses.append("CATEGORY = ?");       params.append(category)
    if brand:       clauses.append("BRAND = ?");          params.append(brand)
    if supplier:    clauses.append("SUPPLIER_NAME LIKE ?"); params.append(f'%{supplier}%')
    if dept:        clauses.append("DEPT_CODE = ?");      params.append(dept)
    if item_search:
        clauses.append("(ITEM_CODE LIKE ? OR ITEM_NAME LIKE ?)")
        params.extend([f'%{item_search}%', f'%{item_search}%'])
    return ' AND '.join(clauses), params


def _safe_kpi(df, col, default=0.0):
    """Safely sum a column, returning default if missing."""
    if df.empty or col not in df.columns:
        return default
    try:
        return float(df[col].sum())
    except Exception:
        return default


def _filter_qs(from_date, to_date, category='', brand='', item_search='',
               supplier='', dept='', view='summary'):
    """Build query-string for template links."""
    parts = [f"from_date={from_date}", f"to_date={to_date}", f"view={view}"]
    if category:    parts.append(f"category={category}")
    if brand:       parts.append(f"brand={brand}")
    if item_search: parts.append(f"item_search={item_search}")
    if supplier:    parts.append(f"supplier={supplier}")
    if dept:        parts.append(f"dept={dept}")
    return '&'.join(parts)


# ── Group-by dimension config ──────────────────────────────────────
# Each entry: (select_cols_summary, group_by_cols, order_col, label, icon)
GROUP_BY_OPTIONS = {
    'category': {
        'label':       'Category',
        'icon':        'bi-tag',
        'dim_col':     'CATEGORY',          # single dimension column name in query result
        'select_sql':  'CATEGORY',
        'group_sql':   'CATEGORY',
        'order_sql':   'CATEGORY',
    },
    'brand': {
        'label':       'Brand',
        'icon':        'bi-bookmarks',
        'dim_col':     'BRAND',
        'select_sql':  'BRAND',
        'group_sql':   'BRAND',
        'order_sql':   'BRAND',
    },
    'supplier': {
        'label':       'Supplier',
        'icon':        'bi-building',
        'dim_col':     'SUPPLIER_NAME',
        'select_sql':  'SUPPLIER_NAME',
        'group_sql':   'SUPPLIER_NAME',
        'order_sql':   'SUPPLIER_NAME',
    },
    'item': {
        'label':       'Item',
        'icon':        'bi-box-seam',
        'dim_col':     'ITEM_NAME',          # primary display col
        'select_sql':  'ITEM_CODE, ITEM_NAME, CATEGORY, BRAND',
        'group_sql':   'ITEM_CODE, ITEM_NAME, CATEGORY, BRAND',
        'order_sql':   'ITEM_NAME',
    },
}

# ── Shared financial SELECT fragment (works on VW_ADV_SALES_BASE) ──
_SALES_FIN_SELECT = """
    SUM(CASE WHEN TRAN_TYPE='SALES'  THEN ISNULL(QTY,0)        ELSE 0 END) AS SALES_QTY,
    SUM(CASE WHEN TRAN_TYPE='SALES'  THEN ISNULL(AMOUNT,0)      ELSE 0 END) AS SALES_AMOUNT,
    SUM(CASE WHEN TRAN_TYPE='SALES'  THEN ISNULL(DISC_AMOUNT,0) ELSE 0 END) AS DISC_AMOUNT,
    ROUND(SUM(SALES_VALUE),  2)                                              AS NET_SALES,
    SUM(CASE WHEN TRAN_TYPE='REFUND' THEN ISNULL(QTY,0)        ELSE 0 END) AS REFUND_QTY,
    ROUND(SUM(REFUND_VALUE), 2)                                              AS REFUND_AMOUNT,
    0.00                                                                     AS REFUND_DISC,
    ROUND(SUM(NET_VALUE),    2)                                              AS NET_TOTAL,
    ROUND(SUM(GROSS_PROFIT), 2)                                              AS GROSS_PROFIT
"""


# ═══════════════════════════════════════════════════════════════════
# ADVANCED SALES REPORT
# ?view=summary|detail  &group_by=category|brand|supplier|item
# &from_date= &to_date= &category= &brand= &supplier= &item_search= &dept=
# ═══════════════════════════════════════════════════════════════════

@adv_bp.route('/adv/sales')
def adv_sales():
    from exports.excel_export import generate_excel
    from exports.pdf_export   import generate_pdf

    from_date    = request.args.get('from_date',    _month_start())
    to_date      = request.args.get('to_date',      _today())
    view         = request.args.get('view',          'summary')   # summary | detail
    group_by     = request.args.get('group_by',      'category')  # category|brand|supplier|item
    category     = request.args.get('category',     '')
    brand        = request.args.get('brand',        '')
    supplier_f   = request.args.get('supplier',     '')
    item_search  = request.args.get('item_search',  '')
    dept         = request.args.get('dept',         '')
    export       = request.args.get('export',       '')

    # Validate group_by
    if group_by not in GROUP_BY_OPTIONS:
        group_by = 'category'
    gbo = GROUP_BY_OPTIONS[group_by]

    # Build WHERE
    where, params = _sales_where(from_date, to_date, category, brand, item_search, dept)
    # additional supplier filter
    if supplier_f:
        where += ' AND SUPPLIER_NAME LIKE ?'
        params.append(f'%{supplier_f}%')

    categories, brands, suppliers = _get_filter_lists()

    # ── SUMMARY query: group by chosen dimension ───────────────────
    if view == 'summary':
        sql = f"""
            SELECT
                {gbo['select_sql']},
                {_SALES_FIN_SELECT}
            FROM dbo.VW_ADV_SALES_BASE
            WHERE {where}
            GROUP BY {gbo['group_sql']}
            ORDER BY SUM(NET_VALUE) DESC
        """
        df, err = run_query(sql, params)
        if err:
            flash(f'DB Error: {err}', 'danger')
            df = pd.DataFrame()

        kpi = {
            'total_sales':   _safe_kpi(df, 'NET_SALES'),
            'total_refund':  _safe_kpi(df, 'REFUND_AMOUNT'),
            'net_total':     _safe_kpi(df, 'NET_TOTAL'),
            'gross_profit':  _safe_kpi(df, 'GROSS_PROFIT'),
        }

    # ── DETAIL query: full item lines ─────────────────────────────
    else:
        sql = f"""
            SELECT
                TRANS_DATE, TRANS_NO, TRAN_TYPE, DEPT_CODE,
                ITEM_CODE, ITEM_NAME, CATEGORY, BRAND, SUPPLIER_NAME,
                QTY, AMOUNT, DISC_AMOUNT,
                SALES_VALUE, REFUND_VALUE, NET_VALUE, GROSS_PROFIT
            FROM dbo.VW_ADV_SALES_BASE
            WHERE {where}
            ORDER BY {gbo['order_sql']}, TRANS_DATE DESC, TRANS_NO
        """
        df, err = run_query(sql, params)
        if err:
            flash(f'DB Error: {err}', 'danger')
            df = pd.DataFrame()

        kpi = {
            'total_sales':   _safe_kpi(df, 'SALES_VALUE'),
            'total_refund':  _safe_kpi(df, 'REFUND_VALUE'),
            'net_total':     _safe_kpi(df, 'NET_VALUE'),
            'gross_profit':  _safe_kpi(df, 'GROSS_PROFIT'),
        }

    title = f'Advanced Sales — {gbo["label"]} Wise — {from_date} to {to_date}'

    # build common QS helper
    def _qs(**extra):
        base = {
            'from_date': from_date, 'to_date': to_date,
            'view': view, 'group_by': group_by,
        }
        if category:   base['category']    = category
        if brand:      base['brand']       = brand
        if supplier_f: base['supplier']    = supplier_f
        if item_search:base['item_search'] = item_search
        if dept:       base['dept']        = dept
        base.update(extra)
        return '&'.join(f'{k}={v}' for k, v in base.items() if v)

    filter_qs = _qs()
    # qs for switching view (keep group_by, filters, change view)
    sum_qs    = _qs(view='summary')
    det_qs    = _qs(view='detail')
    # qs for switching group_by (keep filters, keep view)
    gb_qs     = {k: _qs(group_by=k) for k in GROUP_BY_OPTIONS}

    if export == 'excel': return generate_excel(df, title, 'adv_sales')
    if export == 'pdf':   return generate_pdf(df, title, 'adv_sales')

    return render_template('adv/sales.html',
        df=df, kpi=kpi,
        view=view, group_by=group_by, gbo=gbo,
        GROUP_BY_OPTIONS=GROUP_BY_OPTIONS,
        from_date=from_date, to_date=to_date,
        category=category, brand=brand,
        supplier=supplier_f, item_search=item_search, dept=dept,
        categories=categories, brands=brands, suppliers=suppliers,
        title=title,
        filter_qs=filter_qs, sum_qs=sum_qs, det_qs=det_qs, gb_qs=gb_qs)


# ═══════════════════════════════════════════════════════════════════
# ADVANCED PURCHASE REPORT
# GET /adv/purchase?view=summary|detail&from_date=&to_date=&...
# ═══════════════════════════════════════════════════════════════════

@adv_bp.route('/adv/purchase')
def adv_purchase():
    from exports.excel_export import generate_excel
    from exports.pdf_export   import generate_pdf

    from_date   = request.args.get('from_date',   _month_start())
    to_date     = request.args.get('to_date',     _today())
    view        = request.args.get('view',         'summary')
    category    = request.args.get('category',    '')
    brand       = request.args.get('brand',       '')
    supplier    = request.args.get('supplier',    '')
    item_search = request.args.get('item_search', '')
    dept        = request.args.get('dept',        '')
    export      = request.args.get('export',      '')

    where, params = _purchase_where(from_date, to_date, category, brand,
                                    supplier, item_search, dept)
    categories, brands, suppliers = _get_filter_lists()

    if view == 'detail':
        sql = f"""
            SELECT
                TRANS_DATE, TRANS_NO, TRAN_TYPE, DEPT_CODE,
                SUPPLIER_NAME, ITEM_CODE, ITEM_NAME,
                CATEGORY, BRAND,
                QTY, RATE, COST_PRICE, MRP,
                AMOUNT, DISC_AMOUNT, TAX_AMOUNT,
                PURCHASE_VALUE, RETURN_VALUE, NET_VALUE
            FROM dbo.VW_ADV_PURCHASE_DETAIL
            WHERE {where}
            ORDER BY TRANS_DATE DESC, TRANS_NO
        """
    else:
        sql = f"""
            SELECT
                GRN_DATE, TRANS_YEAR, TRANS_MONTH, MONTH_NAME,
                DEPT_CODE, SUPPLIER_NAME, CATEGORY, BRAND,
                SUM(GRN_COUNT)     AS GRN_COUNT,
                SUM(PURCHASE_QTY)  AS PURCHASE_QTY,
                SUM(RETURN_QTY)    AS RETURN_QTY,
                SUM(TOTAL_PURCHASE)AS TOTAL_PURCHASE,
                SUM(TOTAL_RETURN)  AS TOTAL_RETURN,
                SUM(NET_PURCHASE)  AS NET_PURCHASE,
                SUM(TOTAL_TAX)     AS TOTAL_TAX
            FROM dbo.VW_ADV_PURCHASE_SUMMARY
            WHERE {where.replace('TRANS_DATE', 'GRN_DATE')}
            GROUP BY GRN_DATE, TRANS_YEAR, TRANS_MONTH, MONTH_NAME,
                     DEPT_CODE, SUPPLIER_NAME, CATEGORY, BRAND
            ORDER BY GRN_DATE DESC
        """

    df, err = run_query(sql, params)
    if err:
        flash(f'DB Error: {err}', 'danger')
        df = pd.DataFrame()

    # ── KPI summary ────────────────────────────────────────────────
    if view == 'summary':
        kpi = {
            'total_purchase': _safe_kpi(df, 'TOTAL_PURCHASE'),
            'total_return':   _safe_kpi(df, 'TOTAL_RETURN'),
            'net_purchase':   _safe_kpi(df, 'NET_PURCHASE'),
            'total_tax':      _safe_kpi(df, 'TOTAL_TAX'),
        }
    else:
        kpi = {
            'total_purchase': _safe_kpi(df, 'PURCHASE_VALUE'),
            'total_return':   _safe_kpi(df, 'RETURN_VALUE'),
            'net_purchase':   _safe_kpi(df, 'NET_VALUE'),
            'total_tax':      _safe_kpi(df, 'TAX_AMOUNT'),
        }

    # ── Top 10 Items by Purchase Value ─────────────────────────────
    top10 = pd.DataFrame()
    if view == 'summary' and not df.empty:
        sql_top = f"""
            SELECT TOP 10
                ITEM_CODE, ITEM_NAME, CATEGORY, BRAND, SUPPLIER_NAME,
                SUM(CASE WHEN TRAN_TYPE='PURCHASE' THEN QTY ELSE 0 END) AS PURCHASE_QTY,
                ROUND(SUM(PURCHASE_VALUE), 2) AS TOTAL_PURCHASE,
                ROUND(SUM(RETURN_VALUE),   2) AS TOTAL_RETURN,
                ROUND(SUM(NET_VALUE),      2) AS NET_PURCHASE
            FROM dbo.VW_ADV_PURCHASE_BASE
            WHERE {where}
            GROUP BY ITEM_CODE, ITEM_NAME, CATEGORY, BRAND, SUPPLIER_NAME
            ORDER BY SUM(NET_VALUE) DESC
        """
        top10, _ = run_query(sql_top, params)

    title   = f'Advanced Purchase Report — {from_date} to {to_date}'
    fqs     = _filter_qs(from_date, to_date, category, brand, item_search,
                         supplier=supplier, dept=dept, view=view)
    base_qs = _filter_qs(from_date, to_date, category, brand, item_search,
                         supplier=supplier, dept=dept)

    if export == 'excel': return generate_excel(df, title, 'adv_purchase')
    if export == 'pdf':   return generate_pdf(df, title, 'adv_purchase')

    return render_template('adv/purchase.html',
        df=df, kpi=kpi, top10=top10, view=view,
        from_date=from_date, to_date=to_date,
        category=category, brand=brand, supplier=supplier,
        item_search=item_search, dept=dept,
        categories=categories, brands=brands, suppliers=suppliers,
        title=title, filter_qs=fqs, base_qs=base_qs)


# ═══════════════════════════════════════════════════════════════════
# ADVANCED STOCK TRANSFER REPORT
# GET /adv/stock-transfer?from_date=&to_date=&from_loc=&to_loc=&category=
# ═══════════════════════════════════════════════════════════════════

@adv_bp.route('/adv/stock-transfer')
def adv_stock_transfer():
    from exports.excel_export import generate_excel
    from exports.pdf_export   import generate_pdf

    from_date  = request.args.get('from_date',  _month_start())
    to_date    = request.args.get('to_date',    _today())
    from_loc   = request.args.get('from_loc',   '')
    to_loc     = request.args.get('to_loc',     '')
    category   = request.args.get('category',   '')
    mtn_type   = request.args.get('mtn_type',   '')
    dept       = request.args.get('dept',       '')
    export     = request.args.get('export',     '')

    clauses = ["TRANS_DATE BETWEEN ? AND ?"]
    params  = [from_date, to_date]
    if from_loc:  clauses.append("FROM_LOCATION LIKE ?"); params.append(f'%{from_loc}%')
    if to_loc:    clauses.append("TO_LOCATION LIKE ?");   params.append(f'%{to_loc}%')
    if category:  clauses.append("CATEGORY = ?");         params.append(category)
    if mtn_type:  clauses.append("MTN_TYPE = ?");         params.append(mtn_type)
    if dept:      clauses.append("DEPT_CODE = ?");        params.append(dept)
    where = ' AND '.join(clauses)

    sql = f"""
        SELECT
            TRANS_DATE, MTN_NO, DEPT_CODE, MTN_TYPE, TRANSFER_TYPE,
            FROM_LOCATION, TO_LOCATION,
            ITEM_CODE, ITEM_NAME, CATEGORY, BRAND,
            QTY, COST_PRICE, MRP, AMOUNT,
            STOCK_IN, STOCK_OUT,
            VALUE_IN, VALUE_OUT,
            VEHICLE_NO, REMARKS, AUTH_STATUS
        FROM dbo.VW_ADV_STOCK_TRANSFER
        WHERE {where}
        ORDER BY TRANS_DATE DESC, MTN_NO
    """

    df, err = run_query(sql, params)
    if err:
        flash(f'DB Error: {err}', 'danger')
        df = pd.DataFrame()

    kpi = {
        'total_in':    _safe_kpi(df, 'STOCK_IN'),
        'total_out':   _safe_kpi(df, 'STOCK_OUT'),
        'net_movement':_safe_kpi(df, 'STOCK_IN') - _safe_kpi(df, 'STOCK_OUT'),
        'value_in':    _safe_kpi(df, 'VALUE_IN'),
        'value_out':   _safe_kpi(df, 'VALUE_OUT'),
        'transactions':len(df),
    }

    # Distinct locations for dropdowns
    loc_df, _ = run_query(
        "SELECT DISTINCT FROM_LOCATION FROM dbo.VW_ADV_STOCK_TRANSFER "
        "WHERE FROM_LOCATION <> '' ORDER BY FROM_LOCATION")
    locations = loc_df['FROM_LOCATION'].tolist() if not loc_df.empty else []

    categories, _, _ = _get_filter_lists()
    title = f'Stock Transfer Report — {from_date} to {to_date}'

    if export == 'excel': return generate_excel(df, title, 'adv_transfer')
    if export == 'pdf':   return generate_pdf(df, title, 'adv_transfer')

    return render_template('adv/stock_transfer.html',
        df=df, kpi=kpi,
        from_date=from_date, to_date=to_date,
        from_loc=from_loc, to_loc=to_loc,
        category=category, mtn_type=mtn_type, dept=dept,
        locations=locations, categories=categories,
        title=title)


# ═══════════════════════════════════════════════════════════════════
# JSON API ENDPOINTS  — for dashboard / external integration
# ═══════════════════════════════════════════════════════════════════

@adv_bp.route('/api/sales')
def api_sales():
    """
    Returns JSON: sales KPIs or top-N items.
    ?type=summary|detail|top10&from_date=&to_date=&category=&brand=
    """
    from_date   = request.args.get('from_date',   _month_start())
    to_date     = request.args.get('to_date',     _today())
    rtype       = request.args.get('type',         'summary')
    category    = request.args.get('category',    '')
    brand       = request.args.get('brand',       '')
    item_search = request.args.get('item_search', '')

    where, params = _sales_where(from_date, to_date, category, brand, item_search, '')

    if rtype == 'top10':
        sql = f"""
            SELECT TOP 10 ITEM_CODE, ITEM_NAME, CATEGORY, BRAND,
                SUM(SALES_VALUE)  AS TOTAL_SALES,
                SUM(REFUND_VALUE) AS TOTAL_REFUND,
                SUM(NET_VALUE)    AS NET_SALES,
                SUM(QTY)          AS TOTAL_QTY
            FROM dbo.VW_ADV_SALES_BASE
            WHERE {where}
            GROUP BY ITEM_CODE, ITEM_NAME, CATEGORY, BRAND
            ORDER BY SUM(NET_VALUE) DESC
        """
    elif rtype == 'detail':
        sql = f"""
            SELECT TRANS_DATE, TRANS_NO, TRAN_TYPE,
                   ITEM_CODE, ITEM_NAME, CATEGORY, BRAND, QTY,
                   SALES_VALUE, REFUND_VALUE, NET_VALUE, GROSS_PROFIT
            FROM dbo.VW_ADV_SALES_DETAIL
            WHERE {where}
            ORDER BY TRANS_DATE DESC
        """
    else:
        # Daily summary
        sql = f"""
            SELECT BILL_DATE, CATEGORY, BRAND,
                SUM(TOTAL_SALES)  AS TOTAL_SALES,
                SUM(TOTAL_REFUND) AS TOTAL_REFUND,
                SUM(NET_SALES)    AS NET_SALES,
                SUM(GROSS_PROFIT) AS GROSS_PROFIT
            FROM dbo.VW_ADV_SALES_SUMMARY
            WHERE {where.replace('TRANS_DATE', 'BILL_DATE')}
            GROUP BY BILL_DATE, CATEGORY, BRAND
            ORDER BY BILL_DATE
        """

    df, err = run_query(sql, params)
    if err:
        return jsonify({'error': err}), 500

    df = df.where(df.notna(), None)  # replace NaN with None → null in JSON
    return jsonify(df.to_dict('records'))


@adv_bp.route('/api/purchase')
def api_purchase():
    """
    Returns JSON: purchase KPIs or top-N items.
    ?type=summary|detail|top10&from_date=&to_date=&supplier=
    """
    from_date   = request.args.get('from_date',   _month_start())
    to_date     = request.args.get('to_date',     _today())
    rtype       = request.args.get('type',         'summary')
    supplier    = request.args.get('supplier',    '')
    category    = request.args.get('category',    '')

    where, params = _purchase_where(from_date, to_date, category, '', supplier, '', '')

    if rtype == 'top10':
        sql = f"""
            SELECT TOP 10 ITEM_CODE, ITEM_NAME, CATEGORY, BRAND, SUPPLIER_NAME,
                SUM(PURCHASE_VALUE) AS TOTAL_PURCHASE,
                SUM(RETURN_VALUE)   AS TOTAL_RETURN,
                SUM(NET_VALUE)      AS NET_PURCHASE,
                SUM(QTY)            AS TOTAL_QTY
            FROM dbo.VW_ADV_PURCHASE_BASE
            WHERE {where}
            GROUP BY ITEM_CODE, ITEM_NAME, CATEGORY, BRAND, SUPPLIER_NAME
            ORDER BY SUM(NET_VALUE) DESC
        """
    else:
        sql = f"""
            SELECT GRN_DATE, SUPPLIER_NAME, CATEGORY,
                SUM(TOTAL_PURCHASE) AS TOTAL_PURCHASE,
                SUM(TOTAL_RETURN)   AS TOTAL_RETURN,
                SUM(NET_PURCHASE)   AS NET_PURCHASE
            FROM dbo.VW_ADV_PURCHASE_SUMMARY
            WHERE {where.replace('TRANS_DATE', 'GRN_DATE')}
            GROUP BY GRN_DATE, SUPPLIER_NAME, CATEGORY
            ORDER BY GRN_DATE
        """

    df, err = run_query(sql, params)
    if err:
        return jsonify({'error': err}), 500

    df = df.where(df.notna(), None)
    return jsonify(df.to_dict('records'))


@adv_bp.route('/api/stock-transfer')
def api_stock_transfer():
    """
    Returns JSON stock transfer data.
    ?from_date=&to_date=&from_loc=&to_loc=
    """
    from_date = request.args.get('from_date', _month_start())
    to_date   = request.args.get('to_date',   _today())
    from_loc  = request.args.get('from_loc',  '')
    to_loc    = request.args.get('to_loc',    '')

    clauses = ["TRANS_DATE BETWEEN ? AND ?"]
    params  = [from_date, to_date]
    if from_loc: clauses.append("FROM_LOCATION LIKE ?"); params.append(f'%{from_loc}%')
    if to_loc:   clauses.append("TO_LOCATION LIKE ?");   params.append(f'%{to_loc}%')

    sql = f"""
        SELECT TRANS_DATE, MTN_NO, TRANSFER_TYPE,
               FROM_LOCATION, TO_LOCATION,
               ITEM_CODE, ITEM_NAME, CATEGORY,
               QTY, STOCK_IN, STOCK_OUT, VALUE_IN, VALUE_OUT
        FROM dbo.VW_ADV_STOCK_TRANSFER
        WHERE {' AND '.join(clauses)}
        ORDER BY TRANS_DATE DESC
    """
    df, err = run_query(sql, params)
    if err:
        return jsonify({'error': err}), 500

    df = df.where(df.notna(), None)
    return jsonify(df.to_dict('records'))


# ═══════════════════════════════════════════════════════════════════
# VIEW SCRIPTS PAGE
# Lists every view in the DB with its full CREATE script.
# GET /adv/view-scripts
# GET /adv/view-scripts?download=1   → download as .sql file
# ═══════════════════════════════════════════════════════════════════

@adv_bp.route('/adv/view-scripts')
def view_scripts():
    from flask import Response

    sql = """
        SELECT
            s.name                                    AS SCHEMA_NAME,
            v.name                                    AS VIEW_NAME,
            s.name + '.' + v.name                    AS FULL_NAME,
            m.definition                              AS VIEW_DEFINITION,
            CONVERT(VARCHAR(20), v.create_date, 120) AS CREATED_ON,
            CONVERT(VARCHAR(20), v.modify_date, 120) AS MODIFIED_ON,
            (SELECT COUNT(*) FROM sys.columns c
             WHERE c.object_id = v.object_id)         AS COL_COUNT
        FROM sys.views          v
        INNER JOIN sys.schemas  s ON v.schema_id  = s.schema_id
        INNER JOIN sys.sql_modules m ON v.object_id = m.object_id
        ORDER BY s.name, v.name
    """
    df, err = run_query(sql)
    if err:
        flash(f'DB Error: {err}', 'danger')
        df = pd.DataFrame()

    # ── Download as single .sql file ──────────────────────────────
    if request.args.get('download') == '1' and not df.empty:
        lines = [
            f'-- ============================================================',
            f'-- ALL VIEWS — {DB_NAME}',
            f'-- Generated  : {datetime.now().strftime("%Y-%m-%d %H:%M:%S")}',
            f'-- Total views: {len(df)}',
            f'-- ============================================================',
            '',
        ]
        for _, row in df.iterrows():
            defn = (row['VIEW_DEFINITION'] or '').strip()
            # Make safe to re-run: DROP IF EXISTS + CREATE
            vname = row['FULL_NAME']
            lines += [
                '',
                f'-- ── {vname} '
                f'(cols:{row["COL_COUNT"]}, modified:{row["MODIFIED_ON"]}) ──',
                f"IF OBJECT_ID('{vname}','V') IS NOT NULL DROP VIEW {vname}",
                'GO',
                defn,
                'GO',
                '',
            ]
        sql_text = '\n'.join(lines)
        return Response(
            sql_text,
            mimetype='text/plain',
            headers={'Content-Disposition':
                f'attachment; filename="{DB_NAME}_all_views_{date.today()}.sql"'}
        )

    # ── Group by schema for the sidebar ───────────────────────────
    schemas = {}
    if not df.empty:
        for _, row in df.iterrows():
            schemas.setdefault(row['SCHEMA_NAME'], []).append(row.to_dict())

    return render_template('adv/view_scripts.html',
        df=df, schemas=schemas,
        db_name=DB_NAME,
        title=f'All View Scripts — {DB_NAME}'
    )
