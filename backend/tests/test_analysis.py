from __future__ import annotations

import pytest
from pydantic import ValidationError

from src.models.ocr import OCRAnalyzeRequest, OCRAnalyzeResponse


def test_ocr_analyze_request_rejects_empty_text() -> None:
    with pytest.raises(ValidationError):
        OCRAnalyzeRequest(text='')


def test_ocr_analysis_response_defaults_lists() -> None:
    response = OCRAnalyzeResponse(
        detected_medicine_name='Parol',
        usage_area='Agri ve ates',
        warnings=['Doktorunuza veya eczacinize danisin.'],
        confidence='medium',
        raw_analysis='Kutu uzerinde Parol ifadesi tespit edildi.',
        patient_assessment='Kayitli alerjilerle dogrudan eslesme bulunamadi.',
        suitability='Dikkatli degerlendirme gerekir.',
    )
    assert response.reasons == []
    assert response.matched_existing_medications == []
