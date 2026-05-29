from __future__ import annotations

from datetime import datetime
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status

from src.config.database import get_database
from src.middleware.auth import get_current_user
from src.models.log import LogAction, LogCreate, LogResponse
from src.services.notification_scheduler import create_snooze_notification
from src.utils.activity import create_activity_event
from src.utils.mongo import parse_object_id, to_document, utcnow

router = APIRouter(prefix='/logs', tags=['Logs'])


@router.post('', response_model=LogResponse, status_code=status.HTTP_201_CREATED)
async def create_log(log: LogCreate, current_user: dict = Depends(get_current_user)):
    db = await get_database()
    reminder = await db.reminders.find_one({'_id': parse_object_id(log.reminder_id, 'reminder id'), 'uid': current_user['uid']})
    if not reminder:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='Hatirlatici bulunamadi')
    medication = await db.medications.find_one({'_id': parse_object_id(log.medication_id, 'medication id'), 'uid': current_user['uid']})
    if not medication:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='Ilac bulunamadi')
    log_dict = log.model_dump()
    now = utcnow()
    log_dict.update({'uid': current_user['uid'], 'member_id': reminder.get('member_id') or medication.get('member_id'), 'action_at': now, 'created_at': now})
    result = await db.logs.insert_one(log_dict)
    log_dict['_id'] = result.inserted_id
    if log.action == LogAction.TAKEN:
        await create_activity_event(current_user['uid'], 'medication_taken', f'Ilac alindi: {medication["name"]}', member_id=log_dict.get('member_id'), metadata={'medication_id': log.medication_id})
    elif log.action == LogAction.SKIPPED:
        await create_activity_event(current_user['uid'], 'medication_skipped', f'Ilac atlandi: {medication["name"]}', member_id=log_dict.get('member_id'))
    elif log.action == LogAction.SNOOZED:
        await create_activity_event(current_user['uid'], 'reminder_snoozed', f'Hatirlatici ertelendi: {medication["name"]}', member_id=log_dict.get('member_id'))
        await create_snooze_notification(db, log_doc=log_dict, medication_name=medication['name'])
    log_dict.pop('_id', None)
    return LogResponse(id=str(result.inserted_id), **log_dict)


@router.get('', response_model=List[LogResponse])
async def get_logs(
    from_date: Optional[str] = Query(None),
    to_date: Optional[str] = Query(None),
    member_id: Optional[str] = Query(None),
    current_user: dict = Depends(get_current_user),
):
    db = await get_database()
    query: dict = {'uid': current_user['uid']}
    if member_id is not None:
        query['member_id'] = member_id
    if from_date or to_date:
        query['scheduled_at'] = {}
        if from_date:
            query['scheduled_at']['$gte'] = datetime.fromisoformat(from_date)
        if to_date:
            query['scheduled_at']['$lte'] = datetime.fromisoformat(to_date + 'T23:59:59')
    logs = await db.logs.find(query).sort('scheduled_at', -1).to_list(length=None)
    return [LogResponse(**to_document(item)) for item in logs]
