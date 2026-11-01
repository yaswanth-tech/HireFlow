Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "Starting HireFlow - Enterprise Recruitment Platform" -ForegroundColor Green
Write-Host "==========================================================" -ForegroundColor Cyan

# Start Backend in new process
Write-Host "Launching FastAPI backend on http://127.0.0.1:8000..." -ForegroundColor Yellow
$backendJob = Start-Process python -ArgumentList "-m uvicorn app.main:app --host 127.0.0.1 --port 8000" -WorkingDirectory "$PSScriptRoot\backend" -PassThru

# Start Frontend in new process
Write-Host "Launching Vite React frontend on http://127.0.0.1:5173..." -ForegroundColor Yellow
$frontendJob = Start-Process npm -ArgumentList "run dev" -WorkingDirectory "$PSScriptRoot\frontend" -PassThru

Write-Host "`nHireFlow is now running!" -ForegroundColor Green
Write-Host "  Frontend: http://127.0.0.1:5173" -ForegroundColor White
Write-Host "  Backend API: http://127.0.0.1:8000" -ForegroundColor White
Write-Host "  API Documentation: http://127.0.0.1:8000/docs" -ForegroundColor White
Write-Host "`nPress Ctrl+C to stop servers.`n"
Wait-Process -Id $backendJob.Id, $frontendJob.Id
