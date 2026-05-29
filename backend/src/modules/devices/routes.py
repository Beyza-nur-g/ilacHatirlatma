from __future__ import annotations

from typing import List

from fastapi import APIRouter, Depends, status

from src.config.database import get_database
from src.middleware.auth import get_current_user
from src.models.device import DeviceRegisterRequest, DeviceResponse, DeviceUnregisterRequest
from src.utils.mongo import to_document, utcnow

router = APIRouter(prefix='/devices', tags=['Devices'])


@router.post('/register', response_model=DeviceResponse, status_code=status.HTTP_201_CREATED)
async def register_device(payload: DeviceRegisterRequest, current_user: dict = Depends(get_current_user)):
    db = await get_database()
    now = utcnow()
    token = payload.expo_push_token.strip()
    update_doc = {
        'uid': current_user['uid'],
        'expo_push_token': token,
        'platform': payload.platform,
        'device_name': payload.device_name,
        'device_id': payload.device_id,
        'app_version': payload.app_version,
        'is_active': True,
        'last_seen_at': now,
        'updated_at': now,
    }
    # Ayni cihaz tekrar giris yaptiginda yeni kayit acmak yerine token kaydi guncellenir.
    await db.devices.update_one(
        {'uid': current_user['uid'], 'expo_push_token': token},
        {'$set': update_doc, '$setOnInsert': {'created_at': now}},
        upsert=True,
    )
    device = await db.devices.find_one({'uid': current_user['uid'], 'expo_push_token': token})
    return DeviceResponse(**to_document(device))


@router.post('/unregister', status_code=status.HTTP_204_NO_CONTENT)
async def unregister_device(payload: DeviceUnregisterRequest, current_user: dict = Depends(get_current_user)):
    db = await get_database()
    await db.devices.update_many(
        {'uid': current_user['uid'], 'expo_push_token': payload.expo_push_token.strip()},
        {'$set': {'is_active': False, 'updated_at': utcnow()}},
    )


@router.get('', response_model=List[DeviceResponse])
async def get_devices(current_user: dict = Depends(get_current_user)):
    db = await get_database()
    devices = await db.devices.find({'uid': current_user['uid']}).sort('last_seen_at', -1).to_list(length=None)
    return [DeviceResponse(**to_document(item)) for item in devices]
