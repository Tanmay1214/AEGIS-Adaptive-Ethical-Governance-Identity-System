# AEGIS: Adaptive Ethical Governance & Identity System
# Monorepo Startup Orchestrator (Windows Powershell)

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "   AEGIS: Adaptive Ethical Governance & Identity System   " -ForegroundColor Cyan
Write-Host "         48-Hour Hackathon Unified Full-Stack Run         " -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Launching both micro-environments..." -ForegroundColor Yellow
Write-Host ""

# 1. Start Express Backend & Hosted UI (Member 3 & Member 1 / 4)
Write-Host "[1/2] Spawning Express Backend + UI Server..." -ForegroundColor DarkYellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Write-Host 'Setting up Backend & Static UI Server (Port 5000)...' -ForegroundColor Cyan; cd backend; npm install; npm start" -WindowStyle Normal
Write-Host "[✓] Backend Service initialized." -ForegroundColor Green

# 2. Start AI Service (Member 2)
Write-Host "[2/2] Spawning AI & ML FastAPI Service..." -ForegroundColor DarkYellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Write-Host 'Setting up AI FastAPI Service (Port 8000)...' -ForegroundColor Cyan; cd ai-service; pip install -r requirements.txt; python main.py" -WindowStyle Normal
Write-Host "[✓] AI FastAPI Service initialized." -ForegroundColor Green

Write-Host ""
Write-Host "==========================================================" -ForegroundColor Green
Write-Host "   SUCCESS: Both environments spawned in separate shell   " -ForegroundColor Green
Write-Host "   terminals. They will install dependencies and start.   " -ForegroundColor Green
Write-Host "==========================================================" -ForegroundColor Green
Write-Host "Landing & Dashboard UI (Port 5000): http://localhost:5000" -ForegroundColor Cyan
Write-Host "Backend REST & WebSockets (Port 5000): http://localhost:5000" -ForegroundColor Cyan
Write-Host "AI Service API (Port 8000):          http://localhost:8000" -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Green
Write-Host "Happy Coding, Team! You've got this." -ForegroundColor Magenta
