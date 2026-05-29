# Frontend calistirma notlari

## Kurulum

```bash
npm install
cp .env.example .env
npx expo start --clear
```

## Gercek cihaz ile test

QR kod ile test edecekseniz `.env` icindeki backend adresini bilgisayarinizin yerel IP adresi ile degistirin:

```env
EXPO_PUBLIC_API_BASE_URL=http://192.168.1.10:8001
EXPO_PUBLIC_API_TIMEOUT_MS=15000
```

Ardindan Expo'yu yeniden baslatin.

## Temel yapilar

- `src/services/api.ts`: tum backend baglantilari
- `src/store/*`: Zustand store'lari
- `src/components/ToastViewport.tsx`: guclu bildirim alani
- `src/components/SelectField.tsx`: cihaz uyumlu secim modal'i
- `src/theme/*`: tema altyapisi
