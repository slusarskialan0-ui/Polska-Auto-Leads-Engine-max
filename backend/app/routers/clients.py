from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session

from app.models.models import Client
from app.runtime import resolve_project_id
from config import PROJECT_ID_HEADER
from database import get_db

router = APIRouter(prefix="/clients", tags=["clients"])


@router.get("")
def list_clients(
    request: Request,
    voivodeship: Optional[str] = None,
    industry: Optional[str] = None,
    source_type: Optional[str] = None,
    status: Optional[str] = None,
    project_id: Optional[str] = None,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
):
    scoped_project_id = resolve_project_id(project_id, request.headers.get(PROJECT_ID_HEADER))
    query = db.query(Client).filter(Client.project_id == scoped_project_id)
    if voivodeship:
        query = query.filter(Client.voivodeship == voivodeship)
    if industry:
        query = query.filter(Client.industry == industry)
    if source_type:
        query = query.filter(Client.source_type == source_type)
    if status:
        query = query.filter(Client.status == status)
    total = query.count()
    clients = query.order_by(Client.acquired_at.desc()).offset(skip).limit(limit).all()
    return {
        "project_id": scoped_project_id,
        "total": total,
        "items": [
            {
                "id": client.id,
                "project_id": client.project_id,
                "company_name": client.company_name,
                "industry": client.industry,
                "voivodeship": client.voivodeship,
                "county": client.county,
                "city": client.city,
                "email": client.email,
                "phone": client.phone,
                "website": client.website,
                "source_type": client.source_type,
                "source_detail": client.source_detail,
                "acquired_at": client.acquired_at.isoformat() if client.acquired_at else None,
                "status": client.status,
            }
            for client in clients
        ],
    }


@router.get("/{client_id}")
def get_client(client_id: int, request: Request, project_id: Optional[str] = None, db: Session = Depends(get_db)):
    scoped_project_id = resolve_project_id(project_id, request.headers.get(PROJECT_ID_HEADER))
    client = db.query(Client).filter(Client.id == client_id, Client.project_id == scoped_project_id).first()
    if not client:
        raise HTTPException(status_code=404, detail="Klient nie znaleziony")
    orders = [
        {
            "id": order.id,
            "project_id": order.project_id,
            "title": order.title,
            "description": order.description,
            "value": order.value,
            "status": order.status,
            "created_at": order.created_at.isoformat() if order.created_at else None,
        }
        for order in client.orders
    ]
    return {
        "id": client.id,
        "project_id": client.project_id,
        "company_name": client.company_name,
        "industry": client.industry,
        "voivodeship": client.voivodeship,
        "county": client.county,
        "city": client.city,
        "email": client.email,
        "phone": client.phone,
        "website": client.website,
        "source_type": client.source_type,
        "source_detail": client.source_detail,
        "acquired_at": client.acquired_at.isoformat() if client.acquired_at else None,
        "status": client.status,
        "orders": orders,
    }


@router.patch("/{client_id}/status")
def update_client_status(client_id: int, status: str, request: Request, project_id: Optional[str] = None, db: Session = Depends(get_db)):
    scoped_project_id = resolve_project_id(project_id, request.headers.get(PROJECT_ID_HEADER))
    client = db.query(Client).filter(Client.id == client_id, Client.project_id == scoped_project_id).first()
    if not client:
        raise HTTPException(status_code=404, detail="Klient nie znaleziony")
    client.status = status
    db.commit()
    return {"ok": True, "project_id": scoped_project_id, "status": status}
