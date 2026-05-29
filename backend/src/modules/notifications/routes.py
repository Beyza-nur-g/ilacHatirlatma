from __future__ import annotations

from typing import List

from fastapi import APIRouter, Depends, HTTPException, status

from src.config.database import get_database
from src.middleware.auth import get_current_user
from src.models.notification import NotificationLogResponse, NotificationTestRequest
from src.services.notification_scheduler import _send_notification_log
from src.utils.mongo import to_document, utcnow

router = APIRouter(prefix='/notifications', tags=['Notifications'])


@router.post('/test', response_model=NotificationLogResponse, status_code=status.HTTP_201_CREATED)
async def send_test_notification(payload: NotificationTestRequest, current_user: dict = Depends(get_current_user)):
    db = await get_database()
    now = utcnow()
    dedupe_key = f'test:{current_user["uid"]}:{now.isoformat()}'
    result = await db.notification_logs.insert_one(
        {
            'uid': current_user['uid'],
            'member_id': None,
            'reminder_id': None,
            'medication_id': None,
            'scheduled_at': None,
            'due_at': now,
            'title': payload.title,
            'body': payload.body,
            'source': 'test',
            'status': 'pending',
            'dedupe_key': dedupe_key,
            'device_count': 0,
            'success_count': 0,
            'failure_count': 0,
            'ticket_ids': [],
            'metadata': {},
            'created_at': now,
            'updated_at': now,
        }
    )
    notification = await db.notification_logs.find_one({'_id': result.inserted_id})
    await _send_notification_log(db, notification)
    notification = await db.notification_logs.find_one({'_id': result.inserted_id})
    if not notification:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail='Bildirim logu olusturulamadi')
    return NotificationLogResponse(**to_document(notification))


@router.get('/logs', response_model=List[NotificationLogResponse])
async def get_notification_logs(current_user: dict = Depends(get_current_user)):
    db = await get_database()
    logs = await db.notification_logs.find({'uid': current_user['uid']}).sort('created_at', -1).to_list(length=100)
    return [NotificationLogResponse(**to_document(item)) for item in logs]
