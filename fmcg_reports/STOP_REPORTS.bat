@echo off
title Stop RetailWizard Reports
echo.
echo  Stopping RetailWizard Reports server...

:: Kill Python processes running app.py
for /f "tokens=1,2" %%a in ('wmic process where "name='python.exe'" get ProcessId^,CommandLine 2^>nul ^| findstr "app.py"') do (
    taskkill /F /PID %%b >nul 2>&1
    echo  [OK] Killed process %%b
)
for /f "tokens=1,2" %%a in ('wmic process where "name='python3.exe'" get ProcessId^,CommandLine 2^>nul ^| findstr "app.py"') do (
    taskkill /F /PID %%b >nul 2>&1
    echo  [OK] Killed process %%b
)

:: Also kill by port 5000
for /f "tokens=5" %%a in ('netstat -ano 2^>nul ^| findstr ":5000 "') do (
    taskkill /F /PID %%a >nul 2>&1
)

echo  [OK] Server stopped.
echo.
timeout /t 2 /nobreak >nul
