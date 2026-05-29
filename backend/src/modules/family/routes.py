from __future__ import annotations

from typing import List

from fastapi import APIRouter, Depends, HTTPException, status

from src.config.database import get_database
from src.middleware.auth import get_current_user
from src.models.family import FamilyMemberCreate, FamilyMemberResponse, FamilyMemberUpdate
from src.utils.activity import create_activity_event
from src.utils.mongo import parse_object_id, to_document, utcnow

router = APIRouter(prefix='/family', tags=['Family'])


@router.get('', response_model=List[FamilyMemberResponse])
async def get_family_members(current_user: dict = Depends(get_current_user)):
    db = await get_database()
    members = await db.family_members.find({'owner_user_id': current_user['uid']}).sort('created_at', -1).to_list(length=None)
    return [FamilyMemberResponse(**to_document(member)) for member in members]


@router.post('', response_model=FamilyMemberResponse, status_code=status.HTTP_201_CREATED)
async def create_family_member(member: FamilyMemberCreate, current_user: dict = Depends(get_current_user)):
    db = await get_database()
    member_dict = member.model_dump()
    member_dict.update({'owner_user_id': current_user['uid'], 'created_at': utcnow()})
    result = await db.family_members.insert_one(member_dict)
    await create_activity_event(current_user['uid'], 'family_member_created', f'Aile bireyi eklendi: {member_dict["name"]}')
    return FamilyMemberResponse(id=str(result.inserted_id), **member_dict)


@router.put('/{member_id}', response_model=FamilyMemberResponse)
async def update_family_member(member_id: str, update_data: FamilyMemberUpdate, current_user: dict = Depends(get_current_user)):
    db = await get_database()
    obj_id = parse_object_id(member_id, 'member id')
    existing = await db.family_members.find_one({'_id': obj_id, 'owner_user_id': current_user['uid']})
    if not existing:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='Aile bireyi bulunamadi')
    update_dict = update_data.model_dump(exclude_unset=True)
    if not update_dict:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail='Guncellenecek alan bulunamadi')
    await db.family_members.update_one({'_id': obj_id}, {'$set': update_dict})
    member = await db.family_members.find_one({'_id': obj_id})
    await create_activity_event(current_user['uid'], 'family_member_updated', f'Aile bireyi guncellendi: {member["name"]}', member_id=member_id)
    return FamilyMemberResponse(**to_document(member))


@router.delete('/{member_id}', status_code=status.HTTP_204_NO_CONTENT)
async def delete_family_member(member_id: str, current_user: dict = Depends(get_current_user)):
    db = await get_database()
    obj_id = parse_object_id(member_id, 'member id')
    existing = await db.family_members.find_one({'_id': obj_id, 'owner_user_id': current_user['uid']})
    if not existing:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='Aile bireyi bulunamadi')
    med_docs = await db.medications.find({'uid': current_user['uid'], 'member_id': member_id}).to_list(length=None)
    medication_ids = [str(item['_id']) for item in med_docs]
    reminder_docs = await db.reminders.find({'uid': current_user['uid'], 'member_id': member_id}).to_list(length=None)
    reminder_ids = [str(item['_id']) for item in reminder_docs]
    await db.family_members.delete_one({'_id': obj_id, 'owner_user_id': current_user['uid']})
    await db.medications.delete_many({'uid': current_user['uid'], 'member_id': member_id})
    await db.reminders.delete_many({'uid': current_user['uid'], 'member_id': member_id})
    await db.logs.delete_many({'uid': current_user['uid'], '$or': [{'member_id': member_id}, {'medication_id': {'$in': medication_ids}}, {'reminder_id': {'$in': reminder_ids}}]})
    await db.measurements.delete_many({'uid': current_user['uid'], 'member_id': member_id})
    await create_activity_event(current_user['uid'], 'family_member_deleted', f'Aile bireyi silindi: {existing["name"]}', member_id=member_id)
