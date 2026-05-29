# Push Bildirim ve Test Revizyon Notları

Bu revizyon ana mimariyi değiştirmeden yapılmıştır. Backend FastAPI + MongoDB olarak korunmuştur. Frontend Expo React Native yapısı korunmuştur.

## Eklenen ana parçalar

### Frontend

- `expo-notifications` eklendi.
- `expo-device` eklendi.
- `@react-native-community/datetimepicker` eklendi.
- Giriş, kayıt ve oturum yükleme sonrasında cihazdan Expo push token alınır.
- Token backend tarafındaki `/api/devices/register` endpointine kaydedilir.
- Çıkış sırasında token `/api/devices/unregister` ile pasifleştirilir.
- Hatırlatıcı formunda başlangıç tarihi, bitiş tarihi ve saat alanları elle yazmak yerine sistem seçicisi ile seçilir.
- Hatırlatıcı ekranına test bildirimi butonu eklendi.

### Backend

- `devices` koleksiyonu eklendi.
- `notification_logs` koleksiyonu eklendi.
- `/api/devices/register` eklendi.
- `/api/devices/unregister` eklendi.
- `/api/devices` eklendi.
- `/api/notifications/test` eklendi.
- `/api/notifications/logs` eklendi.
- APScheduler tabanlı dakikalık hatırlatıcı taraması eklendi.
- Zamanı gelen hatırlatıcılar Expo Push Service üzerinden gerçek push bildirimi olarak gönderilir.
- Erteleme aksiyonu artık sadece log yazmaz; `notification_logs` içinde pending snooze bildirimi oluşturur.

## Önemli çalışma notları

### Expo projectId

Expo push token alımında EAS projectId gerekir. `frontend/app.json` içinde şu alan bırakıldı:

```json
"extra": {
  "eas": {
    "projectId": ""
  }
}
```

EAS projesi bağlandıktan sonra gerçek projectId buraya yazılmalıdır. EAS build sırasında bazı ortamlarda `Constants.easConfig.projectId` otomatik gelebilir, ancak stabil çalışma için app.json alanının doldurulması önerilir.

### Kurulum komutları

Frontend:

```bash
cd frontend
npx expo install expo-notifications expo-device @react-native-community/datetimepicker
npm install
```

Backend:

```bash
cd backend
pip install -r requirements.txt
```

### Scheduler ayarları

`backend/.env.example` içine şu ayarlar eklendi:

```env
SCHEDULER_ENABLED=true
NOTIFICATION_LOOKBACK_SECONDS=90
EXPO_PUSH_API_URL=https://exp.host/--/api/v2/push/send
EXPO_ACCESS_TOKEN=
```

Geliştirme ortamında tek FastAPI worker ile çalıştırılabilir. Production ortamında birden fazla worker açılırsa scheduler her worker içinde ayrı çalışabilir. Bu durumda sadece tek worker için `SCHEDULER_ENABLED=true` bırakılmalı veya scheduler ayrı bir worker sürecine taşınmalıdır.

## Testler

Backend için `pytest` test omurgası eklendi:

```text
backend/tests/test_auth.py
backend/tests/test_profile.py
backend/tests/test_medications.py
backend/tests/test_reminders.py
backend/tests/test_logs.py
backend/tests/test_analysis.py
backend/tests/test_notifications.py
```

Çalıştırma:

```bash
cd backend
pytest
```

## Bildirim akışı

1. Kullanıcı giriş yapar.
2. Mobil uygulama izin ister.
3. Fiziksel cihazdan Expo push token alınır.
4. Token MongoDB `devices` koleksiyonuna kaydedilir.
5. Scheduler her 60 saniyede aktif reminder kayıtlarını kontrol eder.
6. Hatırlatma zamanı geldiyse `notification_logs` kaydı oluşturulur.
7. Aktif cihaz tokenları Expo Push Service API’ye gönderilir.
8. Başarılı, başarısız veya atlanan bildirim sonucu `notification_logs` üzerinde saklanır.
