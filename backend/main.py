"""Main FastAPI application entry point."""
import asyncio
import os
import sys
import time
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy import inspect, text
from sqlalchemy.orm import Session

sys.path.insert(0, os.path.dirname(__file__))

from app.data.geography import DEFAULT_INDUSTRIES, VOIVODESHIPS
from app.models.models import Industry, VoivodeshipStatus
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
from app.runtime import cache_get, cache_set, resolve_project_id, system_event
from config import API_HOST, API_PORT, APP_ENV, APP_VERSION, CORS_ORIGINS, PROJECT_ID_HEADER
from database import Base, SessionLocal, engine


def init_db():
    Base.metadata.create_all(bind=engine)
    db: Session = SessionLocal()
    try:
        insp = inspect(engine)
        table_columns = {
            table_name: [column["name"] for column in insp.get_columns(table_name)]
            for table_name in insp.get_table_names()
        }
        migrations = {
            "voivodeship_statuses": {
                "error_message": "ALTER TABLE voivodeship_statuses ADD COLUMN error_message TEXT DEFAULT ''",
            },
            "clients": {
                "project_id": "ALTER TABLE clients ADD COLUMN project_id VARCHAR DEFAULT 'default'",
            },
            "orders": {
                "project_id": "ALTER TABLE orders ADD COLUMN project_id VARCHAR DEFAULT 'default'",
            },
            "acquisition_logs": {
                "project_id": "ALTER TABLE acquisition_logs ADD COLUMN project_id VARCHAR DEFAULT 'default'",
            },
        }
        for table_name, columns in migrations.items():
            existing = table_columns.get(table_name, [])
            for column_name, sql in columns.items():
                if column_name not in existing:
                    with engine.connect() as conn:
                        conn.execute(text(sql))
                        conn.commit()

        for ind_data in DEFAULT_INDUSTRIES:
            if not db.query(Industry).filter_by(name=ind_data["name"]).first():
                db.add(Industry(**ind_data))
        for voivodeship in VOIVODESHIPS:
            if not db.query(VoivodeshipStatus).filter_by(voivodeship=voivodeship).first():
                db.add(VoivodeshipStatus(voivodeship=voivodeship))
        db.commit()
        system_event("system", "ready", "Database initialized", {"env": APP_ENV})
    finally:
        db.close()


@asynccontextmanager
async def lifespan(application: FastAPI):
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

_bg_tasks: set = set()


def _fire_and_forget(coro):
    task = asyncio.create_task(coro)
    _bg_tasks.add(task)
    task.add_done_callback(_bg_tasks.discard)


@app.middleware("http")
async def security_middleware(request: Request, call_next):
    start = time.perf_counter()
    ip = security.get_client_ip(request)
    endpoint = request.url.path
    user_agent = request.headers.get("user-agent", "")
    project_id = resolve_project_id(request.query_params.get("project_id"), request.headers.get(PROJECT_ID_HEADER))

    if ip in security.BLOCKED_IPS:
        security.add_threat(ip, f"blocked_ip:{security.BLOCKED_IPS[ip]['reason']}", endpoint)
        system_event("security", "blocked", "Rejected blocked IP", {"ip": ip, "endpoint": endpoint, "project_id": project_id})
        _fire_and_forget(security.enqueue_audit_log("BLOCKED_IP", ip, user_agent, endpoint))
        devplatform.record_api_request(endpoint, 0, project_id=project_id, status_code=403)
        return JSONResponse(status_code=403, content={"detail": "IP blocked"})

    if not security.rate_limit_ok(ip):
        security.add_threat(ip, "rate_limit_exceeded", endpoint)
        system_event("security", "rate_limited", "Rate limit exceeded", {"ip": ip, "endpoint": endpoint, "project_id": project_id})
        _fire_and_forget(security.enqueue_audit_log("RATE_LIMITED", ip, user_agent, endpoint))
        devplatform.record_api_request(endpoint, 0, project_id=project_id, status_code=429)
        return JSONResponse(status_code=429, content={"detail": "Rate limit exceeded"})

    try:
        response = await call_next(request)
    except Exception:
        system_event("system", "error", "Unhandled server exception", {"endpoint": endpoint, "project_id": project_id})
        _fire_and_forget(security.enqueue_audit_log("ERROR_500", ip, user_agent, endpoint))
        devplatform.record_api_request(endpoint, (time.perf_counter() - start) * 1000, project_id=project_id, status_code=500)
        raise

    action = f"{request.method} {response.status_code}"
    _fire_and_forget(security.enqueue_audit_log(action, ip, user_agent, endpoint))
    devplatform.record_api_request(endpoint, (time.perf_counter() - start) * 1000, project_id=project_id, status_code=response.status_code)
    response.headers[PROJECT_ID_HEADER] = project_id
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
        "project_id_header": PROJECT_ID_HEADER,
    }


@app.get("/health", tags=["system"])
def health():
    db_status = "ok"
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
    except Exception:
        db_status = "degraded"
    return {
        "status": "ok" if db_status == "ok" else "degraded",
        "version": APP_VERSION,
        "environment": APP_ENV,
        "database": db_status,
        "ts": int(time.time()),
    }


@app.get("/version", tags=["system"])
def version():
    return {"version": APP_VERSION, "api": "v1", "environment": APP_ENV}


@app.get("/metrics", tags=["system"])
def metrics(request: Request, project_id: str | None = None):
    from sqlalchemy import func

    from app.models.models import AcquisitionLog, Client, Order

    scoped_project_id = resolve_project_id(project_id, request.headers.get(PROJECT_ID_HEADER))
    cache_key = f"metrics:{scoped_project_id}"
    cached = cache_get(cache_key)
    if cached is not None:
        return cached

    db: Session = SessionLocal()
    try:
        client_query = db.query(Client).filter(Client.project_id == scoped_project_id)
        order_query = db.query(Order).filter(Order.project_id == scoped_project_id)
        log_query = db.query(AcquisitionLog).filter(AcquisitionLog.project_id == scoped_project_id)
        total_clients = client_query.count()
        total_orders = order_query.count()
        total_logs = log_query.count()
        agg = log_query.with_entities(
            func.sum(AcquisitionLog.found),
            func.sum(AcquisitionLog.accepted),
            func.sum(AcquisitionLog.rejected),
        ).first()
        total_found = int(agg[0] or 0)
        total_accepted = int(agg[1] or 0)
        total_rejected = int(agg[2] or 0)
        acceptance_rate = round(total_accepted / total_found * 100, 1) if total_found else 0
        payload = {
            "project_id": scoped_project_id,
            "total_clients": total_clients,
            "total_orders": total_orders,
            "pipeline_runs": total_logs,
            "pipeline_found": total_found,
            "pipeline_accepted": total_accepted,
            "pipeline_rejected": total_rejected,
            "acceptance_rate_pct": acceptance_rate,
        }
        return cache_set(cache_key, payload)
    finally:
        db.close()


@app.get("/api-config", tags=["system"])
def api_config(request: Request):
    host = request.headers.get("x-forwarded-host") or request.headers.get("host") or f"localhost:{API_PORT}"
    scheme = request.headers.get("x-forwarded-proto", "http")
    return {
        "api_url": f"{scheme}://{host}",
        "version": APP_VERSION,
        "project_id_header": PROJECT_ID_HEADER,
    }


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("main:app", host=API_HOST, port=API_PORT, reload=False)
