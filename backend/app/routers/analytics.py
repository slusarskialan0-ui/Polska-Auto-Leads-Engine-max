from datetime import datetime, timedelta

from fastapi import APIRouter, Depends
from sqlalchemy import func, or_
from sqlalchemy.orm import Session

from database import get_db
from app.models.models import Client, Order

router = APIRouter(prefix="/analytics", tags=["analytics"])


def _month_expr(db: Session, column):
    try:
        dialect = db.get_bind().dialect.name
    except Exception:
        dialect = "sqlite"
    if dialect == "sqlite":
        return func.strftime("%Y-%m", column)
    return func.to_char(column, "YYYY-MM")


def _monthly_counts(db: Session, model, column, label: str):
    month_expr = _month_expr(db, column)
    rows = (
        db.query(month_expr.label("month"), func.count(model.id).label(label))
        .group_by(month_expr)
        .order_by(month_expr)
        .all()
    )
    return [{"month": month or "brak", label: int(count or 0)} for month, count in rows]


def _monthly_revenue(db: Session):
    month_expr = _month_expr(db, Order.created_at)
    rows = (
        db.query(month_expr.label("month"), func.coalesce(func.sum(Order.value), 0.0).label("revenue"))
        .group_by(month_expr)
        .order_by(month_expr)
        .all()
    )
    return [{"month": month or "brak", "revenue": float(revenue or 0.0)} for month, revenue in rows]


def _revenue_summary(db: Session):
    total_revenue = float(db.query(func.coalesce(func.sum(Order.value), 0.0)).scalar() or 0.0)
    avg_order_value = float(db.query(func.coalesce(func.avg(Order.value), 0.0)).scalar() or 0.0)
    return {
        "total_revenue": total_revenue,
        "by_month": _monthly_revenue(db),
        "avg_order_value": avg_order_value,
    }


def _growth_summary(db: Session):
    return {
        "clients_growth": _monthly_counts(db, Client, Client.acquired_at, "count"),
        "orders_growth": _monthly_counts(db, Order, Order.created_at, "count"),
    }


def _churn_summary(db: Session):
    recent_cutoff = datetime.utcnow() - timedelta(days=90)
    active_clients = (
        db.query(func.count(func.distinct(Client.id)))
        .outerjoin(Order, Order.client_id == Client.id)
        .filter(or_(Order.created_at >= recent_cutoff, Client.status != "odrzucony"))
        .scalar()
        or 0
    )
    total_clients = db.query(Client).count()
    churned_clients = max(total_clients - int(active_clients), 0)
    churn_rate = round((churned_clients / total_clients) * 100, 2) if total_clients else 0.0
    return {
        "churn_rate_pct": churn_rate,
        "churned_clients": churned_clients,
        "active_clients": int(active_clients),
    }


def _heatmap_summary(db: Session):
    rows = (
        db.query(
            Client.voivodeship,
            func.count(func.distinct(Client.id)).label("clients"),
            func.count(Order.id).label("orders"),
            func.coalesce(func.sum(Order.value), 0.0).label("revenue"),
        )
        .outerjoin(Order, Order.client_id == Client.id)
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


@router.get("/revenue")
def revenue(db: Session = Depends(get_db)):
    return _revenue_summary(db)


@router.get("/growth")
def growth(db: Session = Depends(get_db)):
    return _growth_summary(db)


@router.get("/churn")
def churn(db: Session = Depends(get_db)):
    return _churn_summary(db)


@router.get("/heatmap")
def heatmap(db: Session = Depends(get_db)):
    return _heatmap_summary(db)


@router.get("/saas-dashboard")
def saas_dashboard(db: Session = Depends(get_db)):
    top_industries_rows = (
        db.query(
            Client.industry,
            func.count(func.distinct(Client.id)).label("clients"),
            func.coalesce(func.sum(Order.value), 0.0).label("revenue"),
        )
        .outerjoin(Order, Order.client_id == Client.id)
        .group_by(Client.industry)
        .order_by(func.coalesce(func.sum(Order.value), 0.0).desc(), func.count(func.distinct(Client.id)).desc())
        .limit(5)
        .all()
    )
    heatmap_data = _heatmap_summary(db)["by_voivodeship"]
    return {
        "revenue": _revenue_summary(db),
        "growth": _growth_summary(db),
        "churn": _churn_summary(db),
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
