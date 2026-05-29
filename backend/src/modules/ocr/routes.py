from __future__ import annotations

from bson import ObjectId
from fastapi import APIRouter, Depends, File, Form, UploadFile

from src.config.database import get_database
from src.middleware.auth import get_current_user
from src.models.ocr import OCRAnalyzeRequest, OCRAnalyzeResponse
from src.services.openai_service import analyze_medication_image
from src.utils.mongo import parse_object_id

router = APIRouter(prefix='/ocr', tags=['OCR'])


async def _patient_context(uid: str, member_id: str | None) -> dict:
    db = await get_database()
    medications = await db.medications.find({'uid': uid, 'member_id': member_id}).to_list(length=100)
    family_member = None
    if member_id:
        family_member = await db.family_members.find_one({'_id': parse_object_id(member_id, 'member id'), 'owner_user_id': uid})
    owner = await db.patients.find_one({'_id': ObjectId(uid)})
    return {
        'patient_name': family_member['name'] if family_member else owner.get('full_name'),
        'chronic_diseases': owner.get('chronic_diseases', []),
        'allergies': owner.get('allergies', []),
        'medication_names': [item.get('name') for item in medications],
        'member_id': member_id,
    }


@router.post('/analyze', response_model=OCRAnalyzeResponse)
async def analyze_ocr_text(request: OCRAnalyzeRequest, current_user: dict = Depends(get_current_user)):
    context = await _patient_context(current_user['uid'], request.member_id)
    result = await analyze_medication_image(
        image_bytes=None,
        mime_type=None,
        extracted_text=request.text,
        patient_context=context,
    )
    return OCRAnalyzeResponse(**result)


@router.post('/upload', response_model=OCRAnalyzeResponse)
async def upload_and_analyze(
    file: UploadFile = File(...),
    member_id: str | None = Form(None),
    extracted_text: str | None = Form(None),
    current_user: dict = Depends(get_current_user),
):
    content = await file.read()
    context = await _patient_context(current_user['uid'], member_id)
    result = await analyze_medication_image(
        image_bytes=content,
        mime_type=file.content_type,
        extracted_text=extracted_text,
        patient_context=context,
    )
    return OCRAnalyzeResponse(**result)
