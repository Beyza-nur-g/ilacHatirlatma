# Akilli Ilac Takip Uygulamasi

Bu proje FastAPI + MongoDB + Expo (React Native) tabanli akilli ilac takip uygulamasidir.
Bu surumde backend, frontend ve MongoDB veri modeli ayni sozlesme etrafinda yeniden duzenlendi.

## Bu surumde duzeltilen ana basliklar

- MongoDB baglanti ve indeks altyapisi guclendirildi.
- Tum frontend store katmani tek bir API istemcisinde toplandi.
- Eski emergent URL kalintilari temizlendi.
- Expo splash referansi duzeltildi.
- Mobilde sorun cikaran Picker alanlari custom modal SelectField ile degistirildi.
- Ilac, hatirlatici, aile bireyi ve olcum ekranlarina calisir CRUD akislari eklendi.
- Dashboard zenginlestirildi.
- Tema sistemi eklendi.
- Kullanici islemleri icin toast bildirim mekanizmasi guclendirildi.
- Ayrik iki OpenAI alani eklendi:
  - sohbet asistani
  - ilac fotografi / metin analizi
- Her iki AI alani ayri env key ve ayri env model ile calisacak sekilde ayrildi.
- Varsayilan model `gpt-5-nano` olarak ayarlandi.

## Proje yapisi

```text
backend/
  src/
    config/
    middleware/
    models/
    modules/
    services/
    utils/
  scripts/
  server.py
  .env.example

frontend/
  app/
    (auth)/
    (tabs)/
  src/
    components/
    constants/
    models/
    services/
    store/
    theme/
  .env.example
```

## Backend kurulumu

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
python server.py
```

Backend varsayilan olarak su adreste acilir:

```text
http://0.0.0.0:8001
```

Saglik kontrolu:

```bash
curl http://localhost:8001/api/health
```

## Frontend kurulumu

```bash
cd frontend
npm install
cp .env.example .env
npx expo start --clear
```

### QR ile gercek cihazda acarken onemli not

`frontend/.env` dosyasindaki API adresi bilgisayarin yerel IP adresi olmalidir.
Ornek:

```env
EXPO_PUBLIC_API_BASE_URL=http://192.168.1.10:8001
EXPO_PUBLIC_API_TIMEOUT_MS=15000
```

Yerel IP adresini ogrendikten sonra `.env` dosyasini guncelleyip Expo'yu yeniden baslatin.
`127.0.0.1` veya `localhost` yalnizca ayni cihazdaki emulator/simulator icin uygundur.

## OpenAI env ayarlari

Backend `.env` icine su alanlar eklendi:

```env
OPENAI_CHAT_API_KEY=
OPENAI_CHAT_MODEL=gpt-5-nano
OPENAI_CHAT_REASONING_EFFORT=minimal

OPENAI_VISION_API_KEY=
OPENAI_VISION_MODEL=gpt-5-nano
OPENAI_VISION_REASONING_EFFORT=minimal
```

- `OPENAI_CHAT_*` alanlari sohbet asistani icindir.
- `OPENAI_VISION_*` alanlari ilac fotografi / prospektus analizi icindir.
- Bu iki alan birbirinden tamamen ayridir.

## MongoDB veritabani ve koleksiyonlari olusturma

### Yontem 1 - Hazir script ile

```bash
cd backend
mongo --host localhost:27017 scripts/mongo_init.js
```

### Yontem 2 - Mongo shell icinde manuel

```javascript
use akilli_ilac

db.createCollection('patients')
db.createCollection('family_members')
db.createCollection('medications')
db.createCollection('reminders')
db.createCollection('logs')
db.createCollection('chat_messages')
db.createCollection('measurement_types')
db.createCollection('measurements')
db.createCollection('activity_events')

db.patients.createIndex({ email: 1 }, { unique: true, name: 'uq_patients_email' })
db.family_members.createIndex({ owner_user_id: 1, created_at: -1 }, { name: 'idx_family_owner_created' })
db.medications.createIndex({ uid: 1, member_id: 1, updated_at: -1 }, { name: 'idx_medications_uid_member_updated' })
db.reminders.createIndex({ uid: 1, member_id: 1, enabled: 1 }, { name: 'idx_reminders_uid_member_enabled' })
db.reminders.createIndex({ uid: 1, medication_id: 1 }, { name: 'idx_reminders_uid_medication' })
db.logs.createIndex({ uid: 1, scheduled_at: -1 }, { name: 'idx_logs_uid_scheduled' })
db.logs.createIndex({ uid: 1, member_id: 1 }, { name: 'idx_logs_uid_member' })
db.logs.createIndex({ uid: 1, medication_id: 1 }, { name: 'idx_logs_uid_medication' })
db.chat_messages.createIndex({ owner_user_id: 1, created_at: -1 }, { name: 'idx_chat_owner_created' })
db.measurement_types.createIndex({ uid: 1, name: 1 }, { unique: true, name: 'uq_measurement_types_uid_name' })
db.measurements.createIndex({ uid: 1, member_id: 1, measured_at: -1 }, { name: 'idx_measurements_uid_member_measured' })
db.measurements.createIndex({ uid: 1, measurement_type_id: 1 }, { name: 'idx_measurements_uid_type' })
db.activity_events.createIndex({ uid: 1, created_at: -1 }, { name: 'idx_activity_uid_created' })
```

## API ozetleri

### Auth
- `POST /api/auth/register`
- `POST /api/auth/login`

### Profil
- `GET /api/profile`
- `PUT /api/profile`

### Aile
- `GET /api/family`
- `POST /api/family`
- `PUT /api/family/{id}`
- `DELETE /api/family/{id}`

### Ilaclar
- `GET /api/medications`
- `POST /api/medications`
- `PUT /api/medications/{id}`
- `DELETE /api/medications/{id}`

### Hatirlaticilar
- `GET /api/reminders`
- `POST /api/reminders`
- `PUT /api/reminders/{id}`
- `POST /api/reminders/{id}/toggle`
- `DELETE /api/reminders/{id}`

### Loglar
- `GET /api/logs`
- `POST /api/logs`

### Olcumler
- `GET /api/measurements/types`
- `POST /api/measurements/types`
- `PUT /api/measurements/types/{id}`
- `DELETE /api/measurements/types/{id}`
- `GET /api/measurements`
- `POST /api/measurements`
- `PUT /api/measurements/{id}`
- `DELETE /api/measurements/{id}`

### Dashboard ve aktivite
- `GET /api/dashboard`
- `GET /api/activity`

### AI alanlari
- `POST /api/chat/send`
- `POST /api/ocr/analyze`
- `POST /api/ocr/upload`

## Notlar

- Ilac fotografindan analiz alani fallback mod ile de calisabilir; key tanimliysa OpenAI kullanilir.
- Theme secimi cihazda saklanir.
- Tum ag katmani `frontend/src/services/api.ts` uzerinden yonetilir.
- CRUD ekranlari aktif profil mantigina gore filtrelenir.
