from __future__ import annotations

from fastapi import APIRouter, Depends
from bson import ObjectId

from src.config.database import get_database
from src.middleware.auth import get_current_user
from src.models.chat import ChatMessageCreate, ChatReplyResponse
from src.services.openai_service import generate_chat_reply
from src.utils.mongo import utcnow

router = APIRouter(prefix='/chat', tags=['Chat'])


@router.post('/send', response_model=ChatReplyResponse)
async def send_chat_message(message: ChatMessageCreate, current_user: dict = Depends(get_current_user)):
    db = await get_database()
    owner = await db.patients.find_one({'_id': ObjectId(current_user['uid'])})
    medications = await db.medications.find({'uid': current_user['uid'], 'member_id': message.member_id}).to_list(length=20)
    reminders = await db.reminders.find({'uid': current_user['uid'], 'member_id': message.member_id}).to_list(length=20)
    context = message.context or {}
    context.update(
        {
            'patient_name': owner.get('full_name') if owner else None,
            'allergies': owner.get('allergies', []) if owner else [],
            'chronic_diseases': owner.get('chronic_diseases', []) if owner else [],
            'medication_names': [item.get('name') for item in medications],
            'reminder_count': len(reminders),
        }
    )
    reply = await generate_chat_reply(message.text, context=context)
    now = utcnow()
    await db.chat_messages.insert_many(
        [
            {
                'owner_user_id': current_user['uid'],
                'member_id': message.member_id,
                'role': 'user',
                'text': message.text,
                'created_at': now,
            },
            {
                'owner_user_id': current_user['uid'],
                'member_id': message.member_id,
                'role': 'assistant',
                'text': reply['reply'],
                'risk_level': reply['risk_level'],
                'safety_note': reply['safety_note'],
                'suggested_actions': reply['suggested_actions'],
                'created_at': utcnow(),
            },
        ]
    )
    return ChatReplyResponse(**reply)
