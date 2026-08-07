"""Auto-pipeline: orchestrates all data sources and writes results to DB."""
import concurrent.futures
import random
from datetime import datetime

from sqlalchemy.orm import Session

from app.data.geography import ORDER_TEMPLATES
from app.models.models import AcquisitionLog, Client, Location, Order, VoivodeshipStatus
from app.runtime import system_event
from app.sources import ALL_SOURCES, CompanyProfile, validate_email, validate_phone
from app.sources.sources import BaseSource


def _validate(profile: CompanyProfile) -> bool:
    if not profile.company_name or not profile.company_name.strip():
        return False
    if profile.email and not validate_email(profile.email):
        profile.email = ""
    if profile.phone and not validate_phone(profile.phone):
        profile.phone = ""
    return True


def _fetch_source(source: BaseSource, voivodeship: str, industries: list[str]):
    try:
        return source.source_type, source.fetch(voivodeship, industries)
    except Exception:
        return source.source_type, []


def run_pipeline(voivodeship: str, industries: list[str], db: Session, project_id: str = "default") -> dict:
    """Run the full acquisition pipeline for given voivodeship + industries."""
    vs = db.query(VoivodeshipStatus).filter_by(voivodeship=voivodeship).first()
    if vs:
        vs.status = "w_trakcie"
        vs.error_message = ""
        db.commit()

    system_event("pipeline", "started", "Pipeline started", {"voivodeship": voivodeship, "project_id": project_id})
    logs: list[tuple[str, int, list[CompanyProfile]]] = []
    all_profiles: list[CompanyProfile] = []

    with concurrent.futures.ThreadPoolExecutor() as executor:
        futures = {executor.submit(_fetch_source, src, voivodeship, industries): src for src in ALL_SOURCES}
        for future in concurrent.futures.as_completed(futures):
            source_type, profiles = future.result()
            found = len(profiles)
            logs.append((source_type, found, profiles))
            all_profiles.extend(profiles)

    raw_total_found = len(all_profiles)
    source_totals = {source_type: {"found": found, "accepted": 0, "rejected": 0} for source_type, found, _ in logs}
    accepted = 0
    rejected = 0
    seen = set()

    for profile in all_profiles:
        source_type = profile.source_type
        dedup_key = (profile.company_name.lower().strip(), profile.voivodeship, profile.industry)
        if dedup_key in seen:
            rejected += 1
            source_totals[source_type]["rejected"] += 1
            continue
        seen.add(dedup_key)

        if not _validate(profile):
            rejected += 1
            source_totals[source_type]["rejected"] += 1
            continue

        existing = (
            db.query(Client.id)
            .filter(
                Client.project_id == project_id,
                Client.company_name == profile.company_name,
                Client.voivodeship == profile.voivodeship,
                Client.industry == profile.industry,
            )
            .first()
        )
        if existing:
            rejected += 1
            source_totals[source_type]["rejected"] += 1
            continue

        loc = (
            db.query(Location)
            .filter_by(
                voivodeship=profile.voivodeship,
                city=profile.city,
                county=profile.county,
            )
            .first()
        )
        if not loc:
            loc = Location(
                voivodeship=profile.voivodeship,
                county=profile.county,
                city=profile.city,
            )
            db.add(loc)
            db.flush()

        client = Client(
            project_id=project_id,
            company_name=profile.company_name,
            industry=profile.industry,
            voivodeship=profile.voivodeship,
            county=profile.county,
            city=profile.city,
            email=profile.email,
            phone=profile.phone,
            website=profile.website,
            source_type=profile.source_type,
            source_detail=profile.source_detail,
            acquired_at=profile.acquired_at,
            status="nowy",
            location_id=loc.id,
        )
        db.add(client)
        db.flush()

        template = ORDER_TEMPLATES.get(
            profile.industry,
            (
                f"Pozyskanie klienta – {profile.industry}",
                f"Propozycja współpracy dla firmy z branży {profile.industry}.",
            ),
        )
        order = Order(
            project_id=project_id,
            client_id=client.id,
            title=template[0],
            description=f"{template[1]} Lokalizacja: {profile.city}, {profile.voivodeship}.",
            value=round(random.uniform(500, 15000), 2),
            status="nowe",
            created_at=datetime.now(),
        )
        db.add(order)
        accepted += 1
        source_totals[source_type]["accepted"] += 1

    db.commit()

    for source_type, totals in source_totals.items():
        db.add(
            AcquisitionLog(
                project_id=project_id,
                voivodeship=voivodeship,
                industries=",".join(industries),
                source_type=source_type,
                found=totals["found"],
                accepted=totals["accepted"],
                rejected=totals["found"] - totals["accepted"],
            )
        )

    if vs:
        vs.status = "zakonczone"
        vs.last_scan = datetime.now()
        vs.clients_count = db.query(Client).filter_by(project_id=project_id, voivodeship=voivodeship).count()
        vs.orders_count = (
            db.query(Order)
            .join(Client)
            .filter(Order.project_id == project_id, Client.voivodeship == voivodeship)
            .count()
        )
    db.commit()

    result = {
        "project_id": project_id,
        "voivodeship": voivodeship,
        "industries": industries,
        "total_found": raw_total_found,
        "accepted": accepted,
        "rejected": rejected,
        "sources": [{"source_type": source_type, "found": totals["found"]} for source_type, totals in source_totals.items()],
    }
    system_event("pipeline", "completed", "Pipeline completed", result)
    return result
