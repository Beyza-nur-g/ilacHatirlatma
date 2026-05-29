from __future__ import annotations

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from src.config.database import close_mongo_connection, connect_to_mongo, mongodb
from src.config.settings import API_PREFIX, APP_NAME, CORS_ORIGINS, DB_NAME
from src.modules.activity.routes import router as activity_router
from src.modules.auth.routes import router as auth_router
from src.modules.chat.routes import router as chat_router
from src.modules.dashboard.routes import router as dashboard_router
from src.modules.devices.routes import router as devices_router
from src.modules.family.routes import router as family_router
from src.modules.logs.routes import router as logs_router
from src.modules.measurements.routes import router as measurements_router
from src.modules.medications.routes import router as medications_router
from src.modules.notifications.routes import router as notifications_router
from src.modules.ocr.routes import router as ocr_router
from src.modules.patient.routes import router as patient_router
from src.modules.reminders.routes import router as reminders_router
from src.services.notification_scheduler import start_notification_scheduler, stop_notification_scheduler

app = FastAPI(title=APP_NAME, version='3.0.0', description='Akilli ilac takip ve aile sagligi uygulamasi API')

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS if CORS_ORIGINS != ['*'] else ['*'],
    allow_credentials=True,
    allow_methods=['*'],
    allow_headers=['*'],
)


@app.on_event('startup')
async def startup_event():
    await connect_to_mongo()
    await start_notification_scheduler()


@app.on_event('shutdown')
async def shutdown_event():
    await stop_notification_scheduler()
    await close_mongo_connection()


@app.get(f'{API_PREFIX}/health')
async def health_check():
    db_ok = False
    try:
        if mongodb.client is not None:
            await mongodb.client.admin.command('ping')
            db_ok = True
    except Exception:
        db_ok = False
    return {'status': 'ok', 'database': 'ok' if db_ok else 'error', 'db_name': DB_NAME}


for router in [
    auth_router,
    patient_router,
    medications_router,
    reminders_router,
    logs_router,
    family_router,
    chat_router,
    ocr_router,
    measurements_router,
    dashboard_router,
    devices_router,
    notifications_router,
    activity_router,
]:
    app.include_router(router, prefix=API_PREFIX)


if __name__ == '__main__':
    import uvicorn

    uvicorn.run('src.main:app', host='0.0.0.0', port=8001, reload=True)
