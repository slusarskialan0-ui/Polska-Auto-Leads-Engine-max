"""Main FastAPI application entry point."""
import sys
import os
from contextlib import asynccontextmanager

sys.path.insert(0, os.path.dirname(__file__))

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from database import engine, Base, SessionLocal
from sqlalchemy.orm import Session
from app.models.models import Industry, VoivodeshipStatus
from app.data.geography import DEFAULT_INDUSTRIES, VOIVODESHIPS
from app.routers import clients, orders, voivodeships, industries, pipeline, stats
from config import API_HOST, API_PORT, CORS_ORIGINS


def init_db():
    Base.metadata.create_all(bind=engine)
    db: Session = SessionLocal()
    try:
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
    description="Automatyczny system pozyskiwania klientów dla całej Polski",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
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


@app.get("/")
def root():
    return {"message": "Polska Auto Leads Engine API", "version": "1.0.0", "docs": "/docs"}


@app.get("/health")
def health():
    return {"status": "ok"}


@app.get("/api-config")
def api_config():
    """Returns the API URL for auto-connect by frontend."""
    return {"api_url": f"http://localhost:{API_PORT}"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host=API_HOST, port=API_PORT, reload=True)
