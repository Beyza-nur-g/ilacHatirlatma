from __future__ import annotations

from typing import List

from fastapi import APIRouter, Depends, HTTPException, status

from src.config.database import get_database
from src.middleware.auth import get_current_user
from src.models.reminder import ReminderCreate, ReminderResponse, ReminderUpdate
from src.utils.activity import create_activity_event
from src.utils.mongo import parse_object_id, to_document, utcnow

router = APIRouter(prefix='/reminders', tags=['Reminders'])


async def _ensure_medication(db, uid: str, medication_id: str):
    obj_id = parse_object_id(medication_id, 'medication id')
    medication = await db.medications.find_one({'_id': obj_id, 'uid': uid})
    if not medication:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='Ilac bulunamadi')
    return medication


@router.get('', response_model=List[ReminderResponse])
async def get_reminders(current_user: dict = Depends(get_current_user)):
    db = await get_database()
    reminders = await db.reminders.find({'uid': current_user['uid']}).sort('updated_at', -1).to_list(length=None)
    return [ReminderResponse(**to_document(reminder)) for reminder in reminders]


@router.post('', response_model=ReminderResponse, status_code=status.HTTP_201_CREATED)
async def create_reminder(reminder: ReminderCreate, current_user: dict = Depends(get_current_user)):
    db = await get_database()
    medication = await _ensure_medication(db, current_user['uid'], reminder.medication_id)
    reminder_dict = reminder.model_dump()
    if reminder_dict.get('member_id') is None:
        reminder_dict['member_id'] = medication.get('member_id')
    now = utcnow()
    reminder_dict.update({'uid': current_user['uid'], 'created_at': now, 'updated_at': now})
    result = await db.reminders.insert_one(reminder_dict)
    await create_activity_event(current_user['uid'], 'reminder_created', 'Hatirlatici eklendi', member_id=reminder_dict.get('member_id'), metadata={'medication_id': reminder.medication_id})
    return ReminderResponse(id=str(result.inserted_id), **reminder_dict)


@router.put('/{reminder_id}', response_model=ReminderResponse)
async def update_reminder(reminder_id: str, update_data: ReminderUpdate, current_user: dict = Depends(get_current_user)):
    db = await get_database()
    obj_id = parse_object_id(reminder_id, 'reminder id')
    existing = await db.reminders.find_one({'_id': obj_id, 'uid': current_user['uid']})
    if not existing:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='Hatirlatici bulunamadi')
    update_dict = update_data.model_dump(exclude_unset=True)
    if 'medication_id' in update_dict and update_dict['medication_id']:
        medication = await _ensure_medication(db, current_user['uid'], update_dict['medication_id'])
        if 'member_id' not in update_dict or update_dict['member_id'] is None:
            update_dict['member_id'] = medication.get('member_id')
    if not update_dict:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail='Guncellenecek alan bulunamadi')
    update_dict['updated_at'] = utcnow()
    await db.reminders.update_one({'_id': obj_id}, {'$set': update_dict})
    reminder = await db.reminders.find_one({'_id': obj_id})
    await create_activity_event(current_user['uid'], 'reminder_updated', 'Hatirlatici guncellendi', member_id=reminder.get('member_id'), metadata={'reminder_id': reminder_id})
    return ReminderResponse(**to_document(reminder))


@router.post('/{reminder_id}/toggle', response_model=ReminderResponse)
async def toggle_reminder(reminder_id: str, current_user: dict = Depends(get_current_user)):
    db = await get_database()
    obj_id = parse_object_id(reminder_id, 'reminder id')
    reminder = await db.reminders.find_one({'_id': obj_id, 'uid': current_user['uid']})
    if not reminder:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='Hatirlatici bulunamadi')
    new_status = not reminder.get('enabled', True)
    await db.reminders.update_one({'_id': obj_id}, {'$set': {'enabled': new_status, 'updated_at': utcnow()}})
    reminder = await db.reminders.find_one({'_id': obj_id})
    message = 'Hatirlatici aktif edildi' if new_status else 'Hatirlatici pasif yapildi'
    await create_activity_event(current_user['uid'], 'reminder_toggled', message, member_id=reminder.get('member_id'), metadata={'reminder_id': reminder_id})
    return ReminderResponse(**to_document(reminder))


@router.delete('/{reminder_id}', status_code=status.HTTP_204_NO_CONTENT)
async def delete_reminder(reminder_id: str, current_user: dict = Depends(get_current_user)):
    db = await get_database()
    obj_id = parse_object_id(reminder_id, 'reminder id')
    existing = await db.reminders.find_one({'_id': obj_id, 'uid': current_user['uid']})
    if not existing:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='Hatirlatici bulunamadi')
    await db.reminders.delete_one({'_id': obj_id, 'uid': current_user['uid']})
    await db.logs.delete_many({'uid': current_user['uid'], 'reminder_id': reminder_id})
    await db.notification_logs.delete_many({'uid': current_user['uid'], 'reminder_id': reminder_id})
    await create_activity_event(current_user['uid'], 'reminder_deleted', 'Hatirlatici silindi', member_id=existing.get('member_id'))
