from __future__ import annotations

from datetime import datetime
from enum import Enum
from typing import Optional

from pydantic import BaseModel, Field


class RiskLevel(str, Enum):
    LOW = 'low'
    MEDIUM = 'medium'
    HIGH = 'high'


class ChatMessageCreate(BaseModel):
    member_id: Optional[str] = None
    text: str = Field(..., min_length=1, max_length=1200)
    context: Optional[dict] = None


class ChatSuggestedAction(BaseModel):
    label: str
    route: str
    icon: Optional[str] = None


class ChatMessageResponse(BaseModel):
    id: str
    owner_user_id: str
    member_id: Optional[str] = None
    role: str
    text: str
    risk_level: Optional[RiskLevel] = None
    safety_note: Optional[str] = None
    suggested_actions: list[ChatSuggestedAction] = Field(default_factory=list)
    created_at: datetime


class ChatReplyResponse(BaseModel):
    reply: str
    safety_note: str
    risk_level: RiskLevel
    suggested_actions: list[ChatSuggestedAction] = Field(default_factory=list)
    source: str = 'fallback'
