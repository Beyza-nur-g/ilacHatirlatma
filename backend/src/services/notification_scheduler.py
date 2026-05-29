from __future__ import annotations

import logging
from datetime import datetime, timedelta
from typing import Any
from zoneinfo import ZoneInfo

try:
    from apscheduler.schedulers.asyncio import AsyncIOScheduler
except Exception:  # pragma: no cover - APScheduler kurulmadan uygulama import edilebilsin.
    AsyncIOScheduler = None  # type: ignore[assignment]

from src.config.database import get_database
from src.config.settings import NOTIFICATION_LOOKBACK_SECONDS, SCHEDULER_ENABLED, TIMEZONE
from src.services.push_service import expo_push_service
from src.utils.mongo import parse_object_id, utcnow

logger = logging.getLogger(__name__)

WEEKDAY_MAP = {
    0: 'monday',
    1: 'tuesday',
    2: 'wednesday',
    3: 'thursday',
    4: 'friday',
    5: 'saturday',
    6: 'sunday',
}

scheduler = None


def _naive_utc(dt: datetime) -> datetime:
    # Projedeki mevcut veri modeli UTC datetime'i naive olarak tutuyor; geriye uyum icin ayni bicim korunur.
    if dt.tzinfo is None:
        return dt
    return dt.astimezone(ZoneInfo('UTC')).replace(tzinfo=None)


def _safe_timezone(value: str | None) -> ZoneInfo:
    try:
        return ZoneInfo(value or TIMEZONE)
    except Exception:
        logger.warning('[scheduler] gecersiz timezone=%s, varsayilan kullaniliyor', value)
        return ZoneInfo(TIMEZONE)


def _is_reminder_active_on_date(reminder: dict[str, Any], local_date: str, weekday_name: str) -> bool:
    if not reminder.get('enabled', True):
        return False
    start_date = reminder.get('start_date') or local_date
    end_date = reminder.get('end_date') or '9999-12-31'
    if not (start_date <= local_date <= end_date):
        return False
    if reminder.get('frequency') == 'weekly':
        weekly_days = reminder.get('weekly_days') or []
        return weekday_name in weekly_days
    if reminder.get('frequency') == 'as_needed':
        # Gerektiginde kullanilan ilaclar otomatik zamanlanmaz; kullanici manuel log girer.
        return False
    return True


def build_due_candidates(reminder: dict[str, Any], now_utc: datetime | None = None) -> list[dict[str, Any]]:
    # Bu fonksiyon saf hesaplama yapar; pytest ile MongoDB gerekmeden test edilebilir.
    now_utc = now_utc or utcnow()
    timezone = _safe_timezone(reminder.get('timezone'))
    now_local = now_utc.replace(tzinfo=ZoneInfo('UTC')).astimezone(timezone)
    local_date = now_local.strftime('%Y-%m-%d')
    weekday_name = WEEKDAY_MAP[now_local.weekday()]
    if not _is_reminder_active_on_date(reminder, local_date, weekday_name):
        return []

    candidates: list[dict[str, Any]] = []
    notify_before = int(reminder.get('notify_before_minutes') or 0)
    window_start = now_local - timedelta(seconds=NOTIFICATION_LOOKBACK_SECONDS)
    window_end = now_local + timedelta(seconds=59)

    for time_text in reminder.get('times', []):
        try:
            hour, minute = [int(part) for part in time_text.split(':')]
            scheduled_local = now_local.replace(hour=hour, minute=minute, second=0, microsecond=0)
        except Exception:
            logger.warning('[scheduler] gecersiz reminder saati reminder_id=%s time=%s', reminder.get('_id'), time_text)
            continue
        due_local = scheduled_local - timedelta(minutes=notify_before)
        if window_start <= due_local <= window_end:
            reminder_id = str(reminder.get('_id'))
            scheduled_at = _naive_utc(scheduled_local)
            due_at = _naive_utc(due_local)
            candidates.append(
                {
                    'dedupe_key': f'normal:{reminder_id}:{local_date}:{time_text}:{notify_before}',
                    'scheduled_at': scheduled_at,
                    'due_at': due_at,
                    'time': time_text,
                    'source': 'normal',
                }
            )
    return candidates


async def create_snooze_notification(db, *, log_doc: dict[str, Any], medication_name: str) -> None:
    # Erteleme sadece log olarak kalmasin diye ikinci bir bildirim isini pending olarak yazariz.
    snooze_minutes = int(log_doc.get('snooze_minutes') or 10)
    due_at = log_doc['action_at'] + timedelta(minutes=snooze_minutes)
    dedupe_key = f'snooze:{str(log_doc.get("_id"))}'
    now = utcnow()
    await db.notification_logs.update_one(
        {'dedupe_key': dedupe_key},
        {
            '$setOnInsert': {
                'uid': log_doc['uid'],
                'member_id': log_doc.get('member_id'),
                'reminder_id': log_doc.get('reminder_id'),
                'medication_id': log_doc.get('medication_id'),
                'scheduled_at': log_doc.get('scheduled_at'),
                'due_at': due_at,
                'title': 'Ertelenen ilac hatirlatmasi',
                'body': f'{medication_name} icin ertelediginiz hatirlatici zamani geldi.',
                'source': 'snooze',
                'status': 'pending',
                'dedupe_key': dedupe_key,
                'device_count': 0,
                'success_count': 0,
                'failure_count': 0,
                'ticket_ids': [],
                'metadata': {'snooze_minutes': snooze_minutes},
                'created_at': now,
                'updated_at': now,
            }
        },
        upsert=True,
    )
    logger.info('[scheduler] snooze bildirimi planlandi dedupe_key=%s due_at=%s', dedupe_key, due_at.isoformat())


async def _send_notification_log(db, notification: dict[str, Any]) -> None:
    notification_id = notification.get('_id')
    uid = notification['uid']
    devices = await db.devices.find({'uid': uid, 'is_active': True}).to_list(length=None)
    tokens = [device.get('expo_push_token') for device in devices if device.get('expo_push_token')]
    now = utcnow()

    if not tokens:
        await db.notification_logs.update_one(
            {'_id': notification_id},
            {'$set': {'status': 'skipped', 'error': 'Aktif cihaz tokeni bulunamadi', 'updated_at': now}},
        )
        logger.info('[scheduler] cihaz tokeni yok uid=%s notification_id=%s', uid, notification_id)
        return

    payload = {
        'notificationLogId': str(notification_id),
        'reminderId': notification.get('reminder_id'),
        'medicationId': notification.get('medication_id'),
        'scheduledAt': notification.get('scheduled_at').isoformat() if notification.get('scheduled_at') else None,
        'source': notification.get('source'),
    }
    result = await expo_push_service.send_push_messages(
        tokens=tokens,
        title=notification['title'],
        body=notification['body'],
        data=payload,
    )
    status = 'sent' if result.success_count > 0 else 'failed'
    await db.notification_logs.update_one(
        {'_id': notification_id},
        {
            '$set': {
                'status': status,
                'device_count': len(tokens),
                'success_count': result.success_count,
                'failure_count': result.failure_count,
                'ticket_ids': result.ticket_ids,
                'error': '; '.join(result.errors[:5]) if result.errors else None,
                'sent_at': now,
                'updated_at': now,
            }
        },
    )
    logger.info('[scheduler] bildirim sonucu notification_id=%s status=%s success=%s failure=%s', notification_id, status, result.success_count, result.failure_count)


async def process_due_notifications(now_utc: datetime | None = None) -> dict[str, int]:
    db = await get_database()
    now_utc = now_utc or utcnow()
    stats = {'created': 0, 'sent': 0, 'pending_snooze': 0}

    reminders = await db.reminders.find({'enabled': True}).to_list(length=None)
    medication_cache: dict[str, dict[str, Any] | None] = {}

    for reminder in reminders:
        for candidate in build_due_candidates(reminder, now_utc):
            dedupe_key = candidate['dedupe_key']
            existing = await db.notification_logs.find_one({'dedupe_key': dedupe_key})
            if existing:
                continue
            medication_id = reminder.get('medication_id')
            medication = medication_cache.get(medication_id)
            if medication_id not in medication_cache:
                try:
                    medication = await db.medications.find_one({'_id': parse_object_id(medication_id, 'medication id'), 'uid': reminder['uid']})
                except Exception:
                    medication = None
                medication_cache[medication_id] = medication
            medication_name = (medication or {}).get('name', 'Ilac')
            notify_before = int(reminder.get('notify_before_minutes') or 0)
            title = 'Ilac hatirlatmasi'
            body = f'{medication_name} zamani geldi.' if notify_before == 0 else f'{medication_name} icin {notify_before} dakika sonra doz zamani.'
            now = utcnow()
            result = await db.notification_logs.insert_one(
                {
                    'uid': reminder['uid'],
                    'member_id': reminder.get('member_id') or (medication or {}).get('member_id'),
                    'reminder_id': str(reminder.get('_id')),
                    'medication_id': medication_id,
                    'scheduled_at': candidate['scheduled_at'],
                    'due_at': candidate['due_at'],
                    'title': title,
                    'body': body,
                    'source': candidate['source'],
                    'status': 'pending',
                    'dedupe_key': dedupe_key,
                    'device_count': 0,
                    'success_count': 0,
                    'failure_count': 0,
                    'ticket_ids': [],
                    'metadata': {'time': candidate['time'], 'notify_before_minutes': notify_before},
                    'created_at': now,
                    'updated_at': now,
                }
            )
            stats['created'] += 1
            pending_doc = await db.notification_logs.find_one({'_id': result.inserted_id})
            if pending_doc:
                await _send_notification_log(db, pending_doc)
                stats['sent'] += 1

    pending_snoozes = await db.notification_logs.find({'status': 'pending', 'due_at': {'$lte': now_utc}}).to_list(length=None)
    for notification in pending_snoozes:
        if notification.get('source') != 'snooze':
            continue
        await _send_notification_log(db, notification)
        stats['pending_snooze'] += 1

    logger.info('[scheduler] tur tamamlandi stats=%s', stats)
    return stats


async def start_notification_scheduler() -> None:
    global scheduler
    if not SCHEDULER_ENABLED:
        logger.info('[scheduler] kapali: SCHEDULER_ENABLED=false')
        return
    if AsyncIOScheduler is None:
        logger.warning('[scheduler] APScheduler kurulu degil, otomatik bildirimler baslatilamadi')
        return
    if scheduler and scheduler.running:
        return
    scheduler = AsyncIOScheduler(timezone=TIMEZONE)
    scheduler.add_job(process_due_notifications, 'interval', seconds=60, id='process_due_notifications', max_instances=1, coalesce=True)
    scheduler.start()
    logger.info('[scheduler] baslatildi interval=60s timezone=%s', TIMEZONE)


async def stop_notification_scheduler() -> None:
    global scheduler
    if scheduler and scheduler.running:
        scheduler.shutdown(wait=False)
        logger.info('[scheduler] durduruldu')
    scheduler = None
