from __future__ import annotations

from datetime import datetime
from enum import Enum
from typing import Optional

from pydantic import BaseModel, Field, field_validator


class Frequency(str, Enum):
    DAILY = 'daily'
    WEEKLY = 'weekly'
    AS_NEEDED = 'as_needed'


class Weekday(str, Enum):
    MONDAY = 'monday'
    TUESDAY = 'tuesday'
    WEDNESDAY = 'wednesday'
    THURSDAY = 'thursday'
    FRIDAY = 'friday'
    SATURDAY = 'saturday'
    SUNDAY = 'sunday'


class MealRule(str, Enum):
    NONE = 'none'
    HUNGRY = 'hungry'
    FULL_BEFORE_60 = 'full_before_60'


class FamilyNotify(BaseModel):
    enabled: bool = False
    member_ids: list[str] = Field(default_factory=list)


class ReminderBase(BaseModel):
    member_id: Optional[str] = None
    medication_id: str
    start_date: str = Field(..., pattern=r'^\d{4}-\d{2}-\d{2}$')
    end_date: Optional[str] = Field(None, pattern=r'^\d{4}-\d{2}-\d{2}$')
    times: list[str] = Field(default_factory=list, min_length=1)
    frequency: Frequency = Frequency.DAILY
    weekly_days: Optional[list[Weekday]] = None
    enabled: bool = True
    timezone: str = 'Europe/Istanbul'
    notify_before_minutes: int = Field(default=0, ge=0, le=120)
    meal_rule: MealRule = MealRule.NONE
    family_notify: FamilyNotify = Field(default_factory=FamilyNotify)

    @field_validator('times')
    @classmethod
    def validate_times(cls, value: list[str]) -> list[str]:
        for item in value:
            hour, minute = item.split(':')
            if not (0 <= int(hour) <= 23 and 0 <= int(minute) <= 59):
                raise ValueError('Saat HH:MM formatinda olmali')
        return value


class ReminderCreate(ReminderBase):
    pass


class ReminderUpdate(BaseModel):
    member_id: Optional[str] = None
    medication_id: Optional[str] = None
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    times: Optional[list[str]] = None
    frequency: Optional[Frequency] = None
    weekly_days: Optional[list[Weekday]] = None
    enabled: Optional[bool] = None
    timezone: Optional[str] = None
    notify_before_minutes: Optional[int] = Field(None, ge=0, le=120)
    meal_rule: Optional[MealRule] = None
    family_notify: Optional[FamilyNotify] = None


class ReminderResponse(ReminderBase):
    id: str
    uid: str
    created_at: datetime
    updated_at: datetime
