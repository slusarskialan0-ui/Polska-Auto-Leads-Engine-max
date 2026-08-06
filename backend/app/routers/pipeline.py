from fastapi import APIRouter, BackgroundTasks, HTTPException, Depends
from sqlalchemy.orm import Session
from typing import List
from database import SessionLocal, get_db
from app.models.models import AcquisitionLog, VoivodeshipStatus
from app.pipeline.pipeline import run_pipeline
from app.data.geography import DEFAULT_INDUSTRIES, VOIVODESHIPS
from pydantic import BaseModel
import time

router = APIRouter(prefix="/pipeline", tags=["pipeline"])


class PipelineRequest(BaseModel):
    voivodeship: str
    industries: List[str] = []
    project_id: str = "default"


pipeline_status: dict = {}
MAX_RETRIES = 3


@router.post("/run")
def start_pipeline(payload: PipelineRequest, background_tasks: BackgroundTasks):
    industries = payload.industries
    if not industries:
        industries = [i["name"] for i in DEFAULT_INDUSTRIES]
    voivodeship = payload.voivodeship
    if voivodeship not in VOIVODESHIPS:
        raise HTTPException(status_code=400, detail=f"Nieznane województwo: {voivodeship}")
    pipeline_status[voivodeship] = {
        "status": "running",
        "result": None,
        "started_at": time.time(),
        "retries": 0,
    }

    def _run(attempt: int = 0):
        db = SessionLocal()
        try:
            result = run_pipeline(voivodeship, industries, db)
            pipeline_status[voivodeship] = {
                "status": "done",
                "result": result,
                "started_at": pipeline_status[voivodeship].get("started_at"),
                "finished_at": time.time(),
                "retries": attempt,
            }
        except Exception as exc:
            if attempt < MAX_RETRIES - 1:
                # auto-resume: mark as retrying and try again
                pipeline_status[voivodeship]["status"] = f"retrying ({attempt + 1}/{MAX_RETRIES})"
                pipeline_status[voivodeship]["retries"] = attempt + 1
                db.close()
                time.sleep(2)
                _run(attempt + 1)
                return
            pipeline_status[voivodeship] = {
                "status": "error",
                "result": str(exc),
                "retries": attempt,
            }
            # Mark voivodeship status as failed
            vs = db.query(VoivodeshipStatus).filter_by(voivodeship=voivodeship).first()
            if vs:
                vs.status = "nie_rozpoczete"
                vs.error_message = str(exc)
                db.commit()
        finally:
            db.close()

    background_tasks.add_task(_run)
    return {"message": f"Pipeline uruchomiony dla województwa: {voivodeship}", "voivodeship": voivodeship}


@router.get("/status/{voivodeship}")
def get_pipeline_status(voivodeship: str):
    return pipeline_status.get(voivodeship, {"status": "idle", "result": None})


@router.get("/status")
def get_all_pipeline_statuses():
    """Returns status for all voivodeships currently tracked in memory."""
    return pipeline_status


@router.get("/logs")
def get_logs(voivodeship: str = None, limit: int = 200, db: Session = Depends(get_db)):
    q = db.query(AcquisitionLog)
    if voivodeship:
        q = q.filter(AcquisitionLog.voivodeship == voivodeship)
    logs = q.order_by(AcquisitionLog.created_at.desc()).limit(limit).all()
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
