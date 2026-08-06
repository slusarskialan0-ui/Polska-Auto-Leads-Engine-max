from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import Optional
from database import get_db
from app.models.models import Client, Order

router = APIRouter(prefix="/clients", tags=["clients"])


@router.get("")
def list_clients(
    voivodeship: Optional[str] = None,
    industry: Optional[str] = None,
    source_type: Optional[str] = None,
    status: Optional[str] = None,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
):
    q = db.query(Client)
    if voivodeship:
        q = q.filter(Client.voivodeship == voivodeship)
    if industry:
        q = q.filter(Client.industry == industry)
    if source_type:
        q = q.filter(Client.source_type == source_type)
    if status:
        q = q.filter(Client.status == status)
    total = q.count()
    clients = q.offset(skip).limit(limit).all()
    return {
        "total": total,
        "items": [
            {
                "id": c.id,
                "company_name": c.company_name,
                "industry": c.industry,
                "voivodeship": c.voivodeship,
                "county": c.county,
                "city": c.city,
                "email": c.email,
                "phone": c.phone,
                "website": c.website,
                "source_type": c.source_type,
                "source_detail": c.source_detail,
                "acquired_at": c.acquired_at.isoformat() if c.acquired_at else None,
                "status": c.status,
            }
            for c in clients
        ],
    }


@router.get("/{client_id}")
def get_client(client_id: int, db: Session = Depends(get_db)):
    c = db.query(Client).filter(Client.id == client_id).first()
    if not c:
        raise HTTPException(status_code=404, detail="Klient nie znaleziony")
    orders = [
        {
            "id": o.id,
            "title": o.title,
            "description": o.description,
            "value": o.value,
            "status": o.status,
            "created_at": o.created_at.isoformat() if o.created_at else None,
        }
        for o in c.orders
    ]
    return {
        "id": c.id,
        "company_name": c.company_name,
        "industry": c.industry,
        "voivodeship": c.voivodeship,
        "county": c.county,
        "city": c.city,
        "email": c.email,
        "phone": c.phone,
        "website": c.website,
        "source_type": c.source_type,
        "source_detail": c.source_detail,
        "acquired_at": c.acquired_at.isoformat() if c.acquired_at else None,
        "status": c.status,
        "orders": orders,
    }


@router.patch("/{client_id}/status")
def update_client_status(client_id: int, status: str, db: Session = Depends(get_db)):
    c = db.query(Client).filter(Client.id == client_id).first()
    if not c:
        raise HTTPException(status_code=404, detail="Klient nie znaleziony")
    c.status = status
    db.commit()
    return {"ok": True}
