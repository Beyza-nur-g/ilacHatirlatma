from __future__ import annotations

import os
from pathlib import Path
from typing import List

from dotenv import load_dotenv

ENV_PATH = Path(__file__).resolve().parents[2] / '.env'
load_dotenv(dotenv_path=ENV_PATH, override=False)



def _csv(value: str | None, default: list[str] | None = None) -> list[str]:
    if value is None:
        return list(default or [])
    items = [item.strip() for item in value.split(',') if item.strip()]
    return items or list(default or [])


APP_NAME = os.getenv('APP_NAME', 'Akilli Ilac Hatirlatma API')
API_PREFIX = os.getenv('API_PREFIX', '/api')
TIMEZONE = os.getenv('APP_TIMEZONE', 'Europe/Istanbul')

MONGO_URL = os.getenv('MONGO_URL', 'mongodb://localhost:27017')
DB_NAME = os.getenv('DB_NAME', 'akilli_ilac')
MONGO_TIMEOUT_MS = int(os.getenv('MONGO_TIMEOUT_MS', '5000'))

JWT_SECRET = os.getenv('JWT_SECRET', 'change-this-secret-in-production')
JWT_ALGORITHM = os.getenv('JWT_ALGORITHM', 'HS256')
JWT_EXPIRATION_HOURS = int(os.getenv('JWT_EXPIRATION_HOURS', str(24 * 30)))

CORS_ORIGINS = _csv(os.getenv('CORS_ORIGINS'), default=['*'])

OPENAI_CHAT_API_KEY = os.getenv('OPENAI_CHAT_API_KEY', '').strip()
OPENAI_CHAT_MODEL = os.getenv('OPENAI_CHAT_MODEL', 'gpt-5-nano').strip()
OPENAI_CHAT_REASONING_EFFORT = os.getenv('OPENAI_CHAT_REASONING_EFFORT', 'minimal').strip()

OPENAI_VISION_API_KEY = os.getenv('OPENAI_VISION_API_KEY', '').strip()
OPENAI_VISION_MODEL = os.getenv('OPENAI_VISION_MODEL', 'gpt-5-nano').strip()
OPENAI_VISION_REASONING_EFFORT = os.getenv('OPENAI_VISION_REASONING_EFFORT', 'minimal').strip()

REQUEST_TIMEOUT_SECONDS = int(os.getenv('REQUEST_TIMEOUT_SECONDS', '20'))
ENABLE_ACTIVITY_FEED = os.getenv('ENABLE_ACTIVITY_FEED', 'true').lower() not in {'0', 'false', 'no'}

OPENAI_WEB_SEARCH_ENABLED: bool = os.getenv("OPENAI_WEB_SEARCH_ENABLED", "true").lower() in {"1", "true", "yes", "on"}
OPENAI_WEB_SEARCH_CONTEXT_SIZE: str = os.getenv("OPENAI_WEB_SEARCH_CONTEXT_SIZE", "medium")
OPENAI_WEB_SEARCH_ALLOWED_DOMAINS: str = os.getenv("OPENAI_WEB_SEARCH_ALLOWED_DOMAINS", "")

# Expo Push Service ayarlari. EXPO_ACCESS_TOKEN opsiyoneldir; EAS tarafinda push token korumasi acilirsa kullanilir.
EXPO_PUSH_API_URL = os.getenv('EXPO_PUSH_API_URL', 'https://exp.host/--/api/v2/push/send').strip()
EXPO_ACCESS_TOKEN = os.getenv('EXPO_ACCESS_TOKEN', '').strip()

# Scheduler ana mimariyi bozmadan FastAPI surecine gomulu calisir.
# Uretimde birden fazla worker acilacaksa sadece bir worker icin true kalmali veya ayri worker surecine tasinmalidir.
SCHEDULER_ENABLED = os.getenv('SCHEDULER_ENABLED', 'true').lower() in {'1', 'true', 'yes', 'on'}
NOTIFICATION_LOOKBACK_SECONDS = int(os.getenv('NOTIFICATION_LOOKBACK_SECONDS', '90'))
