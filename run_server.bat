@echo off
echo ======================================================
echo   Modern Bazaar HO - Starting Enterprise Servers
echo ======================================================
echo.

:: Start Backend in a new window
echo [STARTING] FastAPI Backend on port 8000...
start "MB-HO-BACKEND" cmd /k "cd backend && venv\Scripts\activate && uvicorn app.main:app --reload --host 0.0.0.0 --port 8000"

:: Start Global Sync Worker in a new window
echo [STARTING] Global Sync Worker (every 2 hrs)...
start "MB-HO-GLOBAL-SYNC" cmd /k "cd backend && venv\Scripts\activate && python global_sync_worker.py"

:: Start Frontend in a new window
echo [STARTING] React-Vite Frontend on port 5173...
start "MB-HO-FRONTEND" cmd /k "cd frontend && npm run dev"

echo.
echo ------------------------------------------------------
echo   Backend URL:  http://localhost:8000
echo   Frontend URL: http://localhost:5173
echo   API Docs:     http://localhost:8000/docs
echo ------------------------------------------------------
echo.

:: Automatically open browser
echo [LAUNCHING] Opening application in browser...
timeout /t 5 /nobreak >nul
start http://localhost:5173

echo Keep the command windows open to maintain server connection.
pause
