from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.models.models import Client, Order, OrderHistory
from app.runtime import resolve_project_id
from config import PROJECT_ID_HEADER
from database import get_db

router = APIRouter(prefix="/orders", tags=["orders"])


class OrderHistoryIn(BaseModel):
    note: str = ""
    status_change: str = ""


@router.get("")
def list_orders(
    request: Request,
    voivodeship: Optional[str] = None,
    industry: Optional[str] = None,
    status: Optional[str] = None,
    min_value: Optional[float] = None,
    max_value: Optional[float] = None,
    project_id: Optional[str] = None,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
):
    scoped_project_id = resolve_project_id(project_id, request.headers.get(PROJECT_ID_HEADER))
    query = db.query(Order).join(Client).filter(Order.project_id == scoped_project_id)
    if voivodeship:
        query = query.filter(Client.voivodeship == voivodeship)
    if industry:
        query = query.filter(Client.industry == industry)
    if status:
        query = query.filter(Order.status == status)
    if min_value is not None:
        query = query.filter(Order.value >= min_value)
    if max_value is not None:
        query = query.filter(Order.value <= max_value)
    total = query.count()
    orders = query.order_by(Order.created_at.desc()).offset(skip).limit(limit).all()
    return {
        "project_id": scoped_project_id,
        "total": total,
        "items": [
            {
                "id": order.id,
                "project_id": order.project_id,
                "client_id": order.client_id,
                "client_name": order.client.company_name if order.client else "",
                "title": order.title,
                "description": order.description,
                "value": order.value,
                "status": order.status,
                "created_at": order.created_at.isoformat() if order.created_at else None,
                "voivodeship": order.client.voivodeship if order.client else "",
                "industry": order.client.industry if order.client else "",
            }
            for order in orders
        ],
    }


@router.get("/{order_id}")
def get_order(order_id: int, request: Request, project_id: Optional[str] = None, db: Session = Depends(get_db)):
    scoped_project_id = resolve_project_id(project_id, request.headers.get(PROJECT_ID_HEADER))
    order = db.query(Order).filter(Order.id == order_id, Order.project_id == scoped_project_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Zlecenie nie znalezione")
    return {
        "id": order.id,
        "project_id": order.project_id,
        "client_id": order.client_id,
        "client_name": order.client.company_name if order.client else "",
        "title": order.title,
        "description": order.description,
        "value": order.value,
        "status": order.status,
        "created_at": order.created_at.isoformat() if order.created_at else None,
        "history": [
            {
                "id": history.id,
                "note": history.note,
                "status_change": history.status_change,
                "created_at": history.created_at.isoformat() if history.created_at else None,
            }
            for history in order.history
        ],
    }


@router.patch("/{order_id}/status")
def update_order_status(order_id: int, status: str, request: Request, project_id: Optional[str] = None, db: Session = Depends(get_db)):
    scoped_project_id = resolve_project_id(project_id, request.headers.get(PROJECT_ID_HEADER))
    order = db.query(Order).filter(Order.id == order_id, Order.project_id == scoped_project_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Zlecenie nie znalezione")
    old_status = order.status
    order.status = status
    db.add(OrderHistory(order_id=order_id, note="Zmiana statusu", status_change=f"{old_status} → {status}"))
    db.commit()
    return {"ok": True, "project_id": scoped_project_id, "status": status}


@router.post("/{order_id}/history")
def add_history(order_id: int, payload: OrderHistoryIn, request: Request, project_id: Optional[str] = None, db: Session = Depends(get_db)):
    scoped_project_id = resolve_project_id(project_id, request.headers.get(PROJECT_ID_HEADER))
    order = db.query(Order).filter(Order.id == order_id, Order.project_id == scoped_project_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Zlecenie nie znalezione")
    db.add(OrderHistory(order_id=order_id, note=payload.note, status_change=payload.status_change))
    db.commit()
    return {"ok": True, "project_id": scoped_project_id}
