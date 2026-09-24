@echo off
echo ===================================================
echo   Starting SafeCity Loop V2 (Backend + Frontend)
echo ===================================================

echo [1/2] Launching FastAPI Backend on http://localhost:8000 ...
start "SafeCity Backend (Port 8000)" cmd /k "python -m uvicorn backend.main:app --reload --port 8000"

timeout /t 3 /nobreak >nul

echo [2/2] Launching Vite Frontend on http://localhost:5173 ...
start "SafeCity Frontend (Port 5173)" cmd /k "cd frontend && npm run dev"

timeout /t 2 /nobreak >nul

echo Opening application in your default browser...
start http://localhost:5173

echo ===================================================
echo   SafeCity Loop V2 is now running!
echo   Frontend: http://localhost:5173
echo   Backend:  http://localhost:8000
echo   API Docs: http://localhost:8000/docs
echo ===================================================
