import time
from typing import List

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Request
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.data.geography import DEFAULT_INDUSTRIES, VOIVODESHIPS
from app.models.models import AcquisitionLog, VoivodeshipStatus
from app.pipeline.pipeline import run_pipeline
from app.runtime import invalidate_project_caches, resolve_project_id, system_event
from config import PIPELINE_WORKER_CAPACITY, PROJECT_ID_HEADER
from database import SessionLocal, get_db

router = APIRouter(prefix="/pipeline", tags=["pipeline"])


class PipelineRequest(BaseModel):
    voivodeship: str
    industries: List[str] = []
    project_id: str | None = None


pipeline_status: dict[str, dict] = {}
MAX_RETRIES = 3


def _status_key(project_id: str, voivodeship: str) -> str:
    return f"{project_id}:{voivodeship}"


@router.post("/run")
def start_pipeline(payload: PipelineRequest, background_tasks: BackgroundTasks, request: Request):
    industries = payload.industries or [item["name"] for item in DEFAULT_INDUSTRIES]
    voivodeship = payload.voivodeship
    project_id = resolve_project_id(payload.project_id, request.headers.get(PROJECT_ID_HEADER))
    status_key = _status_key(project_id, voivodeship)

    if voivodeship not in VOIVODESHIPS:
        raise HTTPException(status_code=400, detail=f"Nieznane województwo: {voivodeship}")
    if pipeline_status.get(status_key, {}).get("status") == "running":
        raise HTTPException(status_code=409, detail="Pipeline już działa dla tego project_id i województwa")

    pipeline_status[status_key] = {
        "project_id": project_id,
        "voivodeship": voivodeship,
        "status": "running",
        "result": None,
        "started_at": time.time(),
        "retries": 0,
        "industries": industries,
    }

    def _run(attempt: int = 0):
        db = SessionLocal()
        try:
            result = run_pipeline(voivodeship, industries, db, project_id=project_id)
            pipeline_status[status_key] = {
                **pipeline_status.get(status_key, {}),
                "status": "done",
                "result": result,
                "finished_at": time.time(),
                "retries": attempt,
            }
            invalidate_project_caches(project_id)
        except Exception as exc:
            if attempt < MAX_RETRIES - 1:
                pipeline_status[status_key]["status"] = f"retrying ({attempt + 1}/{MAX_RETRIES})"
                pipeline_status[status_key]["retries"] = attempt + 1
                system_event("pipeline", "retry", "Retrying pipeline after failure", {"project_id": project_id, "voivodeship": voivodeship, "attempt": attempt + 1})
                db.close()
                time.sleep(2 * (attempt + 1))
                _run(attempt + 1)
                return
            pipeline_status[status_key] = {
                **pipeline_status.get(status_key, {}),
                "status": "error",
                "result": str(exc),
                "retries": attempt,
                "finished_at": time.time(),
            }
            system_event("pipeline", "error", "Pipeline failed", {"project_id": project_id, "voivodeship": voivodeship, "error": str(exc)})
            vs = db.query(VoivodeshipStatus).filter_by(voivodeship=voivodeship).first()
            if vs:
                vs.status = "nie_rozpoczete"
                vs.error_message = str(exc)
                db.commit()
        finally:
            db.close()

    background_tasks.add_task(_run)
    return {
        "message": f"Pipeline uruchomiony dla województwa: {voivodeship}",
        "project_id": project_id,
        "voivodeship": voivodeship,
        "worker_capacity": PIPELINE_WORKER_CAPACITY,
    }


@router.get("/status/{voivodeship}")
def get_pipeline_status(voivodeship: str, request: Request, project_id: str | None = None):
    scoped_project_id = resolve_project_id(project_id, request.headers.get(PROJECT_ID_HEADER))
    return pipeline_status.get(_status_key(scoped_project_id, voivodeship), {"status": "idle", "result": None, "project_id": scoped_project_id})


@router.get("/status")
def get_all_pipeline_statuses(request: Request, project_id: str | None = None):
    scoped_project_id = resolve_project_id(project_id, request.headers.get(PROJECT_ID_HEADER))
    return {
        key: value
        for key, value in pipeline_status.items()
        if value.get("project_id") == scoped_project_id
    }


@router.get("/queue")
def get_pipeline_queue(request: Request, project_id: str | None = None):
    scoped_project_id = resolve_project_id(project_id, request.headers.get(PROJECT_ID_HEADER))
    entries = [value for value in pipeline_status.values() if value.get("project_id") == scoped_project_id]
    active = [item for item in entries if item.get("status") == "running" or str(item.get("status", "")).startswith("retrying")]
    completed = [item for item in entries if item.get("status") == "done"]
    failed = [item for item in entries if item.get("status") == "error"]
    return {
        "project_id": scoped_project_id,
        "worker_capacity": PIPELINE_WORKER_CAPACITY,
        "active": len(active),
        "completed": len(completed),
        "failed": len(failed),
        "items": entries[-20:],
    }


@router.get("/logs")
def get_logs(request: Request, voivodeship: str | None = None, limit: int = 200, project_id: str | None = None, db: Session = Depends(get_db)):
    scoped_project_id = resolve_project_id(project_id, request.headers.get(PROJECT_ID_HEADER))
    query = db.query(AcquisitionLog).filter(AcquisitionLog.project_id == scoped_project_id)
    if voivodeship:
        query = query.filter(AcquisitionLog.voivodeship == voivodeship)
    logs = query.order_by(AcquisitionLog.created_at.desc()).limit(limit).all()
    return [
        {
            "id": log.id,
            "project_id": log.project_id,
            "voivodeship": log.voivodeship,
            "industries": log.industries,
            "source_type": log.source_type,
            "found": log.found,
            "accepted": log.accepted,
            "rejected": log.rejected,
            "created_at": log.created_at.isoformat() if log.created_at else None,
        }
        for log in logs
    ]
