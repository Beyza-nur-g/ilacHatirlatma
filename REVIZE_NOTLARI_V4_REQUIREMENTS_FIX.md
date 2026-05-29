# V4 Kurulum Düzeltmesi

Bu revizyon, V3 paketinde görülen `pip install -r requirements.txt` hatasını düzeltir.

## Düzeltilen sorun

Önceki `requirements.txt` dosyasında şu geçersiz paket sürümü vardı:

```txt
APScheduler==3.11.2.post1
```

Pip çıktısında bu sürüm bulunamadığı için kurulum yarıda kesiliyordu. Kurulum yarıda kesildiği için `passlib` ve `bson` gibi paketler de kurulmamış görünüyor, pytest sırasında zincirleme `ModuleNotFoundError` oluşuyordu.

## Yapılan düzeltme

- `APScheduler==3.11.2` olarak düzeltildi.
- Gereksiz otomatik freeze paketleri kaldırıldı.
- Backend için gerçekten kullanılan minimal bağımlılık listesi bırakıldı.
- FastAPI + MongoDB + Expo push mimarisi değiştirilmedi.

## Temiz kurulum komutları

Windows PowerShell için önerilen komutlar:

```powershell
cd C:\Users\JARVIS\bb\Akilli_ilac_hatirlatma_V2\backend
python -m venv .venv
.\.venv\Scripts\activate
python -m pip install --upgrade pip
pip install -r requirements.txt
pytest
```

Eğer eski global kurulum karıştıysa `.venv` kullanmak en güvenli yoldur.
