from __future__ import annotations

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field


class ActivityEventResponse(BaseModel):
    id: str
    uid: str
    member_id: Optional[str] = None
    event_type: str
    message: str
    metadata: dict = Field(default_factory=dict)
    created_at: datetime


class DueDoseResponse(BaseModel):
    reminder_id: str
    medication_id: str
    medication_name: str
    member_id: Optional[str] = None
    time: str
    status: str


class DashboardSummaryResponse(BaseModel):
    medication_count: int
    active_reminder_count: int
    today_taken_count: int
    today_total_dose_count: int
    family_member_count: int
    measurement_count: int
    due_doses: list[DueDoseResponse] = Field(default_factory=list)
    recent_activity: list[ActivityEventResponse] = Field(default_factory=list)
