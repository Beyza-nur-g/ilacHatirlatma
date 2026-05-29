from __future__ import annotations

import pytest
from pydantic import ValidationError

from src.models.medication import MedicationCreate, MedicationShape


def test_medication_create_uses_safe_default_appearance() -> None:
    medication = MedicationCreate(name='Parol', active_ingredient='Parasetamol', category='pain_fever')
    assert medication.category == 'pain_fever'
    assert medication.appearance.shape == MedicationShape.TABLET
    assert medication.appearance.color.startswith('#')


def test_medication_create_rejects_empty_name() -> None:
    with pytest.raises(ValidationError):
        MedicationCreate(name='')
