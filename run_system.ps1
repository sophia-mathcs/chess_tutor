param(
    [string]$ApiKey = $env:DUKE_API_KEY
)

$Root    = $PSScriptRoot
$Venv    = "$Root\.venv"
$Pip     = "$Venv\Scripts\pip.exe"
$Python  = "$Venv\Scripts\python.exe"
$Uvicorn = "$Venv\Scripts\uvicorn.exe"

# ── Python check ──────────────────────────────────────────────────────────────

if (-not (Get-Command python -ErrorAction SilentlyContinue)) {
    Write-Host "ERROR: python not found in PATH. Install Python 3 and re-run." -ForegroundColor Red
    exit 1
}

if (-not (Get-Command npm -ErrorAction SilentlyContinue)) {
    Write-Host "ERROR: npm not found in PATH. Install Node.js and re-run." -ForegroundColor Red
    exit 1
}

# ── Create venv if missing ────────────────────────────────────────────────────

if (-not (Test-Path $Venv)) {
    Write-Host "==> Creating Python virtual environment (.venv)..." -ForegroundColor Cyan
    python -m venv "$Venv"
    if ($LASTEXITCODE -ne 0) { Write-Host "ERROR: Failed to create venv." -ForegroundColor Red; exit 1 }
}

# ── Install / upgrade Python dependencies ─────────────────────────────────────

Write-Host "==> Installing Python dependencies..." -ForegroundColor Cyan
& $Pip install --upgrade pip | Out-Null
& $Pip install -r "$Root\requirements.txt"
& $Pip install aiohttp numpy maia2 pandas scikit-learn tqdm gdown pyzstd pyyaml einops
& $Pip install torch

if ($LASTEXITCODE -ne 0) { Write-Host "ERROR: pip install failed." -ForegroundColor Red; exit 1 }

# ── Install npm dependencies ──────────────────────────────────────────────────

Write-Host "==> Installing frontend dependencies (npm)..." -ForegroundColor Cyan
Push-Location $Root
npm install
Pop-Location
if ($LASTEXITCODE -ne 0) { Write-Host "ERROR: npm install failed." -ForegroundColor Red; exit 1 }

# ── API key warning ───────────────────────────────────────────────────────────

if (-not $ApiKey) {
    Write-Host "WARNING: No API key provided. Tutor LLM will be disabled." -ForegroundColor Yellow
    Write-Host "  Pass it with:  .\start_all_services.ps1 -ApiKey 'your-key'"
}

# ── Ensure engines folder exists ─────────────────────────────────────────────

New-Item -ItemType Directory -Force -Path "$Root\engines\stockfish" | Out-Null

# ── Resolve Stockfish path ────────────────────────────────────────────────────

$StockfishCandidates = @(
    "$Root\engines\stockfish\stockfish-windows-x86-64-avx2.exe",
    "$Root\engines\stockfish\stockfish.exe",
    "$Root\engines\stockfish\stockfish",
    "$Root\engines\stockfish\stockfish-macos"
)

$StockfishPath = $null
foreach ($candidate in $StockfishCandidates) {
    if (Test-Path $candidate) {
        $StockfishPath = (Resolve-Path $candidate).Path
        break
    }
}

if (-not $StockfishPath) {
    $sfCmd = Get-Command stockfish -ErrorAction SilentlyContinue
    if ($sfCmd) { $StockfishPath = $sfCmd.Source }
}

if (-not $StockfishPath) {
    # Try winget as a last resort (Windows Package Manager)
    if (Get-Command winget -ErrorAction SilentlyContinue) {
        Write-Host "==> Stockfish not found. Attempting install via winget..." -ForegroundColor Cyan
        winget install --id=Stockfish.Stockfish -e --silent
        $env:PATH = [System.Environment]::GetEnvironmentVariable("PATH","Machine") + ";" +
                    [System.Environment]::GetEnvironmentVariable("PATH","User")
        $sfCmd = Get-Command stockfish -ErrorAction SilentlyContinue
        if ($sfCmd) { $StockfishPath = $sfCmd.Source }
    }
}

if (-not $StockfishPath) {
    Write-Host "ERROR: Stockfish binary not found." -ForegroundColor Red
    Write-Host "Looked in:"
    foreach ($c in $StockfishCandidates) { Write-Host "  $c" }
    Write-Host "  (and PATH: stockfish)"
    Write-Host ""
    Write-Host "Place the binary under engines\stockfish\ or install via:"
    Write-Host "  winget install Stockfish.Stockfish"
    exit 1
}

Write-Host "==> Using Stockfish: $StockfishPath" -ForegroundColor DarkGray

# ── Launch each service in its own window ─────────────────────────────────────

Write-Host "Starting engine_backend  (port 8000)..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList "-NoExit", "-Command",
    "`$env:STOCKFISH_PATH='$StockfishPath'; cd '$Root\engine_backend'; & '$Uvicorn' main:app --port 8000" `
    -WindowStyle Normal

Write-Host "Starting playerbot_backend (port 8001)..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList "-NoExit", "-Command",
    "`$env:STOCKFISH_PATH='$StockfishPath'; cd '$Root\playerbot_backend'; & '$Uvicorn' main:app --port 8001" `
    -WindowStyle Normal

Write-Host "Starting tutor_backend   (port 8002)..." -ForegroundColor Cyan
$tutorEnv = "`$env:STOCKFISH_PATH='$StockfishPath';"
if ($ApiKey) { $tutorEnv += " `$env:DUKE_API_KEY='$ApiKey';" }
$tutorCmd = "$tutorEnv cd '$Root\tutor_backend'; & '$Uvicorn' main:app --port 8002"
Start-Process powershell -ArgumentList "-NoExit", "-Command", $tutorCmd -WindowStyle Normal

Write-Host "Starting node server     (port 3000)..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList "-NoExit", "-Command",
    "cd '$Root'; node server.js" `
    -WindowStyle Normal

Write-Host ""
Write-Host "All services launched. Open: http://localhost:3000" -ForegroundColor Green
