from __future__ import annotations

from datetime import datetime
from enum import Enum
from typing import Optional

from pydantic import BaseModel, Field


class Relation(str, Enum):
    SELF = 'self'
    SPOUSE = 'spouse'
    MOTHER = 'mother'
    FATHER = 'father'
    SON = 'son'
    DAUGHTER = 'daughter'
    BROTHER = 'brother'
    SISTER = 'sister'
    OTHER = 'other'


class FamilyMemberBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    relation: Relation = Relation.OTHER
    birth_date: Optional[str] = Field(None, pattern=r'^\d{4}-\d{2}-\d{2}$')
    note: Optional[str] = Field(None, max_length=500)


class FamilyMemberCreate(FamilyMemberBase):
    pass


class FamilyMemberUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    relation: Optional[Relation] = None
    birth_date: Optional[str] = Field(None, pattern=r'^\d{4}-\d{2}-\d{2}$')
    note: Optional[str] = Field(None, max_length=500)


class FamilyMemberResponse(FamilyMemberBase):
    id: str
    owner_user_id: str
    created_at: datetime
