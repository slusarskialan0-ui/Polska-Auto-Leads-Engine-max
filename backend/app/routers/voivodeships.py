from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from database import get_db
from app.models.models import VoivodeshipStatus, Client, Order
from app.data.geography import VOIVODESHIPS
from pydantic import BaseModel
from typing import Optional

router = APIRouter(prefix="/voivodeships", tags=["voivodeships"])


class PriorityUpdate(BaseModel):
    priority: int


@router.get("")
def list_voivodeships(db: Session = Depends(get_db)):
    statuses = {vs.voivodeship: vs for vs in db.query(VoivodeshipStatus).all()}
    result = []
    for v in VOIVODESHIPS:
        vs = statuses.get(v)
        result.append({
            "voivodeship": v,
            "status": vs.status if vs else "nie_rozpoczete",
            "priority": vs.priority if vs else 0,
            "last_scan": vs.last_scan.isoformat() if vs and vs.last_scan else None,
            "clients_count": vs.clients_count if vs else 0,
            "orders_count": vs.orders_count if vs else 0,
        })
    return result


@router.patch("/{voivodeship}/priority")
def set_priority(voivodeship: str, payload: PriorityUpdate, db: Session = Depends(get_db)):
    vs = db.query(VoivodeshipStatus).filter_by(voivodeship=voivodeship).first()
    if not vs:
        vs = VoivodeshipStatus(voivodeship=voivodeship)
        db.add(vs)
    vs.priority = payload.priority
    db.commit()
    return {"ok": True}
