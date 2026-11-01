@echo off
echo ==========================================================
echo Starting HireFlow - Enterprise Recruitment Platform
echo ==========================================================

start "HireFlow Backend" cmd /k "cd backend && python -m uvicorn app.main:app --host 127.0.0.1 --port 8000"
start "HireFlow Frontend" cmd /k "cd frontend && npm run dev"

echo Servers launched.
echo Frontend: http://127.0.0.1:5173
echo Backend: http://127.0.0.1:8000
echo Docs: http://127.0.0.1:8000/docs
pause
