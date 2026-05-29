from __future__ import annotations

from datetime import datetime
from enum import Enum
from typing import Optional

from pydantic import BaseModel, Field, field_validator


class DevicePlatform(str, Enum):
    IOS = 'ios'
    ANDROID = 'android'
    WEB = 'web'
    UNKNOWN = 'unknown'


class DeviceRegisterRequest(BaseModel):
    expo_push_token: str = Field(..., min_length=20)
    platform: DevicePlatform = DevicePlatform.UNKNOWN
    device_name: Optional[str] = None
    device_id: Optional[str] = None
    app_version: Optional[str] = None

    @field_validator('expo_push_token')
    @classmethod
    def validate_expo_token(cls, value: str) -> str:
        # Expo tokenlari genelde ExpoPushToken[...] veya eski formatta ExponentPushToken[...] seklindedir.
        # Burada bilerek gevsek kontrol uygulanir; Expo ileride token bicimini degistirirse sistem kirilmasin.
        token = value.strip()
        if not token.startswith(('ExpoPushToken[', 'ExponentPushToken[')):
            raise ValueError('Gecersiz Expo push token formati')
        return token


class DeviceUnregisterRequest(BaseModel):
    expo_push_token: str = Field(..., min_length=20)


class DeviceResponse(BaseModel):
    id: str
    uid: str
    expo_push_token: str
    platform: DevicePlatform
    device_name: Optional[str] = None
    device_id: Optional[str] = None
    app_version: Optional[str] = None
    is_active: bool
    last_seen_at: datetime
    created_at: datetime
    updated_at: datetime
