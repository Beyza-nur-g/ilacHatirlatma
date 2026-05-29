# backend/src/services/openai_service.py
from __future__ import annotations

import asyncio
import base64
import json
import re
import time
from datetime import date, datetime
from typing import Any

from openai import OpenAI

from src.config.settings import (
    OPENAI_CHAT_API_KEY,
    OPENAI_CHAT_MODEL,
    OPENAI_VISION_API_KEY,
    OPENAI_VISION_MODEL,
)

try:
    from src.config.settings import (
        OPENAI_WEB_SEARCH_ALLOWED_DOMAINS,
        OPENAI_WEB_SEARCH_CONTEXT_SIZE,
        OPENAI_WEB_SEARCH_ENABLED,
    )
except Exception:
    OPENAI_WEB_SEARCH_ENABLED = True
    OPENAI_WEB_SEARCH_CONTEXT_SIZE = "medium"
    OPENAI_WEB_SEARCH_ALLOWED_DOMAINS = ""


APP_ROUTES: dict[str, dict[str, str]] = {
    "dashboard": {"label": "Panel", "route": "/(tabs)", "icon": "home"},
    "medications": {"label": "Ilaclar", "route": "/(tabs)/medications", "icon": "medical"},
    "reminders": {"label": "Hatirlaticilar", "route": "/(tabs)/reminders", "icon": "alarm"},
    "measurements": {"label": "Olcumler", "route": "/(tabs)/measurements", "icon": "fitness"},
    "family": {"label": "Aile", "route": "/(tabs)/family", "icon": "people"},
    "ocr": {"label": "Ilac Analizi", "route": "/(tabs)/ocr", "icon": "camera"},
    "profile": {"label": "Profil", "route": "/(tabs)/profile", "icon": "person"},
}

RISK_ORDER = {"low": 0, "medium": 1, "high": 2}

CHAT_MEMORY_TTL_SECONDS = 60 * 60 * 6
CHAT_MEMORY_MAX_TURNS = 12
_CHAT_MEMORY: dict[str, dict[str, Any]] = {}

EMERGENCY_KEYWORDS = [
    "nefes alamiyorum", "nefes alamıyorum", "nefes darligi", "nefes darlığı",
    "gogus agrisi", "göğüs ağrısı", "bayil", "bayıl", "bayildim", "bayıldım",
    "bilinc kaybi", "bilinç kaybı", "kanama", "zehirlendim", "intihar",
    "kalp krizi", "112", "acil",
]

OUT_OF_SCOPE_KEYWORDS = [
    "borsa", "hisse", "kripto", "bitcoin", "dolar", "euro", "futbol",
    "film", "siyaset", "secim", "seçim", "hava durumu", "yemek tarifi", "kod yaz",
]

APP_SCOPE_KEYWORDS = [
    "ilac", "ilaç", "tablet", "kapsul", "kapsül", "recete", "reçete",
    "prospektus", "prospektüs", "kub", "küb", "kt", "kullanma talimati",
    "kullanma talimatı", "etken madde", "icerik", "içerik", "yan etki",
    "etkilesim", "etkileşim", "alerji", "kronik", "hastalik", "hastalık",
    "hatirlatici", "hatırlatıcı", "alarm", "olcum", "ölçüm", "tansiyon",
    "seker", "şeker", "aile", "profil", "hamile", "hamilelik", "gebelik",
    "emzirme", "emziriyor", "foto", "fotograf", "fotoğraf", "resim", "kutu",
    "blister", "uygulama", "panel", "liste", "sil", "ekle", "guncelle",
    "güncelle", "kullanim", "kullanım", "uyari", "uyarı", "kontrendikasyon",
    "uygun mu", "kullanabilir", "kullanabilirim", "alabilir miyim",
    "alabilirim", "içebilir miyim", "icebilir miyim",
]

FOLLOW_UP_KEYWORDS = [
    "yani", "peki", "o zaman", "bu durumda", "şimdi", "simdi",
    "kullanabilir miyim", "kullanabilirim", "kullanayim mi", "kullanayım mı",
    "alabilir miyim", "içebilir miyim", "icebilir miyim", "uygun mu",
    "değil mi", "degil mi", "doğru mu", "dogru mu", "bu ilacı", "bu ilaci",
    "onda", "içinde", "icinde", "onun içinde", "onun icinde",
]

NEW_SEARCH_KEYWORDS = [
    "yeniden ara", "tekrar ara", "güncel ara", "guncel ara", "başka kaynak",
    "baska kaynak", "prospektüsünü ara", "prospektusunu ara", "kub ara",
    "küb ara", "kaynak göster", "kaynak goster",
]

MEDICATION_RECOMMENDATION_KEYWORDS = [
    "hangi ilaci oner", "hangi ilacı öner", "ilac oner", "ilaç öner",
    "antibiyotik oner", "antibiyotik öner", "agri kesici oner",
    "ağrı kesici öner", "ne icmeliyim", "ne içmeliyim", "bana ilac yaz",
    "bana ilaç yaz",
]

DOSE_DECISION_KEYWORDS = [
    "kac tane ic", "kaç tane iç", "gunde kac", "günde kaç", "dozu artir",
    "dozu artır", "dozu azalt", "sabah mi aksam mi", "sabah mı akşam mı",
    "iki tane alayim mi", "iki tane alayım mı",
]

START_STOP_DECISION_KEYWORDS = [
    "kullanayim mi", "kullanayım mı", "kullanabilir miyim", "kullanabilirim",
    "icsem olur mu", "içsem olur mu", "alabilir miyim", "içebilir miyim",
    "icebilir miyim", "birakayim mi", "bırakayım mı", "keseyim mi",
    "baslayayim mi", "başlayayım mı", "cocuguma vereyim mi", "çocuğuma vereyim mi",
]

GENERIC_MEDICINE_WORDS = {
    "ilac", "ilaç", "ilaclar", "ilaçlar", "ilaclarim", "ilaçlarım",
    "ilaclarım", "ilaçlarim", "kayitli ilaclarim", "kayıtlı ilaçlarım",
    "genel bilgi", "bilgi", "bu ilac", "bu ilaç",
}

STOP_WORDS_FOR_MEDICINE_EXTRACTION = {
    "bu", "şu", "su", "o", "ben", "bana", "bende", "icin", "için",
    "hakkinda", "hakkında", "genel", "bilgi", "yani", "peki", "tamam",
    "değil", "degil", "mi", "mı", "mu", "mü", "kullanabilir",
    "kullanabilirim", "kullanayim", "kullanayım", "alabilir",
    "alabilirim", "içebilir", "icebilir", "uygun", "olur", "olabilir",
    "doktor", "eczaci", "eczacı", "ilac", "ilaç",
}

ROUTINE_WARNING_MARKERS = [
    "yüksek doz", "yuksek doz", "aşırı doz", "asiri doz",
    "önerilen dozdan fazla", "onerilen dozdan fazla", "uzun süre", "uzun sure",
    "genel olarak", "doktor kontrolünde", "doktor kontrolunde",
    "prospektüse uygun", "prospektuse uygun",
]

DIRECT_RISK_MARKERS = [
    "kontrendike", "kullanilmamali", "kullanılmamalı", "uygun degil",
    "uygun değil", "alerjik reaksiyon", "alerji riski", "alerjen",
    "etkilesim", "etkileşim", "tansiyonu yukselt", "tansiyonu yükselt",
    "kan basincini yukselt", "kan basıncını yükselt", "hipertansiyon icin uyar",
    "hipertansiyon için uyar", "gebelikte kullanilmaz", "gebelikte kullanılmaz",
    "hamilelikte kullanilmaz", "hamilelikte kullanılmaz",
    "emzirme döneminde kullanilmaz", "emzirme döneminde kullanılmaz",
    "emzirirken kullanilmaz", "emzirirken kullanılmaz", "bobrek yetmezligi",
    "böbrek yetmezliği", "karaciger yetmezligi", "karaciğer yetmezliği",
    "kalp ritmi", "aritmi",
]

NO_RISK_PHRASES = [
    "dogrudan iliski bulunamadi", "doğrudan ilişki bulunamadı",
    "dogrudan uyumsuzluk bulunamadi", "doğrudan uyumsuzluk bulunamadı",
    "belirgin risk bulunamadi", "belirgin risk bulunamadı",
    "uyumsuzluk sinyali goremedim", "uyumsuzluk sinyali göremedim",
    "risk sinyali goremedim", "risk sinyali göremedim", "uyari yok", "uyarı yok",
]

MEDICAL_SAFETY_RULES = """
GUVENLIK VE KAPSAM KURALLARI:
1. Tani koyma.
2. Tedavi baslatma, tedavi kesme veya tedavi degistirme talimati verme.
3. Yeni ilac, antibiyotik, agri kesici, vitamin veya takviye onerme.
4. Kisisel doz, doz artirma, doz azaltma, kullanim sikligi veya saat plani uretme.
5. "Kesin kullanabilirsiniz", "kesin kullanmayin", "doktor gerekmez" gibi kesin hukum verme.
6. Ilac hakkinda yorum yaparken web search ile bulunan prospektus/KUB/KT veya onceki kaynakli cevaba dayan.
7. Hastanin profilindeki dogum tarihi, yas, cinsiyet, hamilelik/emzirme durumu, alerji, kronik hastalik, mevcut ilac, olcum, kilo, boy, kan grubu ve diger kayitli bilgileri dikkate al.
8. Dogum tarihi varsa yas mutlaka hesaplanmis kabul edilir; "yas bilinmiyor" deme.
9. Hamilelik veya emzirme bilgisi varsa bunu ilac yorumunda mutlaka dikkate al.
10. Sadece hastanin kayitli alerji/hastalik/ilac/profil bilgisiyle dogrudan iliskili olan uyarilari ana degerlendirmeye al.
11. "Yuksek dozda sorun olabilir", "onerilen doz asilmamali", "uzun sure doktora danismadan kullanilmaz" gibi genel ve cogu ilac icin gecerli ifadeleri ana risk nedeni yapma; bunlari en sonda kisa genel not olarak yaz.
12.  spesifik bir alerji, kaynaklarda ilacin etken maddesi/yardimci maddesiyle dogrudan baglantili degilse bunu "dogrudan iliski bulunamadi" diye belirt; sirf alerji var diye dikkat/uygun degil deme.
13. Hipertansiyon gibi kronik hastaliklar kaynaklarda ilac icin dogrudan uyari/kontrendikasyon olarak gecmiyorsa bunu ana risk nedeni yapma.
14. Belirgin risk yoksa "kaynaklarda ve kayitli bilgilerde belirgin uyumsuzluk sinyali goremedim; bu kesin uygunluk/onay degildir" de.
15. Kullanim bilgisi sorulursa, sadece kaynaklarda bulunan genel kullanim bilgisini ozetle; kisiye ozel doz talimati verme.
16. Acil belirtilerde 112 veya en yakin saglik kurulusuna yonlendir.
17. Uygulama disi konulara cevap verme.
18. Her tibbi yorumda "Doktorunuza veya eczacinize tekrar danisin." ifadesi bulunmali.
19. Cevap Turkce, net, dengeli, kaynakli, hasta bilgisine gore ozellestirilmis ve kullanici dostu olsun.
""".strip()


def _client(api_key: str) -> OpenAI:
    return OpenAI(api_key=api_key)


def _get(obj: Any, key: str, default: Any = None) -> Any:
    if isinstance(obj, dict):
        return obj.get(key, default)
    return getattr(obj, key, default)


def _as_bool(value: Any) -> bool:
    if isinstance(value, bool):
        return value
    return str(value).strip().lower() in {"1", "true", "yes", "on", "evet", "var", "hamile", "pregnant"}


def _normalize_text(text: str | None) -> str:
    return (text or "").strip().lower()


def _contains_any(text: str, keywords: list[str]) -> bool:
    lowered = _normalize_text(text)
    return any(keyword in lowered for keyword in keywords)


def _max_risk(*levels: str) -> str:
    valid = [level for level in levels if level in RISK_ORDER]
    if not valid:
        return "low"
    return max(valid, key=lambda item: RISK_ORDER[item])


def _parse_date_value(value: Any) -> date | None:
    if value is None:
        return None
    if isinstance(value, datetime):
        return value.date()
    if isinstance(value, date):
        return value

    text = str(value).strip()
    if not text:
        return None

    text = text.replace("Z", "+00:00")
    candidate = text.split("T", 1)[0] if "T" in text else text

    for fmt in ("%Y-%m-%d", "%d.%m.%Y", "%d/%m/%Y", "%Y/%m/%d", "%d-%m-%Y"):
        try:
            return datetime.strptime(candidate, fmt).date()
        except Exception:
            pass

    try:
        return datetime.fromisoformat(text).date()
    except Exception:
        return None


def _calculate_age_from_birth_date(birth_date_value: Any) -> int | None:
    birth = _parse_date_value(birth_date_value)
    if not birth:
        return None

    today = date.today()
    age = today.year - birth.year - ((today.month, today.day) < (birth.month, birth.day))
    if age < 0 or age > 130:
        return None
    return age


def _as_list(value: Any) -> list[Any]:
    if value is None:
        return []
    if isinstance(value, list):
        return value
    if isinstance(value, tuple):
        return list(value)
    if isinstance(value, set):
        return list(value)
    if isinstance(value, str):
        text = value.strip()
        if not text:
            return []
        return [part.strip() for part in re.split(r"[,;\n]", text) if part.strip()]
    return [value]


def _context_candidates(context: dict[str, Any] | None) -> list[dict[str, Any]]:
    if not isinstance(context, dict):
        return []

    candidates: list[dict[str, Any]] = [context]
    keys = [
        "profile", "patient", "member", "active_member", "active_profile",
        "current_user", "user", "family_member", "selected_member", "selected_profile",
    ]

    for key in keys:
        value = context.get(key)
        if isinstance(value, dict):
            candidates.append(value)

    expanded: list[dict[str, Any]] = []
    for candidate in candidates:
        expanded.append(candidate)
        for key in keys:
            value = candidate.get(key)
            if isinstance(value, dict):
                expanded.append(value)

    unique: list[dict[str, Any]] = []
    seen: set[int] = set()
    for item in expanded:
        ident = id(item)
        if ident not in seen:
            seen.add(ident)
            unique.append(item)

    return unique


def _profile_value(context: dict[str, Any] | None, *keys: str) -> Any:
    for candidate in _context_candidates(context):
        for key in keys:
            if key in candidate and candidate.get(key) is not None:
                value = candidate.get(key)
                if isinstance(value, str) and not value.strip():
                    continue
                return value
    return None


def _profile_bool(context: dict[str, Any] | None, *keys: str) -> bool | None:
    value = _profile_value(context, *keys)
    if value is None:
        return None
    if isinstance(value, bool):
        return value

    lowered = str(value).strip().lower()
    if lowered in {"1", "true", "yes", "evet", "var", "hamile", "pregnant", "gebe"}:
        return True
    if lowered in {"0", "false", "no", "hayir", "hayır", "yok", "degil", "değil", "not_pregnant"}:
        return False
    return None


def _profile_list(context: dict[str, Any] | None, *keys: str) -> list[Any]:
    return _as_list(_profile_value(context, *keys))


def _extract_json_block(text: str) -> dict[str, Any] | None:
    if not text:
        return None

    text = text.strip()
    candidates = [text]
    fenced = re.search(r"```json\s*(\{.*?\})\s*```", text, re.S)
    if fenced:
        candidates.insert(0, fenced.group(1))

    first = text.find("{")
    last = text.rfind("}")
    if first != -1 and last != -1 and last > first:
        candidates.append(text[first : last + 1])

    for candidate in candidates:
        try:
            parsed = json.loads(candidate)
            if isinstance(parsed, dict):
                return parsed
        except Exception:
            continue
    return None


def _responses_text(response: Any) -> str:
    text = _get(response, "output_text", "") or ""
    if str(text).strip():
        return str(text).strip()

    parts: list[str] = []
    for item in _get(response, "output", []) or []:
        if _get(item, "type", "") != "message":
            continue
        for content in _get(item, "content", []) or []:
            value = _get(content, "text", "") or ""
            if value:
                parts.append(str(value))
    return "\n".join(parts).strip()


def _extract_url_citations(response: Any) -> list[dict[str, str]]:
    citations: list[dict[str, str]] = []
    seen: set[str] = set()

    for item in _get(response, "output", []) or []:
        if _get(item, "type", "") == "message":
            for content in _get(item, "content", []) or []:
                for annotation in _get(content, "annotations", []) or []:
                    if _get(annotation, "type", "") != "url_citation":
                        continue
                    url = _get(annotation, "url", "") or ""
                    title = _get(annotation, "title", "") or url
                    if url and url not in seen:
                        seen.add(url)
                        citations.append({"title": str(title), "url": str(url)})

        if _get(item, "type", "") == "web_search_call":
            action = _get(item, "action", None)
            for source in _get(action, "sources", []) or []:
                url = _get(source, "url", "") or ""
                title = _get(source, "title", "") or url
                if url and url not in seen:
                    seen.add(url)
                    citations.append({"title": str(title), "url": str(url)})

    return citations[:10]


def _text_payload_low() -> dict[str, str]:
    return {"verbosity": "low"}


def _reasoning_payload_for_model(model: str) -> dict[str, str] | None:
    lowered = (model or "").lower()
    if lowered.startswith("gpt-5") or lowered.startswith("o"):
        return {"effort": "low"}
    return None


def _web_search_tools() -> list[dict[str, Any]]:
    if not _as_bool(OPENAI_WEB_SEARCH_ENABLED):
        return []

    tool: dict[str, Any] = {
        "type": "web_search",
        "search_context_size": OPENAI_WEB_SEARCH_CONTEXT_SIZE or "medium",
        "user_location": {
            "type": "approximate",
            "country": "TR",
            "city": "Istanbul",
            "region": "Istanbul",
            "timezone": "Europe/Istanbul",
        },
    }

    raw_domains = str(OPENAI_WEB_SEARCH_ALLOWED_DOMAINS or "").strip()
    if raw_domains:
        domains = [item.strip() for item in raw_domains.split(",") if item.strip()]
        if domains:
            tool["filters"] = {"allowed_domains": domains}

    return [tool]


def _medication_names_from_context(context: dict[str, Any] | None) -> list[str]:
    if not context:
        return []

    names: list[str] = []
    raw_names = _profile_value(context, "medication_names", "medicine_names", "drug_names")
    if isinstance(raw_names, list):
        names.extend(str(item) for item in raw_names if item)

    medications = _profile_value(context, "medications", "medicines", "drugs", "active_medications")
    if isinstance(medications, list):
        for item in medications:
            if isinstance(item, dict) and item.get("name"):
                names.append(str(item["name"]))
            elif isinstance(item, dict) and item.get("medicine_name"):
                names.append(str(item["medicine_name"]))
            elif isinstance(item, dict) and item.get("medication_name"):
                names.append(str(item["medication_name"]))
            elif isinstance(item, str):
                names.append(item)

    unique: list[str] = []
    seen: set[str] = set()
    for name in names:
        cleaned = name.strip()
        lowered = cleaned.lower()
        if cleaned and lowered not in seen:
            seen.add(lowered)
            unique.append(cleaned)
    return unique[:30]


def _compact_context(context: dict[str, Any] | None) -> dict[str, Any]:
    if not context:
        return {}

    birth_date = _profile_value(
        context, "birth_date", "birthDate", "date_of_birth", "dateOfBirth",
        "dob", "birthday", "dogum_tarihi", "doğum_tarihi",
    )
    explicit_age = _profile_value(context, "age", "yas", "yaş")
    calculated_age = _calculate_age_from_birth_date(birth_date)
    age = explicit_age if explicit_age is not None else calculated_age

    medications = _profile_value(context, "medications", "medicines", "drugs", "active_medications") or []
    reminders = _profile_value(context, "reminders", "alarms", "hatirlaticilar", "hatırlatıcılar") or []
    measurements = _profile_value(context, "measurements", "olcumler", "ölçümler", "recent_measurements") or []

    compact_medications: list[dict[str, Any]] = []
    if isinstance(medications, list):
        for item in medications[:30]:
            if isinstance(item, dict):
                compact_medications.append(
                    {
                        "name": item.get("name") or item.get("medicine_name") or item.get("medication_name"),
                        "dosage": item.get("dosage") or item.get("dose"),
                        "form": item.get("form"),
                        "notes": item.get("notes") or item.get("description"),
                        "is_active": item.get("is_active", item.get("active", True)),
                    }
                )
            elif isinstance(item, str):
                compact_medications.append({"name": item, "is_active": True})

    compact_reminders: list[dict[str, Any]] = []
    if isinstance(reminders, list):
        for item in reminders[:30]:
            if isinstance(item, dict):
                compact_reminders.append(
                    {
                        "medication_name": item.get("medication_name") or item.get("medicine_name") or item.get("name"),
                        "times": item.get("times", []),
                        "frequency": item.get("frequency"),
                        "is_active": item.get("is_active", item.get("active", True)),
                    }
                )

    compact_measurements: list[dict[str, Any]] = []
    if isinstance(measurements, list):
        for item in measurements[:10]:
            if isinstance(item, dict):
                compact_measurements.append(
                    {
                        "type": item.get("type") or item.get("type_name") or item.get("measurement_type"),
                        "value": item.get("value"),
                        "unit": item.get("unit"),
                        "measured_at": item.get("measured_at") or item.get("created_at") or item.get("date"),
                    }
                )

    is_pregnant = _profile_bool(
        context, "is_pregnant", "pregnant", "pregnancy", "pregnancy_status",
        "hamile", "hamile_mi", "gebelik", "gebe",
    )
    is_breastfeeding = _profile_bool(
        context, "is_breastfeeding", "breastfeeding", "lactating",
        "emziriyor", "emzirme", "emziriyor_mu",
    )

    profile_summary = {
        "patient_name": _profile_value(context, "patient_name", "member_name", "name", "full_name", "ad_soyad"),
        "active_member_id": _profile_value(context, "member_id", "active_member_id", "patient_id", "user_id", "_id", "id"),
        "age": age,
        "age_source": "birth_date" if explicit_age is None and calculated_age is not None else "profile_age" if explicit_age is not None else "unknown",
        "birth_date": birth_date,
        "gender": _profile_value(context, "gender", "sex", "cinsiyet"),
        "blood_type": _profile_value(context, "blood_type", "bloodType", "kan_grubu", "kanGrubu"),
        "height_cm": _profile_value(context, "height_cm", "height", "boy", "boy_cm"),
        "weight_kg": _profile_value(context, "weight_kg", "weight", "kilo", "kilo_kg"),
        "is_pregnant": is_pregnant,
        "pregnancy_week": _profile_value(context, "pregnancy_week", "pregnancyWeek", "gebelik_haftasi", "hamilelik_haftasi"),
        "is_breastfeeding": is_breastfeeding,
        "allergies": _profile_list(context, "allergies", "alerjiler", "allergy_list"),
        "chronic_diseases": _profile_list(context, "chronic_diseases", "chronicDiseases", "hastaliklar", "kronik_hastaliklar", "kronikHastaliklar"),
        "conditions": _profile_list(context, "conditions", "diagnoses", "medical_conditions", "saglik_durumlari"),
        "surgeries": _profile_list(context, "surgeries", "ameliyatlar"),
        "medication_names": _medication_names_from_context(context),
        "medications": compact_medications,
        "reminders": compact_reminders,
        "recent_measurements": compact_measurements,
        "emergency_contact": _profile_value(context, "emergency_contact", "emergencyContact", "acil_iletisim", "acilIletisim"),
        "notes": _profile_value(context, "notes", "medical_notes", "profile_notes", "notlar"),
        "reminder_count": _profile_value(context, "reminder_count") or len(compact_reminders),
    }

    extra_profile_fields: dict[str, Any] = {}
    protected = {"password", "hashed_password", "token", "access_token", "refresh_token", "jwt", "secret"}
    for candidate in _context_candidates(context):
        for key, value in candidate.items():
            lowered_key = str(key).lower()
            if lowered_key in protected or key in profile_summary:
                continue
            if isinstance(value, (str, int, float, bool)) and value not in ("", None):
                extra_profile_fields[str(key)] = value
            if len(extra_profile_fields) >= 20:
                break
        if len(extra_profile_fields) >= 20:
            break

    profile_summary["extra_profile_fields"] = extra_profile_fields
    return profile_summary


def _conversation_key(context: dict[str, Any] | None) -> str:
    for key in ["active_member_id", "member_id", "user_id", "patient_id", "_id", "id", "email", "patient_name", "member_name", "name"]:
        value = _profile_value(context, key)
        if value:
            return str(value)
    return "default"


def _get_memory(context: dict[str, Any] | None) -> dict[str, Any]:
    now = time.time()
    key = _conversation_key(context)
    memory = _CHAT_MEMORY.get(key)
    if not memory or now - memory.get("updated_at", 0) > CHAT_MEMORY_TTL_SECONDS:
        memory = {"turns": [], "last_medicine_name": None, "last_sources": [], "last_evidence": [], "updated_at": now}
        _CHAT_MEMORY[key] = memory
    return memory


def _memory_snapshot(context: dict[str, Any] | None) -> dict[str, Any]:
    memory = _get_memory(context)
    return {
        "last_medicine_name": memory.get("last_medicine_name"),
        "last_sources": memory.get("last_sources", [])[:8],
        "last_evidence": memory.get("last_evidence", [])[:8],
        "recent_turns": memory.get("turns", [])[-8:],
    }


def _recent_conversation_text(context: dict[str, Any] | None) -> str:
    turns = _memory_snapshot(context).get("recent_turns") or []
    lines: list[str] = []
    for turn in turns[-8:]:
        role = turn.get("role", "")
        content = str(turn.get("content", "")).strip()
        if not content:
            continue
        if len(content) > 1200:
            content = content[:1200] + "..."
        lines.append(f"{role}: {content}")
    return "\n".join(lines)


def _memory_last_medicine(context: dict[str, Any] | None) -> str | None:
    value = _memory_snapshot(context).get("last_medicine_name")
    return str(value) if value else None


def _memory_sources(context: dict[str, Any] | None) -> list[dict[str, str]]:
    sources = _memory_snapshot(context).get("last_sources") or []
    return [
        {"title": str(source.get("title") or source.get("url")), "url": str(source.get("url"))}
        for source in sources if isinstance(source, dict) and source.get("url")
    ][:8]


def _remember_turn(
    context: dict[str, Any] | None,
    *,
    user_text: str,
    assistant_reply: str,
    medicine_name: str | None,
    sources: list[dict[str, str]] | None,
    evidence: list[str] | None,
) -> None:
    memory = _get_memory(context)
    memory["turns"].append({"role": "user", "content": user_text})
    memory["turns"].append({"role": "assistant", "content": assistant_reply})
    memory["turns"] = memory["turns"][-CHAT_MEMORY_MAX_TURNS:]

    if medicine_name and medicine_name not in {"coklu_ilac", "çoklu_ilac"}:
        memory["last_medicine_name"] = medicine_name
    if sources:
        memory["last_sources"] = sources[:8]
    if evidence:
        memory["last_evidence"] = [str(item) for item in evidence if str(item).strip()][:8]
    memory["updated_at"] = time.time()


def _is_follow_up_question(text: str, context: dict[str, Any] | None = None) -> bool:
    lowered = _normalize_text(text)
    if any(keyword in lowered for keyword in FOLLOW_UP_KEYWORDS):
        return True
    return bool(_memory_last_medicine(context) and len(lowered.split()) <= 9)


def _needs_fresh_search(text: str) -> bool:
    lowered = _normalize_text(text)
    return any(keyword in lowered for keyword in NEW_SEARCH_KEYWORDS)


def _risk_from_text(text: str) -> tuple[str, str]:
    if _contains_any(text, EMERGENCY_KEYWORDS):
        return "high", "Acil belirti varsa 112'yi arayin veya en yakin saglik kurulusuna basvurun."
    medium_keywords = [
        "yan etki", "alerji", "hamile", "gebelik", "emzir", "cocuk", "çocuk",
        "bebek", "yasli", "yaşlı", "etkilesim", "etkileşim", "kan sulandirici",
        "kan sulandırıcı", "tansiyon", "diyabet", "bobrek", "böbrek",
        "karaciger", "karaciğer", "kalp", "doz", "kontrendikasyon",
    ]
    if _contains_any(text, medium_keywords):
        return "medium", "Bu konuda doktor veya eczaci gorusu almadan ilac ya da doz karari vermeyin."
    return "low", "Bu yanit bilgilendirme amaclidir; tani ve tedavi icin doktorunuza veya eczacinize danisin."


def _suggested_actions(text: str) -> list[dict[str, str]]:
    lowered = _normalize_text(text)
    actions: list[dict[str, str]] = []
    if any(word in lowered for word in ["foto", "fotograf", "fotoğraf", "resim", "kutu", "prospektus", "prospektüs", "kub", "küb"]):
        actions.append(APP_ROUTES["ocr"])
    if any(word in lowered for word in ["hatirlat", "hatırlat", "alarm", "saat"]):
        actions.append(APP_ROUTES["reminders"])
    if any(word in lowered for word in ["ilac", "ilaç", "tablet", "kapsul", "kapsül"]):
        actions.append(APP_ROUTES["medications"])
    if any(word in lowered for word in ["olcum", "ölçüm", "seker", "şeker", "tansiyon"]):
        actions.append(APP_ROUTES["measurements"])
    if any(word in lowered for word in ["aile", "anne", "baba", "cocuk", "çocuk", "profil"]):
        actions.append(APP_ROUTES["family"])
    if not actions:
        actions = [APP_ROUTES["dashboard"], APP_ROUTES["medications"], APP_ROUTES["ocr"]]

    unique: list[dict[str, str]] = []
    seen: set[str] = set()
    for action in actions:
        if action["route"] not in seen:
            seen.add(action["route"])
            unique.append(action)
    return unique[:3]


def _actions_from_keys(keys: list[str] | None, fallback_text: str) -> list[dict[str, str]]:
    if not keys:
        return _suggested_actions(fallback_text)
    actions: list[dict[str, str]] = []
    seen: set[str] = set()
    for key in keys:
        item = APP_ROUTES.get(str(key))
        if item and item["route"] not in seen:
            seen.add(item["route"])
            actions.append(item)
    return actions[:3] if actions else _suggested_actions(fallback_text)


def _text_mentions_registered_medicine(text: str, context: dict[str, Any] | None) -> bool:
    lowered = _normalize_text(text)
    return any(_normalize_text(name) in lowered for name in _medication_names_from_context(context))


def _is_out_of_scope(text: str, context: dict[str, Any] | None = None) -> bool:
    lowered = _normalize_text(text)
    if not lowered:
        return False
    if _text_mentions_registered_medicine(text, context):
        return False
    if _is_follow_up_question(text, context):
        return False
    if any(word in lowered for word in ["merhaba", "selam", "iyi gunler", "iyi günler", "yardim", "yardım", "nasilsin", "nasılsın"]):
        return False
    if any(word in lowered for word in OUT_OF_SCOPE_KEYWORDS):
        return True
    return not any(word in lowered for word in APP_SCOPE_KEYWORDS)


def _is_medication_recommendation_request(text: str) -> bool:
    return _contains_any(text, MEDICATION_RECOMMENDATION_KEYWORDS)


def _is_dose_or_start_stop_decision(text: str) -> bool:
    return _contains_any(text, DOSE_DECISION_KEYWORDS + START_STOP_DECISION_KEYWORDS)


def _is_personal_medication_summary_request(text: str) -> bool:
    lowered = _normalize_text(text)
    phrases = [
        "ilaclarim hakkinda", "ilaçlarım hakkında", "ilaclarım hakkında",
        "ilaclarim neler", "ilaçlarım neler", "kayitli ilaclarim",
        "kayıtlı ilaçlarım", "ilac listem", "ilaç listem", "ilaçlarımı",
        "ilaclarimi",
    ]
    return any(phrase in lowered for phrase in phrases)


def _is_generic_medicine_candidate(candidate: str | None) -> bool:
    cleaned = _normalize_text(candidate)
    if not cleaned:
        return True
    cleaned = re.sub(r"\s+", " ", cleaned).strip()
    if cleaned in GENERIC_MEDICINE_WORDS:
        return True
    generic_words = ["ilaclarim", "ilaçlarım", "ilaclarım", "ilaçlar", "ilaclar", "genel bilgi"]
    return any(word in cleaned for word in generic_words)


def _clean_medicine_candidate(candidate: str) -> str:
    words = re.split(r"\s+", candidate.strip(" .,:;!?"))
    useful = []
    for word in words:
        cleaned = _normalize_text(word.strip(" .,:;!?"))
        if cleaned and cleaned not in STOP_WORDS_FOR_MEDICINE_EXTRACTION:
            useful.append(word.strip(" .,:;!?"))
    return " ".join(useful).strip()


def _guess_medicine_name(text: str, context: dict[str, Any] | None = None) -> str | None:
    if not text:
        return None

    lowered = _normalize_text(text)
    for name in _medication_names_from_context(context):
        if _normalize_text(name) in lowered:
            return name

    direct_patterns = [
        r"\b([-A-Za-zÇĞİÖŞÜçğıöşü0-9]{2,40})\s+kullanabilir",
        r"\b([-A-Za-zÇĞİÖŞÜçğıöşü0-9]{2,40})\s+kullanay",
        r"\b([-A-Za-zÇĞİÖŞÜçğıöşü0-9]{2,40})\s+alabilir",
        r"\b([-A-Za-zÇĞİÖŞÜçğıöşü0-9]{2,40})\s+içebilir",
        r"\b([-A-Za-zÇĞİÖŞÜçğıöşü0-9]{2,40})\s+icebilir",
        r"\b([-A-Za-zÇĞİÖŞÜçğıöşü0-9]{2,40})\s+uygun mu",
        r"\b([-A-Za-zÇĞİÖŞÜçğıöşü0-9]{2,40})(?:un|ün|in|ın|nin|nın|nun|nün)?\s+içinde",
        r"\b([-A-Za-zÇĞİÖŞÜçğıöşü0-9]{2,40})(?:un|ün|in|ın|nin|nın|nun|nün)?\s+icinde",
    ]
    for pattern in direct_patterns:
        match = re.search(pattern, text, re.I)
        if match:
            candidate = _clean_medicine_candidate(match.group(1))
            if not _is_generic_medicine_candidate(candidate) and 2 <= len(candidate) <= 60:
                return candidate

    patterns = [
        r"([-A-Za-zÇĞİÖŞÜçğıöşü0-9 ]+)\s+hakkinda",
        r"([-A-Za-zÇĞİÖŞÜçğıöşü0-9 ]+)\s+hakkında",
        r"([-A-Za-zÇĞİÖŞÜçğıöşü0-9 ]+)\s+nedir",
        r"([-A-Za-zÇĞİÖŞÜçğıöşü0-9 ]+)\s+uygun mu",
        r"([-A-Za-zÇĞİÖŞÜçğıöşü0-9 ]+)\s+kullan",
    ]
    for pattern in patterns:
        match = re.search(pattern, text, re.I)
        if not match:
            continue
        candidate = _clean_medicine_candidate(match.group(1))
        if not _is_generic_medicine_candidate(candidate) and 2 <= len(candidate) <= 60:
            return candidate
    return None


def _medicines_to_search(text: str, context: dict[str, Any] | None) -> list[str]:
    explicit = _guess_medicine_name(text, context)
    if explicit:
        return [explicit]

    registered = _medication_names_from_context(context)
    if _is_personal_medication_summary_request(text):
        return registered[:8]

    if _is_follow_up_question(text, context):
        last = _memory_last_medicine(context)
        if last:
            return [last]

    lowered = _normalize_text(text)
    triggers = [
        "prospektus", "prospektüs", "kub", "küb", "kullanma talimati",
        "kullanma talimatı", "etken madde", "yan etki", "kontrendikasyon",
        "uygun mu", "kullanabilir miyim", "kullanabilirim", "alabilir miyim",
        "içebilir miyim", "icebilir miyim", "alerjim var", "hastaligim var",
        "hastalığım var", "hamileyim", "emziriyorum",
    ]
    if any(trigger in lowered for trigger in triggers):
        return registered[:1] if len(registered) == 1 else registered[:5]
    return []


def _should_use_memory_without_search(text: str, context: dict[str, Any] | None, medicines: list[str]) -> bool:
    if _needs_fresh_search(text) or not _is_follow_up_question(text, context) or not medicines:
        return False
    last = _memory_last_medicine(context)
    if not last or _normalize_text(medicines[0]) != _normalize_text(last):
        return False
    snapshot = _memory_snapshot(context)
    return bool(_memory_sources(context) or snapshot.get("last_evidence"))


def _filter_direct_findings(findings: list[str]) -> list[str]:
    filtered = []
    for item in findings:
        text = _normalize_text(item)
        if not text:
            continue
        if any(phrase in text for phrase in NO_RISK_PHRASES):
            continue
        if any(marker in text for marker in ROUTINE_WARNING_MARKERS):
            continue
        if any(marker in text for marker in DIRECT_RISK_MARKERS):
            filtered.append(item)
    return filtered[:6]


def _normalize_suitability(value: Any) -> str:
    value = str(value or "").lower()
    return value if value in {"appropriate", "caution", "avoid", "unknown"} else "unknown"


def _calibrate_suitability(suitability: str, negative_findings: list[str], reasons: list[str]) -> str:
    value = _normalize_suitability(suitability)
    combined = _normalize_text(" ".join([*negative_findings, *reasons]))
    if value in {"caution", "avoid"}:
        direct = _filter_direct_findings(negative_findings)
        if not direct:
            if any(marker in combined for marker in ROUTINE_WARNING_MARKERS):
                return "appropriate"
            if any(phrase in combined for phrase in NO_RISK_PHRASES):
                return "appropriate"
            if not any(marker in combined for marker in DIRECT_RISK_MARKERS):
                return "appropriate"
    return value


def _guardrail_reply(text: str, context: dict[str, Any] | None) -> dict[str, Any] | None:
    risk_level, _ = _risk_from_text(text)

    if _contains_any(text, EMERGENCY_KEYWORDS):
        return {
            "reply": "Bu ifade acil bir duruma isaret ediyor olabilir. Ben acil tibbi destek yerine gecemem. Lutfen 112'yi arayin veya en yakin saglik kurulusuna basvurun.",
            "risk_level": "high",
            "safety_note": "Acil belirtilerde uygulama veya sohbet yerine 112 ve saglik kuruluslari onceliklidir.",
            "suggested_actions": [APP_ROUTES["dashboard"]],
            "source": "guardrail_emergency",
            "sources": [],
        }

    if _is_medication_recommendation_request(text):
        return {
            "reply": "Yeni ilac oneremem. Belirli bir ilac adi verirseniz veya sistemde kayitli ilaclariniz varsa, prospektus/KUB/KT bilgilerini arayip yas, hamilelik/emzirme, alerji, kronik hastalik ve mevcut ilac bilgilerinize gore dikkat edilmesi gereken noktalar acisindan on degerlendirme yapabilirim. Doktorunuza veya eczacinize tekrar danisin.",
            "risk_level": _max_risk(risk_level, "medium"),
            "safety_note": "Ilac secimi ve tedavi karari icin doktor/eczaci gorusu gerekir.",
            "suggested_actions": [APP_ROUTES["ocr"], APP_ROUTES["medications"], APP_ROUTES["reminders"]],
            "source": "guardrail_recommendation",
            "sources": [],
        }

    if _is_dose_or_start_stop_decision(text):
        medicines = _medicines_to_search(text, context)
        if medicines:
            return None
        return {
            "reply": "Bir ilaci kullanip kullanmama, baslama/birakma veya doz degistirme kararini ben veremem. Ilacin adini net yazarsaniz veya ilac sistemde kayitli ise prospektus/KUB/KT bilgilerini arayip profil bilgilerinizle birlikte dikkat edilmesi gereken olumsuz noktalari ozetleyebilirim. Doktorunuza veya eczacinize tekrar danisin.",
            "risk_level": _max_risk(risk_level, "medium"),
            "safety_note": "Doz ve kullanim karari icin doktor/eczaci gorusu gerekir.",
            "suggested_actions": [APP_ROUTES["ocr"], APP_ROUTES["medications"]],
            "source": "guardrail_dose_decision",
            "sources": [],
        }

    if _is_out_of_scope(text, context):
        return {
            "reply": "Ben bu uygulamada ilaclar, prospektus/KUB/KT bilgileri, hatirlaticilar, olcumler, aile profilleri ve ilac fotografi analizi konularinda yardimci olabilirim. Uygulama disi konularda cevap veremem.",
            "risk_level": "low",
            "safety_note": "Asistan sadece uygulamanin ilac takip ve saglik kaydi ozellikleri icin kullanilmalidir.",
            "suggested_actions": [APP_ROUTES["dashboard"], APP_ROUTES["medications"], APP_ROUTES["ocr"]],
            "source": "guardrail_scope",
            "sources": [],
        }
    return None


def _format_medication_line(item: dict[str, Any]) -> str:
    parts = [str(item.get("name") or "Isimsiz ilac")]
    if item.get("dosage"):
        parts.append(str(item["dosage"]))
    if item.get("form"):
        parts.append(str(item["form"]))
    line = " - ".join(parts)
    if item.get("notes"):
        line += f" ({item['notes']})"
    return line


def _local_medication_summary(context: dict[str, Any] | None) -> str:
    compact = _compact_context(context)
    medications = compact.get("medications") or []
    reminders = compact.get("reminders") or []
    allergies = compact.get("allergies") or []
    chronic_diseases = compact.get("chronic_diseases") or []
    patient_name = compact.get("patient_name") or "aktif profil"

    lines = [f"{patient_name} icin sistemdeki kayitlara gore kisa ozet:"]

    if compact.get("age") is not None:
        source = "dogum tarihinden hesaplandi" if compact.get("age_source") == "birth_date" else "profil kaydindan alindi"
        lines.append(f"Yas: {compact.get('age')} ({source}).")

    if compact.get("is_pregnant") is True:
        lines.append("Hamilelik durumu: Evet.")
    elif compact.get("is_pregnant") is False:
        lines.append("Hamilelik durumu: Hayir.")

    if compact.get("is_breastfeeding") is True:
        lines.append("Emzirme durumu: Evet.")
    elif compact.get("is_breastfeeding") is False:
        lines.append("Emzirme durumu: Hayir.")

    if medications:
        lines.append("Kayitli ilaclar:")
        for item in medications[:10]:
            if isinstance(item, dict):
                lines.append(f"• {_format_medication_line(item)}")
    else:
        lines.append("Kayitli ilac bulunmuyor. Ilaclar sayfasindan yeni ilac ekleyebilirsiniz.")

    active_reminders = [item for item in reminders if isinstance(item, dict) and item.get("is_active", True)]
    lines.append(f"Aktif hatirlatici sayisi: {len(active_reminders)} / toplam {len(reminders)}." if reminders else "Kayitli hatirlatici bulunmuyor.")

    if allergies:
        lines.append("Kayitli alerjiler: " + ", ".join(str(item) for item in allergies) + ".")
    if chronic_diseases:
        lines.append("Kayitli kronik hastaliklar: " + ", ".join(str(item) for item in chronic_diseases) + ".")

    lines.append("Belirli bir ilac hakkinda detayli yorum icin ilac adini yazabilirsiniz. Sistem o ilacin prospektus/KUB/KT bilgilerini arayip profil bilgilerinizle birlikte olumsuz veya dikkat gerektiren noktalar acisindan on degerlendirme yapar.")
    lines.append("Doktorunuza veya eczacinize tekrar danisin.")
    return "\n".join(lines)


def _offline_chat_reply(text: str, context: dict[str, Any] | None, source: str) -> dict[str, Any]:
    risk_level, safety_note = _risk_from_text(text)
    medicines = _medicines_to_search(text, context)
    last = _memory_last_medicine(context)

    if _is_personal_medication_summary_request(text):
        return {
            "reply": _local_medication_summary(context),
            "risk_level": risk_level,
            "safety_note": "Bu ozet sistemdeki kayitlara dayanir; tibbi karar icin doktorunuza veya eczacinize tekrar danisin.",
            "suggested_actions": [APP_ROUTES["medications"], APP_ROUTES["reminders"], APP_ROUTES["ocr"]],
            "source": source,
            "sources": [],
        }

    if medicines or last:
        medicine_label = ", ".join(medicines) if medicines else str(last)
        return {
            "reply": f"{medicine_label} hakkinda yorum istediniz; ancak su anda yapay zeka yaniti tamamlanamadi. Kesin kullanim karari veremem. Profilinizdeki yas, hamilelik/emzirme, alerji, kronik hastalik, mevcut ilac ve olcum bilgilerine gore dikkat gerektirebilecek durumlar icin doktorunuza veya eczacinize tekrar danisin.",
            "risk_level": _max_risk(risk_level, "medium"),
            "safety_note": "Ilac kullanimi icin doktor/eczaci gorusu gerekir.",
            "suggested_actions": [APP_ROUTES["ocr"], APP_ROUTES["medications"], APP_ROUTES["reminders"]],
            "source": source,
            "sources": _memory_sources(context),
        }

    return {
        "reply": "Ilaclar, hatirlaticilar, olcumler, aile profilleri ve ilac fotografi/prospektus analizi konusunda yardimci olabilirim. Ilac disi konulara cevap veremem. Belirli bir ilac adi verirseniz veya sistemde kayitli ilaclariniz varsa prospektus/KUB/KT bilgilerini arayip profil bilgilerinize gore dikkat edilmesi gereken noktalar hakkinda yorum yapabilirim. Doktorunuza veya eczacinize tekrar danisin.",
        "risk_level": risk_level,
        "safety_note": safety_note,
        "suggested_actions": _suggested_actions(text),
        "source": source,
        "sources": [],
    }


def _response_debug_summary(response: Any) -> str:
    status = _get(response, "status", None)
    incomplete = _get(response, "incomplete_details", None)
    reason = _get(incomplete, "reason", None) if incomplete else None
    usage = _get(response, "usage", None)
    output_types = [_get(item, "type", "") for item in _get(response, "output", []) or []]
    return f"status={status}, incomplete_reason={reason}, output_types={output_types}, usage={usage}"


def _create_response_with_continuation(
    client: OpenAI,
    *,
    model: str,
    payload: dict[str, Any],
    continuation_prompt: str,
) -> tuple[str, Any, list[dict[str, str]]]:
    response = client.responses.create(**payload)
    citations = _extract_url_citations(response)
    raw_text = _responses_text(response)
    if raw_text:
        return raw_text, response, citations

    print("[openai] empty response after first call:", _response_debug_summary(response))
    response_id = _get(response, "id", None)

    if response_id:
        continuation_payload: dict[str, Any] = {
            "model": model,
            "previous_response_id": response_id,
            "input": [{"role": "user", "content": [{"type": "input_text", "text": continuation_prompt}]}],
            "max_output_tokens": 5000,
            "text": _text_payload_low(),
        }
        reasoning = _reasoning_payload_for_model(model)
        if reasoning:
            continuation_payload["reasoning"] = reasoning

        continuation = client.responses.create(**continuation_payload)
        continuation_text = _responses_text(continuation)
        continuation_citations = _extract_url_citations(continuation)

        existing_urls = {source.get("url") for source in citations}
        for item in continuation_citations:
            if item.get("url") not in existing_urls:
                citations.append(item)

        if continuation_text:
            return continuation_text, continuation, citations
        print("[openai] empty response after continuation:", _response_debug_summary(continuation))

    retry_payload = dict(payload)
    retry_payload["max_output_tokens"] = 7000
    retry_payload["text"] = _text_payload_low()
    reasoning = _reasoning_payload_for_model(model)
    if reasoning:
        retry_payload["reasoning"] = reasoning

    retry_input = list(retry_payload.get("input", []))
    retry_input.append(
        {
            "role": "user",
            "content": [{"type": "input_text", "text": "Onceki cevap bos kaldi. Arama yaptiysan kaynaklari kullan. Uzun dusunme yapma. Sadece final JSON cevabi uret. Doktorunuza veya eczacinize tekrar danisin ifadesi mutlaka bulunsun."}],
        }
    )
    retry_payload["input"] = retry_input
    retry = client.responses.create(**retry_payload)
    retry_text = _responses_text(retry)
    retry_citations = _extract_url_citations(retry)

    existing_urls = {source.get("url") for source in citations}
    for item in retry_citations:
        if item.get("url") not in existing_urls:
            citations.append(item)

    if retry_text:
        return retry_text, retry, citations

    raise RuntimeError(f"Bos OpenAI cevabi alindi. {_response_debug_summary(retry)}")


def _chat_completion(model: str, api_key: str, user_text: str, context: dict[str, Any] | None) -> dict[str, Any]:
    client = _client(api_key)
    compact_context = _compact_context(context)
    memory_snapshot = _memory_snapshot(context)
    recent_conversation = _recent_conversation_text(context)

    medicines_to_search = _medicines_to_search(user_text, context)
    use_memory_without_search = _should_use_memory_without_search(user_text, context, medicines_to_search)
    use_web_search = bool(medicines_to_search) and _as_bool(OPENAI_WEB_SEARCH_ENABLED) and not use_memory_without_search
    tools = _web_search_tools() if use_web_search else []
    memory_sources = _memory_sources(context)

    system_prompt = f"""
Sen bir akilli ilac takip uygulamasinin guvenli ilac asistanisin.

GOREVIN:
- Ilaclar, prospektus/KUB/KT, hatirlaticilar, olcumler, aile profilleri ve sistem kayitlari hakkinda net konus.
- Profil bilgilerinin tamami dikkate alinir: dogum tarihi, hesaplanan yas, cinsiyet, hamilelik/emzirme, alerji, kronik hastalik, mevcut ilac, olcum, kilo, boy, kan grubu ve diger profil alanlari.
- Dogum tarihi varsa yas HASTA BAGLAMI icindeki age alaninda hesaplanmistir; "yas bilinmiyor" deme.
- Hamilelik veya emzirme bilgisi varsa ilac yorumunda mutlaka kontrol et.
- Web search kullanildiginda kendi genel bellegine degil, bulunan kaynaklara dayan.
- Gercekci risk siniflandirmasi yap: sadece dogrudan ilgili kontrendikasyon, ciddi uyari, etken/yardimci madde alerjisi, hamilelik/emzirme uyarisi veya belirgin hastalik/ilac etkilesimi varsa risk_level'i medium/high yap.
- Genel doz/asiri kullanim uyarilarini ana risk sebebi yapma; routine_notes alanina koy.
- Kesin kullanim onayi verme. Doktorunuza veya eczacinize tekrar danisin ifadesi zorunlu.

{MEDICAL_SAFETY_RULES}

CEVAP FORMATI:
Sadece JSON dondur:
{{
  "reply": "Turkce cevap",
  "risk_level": "low|medium|high",
  "safety_note": "doktor/eczaci danismanizi iceren kisa not",
  "medicine_name": "varsa ilac adi veya coklu_ilac",
  "negative_findings": ["sadece dogrudan ilgili dikkat noktalari"],
  "routine_notes": ["genel doz/asiri kullanim notlari"],
  "evidence_used": ["kullanilan kaynak veya profil bilgisi ozeti"],
  "suggested_action_keys": ["dashboard|medications|reminders|measurements|family|ocr|profile"]
}}

KULLANICI BAGLAMI:
{json.dumps(compact_context, ensure_ascii=False)}

KONUSMA_HAFIZASI:
{json.dumps(memory_snapshot, ensure_ascii=False)}

SON_KONUSMALAR:
{recent_conversation}

ARANACAK_ILACLAR:
{json.dumps(medicines_to_search, ensure_ascii=False)}

WEB_SEARCH_KULLAN:
{"evet" if use_web_search else "hayir"}

ONCEKI_KAYNAKLAR_VAR:
{"evet" if memory_sources else "hayir"}
""".strip()

    user_prompt = f"""
Kullanici mesaji:
{user_text}

Talimat:
- WEB_SEARCH_KULLAN evet ise ARANACAK_ILACLAR listesindeki ilaclari web search ile ara.
- WEB_SEARCH_KULLAN hayir ise onceki konusma, KONUSMA_HAFIZASI ve hasta baglamina dayan.
- Dogum tarihinden hesaplanan yasi kullan; yas bilinmiyor deme.
- Hamilelik/emzirme bilgisi varsa dikkate al.
- Sadece hasta bilgisiyle dogrudan ilgili uyarilari ana dikkat sebebi yap.
- Genel doz/asiri kullanim uyarilarini routine_notes alanina koy.
- Sadece JSON dondur.
""".strip()

    payload: dict[str, Any] = {
        "model": model,
        "input": [
            {"role": "system", "content": [{"type": "input_text", "text": system_prompt}]},
            {"role": "user", "content": [{"type": "input_text", "text": user_prompt}]},
        ],
        "max_output_tokens": 6000,
        "text": _text_payload_low(),
    }

    reasoning = _reasoning_payload_for_model(model)
    if reasoning:
        payload["reasoning"] = reasoning

    if tools:
        payload["tools"] = tools
        payload["tool_choice"] = "auto"
        payload["max_tool_calls"] = min(max(len(medicines_to_search) * 2, 2), 8)
        try:
            payload["include"] = ["web_search_call.action.sources"]
        except Exception:
            pass

    continuation_prompt = f"""
Final cevabi JSON olarak uret.
Dogum tarihinden hesaplanan yasi kullan; yas bilinmiyor deme.
Hamilelik veya emzirme bilgisi varsa dikkate al.
Genel doz/asiri kullanim uyarilarini routine_notes alanina koy.
Doktorunuza veya eczacinize tekrar danisin ifadesi zorunlu.

HASTA_BAGLAMI:
{json.dumps(compact_context, ensure_ascii=False)}
KULLANICI_MESAJI:
{user_text}
""".strip()

    raw_text, response, citations = _create_response_with_continuation(
        client,
        model=model,
        payload=payload,
        continuation_prompt=continuation_prompt,
    )

    if not citations and use_memory_without_search:
        citations = memory_sources

    parsed = _extract_json_block(raw_text)

    default_medicine_name = ""
    if len(medicines_to_search) > 1:
        default_medicine_name = "coklu_ilac"
    elif len(medicines_to_search) == 1:
        default_medicine_name = medicines_to_search[0]
    elif _memory_last_medicine(context):
        default_medicine_name = str(_memory_last_medicine(context))

    if not parsed:
        return {
            "reply": raw_text.strip(),
            "risk_level": _risk_from_text(user_text)[0],
            "safety_note": _risk_from_text(user_text)[1],
            "medicine_name": default_medicine_name,
            "negative_findings": [],
            "routine_notes": [],
            "evidence_used": [],
            "suggested_action_keys": [],
            "sources": citations,
        }

    return {
        "reply": str(parsed.get("reply") or raw_text).strip(),
        "risk_level": parsed.get("risk_level") if parsed.get("risk_level") in RISK_ORDER else _risk_from_text(user_text)[0],
        "safety_note": str(parsed.get("safety_note") or _risk_from_text(user_text)[1]).strip(),
        "medicine_name": str(parsed.get("medicine_name") or default_medicine_name).strip(),
        "negative_findings": parsed.get("negative_findings") if isinstance(parsed.get("negative_findings"), list) else [],
        "routine_notes": parsed.get("routine_notes") if isinstance(parsed.get("routine_notes"), list) else [],
        "evidence_used": parsed.get("evidence_used") if isinstance(parsed.get("evidence_used"), list) else [],
        "suggested_action_keys": parsed.get("suggested_action_keys") if isinstance(parsed.get("suggested_action_keys"), list) else [],
        "sources": citations,
    }


async def generate_chat_reply(text: str, context: dict[str, Any] | None = None) -> dict[str, Any]:
    risk_level, safety_note = _risk_from_text(text)

    guardrail = _guardrail_reply(text, context)
    if guardrail:
        _remember_turn(
            context,
            user_text=text,
            assistant_reply=guardrail.get("reply", ""),
            medicine_name=guardrail.get("medicine_name"),
            sources=guardrail.get("sources", []),
            evidence=[],
        )
        return guardrail

    if not OPENAI_CHAT_API_KEY:
        result = _offline_chat_reply(text, context, "fallback_no_key")
        _remember_turn(
            context,
            user_text=text,
            assistant_reply=result.get("reply", ""),
            medicine_name=result.get("medicine_name"),
            sources=result.get("sources", []),
            evidence=[],
        )
        return result

    try:
        print("[chat] user_text:", text)

        result = await asyncio.to_thread(
            _chat_completion,
            OPENAI_CHAT_MODEL,
            OPENAI_CHAT_API_KEY,
            text,
            context,
        )

        final_risk = _max_risk(risk_level, result.get("risk_level", "low"))
        reply = result["reply"].strip()

        negative_findings = _filter_direct_findings(result.get("negative_findings") or [])
        routine_notes = result.get("routine_notes") or []
        evidence_used = result.get("evidence_used") or []

        if negative_findings:
            reply += "\n\nDikkat edilmesi gerekenler: " + "; ".join(str(item) for item in negative_findings[:6])
        if routine_notes:
            reply += "\n\nGenel kullanim notu: " + "; ".join(str(item) for item in routine_notes[:4])
        if evidence_used:
            reply += "\n\nDayandigim bilgiler: " + "; ".join(str(item) for item in evidence_used[:5])
        if "doktor" not in _normalize_text(reply) and "eczaci" not in _normalize_text(reply) and "eczacı" not in _normalize_text(reply):
            reply += "\n\nDoktorunuza veya eczacinize tekrar danisin."

        final_result = {
            "reply": reply,
            "risk_level": final_risk,
            "safety_note": result.get("safety_note") or safety_note,
            "suggested_actions": _actions_from_keys(result.get("suggested_action_keys"), text),
            "source": "openai_web_search" if result.get("sources") else "openai_memory" if _memory_sources(context) else "openai",
            "sources": result.get("sources", []),
            "medicine_name": result.get("medicine_name"),
        }

        _remember_turn(
            context,
            user_text=text,
            assistant_reply=reply,
            medicine_name=final_result.get("medicine_name"),
            sources=final_result.get("sources", []),
            evidence=[str(item) for item in evidence_used],
        )

        print("[chat] model_reply:", reply)
        return final_result

    except Exception as exc:
        print("[chat] OpenAI error:", repr(exc))
        result = _offline_chat_reply(text, context, "fallback_openai_error")
        _remember_turn(
            context,
            user_text=text,
            assistant_reply=result.get("reply", ""),
            medicine_name=result.get("medicine_name"),
            sources=result.get("sources", []),
            evidence=[],
        )
        return result


def _normalize_confidence(value: Any) -> str:
    value = str(value or "").lower()
    return value if value in {"high", "medium", "low"} else "low"


def _as_string_list(value: Any) -> list[str]:
    if isinstance(value, list):
        return [str(item).strip() for item in value if str(item).strip()]
    if isinstance(value, str) and value.strip():
        return [value.strip()]
    return []


def _mandatory_vision_warnings(warnings: list[str]) -> list[str]:
    required = [
        "Bu analiz kesin kullanim karari degildir.",
        "Ilac baslama, birakma veya doz degistirme icin doktor/eczaci gorusu alin.",
    ]
    result = list(warnings)
    for item in required:
        if item not in result:
            result.append(item)
    return result[:10]


def _match_existing_medications(detected_name: str, patient_context: dict[str, Any]) -> list[str]:
    detected = _normalize_text(detected_name)
    if not detected or detected == "bilinmiyor":
        return []
    matches = []
    for name in _medication_names_from_context(patient_context):
        lowered = _normalize_text(name)
        if lowered and (lowered in detected or detected in lowered):
            matches.append(name)
    return matches[:5]


def _has_any_evidence(image_bytes: bytes | None, extracted_text: str | None) -> bool:
    return bool(image_bytes) or bool((extracted_text or "").strip())


def _vision_completion(
    model: str,
    api_key: str,
    image_bytes: bytes | None,
    mime_type: str | None,
    extracted_text: str | None,
    patient_context: dict[str, Any],
) -> dict[str, Any]:
    client = _client(api_key)
    compact_context = _compact_context(patient_context)

    prompt = f"""
Bir ilac kutusu, blister, prospektus veya ilac fotografi analiz ediyorsun.

ANA ILKE:
- Gorselden ilac adini tespit etmeye calis.
- Ilac adi tespit edilirse web search ile prospektus/KUB/KT/kullanma talimati bilgilerini ara.
- Profil bilgilerinin tamami dikkate alinir: dogum tarihi, hesaplanan yas, cinsiyet, hamilelik/emzirme, alerji, kronik hastalik, mevcut ilac, olcum, kilo, boy, kan grubu ve diger profil alanlari.
- Dogum tarihi varsa yas HASTA BAGLAMI icindeki age alanindan kullan; "yas bilinmiyor" deme.
- Hamilelik veya emzirme bilgisi varsa ilac yorumunda mutlaka kontrol et.
- Sadece dogrudan ilgili kontrendikasyon, ciddi uyari, etken/yardimci madde alerjisi, hamilelik/emzirme uyarisi veya belirgin hastalik/ilac etkilesimi varsa "caution" veya "avoid" de.
- Patlican alerjisi, kaynaklarda ilacin etken maddesi/yardimci maddesi ile dogrudan iliskili degilse bunu risk sebebi yapma.
- Hipertansiyon kaynaklarda bu ilac icin dogrudan uyari/kontrendikasyon degilse hipertansiyonu risk sebebi yapma.
- "Yuksek dozda sorun olabilir", "onerilen doz asilmamali", "uzun sure doktora danismadan kullanilmaz" gibi genel uyarilari ana uygunluk degerlendirmesine alma; bunlari routine_notes alanina koy.
- Kisiye ozel doz plani verme.
- "Kullanabilir" yerine "kaynak ve kayitli bilgilere gore belirgin uyumsuzluk sinyali gorunmuyor ama doktor/eczaci onayi gerekir" de.
- "Kullanamaz" yerine yalnizca dogrudan uyumsuzluk varsa "uygun gorunmuyor/dikkat gerektiriyor, doktor/eczaci gorusu olmadan kullanilmamali" de.

{MEDICAL_SAFETY_RULES}

HASTA BAGLAMI:
{json.dumps(compact_context, ensure_ascii=False)}

KULLANICININ EKLEDIGI METIN:
{extracted_text or ""}

Sadece JSON dondur:
{{
  "detected_medicine_name": "string",
  "active_ingredients": ["string"],
  "usage_area": "string",
  "prospectus_usage_summary": "string",
  "evidence_summary": ["string"],
  "negative_findings": ["sadece hasta icin dogrudan ilgili olumsuz/dikkat gerektiren noktalar"],
  "routine_notes": ["genel doz/asiri kullanim/uzun sure kullanma gibi ana risk olmayan notlar"],
  "warnings": ["string"],
  "confidence": "high|medium|low",
  "patient_assessment": "string",
  "suitability": "appropriate|caution|avoid|unknown",
  "reasons": ["string"],
  "missing_evidence": ["string"]
}}
""".strip()

    content: list[dict[str, Any]] = [{"type": "input_text", "text": prompt}]
    if image_bytes:
        data_url = f'data:{mime_type or "image/jpeg"};base64,' + base64.b64encode(image_bytes).decode("utf-8")
        content.append({"type": "input_image", "image_url": data_url})

    payload: dict[str, Any] = {
        "model": model,
        "input": [{"role": "user", "content": content}],
        "max_output_tokens": 7000,
        "text": _text_payload_low(),
    }

    reasoning = _reasoning_payload_for_model(model)
    if reasoning:
        payload["reasoning"] = reasoning

    tools = _web_search_tools()
    if tools:
        payload["tools"] = tools
        payload["tool_choice"] = "auto"
        payload["max_tool_calls"] = 4
        try:
            payload["include"] = ["web_search_call.action.sources"]
        except Exception:
            pass

    continuation_prompt = """
Az onceki gorsel ve web arama sonucunu kullanarak final JSON cevabi uret.
Dogum tarihinden hesaplanan yasi kullan; yas bilinmiyor deme.
Hamilelik veya emzirme bilgisi varsa dikkate al.
Dogrudan hasta bilgisiyle iliskili risk yoksa suitability=appropriate kullan.
Genel doz/asiri kullanim uyarilarini routine_notes alanina koy.
Doktorunuza veya eczacinize tekrar danisin ifadesi mutlaka bulunmali.
""".strip()

    raw_text, response, citations = _create_response_with_continuation(
        client,
        model=model,
        payload=payload,
        continuation_prompt=continuation_prompt,
    )
    return {"text": raw_text, "sources": citations}


async def analyze_medication_image(
    *,
    image_bytes: bytes | None,
    mime_type: str | None,
    extracted_text: str | None,
    patient_context: dict[str, Any],
) -> dict[str, Any]:
    compact_context = _compact_context(patient_context)

    base_result = {
        "detected_medicine_name": "Bilinmiyor",
        "active_ingredients": [],
        "usage_area": "Net tespit edilemedi",
        "prospectus_usage_summary": "Kaynak/prospektus bilgisi net tespit edilemedi.",
        "evidence_summary": [],
        "negative_findings": [],
        "routine_notes": [],
        "warnings": _mandatory_vision_warnings([]),
        "confidence": "low",
        "raw_analysis": extracted_text or "",
        "patient_assessment": "Hasta baglamina gore net yorum olusturulamadi. Doktorunuza veya eczacinize tekrar danisin.",
        "suitability": "unknown",
        "reasons": ["Yeterli kanit yok veya yapay zeka servisine ulasilamadi."],
        "missing_evidence": ["Ilac adi veya kaynak bilgisi net tespit edilemedi."],
        "matched_existing_medications": [],
        "sources": [],
        "patient_context_used": compact_context,
    }

    if not _has_any_evidence(image_bytes, extracted_text):
        base_result["patient_assessment"] = "Analiz yapabilmem icin ilac kutusu/prospektus fotografi veya ilac adi/metni gereklidir. Doktorunuza veya eczacinize tekrar danisin."
        return base_result

    if not OPENAI_VISION_API_KEY:
        base_result["patient_assessment"] = "Yapay zeka gorsel analizi etkin degil. OpenAI vision anahtari olmadan prospektus aramasi yapilamadi. Doktorunuza veya eczacinize tekrar danisin."
        return base_result

    try:
        completion = await asyncio.to_thread(
            _vision_completion,
            OPENAI_VISION_MODEL,
            OPENAI_VISION_API_KEY,
            image_bytes,
            mime_type,
            extracted_text,
            patient_context,
        )

        raw_text = completion["text"]
        sources = completion.get("sources", [])
        parsed = _extract_json_block(raw_text) or {}

        detected_name = str(parsed.get("detected_medicine_name") or base_result["detected_medicine_name"]).strip()
        active_ingredients = _as_string_list(parsed.get("active_ingredients"))
        warnings = _mandatory_vision_warnings(_as_string_list(parsed.get("warnings")))
        evidence_summary = _as_string_list(parsed.get("evidence_summary"))
        raw_negative_findings = _as_string_list(parsed.get("negative_findings"))
        negative_findings = _filter_direct_findings(raw_negative_findings)
        routine_notes = _as_string_list(parsed.get("routine_notes"))
        reasons = _as_string_list(parsed.get("reasons")) or base_result["reasons"]
        missing_evidence = _as_string_list(parsed.get("missing_evidence"))

        for item in raw_negative_findings:
            text = _normalize_text(item)
            if any(marker in text for marker in ROUTINE_WARNING_MARKERS) and item not in routine_notes:
                routine_notes.append(item)

        suitability = _calibrate_suitability(
            str(parsed.get("suitability") or "unknown"),
            negative_findings,
            reasons,
        )

        patient_assessment = str(parsed.get("patient_assessment") or base_result["patient_assessment"]).strip()

        if suitability == "appropriate" and not negative_findings:
            age_part = f" Yas bilginiz {compact_context.get('age')} olarak degerlendirildi." if compact_context.get("age") is not None else ""
            pregnancy_part = ""
            if compact_context.get("is_pregnant") is True:
                pregnancy_part = " Hamilelik bilginiz kayitli oldugu icin gebelik uyarilari ayrica dikkate alinmalidir."
            elif compact_context.get("is_breastfeeding") is True:
                pregnancy_part = " Emzirme bilginiz kayitli oldugu icin emzirme uyarilari ayrica dikkate alinmalidir."

            patient_assessment = (
                f"{detected_name} icin kaynaklarda ve kayitli hasta bilgilerinizde dogrudan bir uyumsuzluk sinyali "
                f"tespit edemedim.{age_part}{pregnancy_part} Bu, kesin kullanim onayi degildir. "
                + patient_assessment
            )

        if "doktor" not in _normalize_text(patient_assessment) and "eczaci" not in _normalize_text(patient_assessment) and "eczacı" not in _normalize_text(patient_assessment):
            patient_assessment += " Doktorunuza veya eczacinize tekrar danisin."

        result = {
            "detected_medicine_name": detected_name,
            "active_ingredients": active_ingredients,
            "usage_area": str(parsed.get("usage_area") or base_result["usage_area"]).strip(),
            "prospectus_usage_summary": str(parsed.get("prospectus_usage_summary") or base_result["prospectus_usage_summary"]).strip(),
            "evidence_summary": evidence_summary,
            "negative_findings": negative_findings,
            "routine_notes": routine_notes[:6],
            "warnings": warnings,
            "confidence": _normalize_confidence(parsed.get("confidence")),
            "raw_analysis": raw_text.strip(),
            "patient_assessment": patient_assessment,
            "suitability": suitability,
            "reasons": reasons,
            "missing_evidence": missing_evidence,
            "matched_existing_medications": _match_existing_medications(detected_name, patient_context),
            "sources": sources,
            "patient_context_used": compact_context,
        }

        if result["suitability"] == "appropriate":
            result["warnings"] = _mandatory_vision_warnings(
                result["warnings"] + ["Belirgin risk tespit edilmemesi, ilacin kesin uygun oldugu anlamina gelmez."]
            )

        return result

    except Exception as exc:
        print("[vision] OpenAI error:", repr(exc))
        return base_result
