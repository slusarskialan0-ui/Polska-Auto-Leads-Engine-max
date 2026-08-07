from collections import Counter
from datetime import datetime
import uuid

from fastapi import APIRouter, Request

from app.runtime import resolve_project_id, system_event
from config import DEFAULT_PROJECT_ID, PROJECT_ID_HEADER

router = APIRouter(prefix="/dev", tags=["developer"])

api_keys: dict[str, dict[str, dict]] = {}
api_request_log: list[dict] = []


def _ensure_project_key(project_id: str) -> None:
    project_keys = api_keys.setdefault(project_id, {})
    if not any(meta.get("status") == "active" for meta in project_keys.values()):
        raw_key = str(uuid.uuid4())
        project_keys[raw_key] = {
            "status": "active",
            "created_at": datetime.utcnow().isoformat(),
        }


_ensure_project_key(DEFAULT_PROJECT_ID)


def record_api_request(endpoint: str, response_ms: float, project_id: str = DEFAULT_PROJECT_ID, status_code: int | None = None) -> None:
    api_request_log.append(
        {
            "endpoint": endpoint,
            "project_id": project_id,
            "response_ms": round(float(response_ms), 2),
            "status_code": status_code,
            "ts": datetime.utcnow().isoformat(),
        }
    )
    if len(api_request_log) > 5000:
        del api_request_log[:-5000]


def _today_prefix() -> str:
    return datetime.utcnow().strftime("%Y-%m-%d")


def _active_plan(entry_count: int) -> str:
    return "Starter" if entry_count < 300 else "Pro" if entry_count < 3000 else "Enterprise"


def _mask_key(raw_key: str) -> str:
    return f"{raw_key[:6]}...{raw_key[-4:]}"


def _project_id(request: Request, project_id: str | None = None) -> str:
    return resolve_project_id(project_id, request.headers.get(PROJECT_ID_HEADER))


@router.get("/analytics")
def dev_analytics(request: Request, project_id: str | None = None):
    scoped_project_id = _project_id(request, project_id)
    today = _today_prefix()
    entries = [entry for entry in api_request_log if entry["project_id"] == scoped_project_id]
    top_endpoints = Counter(entry["endpoint"] for entry in entries).most_common(5)
    avg_response_ms = round(sum(entry["response_ms"] for entry in entries) / len(entries), 2) if entries else 45
    error_rate_pct = round((sum(1 for entry in entries if (entry.get("status_code") or 200) >= 400) / len(entries)) * 100, 2) if entries else 0.0
    return {
        "project_id": scoped_project_id,
        "total_requests": len(entries),
        "requests_today": sum(1 for entry in entries if entry["ts"].startswith(today)),
        "top_endpoints": [{"endpoint": endpoint, "count": count} for endpoint, count in top_endpoints],
        "avg_response_ms": avg_response_ms,
        "error_rate_pct": error_rate_pct,
        "last_requests": entries[-5:],
    }


@router.get("/limits")
def dev_limits(request: Request, project_id: str | None = None):
    scoped_project_id = _project_id(request, project_id)
    entries = [entry for entry in api_request_log if entry["project_id"] == scoped_project_id]
    today_usage = sum(1 for entry in entries if entry["ts"].startswith(_today_prefix()))
    tier = _active_plan(today_usage)
    per_day = 1000 if tier == "Starter" else 10000 if tier == "Pro" else 50000
    per_min = 30 if tier == "Starter" else 100 if tier == "Pro" else 500
    return {
        "project_id": scoped_project_id,
        "tier": tier,
        "requests_per_min": per_min,
        "requests_per_day": per_day,
        "current_usage": today_usage,
    }


@router.get("/sandbox")
def sandbox(request: Request, project_id: str | None = None):
    scoped_project_id = _project_id(request, project_id)
    return {
        "project_id": scoped_project_id,
        "status": "active",
        "base_url": "/dev/sandbox/api",
        "note": "Test environment — data resets daily within project scope",
    }


@router.post("/keys/rotate")
def rotate_keys(request: Request, project_id: str | None = None):
    scoped_project_id = _project_id(request, project_id)
    _ensure_project_key(scoped_project_id)
    project_keys = api_keys[scoped_project_id]
    for key_meta in project_keys.values():
        if key_meta["status"] == "active":
            key_meta["status"] = "revoked"
            key_meta["revoked_at"] = datetime.utcnow().isoformat()
    new_key = str(uuid.uuid4())
    project_keys[new_key] = {"status": "active", "created_at": datetime.utcnow().isoformat()}
    system_event("developer", "rotated", "API key rotated", {"project_id": scoped_project_id})
    return {"status": "ok", "project_id": scoped_project_id, "new_key": new_key}


@router.get("/keys")
def list_keys(request: Request, project_id: str | None = None):
    scoped_project_id = _project_id(request, project_id)
    _ensure_project_key(scoped_project_id)
    return {
        "project_id": scoped_project_id,
        "keys": [
            {
                "key": _mask_key(key),
                "status": meta["status"],
                "created_at": meta["created_at"],
            }
            for key, meta in api_keys[scoped_project_id].items()
            if meta["status"] == "active"
        ],
    }


@router.get("/docs-url")
def docs_url():
    return {"swagger": "/docs", "redoc": "/redoc", "openapi": "/openapi.json", "markdown": "/API.md"}


@router.get("/project")
def project_config(request: Request, project_id: str | None = None):
    scoped_project_id = _project_id(request, project_id)
    _ensure_project_key(scoped_project_id)
    return {
        "project_id": scoped_project_id,
        "project_id_header": PROJECT_ID_HEADER,
        "keys_active": sum(1 for meta in api_keys[scoped_project_id].values() if meta["status"] == "active"),
    }
