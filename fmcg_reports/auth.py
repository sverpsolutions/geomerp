"""
Authentication helpers and URL-to-report-key mapping.
"""
from flask import session

# Maps every protected URL path → report_key
URL_REPORT_MAP = {
    '/sales/summary':               'sales_summary',
    '/sales/detail':                'sales_detail',
    '/sales/smart_report':          'smart_sales',
    '/sales/payment':               'payment_collection',
    '/sales/returns':               'sales_returns',
    '/customer/list':               'customer_list',
    '/customer/ledger':             'customer_ledger',
    '/customer/loyalty':            'customer_loyalty',
    '/customer/segments':           'customer_segments',
    '/customer/trend':              'customer_trend',
    '/customer/promotions':         'customer_promotions',
    '/purchase/summary':            'purchase_summary',
    '/purchase/detail':             'purchase_detail',
    '/purchase/returns':            'purchase_returns',
    '/inventory/stock':             'inventory_stock',
    '/inventory/transfer':          'stock_transfer',
    '/analytics/stock_valuation':   'stock_valuation',
    '/analytics/dashboard_live':    'dashboard_live',
    '/analytics/trend':             'sales_trend',
    '/analytics/top_items':         'top_items',
    '/analytics/category':          'category_sales',
    '/analytics/supplier':          'supplier_report',
    '/analytics/velocity':          'item_velocity',
    '/analytics/profitability':     'profitability',
    '/analytics/sales_vs_purchase': 'sales_vs_purchase',
    '/analytics/exceptions':        'exceptions',
    '/gst/hsn_sales':               'gst_hsn_sales',
    '/gst/hsn_purchase':            'gst_hsn_purchase',
    '/gst/hsn_comparison':          'hsn_comparison',
    '/gst/gstr1':                   'gstr1',
    '/gst/gstr3b':                  'gstr3b',
    '/gst/itc':                     'itc_report',
    '/gst/cdnr':                    'credit_notes',
    # ── Advanced Reports ─────────────────────────────────────────
    '/adv/sales':                   'adv_sales',
    '/adv/purchase':                'adv_purchase',
    '/adv/stock-transfer':          'adv_stock_transfer',
    '/adv/view-scripts':            'adv_view_scripts',
}

ALL_REPORT_KEYS = list(URL_REPORT_MAP.values())

# Paths that do NOT require a login
PUBLIC_PATHS    = {'/login', '/logout', '/health', '/setup', '/setup/test-db', '/setup/run-sql', '/setup/save-config'}
PUBLIC_PREFIXES = ('/static/', '/favicon')


def is_logged_in():
    return 'user_id' in session


def is_superadmin():
    return session.get('role') == 'superadmin'


def get_allowed_reports():
    """Returns the list of report_keys the current user may access."""
    if is_superadmin():
        return ALL_REPORT_KEYS
    return session.get('allowed_reports', [])


def can_access_report(report_key):
    if is_superadmin():
        return True
    return report_key in session.get('allowed_reports', [])
