from __future__ import annotations

from datetime import datetime

from fastapi import APIRouter, Depends

from src.config.database import get_database
from src.middleware.auth import get_current_user
from src.models.dashboard import ActivityEventResponse, DashboardSummaryResponse, DueDoseResponse
from src.utils.mongo import to_document

router = APIRouter(prefix='/dashboard', tags=['Dashboard'])


def _reminder_active_today(reminder: dict, today: str) -> bool:
    start_date = reminder.get('start_date') or today
    end_date = reminder.get('end_date') or '9999-12-31'
    return reminder.get('enabled', True) and start_date <= today <= end_date


@router.get('', response_model=DashboardSummaryResponse)
async def get_dashboard(current_user: dict = Depends(get_current_user)):
    db = await get_database()
    today = datetime.utcnow().strftime('%Y-%m-%d')
    meds = await db.medications.find({'uid': current_user['uid']}).to_list(length=None)
    reminders = await db.reminders.find({'uid': current_user['uid']}).to_list(length=None)
    family_members = await db.family_members.find({'owner_user_id': current_user['uid']}).to_list(length=None)
    measurements = await db.measurements.find({'uid': current_user['uid']}).to_list(length=None)
    taken_logs = await db.logs.find({'uid': current_user['uid'], 'action': 'taken', 'scheduled_at': {'$gte': datetime.fromisoformat(today)}}).to_list(length=None)
    recent = await db.activity_events.find({'uid': current_user['uid']}).sort('created_at', -1).limit(8).to_list(length=8)

    medication_name_by_id = {str(item['_id']): item.get('name', 'Ilac') for item in meds}
    due_doses: list[DueDoseResponse] = []
    total_doses = 0
    for reminder in reminders:
        if not _reminder_active_today(reminder, today):
            continue
        times = reminder.get('times', [])
        total_doses += len(times)
        for time in times[:3]:
            due_doses.append(DueDoseResponse(reminder_id=str(reminder['_id']), medication_id=reminder['medication_id'], medication_name=medication_name_by_id.get(reminder['medication_id'], 'Ilac'), member_id=reminder.get('member_id'), time=time, status='planned'))
    return DashboardSummaryResponse(
        medication_count=len(meds),
        active_reminder_count=sum(1 for reminder in reminders if reminder.get('enabled', True)),
        today_taken_count=len(taken_logs),
        today_total_dose_count=total_doses,
        family_member_count=len(family_members),
        measurement_count=len(measurements),
        due_doses=due_doses[:8],
        recent_activity=[ActivityEventResponse(**to_document(item)) for item in recent],
    )
