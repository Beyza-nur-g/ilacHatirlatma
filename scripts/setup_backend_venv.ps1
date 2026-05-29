# Backend için temiz sanal ortam kurulum scripti.
# Ortalama süre: 1-4 dakika. İnternet hızına göre değişebilir.
# Bu script global Python paketlerine dokunmaz.

$ErrorActionPreference = "Stop"
$ProjectRoot = Split-Path -Parent $PSScriptRoot
$BackendPath = Join-Path $ProjectRoot "backend"
$VenvPath = Join-Path $BackendPath ".venv"

Write-Host "[1/6] Backend klasörüne geçiliyor: $BackendPath"
Set-Location $BackendPath

if (Test-Path $VenvPath) {
    Write-Host "[2/6] Mevcut .venv bulundu. Temiz kurulum için kaldırılıyor..."
    Remove-Item -Recurse -Force $VenvPath
} else {
    Write-Host "[2/6] Mevcut .venv yok. Yeni ortam oluşturulacak."
}

Write-Host "[3/6] Python sanal ortam oluşturuluyor..."
python -m venv .venv

Write-Host "[4/6] Sanal ortam pip güncelleniyor..."
& .\.venv\Scripts\python.exe -m pip install --upgrade pip

Write-Host "[5/6] Backend bağımlılıkları temiz requirements.txt üzerinden kuruluyor..."
& .\.venv\Scripts\python.exe -m pip install -r requirements.txt

Write-Host "[6/6] Testler çalıştırılıyor..."
& .\.venv\Scripts\python.exe -m pytest

Write-Host ""
Write-Host "Kurulum tamamlandı. Backend çalıştırmak için:"
Write-Host "cd backend"
Write-Host ".\.venv\Scripts\activate"
Write-Host "uvicorn src.main:app --host 0.0.0.0 --port 8001 --reload"
