from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, Request
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.models.models import Client, Order
from app.routers.devplatform import api_request_log
from app.runtime import cache_get, cache_set, resolve_project_id
from config import PROJECT_ID_HEADER
from database import get_db

router = APIRouter(prefix="/biznes", tags=["biznes"])


def _today_prefix() -> str:
    return datetime.utcnow().strftime("%Y-%m-%d")


def _month_prefix() -> str:
    return datetime.utcnow().strftime("%Y-%m")


def _project_id(request: Request, project_id: str | None):
    return resolve_project_id(project_id, request.headers.get(PROJECT_ID_HEADER))


@router.get("/pricing")
def pricing(request: Request, project_id: str | None = None, db: Session = Depends(get_db)):
    scoped_project_id = _project_id(request, project_id)
    cache_key = f"biznes:{scoped_project_id}:pricing"
    cached = cache_get(cache_key)
    if cached is not None:
        return cached
    total_clients = db.query(Client).filter(Client.project_id == scoped_project_id).count()
    demand_factor = round(1.0 + min(total_clients / 10000, 0.35), 2)
    recommended = "Starter" if total_clients < 150 else "Pro" if total_clients < 1000 else "Enterprise"
    payload = {
        "project_id": scoped_project_id,
        "tiers": [
            {"name": "Starter", "price": 299, "leads": 500, "features": ["1 pipeline", "Podstawowy CRM", "Eksport CSV"]},
            {"name": "Pro", "price": 799, "leads": 2000, "features": ["Multi-województwa", "API access", "Automatyzacje follow-up"]},
            {"name": "Enterprise", "price": 1999, "leads": "unlimited", "features": ["Unlimited leads", "White-label", "Dedykowany opiekun"]},
        ],
        "recommended": recommended,
        "demand_factor": demand_factor,
    }
    return cache_set(cache_key, payload)


@router.get("/billing")
def billing(request: Request, project_id: str | None = None):
    scoped_project_id = _project_id(request, project_id)
    today = datetime.utcnow().date()
    return {
        "project_id": scoped_project_id,
        "invoices": [
            {"id": f"INV-{(today - timedelta(days=35)).strftime('%Y-%m%d')}", "date": str(today - timedelta(days=35)), "amount": 799, "status": "paid"},
            {"id": f"INV-{(today - timedelta(days=65)).strftime('%Y-%m%d')}", "date": str(today - timedelta(days=65)), "amount": 799, "status": "paid"},
            {"id": f"INV-{(today - timedelta(days=95)).strftime('%Y-%m%d')}", "date": str(today - timedelta(days=95)), "amount": 599, "status": "paid"},
        ],
        "next_invoice": str(today + timedelta(days=14)),
        "subscription": "Pro",
    }


@router.get("/marketplace")
def marketplace(request: Request, project_id: str | None = None, db: Session = Depends(get_db)):
    scoped_project_id = _project_id(request, project_id)
    rows = (
        db.query(
            Client.id,
            Client.company_name,
            Client.industry,
            Client.voivodeship,
            Client.city,
            Client.email,
            Client.phone,
            func.coalesce(func.sum(Order.value), 0.0).label("order_value"),
            func.count(Order.id).label("orders_count"),
        )
        .outerjoin(Order, Order.client_id == Client.id)
        .filter(Client.project_id == scoped_project_id)
        .group_by(Client.id)
        .order_by(func.coalesce(func.sum(Order.value), 0.0).desc(), func.count(Order.id).desc())
        .limit(20)
        .all()
    )
    return [
        {
            "id": client_id,
            "project_id": scoped_project_id,
            "company_name": company_name,
            "industry": industry,
            "voivodeship": voivodeship,
            "city": city,
            "email": email,
            "phone": phone,
            "order_value": float(order_value or 0.0),
            "orders_count": int(orders_count or 0),
        }
        for client_id, company_name, industry, voivodeship, city, email, phone, order_value, orders_count in rows
    ]


@router.get("/agency-dashboard")
def agency_dashboard(request: Request, project_id: str | None = None, db: Session = Depends(get_db)):
    scoped_project_id = _project_id(request, project_id)
    client_rows = db.query(Client.project_id, func.count(Client.id)).filter(Client.project_id == scoped_project_id).group_by(Client.project_id).all()
    revenue_rows = db.query(Order.project_id, func.coalesce(func.sum(Order.value), 0.0)).filter(Order.project_id == scoped_project_id).group_by(Order.project_id).all()
    top_industries = (
        db.query(Client.industry, func.count(Client.id))
        .filter(Client.project_id == scoped_project_id)
        .group_by(Client.industry)
        .order_by(func.count(Client.id).desc())
        .limit(5)
        .all()
    )
    return {
        "project_id": scoped_project_id,
        "total_projects": len({project_id for project_id, _ in client_rows} | {project_id for project_id, _ in revenue_rows}) or 1,
        "clients_per_project": {project_id or "default": int(count or 0) for project_id, count in client_rows} or {"default": 0},
        "revenue_per_project": {project_id or "default": float(value or 0.0) for project_id, value in revenue_rows} or {"default": 0.0},
        "top_industries": [{"industry": industry or "Nieznana", "count": int(count or 0)} for industry, count in top_industries],
    }


@router.get("/subscriptions")
def subscriptions(request: Request, project_id: str | None = None, db: Session = Depends(get_db)):
    scoped_project_id = _project_id(request, project_id)
    leads_used = db.query(Client).filter(Client.project_id == scoped_project_id).count()
    return {
        "project_id": scoped_project_id,
        "plans": ["Starter", "Pro", "Enterprise"],
        "active_plan": "Pro",
        "usage": {"leads_used": leads_used, "leads_limit": 2000},
    }


@router.get("/usage")
def usage(request: Request, project_id: str | None = None, db: Session = Depends(get_db)):
    scoped_project_id = _project_id(request, project_id)
    today = _today_prefix()
    month = _month_prefix()
    project_requests = [entry for entry in api_request_log if entry["project_id"] == scoped_project_id]
    return {
        "project_id": scoped_project_id,
        "api_requests_today": sum(1 for entry in project_requests if entry["ts"].startswith(today)),
        "api_requests_month": sum(1 for entry in project_requests if entry["ts"].startswith(month)),
        "leads_acquired": db.query(Client).filter(Client.project_id == scoped_project_id).count(),
        "orders_created": db.query(Order).filter(Order.project_id == scoped_project_id).count(),
    }
