"""Quick startup/import check for the Flask app."""
import sys, os
sys.path.insert(0, r'D:\fmcg_reports')
os.chdir(r'D:\fmcg_reports')

errors = []

# 1. Check all imports
try:
    from flask import Flask
    print("[OK] flask")
except Exception as e:
    errors.append(f"[FAIL] flask: {e}")

try:
    import routes_adv
    print("[OK] routes_adv")
except Exception as e:
    errors.append(f"[FAIL] routes_adv: {e}")

try:
    import routes_phase2
    print("[OK] routes_phase2")
except Exception as e:
    errors.append(f"[FAIL] routes_phase2: {e}")

try:
    import admin_routes
    print("[OK] admin_routes")
except Exception as e:
    errors.append(f"[FAIL] admin_routes: {e}")

try:
    import auth
    print(f"[OK] auth — {len(auth.ALL_REPORT_KEYS)} report keys")
    if 'adv_sales' in auth.ALL_REPORT_KEYS:
        print("     adv_sales   ✓")
    else:
        errors.append("     adv_sales NOT in ALL_REPORT_KEYS!")
    if 'adv_purchase' in auth.ALL_REPORT_KEYS:
        print("     adv_purchase ✓")
    if 'adv_stock_transfer' in auth.ALL_REPORT_KEYS:
        print("     adv_stock_transfer ✓")
except Exception as e:
    errors.append(f"[FAIL] auth: {e}")

# 2. Try creating the app
try:
    import app as flask_app
    print("[OK] app.py imported successfully")
    routes = [str(r) for r in flask_app.app.url_map.iter_rules()]
    adv_routes = [r for r in routes if '/adv/' in r]
    print(f"     Advanced routes registered: {adv_routes}")
except Exception as e:
    errors.append(f"[FAIL] app.py: {e}")

# Summary
print()
if errors:
    print("=== ERRORS ===")
    for e in errors:
        print(e)
else:
    print("=== ALL CHECKS PASSED ===")
