from __future__ import annotations

from datetime import datetime
from typing import Any

from bson import ObjectId
from fastapi import HTTPException, status


def to_document(data: dict[str, Any]) -> dict[str, Any]:
    doc = dict(data)
    if '_id' in doc:
        doc['id'] = str(doc.pop('_id'))
    return doc


def parse_object_id(value: str, field_name: str = 'id') -> ObjectId:
    try:
        return ObjectId(value)
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f'Gecersiz {field_name} degeri',
        ) from exc


def utcnow() -> datetime:
    return datetime.utcnow()
