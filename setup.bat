@echo off
SETLOCAL EnableDelayedExpansion

echo ======================================================
echo   Modern Bazaar HO - Enterprise Setup Wizard
echo ======================================================
echo.

:: Check for Python
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Python is not installed or not in PATH.
    pause
    exit /b
)

:: Check for Node.js
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Node.js is not installed or not in PATH.
    pause
    exit /b
)

echo [1/3] Setting up Backend Virtual Environment...
cd backend
if not exist venv (
    python -m venv venv
)
call venv\Scripts\activate
echo [2/3] Installing Backend Dependencies...
pip install -r requirements.txt
cd ..

echo [3/3] Installing Frontend Dependencies (npm)...
cd frontend
call npm install
cd ..

echo.
echo ======================================================
echo   SETUP COMPLETE!
echo   Run 'run_server.bat' to start the application.
echo ======================================================
pause
