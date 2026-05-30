# AEGIS ConsentCam Vision Service Launcher
# Uses the Deep-Live-Cam venv which has all required GPU packages

$VENV_PYTHON = "C:\Users\tanma\Documents\Deep-Live-Cam\venv\Scripts\python.exe"
$SCRIPT_DIR  = Split-Path -Parent $MyInvocation.MyCommand.Path
$SERVER_FILE = Join-Path $SCRIPT_DIR "consentcam_server.py"

Write-Host ""
Write-Host "  ╔══════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "  ║   AEGIS ConsentCam Vision Service — GPU Accelerated     ║" -ForegroundColor Cyan
Write-Host "  ║   RTX 3050 | InsightFace | OpenCV | FastAPI WebSocket   ║" -ForegroundColor Cyan
Write-Host "  ╚══════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""
Write-Host "  Streaming:  ws://localhost:8001/ws/camera/{node_id}" -ForegroundColor Green
Write-Host "  Health:     http://localhost:8001/health" -ForegroundColor Green
Write-Host ""

if (-not (Test-Path $VENV_PYTHON)) {
    Write-Host "  [ERROR] venv not found at: $VENV_PYTHON" -ForegroundColor Red
    exit 1
}

& $VENV_PYTHON $SERVER_FILE
