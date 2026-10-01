#!/usr/bin/env python3
"""
RetailWizard FMCG Reports – One-Time Installer
Run this once: python INSTALL.py
It will:
  1. Install all required Python packages
  2. Verify ODBC Driver for SQL Server
  3. Create Windows desktop shortcut
  4. Create logs folder
  5. Test database connection
  6. Print a summary report
"""

import sys
import os
import subprocess
import platform

APP_DIR  = os.path.dirname(os.path.abspath(__file__))
LOG_DIR  = os.path.join(APP_DIR, 'logs')
IS_WIN   = platform.system() == 'Windows'

PACKAGES = [
    ('flask',      'flask'),
    ('pyodbc',     'pyodbc'),
    ('pandas',     'pandas'),
    ('openpyxl',   'openpyxl'),
    ('reportlab',  'reportlab'),
]

# ── Colour helpers (Windows-safe) ─────────────────────────────
def green(s):  return f"\033[92m{s}\033[0m" if sys.stdout.isatty() else s
def red(s):    return f"\033[91m{s}\033[0m" if sys.stdout.isatty() else s
def yellow(s): return f"\033[93m{s}\033[0m" if sys.stdout.isatty() else s
def bold(s):   return f"\033[1m{s}\033[0m"  if sys.stdout.isatty() else s

def ok(msg):   print(f"  {green('[OK]')}  {msg}")
def err(msg):  print(f"  {red('[ERR]')} {msg}")
def info(msg): print(f"  {yellow('[..]')} {msg}")


def banner():
    print()
    print("  ╔══════════════════════════════════════════════════╗")
    print("  ║     RetailWizard FMCG Reports – Installer       ║")
    print("  ║                    v2.0                          ║")
    print("  ╚══════════════════════════════════════════════════╝")
    print()


def check_python_version():
    major, minor = sys.version_info[:2]
    if major < 3 or (major == 3 and minor < 8):
        err(f"Python {major}.{minor} detected. Python 3.8+ is required.")
        sys.exit(1)
    ok(f"Python {major}.{minor} — OK")


def install_packages():
    info("Installing Python packages...")
    all_ok = True
    for import_name, pkg_name in PACKAGES:
        try:
            __import__(import_name)
            ok(f"{pkg_name} already installed")
        except ImportError:
            info(f"Installing {pkg_name}...")
            result = subprocess.run(
                [sys.executable, '-m', 'pip', 'install', pkg_name,
                 '--quiet', '--no-warn-script-location'],
                capture_output=True, text=True
            )
            if result.returncode == 0:
                ok(f"{pkg_name} installed successfully")
            else:
                err(f"Failed to install {pkg_name}: {result.stderr.strip()}")
                all_ok = False
    return all_ok


def check_odbc():
    info("Checking ODBC Driver for SQL Server...")
    try:
        import pyodbc
        drivers = pyodbc.drivers()
        sql_drivers = [d for d in drivers if 'SQL Server' in d]
        if sql_drivers:
            ok(f"ODBC Driver found: {sql_drivers[-1]}")
            return True
        else:
            err("No SQL Server ODBC Driver found!")
            print()
            print("  ┌─────────────────────────────────────────────────────┐")
            print("  │  Download from Microsoft:                           │")
            print("  │  https://aka.ms/downloadmsodbcsql                  │")
            print("  │  Install: ODBC Driver 17 for SQL Server            │")
            print("  └─────────────────────────────────────────────────────┘")
            return False
    except Exception as e:
        err(f"ODBC check failed: {e}")
        return False


def test_db_connection():
    info("Testing database connection...")
    try:
        import pyodbc
        conn_str = (
            "DRIVER={ODBC Driver 17 for SQL Server};"
            "SERVER=26.132.92.171"
            "DATABASE=MBGUR03;"
            "UID=sysuser;PWD=YOUR_DB_PASSWORD;"
            "TrustServerCertificate=yes;"
            "Connection Timeout=10;"
        )
        conn = pyodbc.connect(conn_str)
        cursor = conn.cursor()
        cursor.execute("SELECT @@VERSION")
        row = cursor.fetchone()
        conn.close()
        version = str(row[0]).split('\n')[0].strip() if row else 'Unknown'
        ok(f"Database connected: {version[:60]}...")
        return True
    except Exception as e:
        err(f"Database connection failed: {e}")
        print()
        print("  This is OK for now — the app will still start.")
        print("  Fix your DB connection in app.py (DB_SERVER, DB_NAME, DB_USER, DB_PASSWORD)")
        return False


def create_logs_folder():
    os.makedirs(LOG_DIR, exist_ok=True)
    ok(f"Logs folder: {LOG_DIR}")


def create_windows_shortcut():
    if not IS_WIN:
        return
    try:
        import winreg
    except ImportError:
        return

    try:
        # Create desktop shortcut using PowerShell
        desktop = os.path.join(os.path.expanduser('~'), 'Desktop')
        shortcut_path = os.path.join(desktop, 'RetailWizard Reports.lnk')
        target   = os.path.join(APP_DIR, 'RetailWizard_Reports.vbs')
        icon_src = os.path.join(APP_DIR, 'START_REPORTS.bat')

        ps_script = f'''
$WScript  = New-Object -ComObject WScript.Shell
$Shortcut = $WScript.CreateShortcut("{shortcut_path}")
$Shortcut.TargetPath  = "wscript.exe"
$Shortcut.Arguments   = '"{target}"'
$Shortcut.WorkingDirectory = "{APP_DIR}"
$Shortcut.Description = "RetailWizard FMCG Reports"
$Shortcut.Save()
'''
        result = subprocess.run(
            ['powershell', '-Command', ps_script],
            capture_output=True, text=True
        )
        if result.returncode == 0:
            ok(f"Desktop shortcut created: {shortcut_path}")
        else:
            info("Shortcut creation skipped (use START_REPORTS.bat instead)")
    except Exception as e:
        info(f"Shortcut skipped: {e}")


def create_startup_task():
    """Optionally register as Windows startup task."""
    if not IS_WIN:
        return
    # Skipped — user can do this manually if desired
    pass


def print_summary(pkg_ok, odbc_ok, db_ok):
    print()
    print("  ╔══════════════════════════════════════════════════╗")
    print("  ║              Installation Summary               ║")
    print("  ╠══════════════════════════════════════════════════╣")
    print(f"  ║  Python Packages : {'✓ Ready' if pkg_ok  else '✗ Issues'}                         ║")
    print(f"  ║  ODBC Driver     : {'✓ Found' if odbc_ok else '✗ Missing (install manually)'}                ║")
    print(f"  ║  Database        : {'✓ Connected' if db_ok   else '✗ Not reached (check network)'}             ║")
    print("  ╠══════════════════════════════════════════════════╣")
    print("  ║                                                  ║")
    print("  ║  HOW TO START THE APP:                          ║")
    print("  ║                                                  ║")
    print("  ║  Option A (Recommended):                        ║")
    print("  ║    Double-click RetailWizard_Reports.vbs        ║")
    print("  ║    (silent – no black window)                   ║")
    print("  ║                                                  ║")
    print("  ║  Option B:                                      ║")
    print("  ║    Double-click START_REPORTS.bat               ║")
    print("  ║    (shows progress window)                      ║")
    print("  ║                                                  ║")
    print("  ║  Option C (from command line):                  ║")
    print("  ║    python app.py                                ║")
    print("  ║    Then open: http://localhost:5000             ║")
    print("  ║                                                  ║")
    if not odbc_ok:
        print("  ║  ⚠  Install ODBC Driver 17:                     ║")
        print("  ║     https://aka.ms/downloadmsodbcsql            ║")
        print("  ║                                                  ║")
    print("  ╚══════════════════════════════════════════════════╝")
    print()


def main():
    # Enable ANSI colours on Windows 10+
    if IS_WIN:
        os.system('color')

    banner()

    print(f"  Installing in: {APP_DIR}")
    print()

    check_python_version()
    create_logs_folder()

    print()
    info("Step 1: Installing Python packages...")
    pkg_ok = install_packages()

    print()
    info("Step 2: Checking ODBC Driver...")
    odbc_ok = check_odbc()

    print()
    info("Step 3: Testing database connection...")
    db_ok = test_db_connection()

    if IS_WIN:
        print()
        info("Step 4: Creating desktop shortcut...")
        create_windows_shortcut()

    print_summary(pkg_ok, odbc_ok, db_ok)

    if pkg_ok:
        print("  Installation complete! Starting app...")
        print()
        # Auto-launch after install
        try:
            import subprocess
            subprocess.Popen([sys.executable, 'app.py'],
                             cwd=APP_DIR,
                             creationflags=subprocess.CREATE_NEW_CONSOLE if IS_WIN else 0)
            import time, webbrowser
            time.sleep(4)
            webbrowser.open('http://localhost:5000')
        except Exception:
            print("  Run manually: python app.py")
    else:
        print("  Fix the errors above, then run INSTALL.py again.")

    if IS_WIN:
        input("  Press Enter to exit...")


if __name__ == '__main__':
    main()
