@echo off
title RetailWizard Reports Launcher
color 1F

echo.
echo  ╔══════════════════════════════════════════════════╗
echo  ║        RetailWizard FMCG Reporting Suite         ║
echo  ║                   v2.0                           ║
echo  ╚══════════════════════════════════════════════════╝
echo.

:: ── Find Python ───────────────────────────────────────────────
set PYTHON_CMD=
where py >nul 2>&1
if %errorlevel%==0 (
    set PYTHON_CMD=py
    goto :found_python
)
where python >nul 2>&1
if %errorlevel%==0 (
    set PYTHON_CMD=python
    goto :found_python
)
where python3 >nul 2>&1
if %errorlevel%==0 (
    set PYTHON_CMD=python3
    goto :found_python
)
:: Try common install paths
for %%P in (
    "C:\Python312\python.exe"
    "C:\Python311\python.exe"
    "C:\Python310\python.exe"
    "C:\Users\%USERNAME%\AppData\Local\Programs\Python\Python312\python.exe"
    "C:\Users\%USERNAME%\AppData\Local\Programs\Python\Python311\python.exe"
    "C:\Users\%USERNAME%\AppData\Local\Programs\Python\Python310\python.exe"
) do (
    if exist %%P (
        set PYTHON_CMD=%%P
        goto :found_python
    )
)

echo  [ERROR] Python not found!
echo  Please install Python 3.10+ from https://python.org
echo  Make sure to check "Add Python to PATH" during installation.
echo.
pause
exit /b 1

:found_python
echo  [OK] Python found: %PYTHON_CMD%

:: ── Go to script directory ─────────────────────────────────────
cd /d "%~dp0"
echo  [OK] Working directory: %cd%

:: ── Check dependencies ─────────────────────────────────────────
echo  [..] Checking dependencies...
%PYTHON_CMD% -c "import flask, pyodbc, pandas, openpyxl, reportlab" >nul 2>&1
if %errorlevel% neq 0 (
    echo  [..] Installing required packages (one-time setup)...
    echo       This may take 2-3 minutes...
    %PYTHON_CMD% -m pip install flask pyodbc pandas openpyxl reportlab --quiet --no-warn-script-location
    if %errorlevel% neq 0 (
        echo  [ERROR] Package installation failed!
        echo  Try running as Administrator or check internet connection.
        pause
        exit /b 1
    )
    echo  [OK] Packages installed successfully!
)

:: ── First-time DB setup (run all SQL scripts if app_users missing) ──
echo  [..] Checking database setup...
%PYTHON_CMD% -c "
import pyodbc, re, os, sys
try:
    from db_config import load_config
    s,d,u,p = load_config()
    conn = pyodbc.connect(f'DRIVER={{ODBC Driver 17 for SQL Server}};SERVER={s};DATABASE={d};UID={u};PWD={p};TrustServerCertificate=yes;', timeout=10, autocommit=True)
    cursor = conn.cursor()
    cursor.execute(\"SELECT COUNT(*) FROM sys.objects WHERE name='app_users' AND type='U'\")
    exists = cursor.fetchone()[0]
    if not exists:
        print('[SETUP] Running first-time SQL setup...')
        sql_files = ['sql/03_auth_company_tables.sql','sql/01_create_views.sql','sql/02_gst_advanced_views.sql','sql/04_advanced_views.sql']
        for filepath in sql_files:
            if not os.path.exists(filepath): continue
            with open(filepath,'r',encoding='utf-8',errors='ignore') as f: sql=f.read()
            sql=re.sub(r'USE\s*\[[^\]]+\]\s*;?','',sql,flags=re.IGNORECASE)
            batches=re.split(r'^\s*GO\s*$',sql,flags=re.MULTILINE|re.IGNORECASE)
            for batch in batches:
                b=batch.strip()
                if not b: continue
                lines=[l for l in b.splitlines() if l.strip() and not l.strip().startswith('--')]
                if not lines or lines[0].strip().upper().startswith('PRINT'): continue
                try: cursor.execute(b)
                except: pass
            print(f'[SETUP] Done: {filepath}')
        print('[SETUP] Database setup complete!')
    else:
        print('[OK] Database already configured.')
    conn.close()
except Exception as e:
    print(f'[WARN] DB setup check failed: {e}')
    sys.exit(0)
"
echo.

:: ── Kill any old instance on port 5000 ────────────────────────
for /f "tokens=5" %%a in ('netstat -ano 2^>nul ^| findstr ":5000 "') do (
    taskkill /F /PID %%a >nul 2>&1
)

:: ── Launch Flask app ──────────────────────────────────────────
echo  [..] Starting RetailWizard Reports server...
start /B %PYTHON_CMD% app.py > logs\app.log 2>&1

:: Wait for server to be ready (up to 15 seconds)
echo  [..] Waiting for server...
set /a WAIT=0
:wait_loop
timeout /t 1 /nobreak >nul
set /a WAIT+=1
%PYTHON_CMD% -c "import urllib.request; urllib.request.urlopen('http://localhost:5000/health', timeout=2)" >nul 2>&1
if %errorlevel%==0 goto :server_ready
if %WAIT% geq 15 goto :timeout_err
goto :wait_loop

:server_ready
echo  [OK] Server is running!
echo.
echo  ┌─────────────────────────────────────────────────┐
echo  │  Reports URL: http://localhost:5000              │
echo  │                                                  │
echo  │  Opening browser automatically...               │
echo  │                                                  │
echo  │  To STOP: close this window or press Ctrl+C     │
echo  └─────────────────────────────────────────────────┘
echo.

:: Open browser
start "" "http://localhost:5000"
goto :keep_alive

:timeout_err
echo  [WARN] Server took too long to start.
echo  [..] Opening browser anyway...
start "" "http://localhost:5000"

:keep_alive
echo  Server is running. This window keeps it alive.
echo  DO NOT close this window while using the reports.
echo.
echo  Press Ctrl+C or close this window to stop the server.
echo.

:: Keep window open and show live status
:heartbeat
timeout /t 30 /nobreak >nul
%PYTHON_CMD% -c "import urllib.request; urllib.request.urlopen('http://localhost:5000/health',timeout=2)" >nul 2>&1
if %errorlevel%==0 (
    echo  [%time%] Server running OK
) else (
    echo  [%time%] Server not responding — restarting...
    start /B %PYTHON_CMD% app.py >> logs\app.log 2>&1
    timeout /t 5 /nobreak >nul
)
goto :heartbeat
