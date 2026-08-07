from fastapi import APIRouter, Depends, Request
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.models.models import Client, Order
from app.runtime import cache_get, cache_set, resolve_project_id
from config import PROJECT_ID_HEADER
from database import get_db

router = APIRouter(prefix="/stats", tags=["stats"])


@router.get("")
def get_stats(request: Request, project_id: str | None = None, db: Session = Depends(get_db)):
    scoped_project_id = resolve_project_id(project_id, request.headers.get(PROJECT_ID_HEADER))
    cache_key = f"stats:{scoped_project_id}"
    cached = cache_get(cache_key)
    if cached is not None:
        return cached

    clients = db.query(Client).filter(Client.project_id == scoped_project_id)
    orders = db.query(Order).filter(Order.project_id == scoped_project_id)
    by_voivodeship = (
        clients.with_entities(Client.voivodeship, func.count(Client.id))
        .group_by(Client.voivodeship)
        .all()
    )
    by_industry = (
        clients.with_entities(Client.industry, func.count(Client.id))
        .group_by(Client.industry)
        .all()
    )
    by_source = (
        clients.with_entities(Client.source_type, func.count(Client.id))
        .group_by(Client.source_type)
        .all()
    )
    payload = {
        "project_id": scoped_project_id,
        "total_clients": clients.count(),
        "total_orders": orders.count(),
        "by_voivodeship": [{"voivodeship": voivodeship, "count": count} for voivodeship, count in by_voivodeship],
        "by_industry": [{"industry": industry, "count": count} for industry, count in by_industry],
        "by_source": [{"source_type": source_type, "count": count} for source_type, count in by_source],
    }
    return cache_set(cache_key, payload)
