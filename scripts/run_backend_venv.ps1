# Backend'i sanal ortam üzerinden çalıştırır.
# Ortalama süre: 5-15 saniye.

$ErrorActionPreference = "Stop"
$ProjectRoot = Split-Path -Parent $PSScriptRoot
$BackendPath = Join-Path $ProjectRoot "backend"
$PythonPath = Join-Path $BackendPath ".venv\Scripts\python.exe"

if (!(Test-Path $PythonPath)) {
    Write-Host ".venv bulunamadı. Önce scripts\setup_backend_venv.ps1 çalıştırın."
    exit 1
}

Set-Location $BackendPath
& $PythonPath -m uvicorn src.main:app --host 0.0.0.0 --port 8001 --reload
