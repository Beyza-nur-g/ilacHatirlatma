from __future__ import annotations

from datetime import datetime
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status

from src.config.database import get_database
from src.middleware.auth import get_current_user
from src.models.measurement import (
    MeasurementCreate,
    MeasurementResponse,
    MeasurementTypeCreate,
    MeasurementTypeResponse,
    MeasurementTypeUpdate,
    MeasurementUpdate,
    MeasurementWithType,
)
from src.utils.activity import create_activity_event
from src.utils.mongo import parse_object_id, to_document, utcnow

router = APIRouter(prefix='/measurements', tags=['Measurements'])


@router.get('/types', response_model=List[MeasurementTypeResponse])
async def get_measurement_types(current_user: dict = Depends(get_current_user)):
    db = await get_database()
    types = await db.measurement_types.find({'uid': current_user['uid']}).sort('created_at', -1).to_list(length=None)
    return [MeasurementTypeResponse(**to_document(item)) for item in types]


@router.post('/types', response_model=MeasurementTypeResponse, status_code=status.HTTP_201_CREATED)
async def create_measurement_type(measurement_type: MeasurementTypeCreate, current_user: dict = Depends(get_current_user)):
    db = await get_database()
    mt_dict = measurement_type.model_dump()
    mt_dict.update({'uid': current_user['uid'], 'created_at': utcnow()})
    try:
        result = await db.measurement_types.insert_one(mt_dict)
    except Exception:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail='Bu olcum tipi zaten mevcut')
    await create_activity_event(current_user['uid'], 'measurement_type_created', f'Olcum tipi eklendi: {mt_dict["name"]}')
    return MeasurementTypeResponse(id=str(result.inserted_id), **mt_dict)


@router.put('/types/{type_id}', response_model=MeasurementTypeResponse)
async def update_measurement_type(type_id: str, update_data: MeasurementTypeUpdate, current_user: dict = Depends(get_current_user)):
    db = await get_database()
    obj_id = parse_object_id(type_id, 'measurement type id')
    existing = await db.measurement_types.find_one({'_id': obj_id, 'uid': current_user['uid']})
    if not existing:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='Olcum tipi bulunamadi')
    update_dict = update_data.model_dump(exclude_unset=True)
    if not update_dict:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail='Guncellenecek alan bulunamadi')
    await db.measurement_types.update_one({'_id': obj_id}, {'$set': update_dict})
    mt = await db.measurement_types.find_one({'_id': obj_id})
    await create_activity_event(current_user['uid'], 'measurement_type_updated', f'Olcum tipi guncellendi: {mt["name"]}')
    return MeasurementTypeResponse(**to_document(mt))


@router.delete('/types/{type_id}', status_code=status.HTTP_204_NO_CONTENT)
async def delete_measurement_type(type_id: str, current_user: dict = Depends(get_current_user)):
    db = await get_database()
    obj_id = parse_object_id(type_id, 'measurement type id')
    existing = await db.measurement_types.find_one({'_id': obj_id, 'uid': current_user['uid']})
    if not existing:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='Olcum tipi bulunamadi')
    await db.measurement_types.delete_one({'_id': obj_id, 'uid': current_user['uid']})
    await db.measurements.delete_many({'uid': current_user['uid'], 'measurement_type_id': type_id})
    await create_activity_event(current_user['uid'], 'measurement_type_deleted', f'Olcum tipi silindi: {existing["name"]}')


@router.get('', response_model=List[MeasurementWithType])
async def get_measurements(
    member_id: Optional[str] = Query(None),
    type_id: Optional[str] = Query(None),
    from_date: Optional[str] = Query(None),
    to_date: Optional[str] = Query(None),
    current_user: dict = Depends(get_current_user),
):
    db = await get_database()
    query: dict = {'uid': current_user['uid']}
    if member_id is not None:
        query['member_id'] = member_id
    if type_id:
        query['measurement_type_id'] = type_id
    if from_date or to_date:
        query['measured_at'] = {}
        if from_date:
            query['measured_at']['$gte'] = datetime.fromisoformat(from_date)
        if to_date:
            query['measured_at']['$lte'] = datetime.fromisoformat(to_date + 'T23:59:59')
    measurements = await db.measurements.find(query).sort('measured_at', -1).to_list(length=None)
    types = await db.measurement_types.find({'uid': current_user['uid']}).to_list(length=None)
    types_by_id = {str(item['_id']): item for item in types}
    result: list[MeasurementWithType] = []
    for item in measurements:
        doc = to_document(item)
        measurement_type = types_by_id.get(doc['measurement_type_id'])
        if measurement_type:
            target_min = measurement_type.get('target_min')
            target_max = measurement_type.get('target_max')
            is_normal = True
            if target_min is not None and doc['value'] < target_min:
                is_normal = False
            if target_max is not None and doc['value'] > target_max:
                is_normal = False
            doc.update({'type_name': measurement_type['name'], 'type_unit': measurement_type['unit'], 'type_icon': measurement_type.get('icon', 'fitness'), 'is_normal': is_normal})
        else:
            doc.update({'type_name': 'Bilinmeyen', 'type_unit': '', 'type_icon': 'fitness', 'is_normal': True})
        result.append(MeasurementWithType(**doc))
    return result


@router.post('', response_model=MeasurementResponse, status_code=status.HTTP_201_CREATED)
async def create_measurement(measurement: MeasurementCreate, current_user: dict = Depends(get_current_user)):
    db = await get_database()
    mt = await db.measurement_types.find_one({'_id': parse_object_id(measurement.measurement_type_id, 'measurement type id'), 'uid': current_user['uid']})
    if not mt:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='Olcum tipi bulunamadi')
    doc = measurement.model_dump()
    doc.update({'uid': current_user['uid'], 'created_at': utcnow(), 'measured_at': measurement.measured_at or utcnow()})
    result = await db.measurements.insert_one(doc)
    await create_activity_event(current_user['uid'], 'measurement_created', f'Olcum kaydedildi: {mt["name"]}', member_id=doc.get('member_id'))
    return MeasurementResponse(id=str(result.inserted_id), **doc)


@router.put('/{measurement_id}', response_model=MeasurementResponse)
async def update_measurement(measurement_id: str, update_data: MeasurementUpdate, current_user: dict = Depends(get_current_user)):
    db = await get_database()
    obj_id = parse_object_id(measurement_id, 'measurement id')
    existing = await db.measurements.find_one({'_id': obj_id, 'uid': current_user['uid']})
    if not existing:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='Olcum bulunamadi')
    update_dict = update_data.model_dump(exclude_unset=True)
    if 'measurement_type_id' in update_dict and update_dict['measurement_type_id']:
        mt = await db.measurement_types.find_one({'_id': parse_object_id(update_dict['measurement_type_id'], 'measurement type id'), 'uid': current_user['uid']})
        if not mt:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='Olcum tipi bulunamadi')
    if not update_dict:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail='Guncellenecek alan bulunamadi')
    await db.measurements.update_one({'_id': obj_id}, {'$set': update_dict})
    measurement = await db.measurements.find_one({'_id': obj_id})
    await create_activity_event(current_user['uid'], 'measurement_updated', 'Olcum guncellendi', member_id=measurement.get('member_id'))
    return MeasurementResponse(**to_document(measurement))


@router.delete('/{measurement_id}', status_code=status.HTTP_204_NO_CONTENT)
async def delete_measurement(measurement_id: str, current_user: dict = Depends(get_current_user)):
    db = await get_database()
    obj_id = parse_object_id(measurement_id, 'measurement id')
    existing = await db.measurements.find_one({'_id': obj_id, 'uid': current_user['uid']})
    if not existing:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='Olcum bulunamadi')
    await db.measurements.delete_one({'_id': obj_id, 'uid': current_user['uid']})
    await create_activity_event(current_user['uid'], 'measurement_deleted', 'Olcum silindi', member_id=existing.get('member_id'))
