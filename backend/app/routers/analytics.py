from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, Request
from sqlalchemy import func, or_
from sqlalchemy.orm import Session

from app.models.models import Client, Order
from app.runtime import cache_get, cache_set, resolve_project_id
from config import PROJECT_ID_HEADER
from database import get_db

router = APIRouter(prefix="/analytics", tags=["analytics"])


def _month_expr(db: Session, column):
    dialect = db.get_bind().dialect.name
    if dialect == "sqlite":
        return func.strftime("%Y-%m", column)
    return func.to_char(column, "YYYY-MM")


def _client_query(db: Session, project_id: str):
    return db.query(Client).filter(Client.project_id == project_id)


def _order_query(db: Session, project_id: str):
    return db.query(Order).filter(Order.project_id == project_id)


def _monthly_counts(query, model, month_expr, label: str):
    rows = query.with_entities(month_expr.label("month"), func.count(model.id).label(label)).group_by(month_expr).order_by(month_expr).all()
    return [{"month": month or "brak", label: int(count or 0)} for month, count in rows]


def _monthly_revenue(db: Session, project_id: str):
    month_expr = _month_expr(db, Order.created_at)
    rows = (
        _order_query(db, project_id)
        .with_entities(month_expr.label("month"), func.coalesce(func.sum(Order.value), 0.0).label("revenue"))
        .group_by(month_expr)
        .order_by(month_expr)
        .all()
    )
    return [{"month": month or "brak", "revenue": float(revenue or 0.0)} for month, revenue in rows]


def _revenue_summary(db: Session, project_id: str):
    orders = _order_query(db, project_id)
    return {
        "total_revenue": float(orders.with_entities(func.coalesce(func.sum(Order.value), 0.0)).scalar() or 0.0),
        "by_month": _monthly_revenue(db, project_id),
        "avg_order_value": float(orders.with_entities(func.coalesce(func.avg(Order.value), 0.0)).scalar() or 0.0),
    }


def _growth_summary(db: Session, project_id: str):
    return {
        "clients_growth": _monthly_counts(_client_query(db, project_id), Client, _month_expr(db, Client.acquired_at), "count"),
        "orders_growth": _monthly_counts(_order_query(db, project_id), Order, _month_expr(db, Order.created_at), "count"),
    }


def _churn_summary(db: Session, project_id: str):
    recent_cutoff = datetime.utcnow() - timedelta(days=90)
    active_clients = (
        db.query(func.count(func.distinct(Client.id)))
        .outerjoin(Order, Order.client_id == Client.id)
        .filter(Client.project_id == project_id)
        .filter(or_(Order.created_at >= recent_cutoff, Client.status != "odrzucony"))
        .scalar()
        or 0
    )
    total_clients = _client_query(db, project_id).count()
    churned_clients = max(total_clients - int(active_clients), 0)
    churn_rate = round((churned_clients / total_clients) * 100, 2) if total_clients else 0.0
    return {
        "churn_rate_pct": churn_rate,
        "churned_clients": churned_clients,
        "active_clients": int(active_clients),
    }


def _heatmap_summary(db: Session, project_id: str):
    rows = (
        db.query(
            Client.voivodeship,
            func.count(func.distinct(Client.id)).label("clients"),
            func.count(Order.id).label("orders"),
            func.coalesce(func.sum(Order.value), 0.0).label("revenue"),
        )
        .outerjoin(Order, Order.client_id == Client.id)
        .filter(Client.project_id == project_id)
        .group_by(Client.voivodeship)
        .order_by(func.coalesce(func.sum(Order.value), 0.0).desc(), Client.voivodeship.asc())
        .all()
    )
    return {
        "by_voivodeship": [
            {
                "voivodeship": voivodeship or "Nieznane",
                "clients": int(clients or 0),
                "orders": int(orders or 0),
                "revenue": float(revenue or 0.0),
            }
            for voivodeship, clients, orders, revenue in rows
        ]
    }


def _project_id(request: Request, project_id: str | None):
    return resolve_project_id(project_id, request.headers.get(PROJECT_ID_HEADER))


@router.get("/revenue")
def revenue(request: Request, project_id: str | None = None, db: Session = Depends(get_db)):
    scoped_project_id = _project_id(request, project_id)
    cache_key = f"analytics:{scoped_project_id}:revenue"
    return cache_get(cache_key) or cache_set(cache_key, {"project_id": scoped_project_id, **_revenue_summary(db, scoped_project_id)})


@router.get("/growth")
def growth(request: Request, project_id: str | None = None, db: Session = Depends(get_db)):
    scoped_project_id = _project_id(request, project_id)
    cache_key = f"analytics:{scoped_project_id}:growth"
    return cache_get(cache_key) or cache_set(cache_key, {"project_id": scoped_project_id, **_growth_summary(db, scoped_project_id)})


@router.get("/churn")
def churn(request: Request, project_id: str | None = None, db: Session = Depends(get_db)):
    scoped_project_id = _project_id(request, project_id)
    cache_key = f"analytics:{scoped_project_id}:churn"
    return cache_get(cache_key) or cache_set(cache_key, {"project_id": scoped_project_id, **_churn_summary(db, scoped_project_id)})


@router.get("/heatmap")
def heatmap(request: Request, project_id: str | None = None, db: Session = Depends(get_db)):
    scoped_project_id = _project_id(request, project_id)
    cache_key = f"analytics:{scoped_project_id}:heatmap"
    return cache_get(cache_key) or cache_set(cache_key, {"project_id": scoped_project_id, **_heatmap_summary(db, scoped_project_id)})


@router.get("/saas-dashboard")
def saas_dashboard(request: Request, project_id: str | None = None, db: Session = Depends(get_db)):
    scoped_project_id = _project_id(request, project_id)
    cache_key = f"analytics:{scoped_project_id}:dashboard"
    cached = cache_get(cache_key)
    if cached is not None:
        return cached

    top_industries_rows = (
        db.query(
            Client.industry,
            func.count(func.distinct(Client.id)).label("clients"),
            func.coalesce(func.sum(Order.value), 0.0).label("revenue"),
        )
        .outerjoin(Order, Order.client_id == Client.id)
        .filter(Client.project_id == scoped_project_id)
        .group_by(Client.industry)
        .order_by(func.coalesce(func.sum(Order.value), 0.0).desc(), func.count(func.distinct(Client.id)).desc())
        .limit(5)
        .all()
    )
    heatmap_data = _heatmap_summary(db, scoped_project_id)["by_voivodeship"]
    payload = {
        "project_id": scoped_project_id,
        "revenue": _revenue_summary(db, scoped_project_id),
        "growth": _growth_summary(db, scoped_project_id),
        "churn": _churn_summary(db, scoped_project_id),
        "top_industries": [
            {
                "industry": industry or "Nieznana",
                "clients": int(clients or 0),
                "revenue": float(revenue or 0.0),
            }
            for industry, clients, revenue in top_industries_rows
        ],
        "top_voivodeships": heatmap_data[:5],
    }
    return cache_set(cache_key, payload)
