@echo off
echo ======================================================
echo   Modern Bazaar HO - Stopping Servers
echo ======================================================
echo.

:: Close the windows opened by run_server.bat (with their child processes)
for %%W in (MB-HO-BACKEND MB-HO-GLOBAL-SYNC MB-HO-FRONTEND) do (
    echo [STOPPING] %%W...
    taskkill /FI "WINDOWTITLE eq %%W*" /T /F >nul 2>&1
)

:: Fallback: kill anything still listening on the backend/frontend ports
for %%P in (8000 5173) do (
    for /f "tokens=5" %%I in ('netstat -ano ^| findstr /R /C:":%%P .*LISTENING"') do (
        echo [STOPPING] PID %%I on port %%P...
        taskkill /PID %%I /T /F >nul 2>&1
    )
)

echo.
echo All Modern Bazaar HO servers stopped.
pause
