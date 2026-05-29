from __future__ import annotations

import logging
from dataclasses import dataclass, field
from typing import Any

import httpx

from src.config.settings import EXPO_ACCESS_TOKEN, EXPO_PUSH_API_URL, REQUEST_TIMEOUT_SECONDS

logger = logging.getLogger(__name__)


@dataclass
class PushResult:
    # Basarili ve basarisiz sayilarini ayri tutmak, notification_logs icin temiz raporlama saglar.
    success_count: int = 0
    failure_count: int = 0
    ticket_ids: list[str] = field(default_factory=list)
    errors: list[str] = field(default_factory=list)


class ExpoPushService:
    def __init__(self, api_url: str = EXPO_PUSH_API_URL, access_token: str = EXPO_ACCESS_TOKEN) -> None:
        self.api_url = api_url
        self.access_token = access_token

    async def send_push_messages(
        self,
        *,
        tokens: list[str],
        title: str,
        body: str,
        data: dict[str, Any] | None = None,
    ) -> PushResult:
        # Expo tek istekte en fazla 100 mesaji rahat tasir; kalabalik cihaz listelerinde parcalayarak gonderiyoruz.
        clean_tokens = [token.strip() for token in tokens if token and token.strip()]
        result = PushResult()
        if not clean_tokens:
            result.errors.append('Gonderilecek aktif cihaz tokeni bulunamadi')
            logger.info('[push] aktif token yok, bildirim atlanacak')
            return result

        headers = {
            'Accept': 'application/json',
            'Accept-Encoding': 'gzip, deflate',
            'Content-Type': 'application/json',
        }
        if self.access_token:
            # Expo access token opsiyoneldir; EAS tarafinda token korumasi acilirsa bu header kullanilir.
            headers['Authorization'] = f'Bearer {self.access_token}'

        async with httpx.AsyncClient(timeout=REQUEST_TIMEOUT_SECONDS) as client:
            for index in range(0, len(clean_tokens), 100):
                batch = clean_tokens[index:index + 100]
                messages = [
                    {
                        'to': token,
                        'title': title,
                        'body': body,
                        'sound': 'default',
                        'priority': 'high',
                        'data': data or {},
                    }
                    for token in batch
                ]
                try:
                    logger.info('[push] Expo API istegi hazirlaniyor token_count=%s', len(batch))
                    response = await client.post(self.api_url, json=messages, headers=headers)
                    response.raise_for_status()
                    payload = response.json()
                    ticket_items = payload.get('data', []) if isinstance(payload, dict) else []
                    for item in ticket_items:
                        if item.get('status') == 'ok':
                            result.success_count += 1
                            if item.get('id'):
                                result.ticket_ids.append(item['id'])
                        else:
                            result.failure_count += 1
                            error_message = item.get('message') or str(item.get('details') or 'Expo push hatasi')
                            result.errors.append(error_message)
                    # Expo bazi hata durumlarinda data donmeyebilir; bunu kayipsiz loglamak icin kontrol ediyoruz.
                    if not ticket_items:
                        result.failure_count += len(batch)
                        result.errors.append('Expo API bos ticket yaniti dondurdu')
                except Exception as exc:
                    logger.exception('[push] Expo push gonderimi basarisiz')
                    result.failure_count += len(batch)
                    result.errors.append(str(exc))
        return result


expo_push_service = ExpoPushService()
