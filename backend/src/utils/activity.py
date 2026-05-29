from __future__ import annotations

from typing import Any

from src.config.database import get_database
from src.config.settings import ENABLE_ACTIVITY_FEED
from src.utils.mongo import utcnow


async def create_activity_event(
    uid: str,
    event_type: str,
    message: str,
    *,
    member_id: str | None = None,
    metadata: dict[str, Any] | None = None,
) -> None:
    if not ENABLE_ACTIVITY_FEED:
        return

    db = await get_database()
    await db.activity_events.insert_one(
        {
            'uid': uid,
            'member_id': member_id,
            'event_type': event_type,
            'message': message,
            'metadata': metadata or {},
            'created_at': utcnow(),
        }
    )
