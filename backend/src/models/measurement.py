from __future__ import annotations

from datetime import datetime
from enum import Enum
from typing import Optional

from pydantic import BaseModel, Field


class MeasurementType(str, Enum):
    BLOOD_SUGAR = 'blood_sugar'
    BLOOD_PRESSURE = 'blood_pressure'
    INSULIN = 'insulin'
    WEIGHT = 'weight'
    TEMPERATURE = 'temperature'
    HEART_RATE = 'heart_rate'
    OXYGEN = 'oxygen'
    CUSTOM = 'custom'


class MeasurementTypeCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    unit: str = Field(..., min_length=1, max_length=20)
    type: MeasurementType = MeasurementType.CUSTOM
    target_min: Optional[float] = None
    target_max: Optional[float] = None
    icon: Optional[str] = 'fitness'


class MeasurementTypeUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    unit: Optional[str] = Field(None, min_length=1, max_length=20)
    type: Optional[MeasurementType] = None
    target_min: Optional[float] = None
    target_max: Optional[float] = None
    icon: Optional[str] = None


class MeasurementTypeResponse(MeasurementTypeCreate):
    id: str
    uid: str
    created_at: datetime


class MeasurementCreate(BaseModel):
    measurement_type_id: str
    member_id: Optional[str] = None
    value: float = Field(..., ge=0)
    note: Optional[str] = Field(None, max_length=500)
    measured_at: Optional[datetime] = None


class MeasurementUpdate(BaseModel):
    value: Optional[float] = Field(None, ge=0)
    note: Optional[str] = Field(None, max_length=500)
    measured_at: Optional[datetime] = None
    member_id: Optional[str] = None
    measurement_type_id: Optional[str] = None


class MeasurementResponse(BaseModel):
    id: str
    uid: str
    member_id: Optional[str] = None
    measurement_type_id: str
    value: float
    note: Optional[str] = None
    measured_at: datetime
    created_at: datetime


class MeasurementWithType(MeasurementResponse):
    type_name: str
    type_unit: str
    type_icon: str
    is_normal: bool
