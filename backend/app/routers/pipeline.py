from fastapi import APIRouter, BackgroundTasks, HTTPException, Depends
from sqlalchemy.orm import Session
from typing import List
from database import SessionLocal, get_db
from app.models.models import AcquisitionLog
from app.pipeline.pipeline import run_pipeline
from app.data.geography import DEFAULT_INDUSTRIES, VOIVODESHIPS
from pydantic import BaseModel

router = APIRouter(prefix="/pipeline", tags=["pipeline"])


class PipelineRequest(BaseModel):
    voivodeship: str
    industries: List[str] = []


pipeline_status: dict = {}


@router.post("/run")
def start_pipeline(payload: PipelineRequest, background_tasks: BackgroundTasks):
    industries = payload.industries
    if not industries:
        industries = [i["name"] for i in DEFAULT_INDUSTRIES]
    voivodeship = payload.voivodeship
    if voivodeship not in VOIVODESHIPS:
        raise HTTPException(status_code=400, detail=f"Nieznane województwo: {voivodeship}")
    pipeline_status[voivodeship] = {"status": "running", "result": None}

    def _run():
        db = SessionLocal()
        try:
            result = run_pipeline(voivodeship, industries, db)
            pipeline_status[voivodeship] = {"status": "done", "result": result}
        except Exception as exc:
            pipeline_status[voivodeship] = {"status": "error", "result": str(exc)}
        finally:
            db.close()

    background_tasks.add_task(_run)
    return {"message": f"Pipeline uruchomiony dla województwa: {voivodeship}", "voivodeship": voivodeship}


@router.get("/status/{voivodeship}")
def get_pipeline_status(voivodeship: str):
    return pipeline_status.get(voivodeship, {"status": "idle", "result": None})


@router.get("/logs")
def get_logs(voivodeship: str = None, db: Session = Depends(get_db)):
    q = db.query(AcquisitionLog)
    if voivodeship:
        q = q.filter(AcquisitionLog.voivodeship == voivodeship)
    logs = q.order_by(AcquisitionLog.created_at.desc()).limit(200).all()
    return [
        {
            "id": l.id,
            "voivodeship": l.voivodeship,
            "industries": l.industries,
            "source_type": l.source_type,
            "found": l.found,
            "accepted": l.accepted,
            "rejected": l.rejected,
            "created_at": l.created_at.isoformat() if l.created_at else None,
        }
        for l in logs
    ]
