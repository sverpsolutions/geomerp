╔══════════════════════════════════════════════════════════════════╗
║          RetailWizard FMCG Reporting Suite v2.0                ║
║          Complete Setup & Usage Guide                          ║
╚══════════════════════════════════════════════════════════════════╝

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
FIRST-TIME SETUP (Do this once)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

STEP 1 — Install Python (if not already installed)
  Download: https://python.org/downloads
  Version:  3.10 or higher recommended
  ⚠ During install: CHECK "Add Python to PATH"

STEP 2 — Install ODBC Driver for SQL Server
  Download: https://aka.ms/downloadmsodbcsql
  Install:  "ODBC Driver 17 for SQL Server"
  (Required to connect to SQL Server database)

STEP 3 — Run SQL Views on your database
  Open SQL Server Management Studio (SSMS)
  Connect to: 157.20.172.168\SQLEXPRESS,1433
  Database:   RWMBSERVER
  Open file:  sql\COMPLETE_ALL_VIEWS_RUN_THIS.sql
  Press F5 to execute
  ✔ You will see: "ALL DONE: 30 Views + Indexes Created!"

STEP 4 — Run the installer
  Double-click INSTALL.py  (or right-click → Open with Python)
  This will:
    ✔ Install all Python packages automatically
    ✔ Check ODBC driver
    ✔ Test database connection
    ✔ Create desktop shortcut
    ✔ Start the app automatically

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
DAILY USE — HOW TO START THE APP
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Option A — RECOMMENDED (no black window):
  Double-click: RetailWizard_Reports.vbs
  Browser opens automatically at http://localhost:5000

Option B — With progress window:
  Double-click: START_REPORTS.bat
  Shows startup progress, then opens browser

Option C — Desktop shortcut:
  After running INSTALL.py, a shortcut is created on your Desktop
  Double-click "RetailWizard Reports" shortcut

Option D — Command line:
  Open Command Prompt in this folder
  Type: python app.py
  Open browser: http://localhost:5000

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
STOPPING THE APP
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  Double-click: STOP_REPORTS.bat
  OR close the CMD window that's running the server
  OR press Ctrl+C in the CMD window

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
DATABASE CONNECTION SETTINGS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  Edit file: app.py (lines 14-17)
  ┌────────────────────────────────────────────────────────┐
  │  DB_SERVER   = r'157.20.172.168\SQLEXPRESS,1433'      │
  │  DB_NAME     = 'RWMBSERVER'                           │
  │  DB_USER     = 'sa'                                   │
  │  DB_PASSWORD = 'YOUR_DB_PASSWORD'                                 │
  └────────────────────────────────────────────────────────┘

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
EMAIL SETTINGS (for sending reports by email)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  Edit file: exports\email_send.py
  SMTP Server: smtp.gmail.com:587
  From:        retailwizardreports@gmail.com

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
AVAILABLE REPORTS (32 reports total)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  SALES (4)
    /sales/summary     Sales Summary by date
    /sales/detail      Item-wise sales detail
    /sales/payment     Payment mode collection
    /sales/returns     Sales returns & refunds

  CUSTOMER (6)
    /customer/list       Customer master
    /customer/ledger     Customer bill history
    /customer/loyalty    Loyalty points ledger
    /customer/segments   RFM customer segments
    /customer/trend      Monthly purchase trend
    /customer/promotions Smart promotions generator

  PURCHASE (3)
    /purchase/summary   GRN summary
    /purchase/detail    GRN item details
    /purchase/returns   Purchase returns (PRN)

  INVENTORY (3)
    /inventory/stock         Stock status & alerts
    /inventory/transfer      Stock transfer (MTN)
    /analytics/stock_valuation Stock valuation

  ANALYTICS (8)
    /analytics/dashboard_live  Live business dashboard
    /analytics/trend           Sales trend charts
    /analytics/top_items       Top selling items
    /analytics/category        Category performance
    /analytics/supplier        Supplier performance
    /analytics/velocity        Fast/slow moving items
    /analytics/profitability   Profit & margin analysis
    /analytics/sales_vs_purchase  Sales vs Purchase
    /analytics/exceptions      Exception & alert report

  GST / COMPLIANCE (6)
    /gst/hsn_sales     HSN wise sales (GSTR-1 table 12)
    /gst/hsn_purchase  HSN wise purchase
    /gst/gstr1         GSTR-1 with JSON export
    /gst/gstr3b        GSTR-3B monthly summary
    /gst/itc           Input Tax Credit report
    /gst/cdnr          Credit notes (CDNR)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
TROUBLESHOOTING
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  Problem: Browser shows "This site can't be reached"
  Fix: Wait 10 seconds and refresh. Server may still be starting.

  Problem: "Invalid object name 'dbo.VW_RPT_...'"
  Fix: Run sql\COMPLETE_ALL_VIEWS_RUN_THIS.sql in SSMS (Step 3)

  Problem: "No module named flask"
  Fix: Run INSTALL.py again, or:
       python -m pip install flask pyodbc pandas openpyxl reportlab

  Problem: "ODBC Driver not found"
  Fix: Install from https://aka.ms/downloadmsodbcsql

  Problem: Port 5000 already in use
  Fix: Double-click STOP_REPORTS.bat then restart

  Logs location: logs\app.log (check for detailed errors)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
FILE STRUCTURE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  fmcg_reports\
  ├── INSTALL.py                ← Run once to set up everything
  ├── START_REPORTS.bat         ← Daily use (with window)
  ├── RetailWizard_Reports.vbs  ← Daily use (silent)
  ├── STOP_REPORTS.bat          ← Stop the server
  ├── README.txt                ← This file
  ├── app.py                    ← Main Flask application
  ├── routes_phase2.py          ← GST & advanced routes
  ├── requirements.txt          ← Python packages list
  ├── exports\                  ← PDF, Excel, Email, GST JSON
  ├── sql\                      ← SQL view scripts
  │   └── COMPLETE_ALL_VIEWS_RUN_THIS.sql  ← Run this in SSMS!
  ├── templates\                ← HTML report pages
  │   ├── base.html             ← Sidebar + layout
  │   ├── sales\                ← 4 sales reports
  │   ├── customer\             ← 6 customer reports
  │   ├── purchase\             ← 3 purchase reports
  │   ├── inventory\            ← 2 inventory reports
  │   ├── analytics\            ← 9 analytics pages
  │   ├── gst\                  ← 6 GST reports
  │   └── errors\               ← 404/500 error pages
  └── logs\                     ← Application logs

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
