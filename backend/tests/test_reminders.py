from __future__ import annotations

from datetime import datetime

import pytest
from bson import ObjectId
from pydantic import ValidationError

from src.models.reminder import Frequency, ReminderCreate, Weekday
from src.services.notification_scheduler import build_due_candidates


def test_reminder_create_accepts_multiple_times() -> None:
    reminder = ReminderCreate(
        medication_id=str(ObjectId()),
        start_date='2026-05-15',
        times=['08:00', '20:30'],
        frequency=Frequency.DAILY,
    )
    assert reminder.times == ['08:00', '20:30']


def test_reminder_create_rejects_invalid_time() -> None:
    with pytest.raises(ValidationError):
        ReminderCreate(
            medication_id=str(ObjectId()),
            start_date='2026-05-15',
            times=['25:00'],
        )


def test_scheduler_builds_due_candidate_with_notify_before() -> None:
    reminder_id = ObjectId()
    reminder = {
        '_id': reminder_id,
        'uid': 'user-123',
        'medication_id': str(ObjectId()),
        'start_date': '2026-05-15',
        'end_date': None,
        'times': ['09:00'],
        'frequency': 'daily',
        'enabled': True,
        'timezone': 'Europe/Istanbul',
        'notify_before_minutes': 15,
    }
    # 08:45 Europe/Istanbul, UTC karsiligi 05:45 oldugu icin bildirim adayi uretilmelidir.
    candidates = build_due_candidates(reminder, datetime(2026, 5, 15, 5, 45, 10))
    assert len(candidates) == 1
    assert candidates[0]['dedupe_key'] == f'normal:{reminder_id}:2026-05-15:09:00:15'


def test_scheduler_skips_weekly_reminder_on_wrong_day() -> None:
    reminder = {
        '_id': ObjectId(),
        'uid': 'user-123',
        'medication_id': str(ObjectId()),
        'start_date': '2026-05-15',
        'times': ['09:00'],
        'frequency': 'weekly',
        'weekly_days': [Weekday.MONDAY.value],
        'enabled': True,
        'timezone': 'Europe/Istanbul',
        'notify_before_minutes': 0,
    }
    candidates = build_due_candidates(reminder, datetime(2026, 5, 15, 6, 0, 0))
    assert candidates == []
