# AEGIS: Adaptive Ethical Governance & Identity System
# Monorepo Startup Orchestrator (Windows Powershell)

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "   AEGIS: Adaptive Ethical Governance & Identity System   " -ForegroundColor Cyan
Write-Host "         48-Hour Hackathon Unified Full-Stack Run         " -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Launching unified micro-environments..." -ForegroundColor Yellow
Write-Host ""

# 1. Start Express Backend (Member 3)
Write-Host "[1/3] Spawning Backend Service..." -ForegroundColor DarkYellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Write-Host 'Setting up Backend Service (Port 5000)...' -ForegroundColor Cyan; cd backend; npm install; npm start" -WindowStyle Normal
Write-Host "[✓] Backend Service initialized." -ForegroundColor Green

# 2. Start AI Service (Member 2)
Write-Host "[2/3] Spawning AI & ML FastAPI Service..." -ForegroundColor DarkYellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Write-Host 'Setting up AI FastAPI Service (Port 8000)...' -ForegroundColor Cyan; cd ai-service; pip install -r requirements.txt; python main.py" -WindowStyle Normal
Write-Host "[✓] AI FastAPI Service initialized." -ForegroundColor Green

# 3. Start Next.js Unified Frontend (Member 1 & Member 4)
Write-Host "[3/3] Spawning Unified Frontend (Dashboard + Citizen Portal)..." -ForegroundColor DarkYellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Write-Host 'Setting up Next.js Frontend (Port 3000)...' -ForegroundColor Cyan; cd frontend; npm install; npm run dev" -WindowStyle Normal
Write-Host "[✓] Next.js Unified Frontend initialized." -ForegroundColor Green

Write-Host ""
Write-Host "==========================================================" -ForegroundColor Green
Write-Host "   SUCCESS: All 3 environments spawned in separate shell  " -ForegroundColor Green
Write-Host "   terminals. They will install dependencies and start.  " -ForegroundColor Green
Write-Host "==========================================================" -ForegroundColor Green
Write-Host "Dashboard View (Member 1):  http://localhost:3000/dashboard" -ForegroundColor Cyan
Write-Host "Citizen Portal (Member 4): http://localhost:3000/citizen" -ForegroundColor Cyan
Write-Host "Backend API (Member 3):     http://localhost:5000" -ForegroundColor Cyan
Write-Host "AI Service (Member 2):     http://localhost:8000" -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Green
Write-Host "Happy Coding, Team! You've got this." -ForegroundColor Magenta
