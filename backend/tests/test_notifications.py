from __future__ import annotations

import pytest
from pydantic import ValidationError

from src.models.device import DevicePlatform, DeviceRegisterRequest
from src.models.notification import NotificationTestRequest


def test_device_register_accepts_expo_token() -> None:
    payload = DeviceRegisterRequest(
        expo_push_token='ExpoPushToken[xxxxxxxxxxxxxxxxxxxxxx]',
        platform=DevicePlatform.ANDROID,
        device_name='Pixel Test',
    )
    assert payload.platform == DevicePlatform.ANDROID


def test_device_register_rejects_non_expo_token() -> None:
    with pytest.raises(ValidationError):
        DeviceRegisterRequest(expo_push_token='plain-token-value')


def test_notification_test_request_has_defaults() -> None:
    payload = NotificationTestRequest()
    assert 'Test' in payload.body
