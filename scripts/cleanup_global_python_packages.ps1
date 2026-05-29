# DİKKAT: Bu script global Python ortamına yanlışlıkla kurulan eski/siskin proje paketlerini kaldırır.
# Ortalama süre: 1-3 dakika.
# Başka Python projeleriniz global ortamdaki bu paketlere bağlıysa onları da etkileyebilir.
# En güvenli yöntem: projeyi .venv ile çalıştırmak ve global ortamı mümkünse kullanmamaktır.

$ErrorActionPreference = "Stop"
$ProjectRoot = Split-Path -Parent $PSScriptRoot
$CleanupFile = Join-Path $ProjectRoot "backend\cleanup_global_old_requirements.txt"

Write-Host "Bu işlem global Python ortamından eski proje paketlerini kaldıracak."
Write-Host "Kullanılacak liste: $CleanupFile"
Write-Host ""
$answer = Read-Host "Devam etmek için EVET yaz"

if ($answer -ne "EVET") {
    Write-Host "İşlem iptal edildi."
    exit 0
}

Write-Host "[1/2] Global Python paketleri temizleniyor..."
python -m pip uninstall -y -r $CleanupFile

Write-Host "[2/2] Global ortam bağımlılık çakışması kontrol ediliyor..."
python -m pip check

Write-Host "Global temizlik tamamlandı. Projeyi bundan sonra .venv üzerinden çalıştırın."
