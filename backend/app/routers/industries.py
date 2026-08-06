from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from app.models.models import Industry
from app.data.geography import DEFAULT_INDUSTRIES
from pydantic import BaseModel

router = APIRouter(prefix="/industries", tags=["industries"])


class IndustryIn(BaseModel):
    name: str
    description: str = ""
    service_type: str = ""


@router.get("")
def list_industries(db: Session = Depends(get_db)):
    industries = db.query(Industry).all()
    return [
        {"id": i.id, "name": i.name, "description": i.description, "service_type": i.service_type}
        for i in industries
    ]


@router.post("")
def create_industry(payload: IndustryIn, db: Session = Depends(get_db)):
    existing = db.query(Industry).filter_by(name=payload.name).first()
    if existing:
        raise HTTPException(status_code=400, detail="Branża już istnieje")
    ind = Industry(name=payload.name, description=payload.description, service_type=payload.service_type)
    db.add(ind)
    db.commit()
    db.refresh(ind)
    return {"id": ind.id, "name": ind.name}
