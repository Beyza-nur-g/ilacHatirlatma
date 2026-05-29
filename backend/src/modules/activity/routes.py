from __future__ import annotations

from typing import List

from fastapi import APIRouter, Depends, Query

from src.config.database import get_database
from src.middleware.auth import get_current_user
from src.models.dashboard import ActivityEventResponse
from src.utils.mongo import to_document

router = APIRouter(prefix='/activity', tags=['Activity'])


@router.get('', response_model=List[ActivityEventResponse])
async def get_activity(limit: int = Query(20, ge=1, le=100), current_user: dict = Depends(get_current_user)):
    db = await get_database()
    rows = await db.activity_events.find({'uid': current_user['uid']}).sort('created_at', -1).limit(limit).to_list(length=limit)
    return [ActivityEventResponse(**to_document(item)) for item in rows]
