from __future__ import annotations

from datetime import datetime
from enum import Enum
from typing import Optional

from pydantic import BaseModel, Field


class MedicationShape(str, Enum):
    CAPSULE = 'capsule'
    TABLET = 'tablet'
    SYRUP = 'syrup'
    INJECTION = 'injection'
    CREAM = 'cream'
    DROPS = 'drops'


class AppearanceModel(BaseModel):
    shape: MedicationShape = MedicationShape.TABLET
    color: str = '#4A90E2'


class MedicationBase(BaseModel):
    member_id: Optional[str] = None
    name: str = Field(..., min_length=1, max_length=200)
    active_ingredient: Optional[str] = Field(None, max_length=200)
    dosage_text: Optional[str] = Field(None, max_length=200)
    category: Optional[str] = Field(None, max_length=100)
    usage_note: Optional[str] = Field(None, max_length=500)
    barcode: Optional[str] = Field(None, max_length=100)
    appearance: AppearanceModel = Field(default_factory=AppearanceModel)


class MedicationCreate(MedicationBase):
    pass


class MedicationUpdate(BaseModel):
    member_id: Optional[str] = None
    name: Optional[str] = Field(None, min_length=1, max_length=200)
    active_ingredient: Optional[str] = Field(None, max_length=200)
    dosage_text: Optional[str] = Field(None, max_length=200)
    category: Optional[str] = Field(None, max_length=100)
    usage_note: Optional[str] = Field(None, max_length=500)
    barcode: Optional[str] = Field(None, max_length=100)
    appearance: Optional[AppearanceModel] = None


class MedicationResponse(MedicationBase):
    id: str
    uid: str
    created_at: datetime
    updated_at: datetime
