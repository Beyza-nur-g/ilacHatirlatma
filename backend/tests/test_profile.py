from __future__ import annotations

import pytest
from pydantic import ValidationError

from src.models.patient import Gender, PatientCreate, PatientUpdate


def test_patient_create_accepts_valid_profile() -> None:
    patient = PatientCreate(
        full_name='Beyza Nur',
        email='beyza@example.com',
        birth_date='2002-02-20',
        gender=Gender.FEMALE,
        pregnancy_status=False,
        chronic_diseases=['hipertansiyon'],
        allergies=['penisilin'],
        password='secret123',
    )
    assert patient.email == 'beyza@example.com'
    assert patient.birth_date == '2002-02-20'


def test_patient_update_rejects_invalid_birth_date() -> None:
    with pytest.raises(ValidationError):
        PatientUpdate(birth_date='20-02-2002')
