"""Main FastAPI application entry point."""
import sys
import os
import time
from contextlib import asynccontextmanager

sys.path.insert(0, os.path.dirname(__file__))

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from database import engine, Base, SessionLocal
from sqlalchemy.orm import Session
from app.models.models import Industry, VoivodeshipStatus
from app.data.geography import DEFAULT_INDUSTRIES, VOIVODESHIPS
from app.routers import clients, orders, voivodeships, industries, pipeline, stats
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
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(clients.router)
app.include_router(orders.router)
app.include_router(voivodeships.router)
app.include_router(industries.router)
app.include_router(pipeline.router)
app.include_router(stats.router)


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
    return {"status": "ok", "version": APP_VERSION, "ts": int(time.time())}


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
