# ─────────────────────────────────────────────────────────────────────────────
#  Plate API — one-command dev launcher (Windows PowerShell)
#
#  Usage:   cd api ;  .\run.ps1
#  Flags:   .\run.ps1 -Install   # force a (re)install of dependencies
#           .\run.ps1 -Test      # run pytest instead of the server
#
#  Creates/activates a local .venv, installs deps the first time, then launches
#  uvicorn (or pytest). Safe to run repeatedly — it only installs when needed.
# ─────────────────────────────────────────────────────────────────────────────
param(
    [switch]$Install,
    [switch]$Test
)

$ErrorActionPreference = "Stop"
Set-Location -Path $PSScriptRoot

# 1) Locate a Python interpreter.
$python = $null
foreach ($candidate in @("python", "py")) {
    if (Get-Command $candidate -ErrorAction SilentlyContinue) { $python = $candidate; break }
}
if (-not $python) {
    Write-Error "Python 3.11+ not found. Install it (winget install Python.Python.3.12) and reopen the terminal."
    exit 1
}

# 2) Create the venv on first run.
$venv = Join-Path $PSScriptRoot ".venv"
$venvPython = Join-Path $venv "Scripts\python.exe"
if (-not (Test-Path $venvPython)) {
    Write-Host "Creating virtual environment (.venv)..." -ForegroundColor Cyan
    & $python -m venv $venv
    $Install = $true
}

# 3) Install dependencies the first time, or when -Install is passed.
$stamp = Join-Path $venv ".installed"
if ($Install -or -not (Test-Path $stamp)) {
    Write-Host "Installing dependencies (this can take a minute)..." -ForegroundColor Cyan
    & $venvPython -m pip install --upgrade pip
    & $venvPython -m pip install -e ".[dev]"
    New-Item -ItemType File -Path $stamp -Force | Out-Null
}

# 4) Warn if .env is missing (the app needs API keys to do anything useful).
if (-not (Test-Path (Join-Path $PSScriptRoot ".env"))) {
    Write-Host "WARNING: api\.env not found. Copy .env.example to .env and fill in your keys." -ForegroundColor Yellow
}

# 5) Run tests or launch the server.
if ($Test) {
    Write-Host "Running tests..." -ForegroundColor Cyan
    & $venvPython -m pytest
} else {
    # Bind 0.0.0.0 so a physical phone on the same Wi-Fi can reach the API at http://<PC-IP>:8000.
    # Pick the adapter that actually has internet (a default gateway) and isn't a virtual one
    # (VirtualBox 192.168.56.*, Hyper-V, etc.) so we don't print an unreachable address.
    $ip = (Get-NetIPConfiguration -ErrorAction SilentlyContinue |
        Where-Object { $_.IPv4DefaultGateway -and $_.NetAdapter.Status -eq 'Up' } |
        Select-Object -First 1).IPv4Address.IPAddress
    if (-not $ip) {
        $ip = (Get-NetIPAddress -AddressFamily IPv4 -ErrorAction SilentlyContinue |
            Where-Object {
                $_.IPAddress -notlike '127.*' -and $_.IPAddress -notlike '169.254.*' -and
                $_.IPAddress -notlike '192.168.56.*'
            } | Select-Object -First 1).IPAddress
    }
    Write-Host "Starting API on all interfaces (port 8000)." -ForegroundColor Green
    Write-Host "  - This PC:        http://127.0.0.1:8000/docs" -ForegroundColor Green
    if ($ip) {
        Write-Host "  - From your phone: http://${ip}:8000   <- put this in mobile\.env EXPO_PUBLIC_API_URL" -ForegroundColor Green
    }
    & $venvPython -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
}
