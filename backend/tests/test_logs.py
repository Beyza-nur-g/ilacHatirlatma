from __future__ import annotations

from datetime import datetime

import pytest
from pydantic import ValidationError

from src.models.log import LogAction, LogCreate


def test_snooze_log_requires_minimum_snooze_minutes() -> None:
    with pytest.raises(ValidationError):
        LogCreate(
            reminder_id='507f1f77bcf86cd799439011',
            medication_id='507f1f77bcf86cd799439012',
            scheduled_at=datetime(2026, 5, 15, 9, 0, 0),
            action=LogAction.SNOOZED,
            snooze_minutes=1,
        )


def test_taken_log_payload_is_valid() -> None:
    log = LogCreate(
        reminder_id='507f1f77bcf86cd799439011',
        medication_id='507f1f77bcf86cd799439012',
        scheduled_at=datetime(2026, 5, 15, 9, 0, 0),
        action=LogAction.TAKEN,
    )
    assert log.action == LogAction.TAKEN
