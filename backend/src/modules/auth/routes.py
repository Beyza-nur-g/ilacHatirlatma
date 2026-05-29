from __future__ import annotations

from datetime import timedelta

import jwt
from fastapi import APIRouter, HTTPException, status
from passlib.context import CryptContext

from src.config.database import get_database
from src.config.settings import JWT_ALGORITHM, JWT_EXPIRATION_HOURS, JWT_SECRET
from src.models.patient import PatientCreate, PatientLogin, PatientResponse, TokenResponse
from src.utils.activity import create_activity_event
from src.utils.mongo import utcnow

router = APIRouter(prefix='/auth', tags=['Authentication'])
pwd_context = CryptContext(schemes=['bcrypt'], deprecated='auto')


def _normalize_email(email: str) -> str:
    return email.strip().lower()


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)


def create_access_token(uid: str) -> str:
    expire = utcnow() + timedelta(hours=JWT_EXPIRATION_HOURS)
    payload = {'uid': uid, 'exp': expire}
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


@router.post('/register', response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
async def register(patient: PatientCreate):
    db = await get_database()
    email = _normalize_email(str(patient.email))
    existing_user = await db.patients.find_one({'email': email})
    if existing_user:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail='Bu e-posta zaten kayitli')

    now = utcnow()
    patient_dict = patient.model_dump(exclude={'password'})
    patient_dict['email'] = email
    patient_dict['password_hash'] = hash_password(patient.password)
    patient_dict['created_at'] = now
    patient_dict['updated_at'] = now
    result = await db.patients.insert_one(patient_dict)
    uid = str(result.inserted_id)

    await create_activity_event(uid, 'account_created', 'Hesap olusturuldu')
    token = create_access_token(uid)
    response_user = PatientResponse(uid=uid, **patient_dict)
    return TokenResponse(access_token=token, user=response_user)


@router.post('/login', response_model=TokenResponse)
async def login(credentials: PatientLogin):
    db = await get_database()
    email = _normalize_email(str(credentials.email))
    user = await db.patients.find_one({'email': email})
    if not user or not verify_password(credentials.password, user['password_hash']):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail='E-posta veya sifre hatali')

    uid = str(user['_id'])
    token = create_access_token(uid)
    await create_activity_event(uid, 'login', f'{user["full_name"]} hesabina giris yapildi')
    user.pop('_id', None)
    user.pop('password_hash', None)
    return TokenResponse(access_token=token, user=PatientResponse(uid=uid, **user))
