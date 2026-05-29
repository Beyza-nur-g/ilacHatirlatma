from __future__ import annotations

from typing import Optional

from pydantic import BaseModel, Field


class OCRAnalyzeRequest(BaseModel):
    text: str = Field(..., min_length=1)
    member_id: Optional[str] = None


class OCRAnalyzeResponse(BaseModel):
    detected_medicine_name: str
    usage_area: str
    warnings: list[str]
    confidence: str
    raw_analysis: str
    patient_assessment: str
    suitability: str
    reasons: list[str] = Field(default_factory=list)
    matched_existing_medications: list[str] = Field(default_factory=list)
