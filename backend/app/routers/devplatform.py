from datetime import datetime
from collections import Counter
import uuid

from fastapi import APIRouter

router = APIRouter(prefix="/dev", tags=["developer"])

api_keys = {
    str(uuid.uuid4()): {"status": "active", "created_at": datetime.utcnow().isoformat()}
}
api_request_log = []


def record_api_request(endpoint: str, response_ms: float) -> None:
    api_request_log.append(
        {
            "endpoint": endpoint,
            "response_ms": round(float(response_ms), 2),
            "ts": datetime.utcnow().isoformat(),
        }
    )
    if len(api_request_log) > 5000:
        del api_request_log[:-5000]


def _today_prefix() -> str:
    return datetime.utcnow().strftime("%Y-%m-%d")


def _active_plan() -> str:
    return "Pro"


def _mask_key(raw_key: str) -> str:
    return f"{raw_key[:6]}...{raw_key[-4:]}"


@router.get("/analytics")
def dev_analytics():
    today = _today_prefix()
    top_endpoints = Counter(entry["endpoint"] for entry in api_request_log).most_common(5)
    avg_response_ms = round(
        sum(entry["response_ms"] for entry in api_request_log) / len(api_request_log), 2
    ) if api_request_log else 45
    return {
        "total_requests": len(api_request_log),
        "requests_today": sum(1 for entry in api_request_log if entry["ts"].startswith(today)),
        "top_endpoints": [{"endpoint": endpoint, "count": count} for endpoint, count in top_endpoints],
        "avg_response_ms": avg_response_ms,
    }


@router.get("/limits")
def dev_limits():
    today_usage = sum(1 for entry in api_request_log if entry["ts"].startswith(_today_prefix()))
    return {
        "tier": _active_plan(),
        "requests_per_min": 100,
        "requests_per_day": 10000,
        "current_usage": today_usage,
    }


@router.get("/sandbox")
def sandbox():
    return {
        "status": "active",
        "base_url": "/dev/sandbox/api",
        "note": "Test environment — data resets daily",
    }


@router.post("/keys/rotate")
def rotate_keys():
    for key_meta in api_keys.values():
        if key_meta["status"] == "active":
            key_meta["status"] = "revoked"
            key_meta["revoked_at"] = datetime.utcnow().isoformat()
    new_key = str(uuid.uuid4())
    api_keys[new_key] = {"status": "active", "created_at": datetime.utcnow().isoformat()}
    return {"status": "ok", "new_key": new_key}


@router.get("/keys")
def list_keys():
    return {
        "keys": [
            {
                "key": _mask_key(key),
                "status": meta["status"],
                "created_at": meta["created_at"],
            }
            for key, meta in api_keys.items()
            if meta["status"] == "active"
        ]
    }


@router.get("/docs-url")
def docs_url():
    return {"swagger": "/docs", "redoc": "/redoc", "openapi": "/openapi.json"}
