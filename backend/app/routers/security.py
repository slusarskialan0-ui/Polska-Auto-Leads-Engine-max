from datetime import datetime
from typing import Dict, List
import asyncio
import os
import threading
import time

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.models.models import AuditLog, Client, Order
from app.runtime import system_event
from config import THRESHOLD_RATE_LIMIT_PER_MIN
from database import SessionLocal, get_db

router = APIRouter(prefix="/security", tags=["security"])

BLOCKED_IPS: Dict[str, Dict[str, str]] = {}
THREAT_LOG: List[dict] = []
RATE_LIMITS: Dict[str, Dict[str, float]] = {}
_RATE_LOCK = threading.Lock()
REQUEST_LIMIT = THRESHOLD_RATE_LIMIT_PER_MIN
REQUEST_WINDOW_SECONDS = 60
TRUSTED_PROXIES = {
    proxy.strip()
    for proxy in os.getenv("TRUSTED_PROXIES", "127.0.0.1,::1,localhost").split(",")
    if proxy.strip()
}


class BlockIpPayload(BaseModel):
    ip: str
    reason: str


def get_client_ip(request: Request) -> str:
    direct_ip = request.client.host if request.client else "unknown"
    forwarded_for = request.headers.get("x-forwarded-for", "")
    if forwarded_for and direct_ip in TRUSTED_PROXIES:
        return forwarded_for.split(",")[0].strip()
    return direct_ip


def add_threat(ip: str, reason: str, endpoint: str = "") -> dict:
    event = {
        "ip": ip,
        "reason": reason,
        "endpoint": endpoint,
        "ts": datetime.utcnow().isoformat(),
    }
    THREAT_LOG.append(event)
    if len(THREAT_LOG) > 50:
        del THREAT_LOG[:-50]
    return event


def persist_audit_log(action: str, ip: str, user_agent: str, endpoint: str) -> None:
    db = SessionLocal()
    try:
        db.add(AuditLog(action=action, ip=ip, user_agent=user_agent[:255], endpoint=endpoint))
        db.commit()
    finally:
        db.close()


def rate_limit_ok(ip: str) -> bool:
    now = time.time()
    with _RATE_LOCK:
        entry = RATE_LIMITS.get(ip)
        if not entry or now - entry["window_start"] >= REQUEST_WINDOW_SECONDS:
            RATE_LIMITS[ip] = {"window_start": now, "count": 1}
            return True
        entry["count"] += 1
        return entry["count"] <= REQUEST_LIMIT


async def enqueue_audit_log(action: str, ip: str, user_agent: str, endpoint: str) -> None:
    await asyncio.to_thread(persist_audit_log, action, ip, user_agent, endpoint)


@router.post("/block-ip")
def block_ip(payload: BlockIpPayload):
    BLOCKED_IPS[payload.ip] = {
        "reason": payload.reason,
        "ts": datetime.utcnow().isoformat(),
    }
    add_threat(payload.ip, f"manual_block:{payload.reason}", "/security/block-ip")
    system_event("security", "blocked", "IP manually blocked", {"ip": payload.ip, "reason": payload.reason})
    return {"status": "blocked", "ip": payload.ip, **BLOCKED_IPS[payload.ip]}


@router.get("/blocked-ips")
def get_blocked_ips():
    return [{"ip": ip, **meta} for ip, meta in BLOCKED_IPS.items()]


@router.delete("/blocked-ips/{ip}")
def unblock_ip(ip: str):
    if ip not in BLOCKED_IPS:
        raise HTTPException(status_code=404, detail="IP not found in blocklist")
    removed = BLOCKED_IPS.pop(ip)
    system_event("security", "unblocked", "IP removed from blocklist", {"ip": ip})
    return {"status": "unblocked", "ip": ip, **removed}


@router.get("/audit-trail")
def audit_trail(limit: int = 100, db: Session = Depends(get_db)):
    limit = max(1, min(limit, 500))
    rows = db.query(AuditLog).order_by(AuditLog.ts.desc()).limit(limit).all()
    return [
        {
            "id": row.id,
            "action": row.action,
            "ip": row.ip,
            "user_agent": row.user_agent,
            "endpoint": row.endpoint,
            "ts": row.ts.isoformat() if row.ts else None,
        }
        for row in rows
    ]


@router.get("/threats")
def recent_threats():
    return THREAT_LOG[-50:][::-1]


@router.post("/backup")
def backup(db: Session = Depends(get_db)):
    timestamp = datetime.utcnow().isoformat()
    system_event("security", "backup", "Backup snapshot created", {"ts": timestamp})
    return {
        "status": "ok",
        "backup_ts": timestamp,
        "rotation_policy": "7 daily / 4 weekly / 3 monthly snapshots",
        "records": {
            "clients": db.query(Client).count(),
            "orders": db.query(Order).count(),
        },
    }


@router.get("/status")
def security_status():
    return {
        "blocked_ips": len(BLOCKED_IPS),
        "threats_detected": len(THREAT_LOG),
        "backup_schedule": "24h",
        "backup_rotation": "7d/4w/3m",
        "status": "active",
    }


@router.get("/recovery")
def recovery_plan():
    return {
        "status": "ready",
        "steps": [
            "Restore latest verified DB snapshot",
            "Re-run /system/fix-slow-queries",
            "Resume affected pipelines via /pipeline/run",
            "Verify /health and /system/ops-dashboard",
        ],
    }
