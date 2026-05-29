from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from bson import ObjectId

from src.config.database import get_database
from src.middleware.auth import get_current_user
from src.models.patient import PatientResponse, PatientUpdate
from src.utils.activity import create_activity_event
from src.utils.mongo import utcnow

router = APIRouter(prefix='/profile', tags=['Profile'])


@router.get('', response_model=PatientResponse)
async def get_profile(current_user: dict = Depends(get_current_user)):
    db = await get_database()
    user = await db.patients.find_one({'_id': ObjectId(current_user['uid'])})
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='Kullanici bulunamadi')
    uid = str(user.pop('_id'))
    user.pop('password_hash', None)
    return PatientResponse(uid=uid, **user)


@router.put('', response_model=PatientResponse)
async def update_profile(update_data: PatientUpdate, current_user: dict = Depends(get_current_user)):
    db = await get_database()
    update_dict = update_data.model_dump(exclude_unset=True)
    if not update_dict:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail='Guncellenecek alan bulunamadi')
    update_dict['updated_at'] = utcnow()
    result = await db.patients.update_one({'_id': ObjectId(current_user['uid'])}, {'$set': update_dict})
    if result.matched_count == 0:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='Kullanici bulunamadi')
    user = await db.patients.find_one({'_id': ObjectId(current_user['uid'])})
    uid = str(user.pop('_id'))
    user.pop('password_hash', None)
    await create_activity_event(current_user['uid'], 'profile_updated', 'Profil bilgileri guncellendi')
    return PatientResponse(uid=uid, **user)
