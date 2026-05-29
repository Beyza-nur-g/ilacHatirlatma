from __future__ import annotations

from datetime import datetime
from enum import Enum
from typing import Optional

from pydantic import BaseModel, EmailStr, Field


class Gender(str, Enum):
    MALE = 'male'
    FEMALE = 'female'
    OTHER = 'other'


class PatientBase(BaseModel):
    full_name: str = Field(..., min_length=2, max_length=120)
    email: EmailStr
    birth_date: str = Field(..., pattern=r'^\d{4}-\d{2}-\d{2}$')
    gender: Gender = Gender.OTHER
    pregnancy_status: bool = False
    chronic_diseases: list[str] = Field(default_factory=list)
    allergies: list[str] = Field(default_factory=list)
    emergency_contact: Optional[str] = None


class PatientCreate(PatientBase):
    password: str = Field(..., min_length=6, max_length=128)


class PatientUpdate(BaseModel):
    full_name: Optional[str] = Field(None, min_length=2, max_length=120)
    birth_date: Optional[str] = Field(None, pattern=r'^\d{4}-\d{2}-\d{2}$')
    gender: Optional[Gender] = None
    pregnancy_status: Optional[bool] = None
    chronic_diseases: Optional[list[str]] = None
    allergies: Optional[list[str]] = None
    emergency_contact: Optional[str] = None


class PatientResponse(PatientBase):
    uid: str
    created_at: datetime
    updated_at: datetime


class PatientLogin(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = 'bearer'
    user: PatientResponse
