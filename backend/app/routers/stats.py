from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from database import get_db
from app.models.models import Client, Order, AcquisitionLog

router = APIRouter(prefix="/stats", tags=["stats"])


@router.get("")
def get_stats(db: Session = Depends(get_db)):
    total_clients = db.query(Client).count()
    total_orders = db.query(Order).count()

    by_voivodeship = (
        db.query(Client.voivodeship, func.count(Client.id))
        .group_by(Client.voivodeship)
        .all()
    )
    by_industry = (
        db.query(Client.industry, func.count(Client.id))
        .group_by(Client.industry)
        .all()
    )
    by_source = (
        db.query(Client.source_type, func.count(Client.id))
        .group_by(Client.source_type)
        .all()
    )

    return {
        "total_clients": total_clients,
        "total_orders": total_orders,
        "by_voivodeship": [{"voivodeship": v, "count": c} for v, c in by_voivodeship],
        "by_industry": [{"industry": i, "count": c} for i, c in by_industry],
        "by_source": [{"source_type": s, "count": c} for s, c in by_source],
    }
