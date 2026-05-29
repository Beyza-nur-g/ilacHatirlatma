from __future__ import annotations

from datetime import datetime
from enum import Enum
from typing import Any, Optional

from pydantic import BaseModel, Field


class NotificationStatus(str, Enum):
    PENDING = 'pending'
    SENT = 'sent'
    FAILED = 'failed'
    SKIPPED = 'skipped'


class NotificationSource(str, Enum):
    NORMAL = 'normal'
    SNOOZE = 'snooze'
    TEST = 'test'


class NotificationLogResponse(BaseModel):
    id: str
    uid: str
    member_id: Optional[str] = None
    reminder_id: Optional[str] = None
    medication_id: Optional[str] = None
    scheduled_at: Optional[datetime] = None
    due_at: datetime
    title: str
    body: str
    source: NotificationSource
    status: NotificationStatus
    dedupe_key: str
    device_count: int = 0
    success_count: int = 0
    failure_count: int = 0
    error: Optional[str] = None
    ticket_ids: list[str] = Field(default_factory=list)
    metadata: dict[str, Any] = Field(default_factory=dict)
    created_at: datetime
    updated_at: datetime
    sent_at: Optional[datetime] = None


class NotificationTestRequest(BaseModel):
    title: str = 'Akilli Ilac Hatirlatici'
    body: str = 'Test bildirimi basariyla gonderildi.'
