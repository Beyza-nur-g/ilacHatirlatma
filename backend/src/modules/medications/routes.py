from __future__ import annotations

from typing import List

from fastapi import APIRouter, Depends, HTTPException, status

from src.config.database import get_database
from src.middleware.auth import get_current_user
from src.models.medication import MedicationCreate, MedicationResponse, MedicationUpdate
from src.utils.activity import create_activity_event
from src.utils.mongo import parse_object_id, to_document, utcnow

router = APIRouter(prefix='/medications', tags=['Medications'])


@router.get('', response_model=List[MedicationResponse])
async def get_medications(current_user: dict = Depends(get_current_user)):
    db = await get_database()
    medications = await db.medications.find({'uid': current_user['uid']}).sort('updated_at', -1).to_list(length=None)
    return [MedicationResponse(**to_document(med)) for med in medications]


@router.post('', response_model=MedicationResponse, status_code=status.HTTP_201_CREATED)
async def create_medication(medication: MedicationCreate, current_user: dict = Depends(get_current_user)):
    db = await get_database()
    med_dict = medication.model_dump()
    now = utcnow()
    med_dict.update({'uid': current_user['uid'], 'created_at': now, 'updated_at': now})
    result = await db.medications.insert_one(med_dict)
    response = MedicationResponse(id=str(result.inserted_id), **med_dict)
    await create_activity_event(current_user['uid'], 'medication_created', f'Ilac eklendi: {med_dict["name"]}', member_id=med_dict.get('member_id'))
    return response


@router.put('/{medication_id}', response_model=MedicationResponse)
async def update_medication(medication_id: str, update_data: MedicationUpdate, current_user: dict = Depends(get_current_user)):
    db = await get_database()
    obj_id = parse_object_id(medication_id, 'medication id')
    existing = await db.medications.find_one({'_id': obj_id, 'uid': current_user['uid']})
    if not existing:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='Ilac bulunamadi')
    update_dict = update_data.model_dump(exclude_unset=True)
    if not update_dict:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail='Guncellenecek alan bulunamadi')
    update_dict['updated_at'] = utcnow()
    await db.medications.update_one({'_id': obj_id}, {'$set': update_dict})
    med = await db.medications.find_one({'_id': obj_id})
    await create_activity_event(current_user['uid'], 'medication_updated', f'Ilac guncellendi: {med["name"]}', member_id=med.get('member_id'))
    return MedicationResponse(**to_document(med))


@router.delete('/{medication_id}', status_code=status.HTTP_204_NO_CONTENT)
async def delete_medication(medication_id: str, current_user: dict = Depends(get_current_user)):
    db = await get_database()
    obj_id = parse_object_id(medication_id, 'medication id')
    existing = await db.medications.find_one({'_id': obj_id, 'uid': current_user['uid']})
    if not existing:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='Ilac bulunamadi')
    await db.medications.delete_one({'_id': obj_id, 'uid': current_user['uid']})
    reminder_ids = [str(item['_id']) for item in await db.reminders.find({'uid': current_user['uid'], 'medication_id': medication_id}).to_list(length=None)]
    await db.reminders.delete_many({'uid': current_user['uid'], 'medication_id': medication_id})
    await db.logs.delete_many({'uid': current_user['uid'], '$or': [{'medication_id': medication_id}, {'reminder_id': {'$in': reminder_ids}}]})
    await db.notification_logs.delete_many({'uid': current_user['uid'], '$or': [{'medication_id': medication_id}, {'reminder_id': {'$in': reminder_ids}}]})
    await create_activity_event(current_user['uid'], 'medication_deleted', f'Ilac silindi: {existing["name"]}', member_id=existing.get('member_id'))
