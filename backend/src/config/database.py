from __future__ import annotations

from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase
from pymongo import ASCENDING, DESCENDING
from pymongo.errors import ServerSelectionTimeoutError

from src.config.settings import DB_NAME, MONGO_TIMEOUT_MS, MONGO_URL


class MongoDB:
    client: AsyncIOMotorClient | None = None
    db: AsyncIOMotorDatabase | None = None


mongodb = MongoDB()


async def ensure_indexes() -> None:
    db = mongodb.db
    if db is None:
        return

    await db.patients.create_index([('email', ASCENDING)], unique=True)
    await db.family_members.create_index([('owner_user_id', ASCENDING), ('created_at', DESCENDING)])
    await db.medications.create_index([('uid', ASCENDING), ('member_id', ASCENDING), ('updated_at', DESCENDING)])
    await db.reminders.create_index([('uid', ASCENDING), ('member_id', ASCENDING), ('enabled', ASCENDING)])
    await db.reminders.create_index([('uid', ASCENDING), ('medication_id', ASCENDING)])
    await db.logs.create_index([('uid', ASCENDING), ('scheduled_at', DESCENDING)])
    await db.logs.create_index([('uid', ASCENDING), ('member_id', ASCENDING)])
    await db.logs.create_index([('uid', ASCENDING), ('medication_id', ASCENDING)])
    await db.chat_messages.create_index([('owner_user_id', ASCENDING), ('created_at', DESCENDING)])
    await db.measurement_types.create_index([('uid', ASCENDING), ('name', ASCENDING)], unique=True)
    await db.measurements.create_index([('uid', ASCENDING), ('member_id', ASCENDING), ('measured_at', DESCENDING)])
    await db.measurements.create_index([('uid', ASCENDING), ('measurement_type_id', ASCENDING)])
    await db.activity_events.create_index([('uid', ASCENDING), ('created_at', DESCENDING)])
    await db.devices.create_index([('uid', ASCENDING), ('expo_push_token', ASCENDING)], unique=True)
    await db.devices.create_index([('uid', ASCENDING), ('is_active', ASCENDING), ('last_seen_at', DESCENDING)])
    await db.notification_logs.create_index([('dedupe_key', ASCENDING)], unique=True)
    await db.notification_logs.create_index([('uid', ASCENDING), ('created_at', DESCENDING)])
    await db.notification_logs.create_index([('status', ASCENDING), ('due_at', ASCENDING)])


async def connect_to_mongo() -> None:
    try:
        mongodb.client = AsyncIOMotorClient(
            MONGO_URL,
            serverSelectionTimeoutMS=MONGO_TIMEOUT_MS,
            uuidRepresentation='standard',
        )
        mongodb.db = mongodb.client[DB_NAME]
        await mongodb.client.admin.command('ping')
        await ensure_indexes()
        print(f'[mongo] connected to {DB_NAME}')
    except ServerSelectionTimeoutError as exc:
        print(f'[mongo] connection failed: {exc}')
        raise


async def close_mongo_connection() -> None:
    if mongodb.client is not None:
        mongodb.client.close()
        mongodb.client = None
        mongodb.db = None


async def get_database() -> AsyncIOMotorDatabase:
    if mongodb.db is None:
        raise RuntimeError('MongoDB baglantisi baslatilmadi')
    return mongodb.db
