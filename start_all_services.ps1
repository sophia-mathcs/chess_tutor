param(
    [string]$ApiKey = $env:DUKE_API_KEY
)

$Root    = $PSScriptRoot
$Uvicorn = "$Root\.venv\Scripts\uvicorn.exe"

# ── Checks ────────────────────────────────────────────────────────────────────

if (-not (Test-Path $Uvicorn)) {
    Write-Host "ERROR: .venv not found. Run these first:" -ForegroundColor Red
    Write-Host "  python -m venv .venv"
    Write-Host "  .venv\Scripts\pip install -r requirements.txt"
    exit 1
}

if (-not (Test-Path "$Root\node_modules")) {
    Write-Host "ERROR: node_modules not found. Run: npm install" -ForegroundColor Red
    exit 1
}

if (-not $ApiKey) {
    Write-Host "WARNING: No API key provided. Tutor LLM will be disabled." -ForegroundColor Yellow
    Write-Host "  Pass it with:  .\start_all_services.ps1 -ApiKey 'your-key'"
}

# ── Launch each service in its own window ─────────────────────────────────────

Write-Host "Starting engine_backend  (port 8000)..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList "-NoExit", "-Command",
    "cd '$Root\engine_backend'; & '$Uvicorn' main:app --port 8000" `
    -WindowStyle Normal

Write-Host "Starting playerbot_backend (port 8001)..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList "-NoExit", "-Command",
    "cd '$Root\playerbot_backend'; & '$Uvicorn' main:app --port 8001" `
    -WindowStyle Normal

Write-Host "Starting tutor_backend   (port 8002)..." -ForegroundColor Cyan
$tutorCmd = if ($ApiKey) {
    "cd '$Root\tutor_backend'; `$env:DUKE_API_KEY='$ApiKey'; & '$Uvicorn' main:app --port 8002"
} else {
    "cd '$Root\tutor_backend'; & '$Uvicorn' main:app --port 8002"
}
Start-Process powershell -ArgumentList "-NoExit", "-Command", $tutorCmd -WindowStyle Normal

Write-Host "Starting node server     (port 3000)..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList "-NoExit", "-Command",
    "cd '$Root'; node server.js" `
    -WindowStyle Normal

Write-Host ""
Write-Host "All services launched. Open: http://localhost:3000" -ForegroundColor Green
