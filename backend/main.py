"""Main FastAPI application entry point."""
import asyncio
import sys
import os
import time
from datetime import datetime, timezone
from contextlib import asynccontextmanager

sys.path.insert(0, os.path.dirname(__file__))

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from database import engine, Base, SessionLocal
from sqlalchemy.orm import Session
from app.models.models import Industry, VoivodeshipStatus
from app.data.geography import DEFAULT_INDUSTRIES, VOIVODESHIPS
from app.routers import (
    analytics,
    biznes,
    clients,
    devplatform,
    industries,
    orders,
    pipeline,
    security,
    stats,
    system,
    voivodeships,
)
from config import API_HOST, API_PORT, CORS_ORIGINS, APP_VERSION

# Simple in-process cache store (key -> (value, expires_at))
_cache: dict = {}


def cache_get(key: str):
    entry = _cache.get(key)
    if entry and entry[1] > time.time():
        return entry[0]
    return None


def cache_set(key: str, value, ttl: int = 30):
    _cache[key] = (value, time.time() + ttl)


def init_db():
    Base.metadata.create_all(bind=engine)
    db: Session = SessionLocal()
    try:
        # SQLite migration: add new columns if they don't exist yet
        from sqlalchemy import text, inspect
        insp = inspect(engine)
        vs_cols = [c["name"] for c in insp.get_columns("voivodeship_statuses")]
        if "error_message" not in vs_cols:
            with engine.connect() as conn:
                conn.execute(text("ALTER TABLE voivodeship_statuses ADD COLUMN error_message TEXT DEFAULT ''"))
                conn.commit()
        client_cols = [c["name"] for c in insp.get_columns("clients")]
        if "project_id" not in client_cols:
            with engine.connect() as conn:
                conn.execute(text("ALTER TABLE clients ADD COLUMN project_id VARCHAR DEFAULT 'default'"))
                conn.commit()
        order_cols = [c["name"] for c in insp.get_columns("orders")]
        if "project_id" not in order_cols:
            with engine.connect() as conn:
                conn.execute(text("ALTER TABLE orders ADD COLUMN project_id VARCHAR DEFAULT 'default'"))
                conn.commit()

        for ind_data in DEFAULT_INDUSTRIES:
            if not db.query(Industry).filter_by(name=ind_data["name"]).first():
                db.add(Industry(**ind_data))
        for v in VOIVODESHIPS:
            if not db.query(VoivodeshipStatus).filter_by(voivodeship=v).first():
                db.add(VoivodeshipStatus(voivodeship=v))
        db.commit()
    finally:
        db.close()


@asynccontextmanager
async def lifespan(application):
    init_db()
    yield


app = FastAPI(
    title="Polska Auto Leads Engine",
    description="Automatyczny system pozyskiwania klientów dla całej Polski — SaaS + mobile + PWA + developer platform.",
    version=APP_VERSION,
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS or ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Background task references kept to prevent GC
_bg_tasks: set = set()


def _fire_and_forget(coro):
    """Schedule a coroutine and hold a reference to prevent garbage collection."""
    task = asyncio.create_task(coro)
    _bg_tasks.add(task)
    task.add_done_callback(_bg_tasks.discard)


@app.middleware("http")
async def security_middleware(request: Request, call_next):
    start = time.perf_counter()
    ip = security.get_client_ip(request)
    endpoint = request.url.path
    user_agent = request.headers.get("user-agent", "")

    if ip in security.BLOCKED_IPS:
        security.add_threat(ip, f"blocked_ip:{security.BLOCKED_IPS[ip]['reason']}", endpoint)
        _fire_and_forget(security.enqueue_audit_log("BLOCKED_IP", ip, user_agent, endpoint))
        devplatform.record_api_request(endpoint, 0)
        return JSONResponse(status_code=403, content={"detail": "IP blocked"})

    if not security.rate_limit_ok(ip):
        security.add_threat(ip, "rate_limit_exceeded", endpoint)
        _fire_and_forget(security.enqueue_audit_log("RATE_LIMITED", ip, user_agent, endpoint))
        devplatform.record_api_request(endpoint, 0)
        return JSONResponse(status_code=429, content={"detail": "Rate limit exceeded"})

    try:
        response = await call_next(request)
    except Exception:
        _fire_and_forget(security.enqueue_audit_log("ERROR_500", ip, user_agent, endpoint))
        devplatform.record_api_request(endpoint, (time.perf_counter() - start) * 1000)
        raise

    action = f"{request.method} {response.status_code}"
    _fire_and_forget(security.enqueue_audit_log(action, ip, user_agent, endpoint))
    devplatform.record_api_request(endpoint, (time.perf_counter() - start) * 1000)
    return response


app.include_router(clients.router)
app.include_router(orders.router)
app.include_router(voivodeships.router)
app.include_router(industries.router)
app.include_router(pipeline.router)
app.include_router(stats.router)
app.include_router(security.router)
app.include_router(analytics.router)
app.include_router(biznes.router)
app.include_router(devplatform.router)
app.include_router(system.router)


@app.get("/", tags=["system"])
def root():
    return {
        "message": "Polska Auto Leads Engine API",
        "version": APP_VERSION,
        "docs": "/docs",
        "health": "/health",
        "metrics": "/metrics",
    }


@app.get("/health", tags=["system"])
def health():
    db_status = "ok"
    db_error = None
    try:
        with engine.connect() as conn:
            conn.exec_driver_sql("SELECT 1")
    except Exception as exc:
        db_status = "error"
        db_error = str(exc)

    payload = {
        "status": "ok" if db_status == "ok" else "degraded",
        "version": APP_VERSION,
        "ts": int(time.time()),
        "time_utc": datetime.now(timezone.utc).isoformat(),
        "db": db_status,
        "error": "database check failed" if db_error else None,
    }
    status_code = 200 if db_status == "ok" else 503
    return JSONResponse(status_code=status_code, content=payload)


@app.get("/version", tags=["system"])
def version():
    return {"version": APP_VERSION, "api": "v1"}


@app.get("/metrics", tags=["system"])
def metrics():
    """Pipeline effectiveness metrics."""
    from sqlalchemy.orm import Session
    from app.models.models import Client, Order, AcquisitionLog
    db: Session = SessionLocal()
    try:
        total_clients = db.query(Client).count()
        total_orders = db.query(Order).count()
        total_logs = db.query(AcquisitionLog).count()
        from sqlalchemy import func
        agg = db.query(
            func.sum(AcquisitionLog.found),
            func.sum(AcquisitionLog.accepted),
            func.sum(AcquisitionLog.rejected),
        ).first()
        total_found = int(agg[0] or 0)
        total_accepted = int(agg[1] or 0)
        total_rejected = int(agg[2] or 0)
        acceptance_rate = round(total_accepted / total_found * 100, 1) if total_found else 0
        return {
            "total_clients": total_clients,
            "total_orders": total_orders,
            "pipeline_runs": total_logs,
            "pipeline_found": total_found,
            "pipeline_accepted": total_accepted,
            "pipeline_rejected": total_rejected,
            "acceptance_rate_pct": acceptance_rate,
        }
    finally:
        db.close()


@app.get("/api-config", tags=["system"])
def api_config(request: Request):
    """Returns the API URL — used by frontend AUTO-CONNECT."""
    host = request.headers.get("x-forwarded-host") or request.headers.get("host") or f"localhost:{API_PORT}"
    scheme = request.headers.get("x-forwarded-proto", "http")
    return {"api_url": f"{scheme}://{host}", "version": APP_VERSION}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host=API_HOST, port=API_PORT, reload=False)
