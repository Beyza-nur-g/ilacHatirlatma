from __future__ import annotations

from datetime import datetime
from enum import Enum
from typing import Optional

from pydantic import BaseModel, Field


class LogAction(str, Enum):
    TAKEN = 'taken'
    SKIPPED = 'skipped'
    SNOOZED = 'snoozed'
    MISSED = 'missed'


class LogCreate(BaseModel):
    reminder_id: str
    medication_id: str
    scheduled_at: datetime
    action: LogAction
    snooze_minutes: Optional[int] = Field(None, ge=5, le=120)


class LogResponse(BaseModel):
    id: str
    uid: str
    member_id: Optional[str] = None
    reminder_id: str
    medication_id: str
    scheduled_at: datetime
    action: LogAction
    action_at: datetime
    snooze_minutes: Optional[int] = None
    created_at: datetime
