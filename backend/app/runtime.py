from __future__ import annotations

import re
import time
from collections import deque
from datetime import datetime
from typing import Any

from config import (
    APP_ENV,
    CACHE_TTL_SECONDS,
    DEFAULT_PROJECT_ID,
    PROJECT_ID_HEADER,
    THRESHOLD_CACHE_TARGET_PCT,
    THRESHOLD_PIPELINE_STALL_SECONDS,
    THRESHOLD_RATE_LIMIT_PER_MIN,
    THRESHOLD_SLOW_QUERY_MS,
)

_CACHE: dict[str, tuple[Any, float]] = {}
SYSTEM_EVENTS: deque[dict[str, Any]] = deque(maxlen=250)
STARTED_AT = time.time()
_PROJECT_ID_RE = re.compile(r"[^a-zA-Z0-9._-]+")
AUTO_THRESHOLDS = {
    "pipeline_stall_seconds": THRESHOLD_PIPELINE_STALL_SECONDS,
    "slow_query_ms": THRESHOLD_SLOW_QUERY_MS,
    "rate_limit_per_minute": THRESHOLD_RATE_LIMIT_PER_MIN,
    "cache_target_hit_rate_pct": THRESHOLD_CACHE_TARGET_PCT,
}


def cache_get(key: str):
    entry = _CACHE.get(key)
    if entry and entry[1] > time.time():
        return entry[0]
    if entry:
        _CACHE.pop(key, None)
    return None


def cache_set(key: str, value: Any, ttl: int = CACHE_TTL_SECONDS):
    _CACHE[key] = (value, time.time() + ttl)
    return value


def cache_invalidate_prefix(prefix: str) -> None:
    for key in list(_CACHE.keys()):
        if key.startswith(prefix):
            _CACHE.pop(key, None)


def invalidate_project_caches(project_id: str) -> None:
    for prefix in ("metrics", "stats", "analytics", "biznes"):
        cache_invalidate_prefix(f"{prefix}:{project_id}")


def resolve_project_id(explicit: str | None = None, header_value: str | None = None) -> str:
    raw_value = explicit or header_value or DEFAULT_PROJECT_ID
    normalized = _PROJECT_ID_RE.sub("-", raw_value.strip())[:64].strip("-._")
    return normalized or DEFAULT_PROJECT_ID


def system_event(component: str, status: str, message: str, metadata: dict[str, Any] | None = None) -> dict[str, Any]:
    event = {
        "component": component,
        "status": status,
        "message": message,
        "metadata": metadata or {},
        "environment": APP_ENV,
        "ts": datetime.utcnow().isoformat(),
    }
    SYSTEM_EVENTS.appendleft(event)
    return event


def recent_events(limit: int = 50, component: str | None = None) -> list[dict[str, Any]]:
    items = list(SYSTEM_EVENTS)
    if component:
        items = [item for item in items if item["component"] == component]
    return items[: max(1, min(limit, 200))]


def runtime_snapshot() -> dict[str, Any]:
    uptime_seconds = int(time.time() - STARTED_AT)
    return {
        "environment": APP_ENV,
        "started_at": datetime.utcfromtimestamp(STARTED_AT).isoformat(),
        "uptime_seconds": uptime_seconds,
        "cache_entries": len(_CACHE),
        "thresholds": AUTO_THRESHOLDS,
        "project_id_header": PROJECT_ID_HEADER,
        "default_project_id": DEFAULT_PROJECT_ID,
    }
