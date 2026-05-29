# V5 - Sanal Ortam ve Global Paket Temizliği

Bu sürümde ana mimari değiştirilmedi. FastAPI + MongoDB + Expo yapısı korunmuştur.

## Eklenenler

- `backend/requirements.txt` sade ve gerçek proje bağımlılıklarıyla tutuldu.
- `backend/cleanup_global_old_requirements.txt` eklendi.
  - Bu dosya sadece yanlışlıkla global Python ortamına kurulan eski/şişkin paketleri temizlemek içindir.
  - Uygulama kurulumu için kullanılmaz.
- `scripts/setup_backend_venv.ps1` eklendi.
  - Backend için temiz `.venv` kurar.
  - Paketleri sanal ortama kurar.
  - Testleri çalıştırır.
- `scripts/run_backend_venv.ps1` eklendi.
  - Backend'i `.venv` üzerinden çalıştırır.
- `scripts/cleanup_global_python_packages.ps1` eklendi.
  - Global Python'a yanlışlıkla kurulan eski paketleri kaldırır.
  - Çalışmadan önce `EVET` onayı ister.

## Önerilen kullanım

```powershell
cd C:\Users\JARVIS\bb\Akilli_ilac_hatirlatma_V2
powershell -ExecutionPolicy Bypass -File .\scripts\setup_backend_venv.ps1
powershell -ExecutionPolicy Bypass -File .\scripts\run_backend_venv.ps1
```

Global ortamı temizlemek isterseniz:

```powershell
cd C:\Users\JARVIS\bb\Akilli_ilac_hatirlatma_V2
powershell -ExecutionPolicy Bypass -File .\scripts\cleanup_global_python_packages.ps1
```

## Not

Global ortam temizliği başka Python projelerini etkileyebilir. Bu yüzden asıl çözüm, projeyi her zaman `.venv` ile çalıştırmaktır.
