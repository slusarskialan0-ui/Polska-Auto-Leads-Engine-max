"""Auto-pipeline: orchestrates all data sources and writes results to DB."""
import random
import concurrent.futures
from datetime import datetime
from sqlalchemy.orm import Session
from app.sources import ALL_SOURCES, validate_email, validate_phone, CompanyProfile
from app.sources.sources import BaseSource
from app.models.models import Client, Order, AcquisitionLog, VoivodeshipStatus, Location
from app.data.geography import ORDER_TEMPLATES


def _dedup(profiles: list[CompanyProfile]) -> list[CompanyProfile]:
    seen = set()
    result = []
    for p in profiles:
        key = (p.company_name.lower().strip(), p.voivodeship, p.industry)
        if key not in seen:
            seen.add(key)
            result.append(p)
    return result


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
    except Exception as exc:
        return source.source_type, []


def run_pipeline(voivodeship: str, industries: list[str], db: Session) -> dict:
    """Run the full acquisition pipeline for given voivodeship + industries."""
    # Update voivodeship status to in-progress
    vs = db.query(VoivodeshipStatus).filter_by(voivodeship=voivodeship).first()
    if vs:
        vs.status = "w_trakcie"
        db.commit()

    logs = []
    all_profiles = []

    with concurrent.futures.ThreadPoolExecutor() as executor:
        futures = {executor.submit(_fetch_source, src, voivodeship, industries): src for src in ALL_SOURCES}
        for future in concurrent.futures.as_completed(futures):
            source_type, profiles = future.result()
            found = len(profiles)
            logs.append((source_type, found, profiles))
            all_profiles.extend(profiles)

    # Dedup + validate
    all_profiles = _dedup(all_profiles)
    accepted = 0
    rejected = 0

    for profile in all_profiles:
        if not _validate(profile):
            rejected += 1
            continue

        # Ensure location
        loc = db.query(Location).filter_by(
            voivodeship=profile.voivodeship,
            city=profile.city,
            county=profile.county,
        ).first()
        if not loc:
            loc = Location(
                voivodeship=profile.voivodeship,
                county=profile.county,
                city=profile.city,
            )
            db.add(loc)
            db.flush()

        client = Client(
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

        # Generate order
        tmpl = ORDER_TEMPLATES.get(profile.industry, (
            f"Pozyskanie klienta – {profile.industry}",
            f"Propozycja współpracy dla firmy z branży {profile.industry}.",
        ))
        order = Order(
            client_id=client.id,
            title=tmpl[0],
            description=f"{tmpl[1]} Lokalizacja: {profile.city}, {profile.voivodeship}.",
            value=round(random.uniform(500, 15000), 2),
            status="nowe",
            created_at=datetime.now(),
        )
        db.add(order)
        accepted += 1

    db.commit()

    # Save logs per source
    for source_type, found, profiles in logs:
        src_accepted = len([p for p in profiles if _validate(p)])
        log = AcquisitionLog(
            voivodeship=voivodeship,
            industries=",".join(industries),
            source_type=source_type,
            found=found,
            accepted=src_accepted,
            rejected=found - src_accepted,
        )
        db.add(log)

    # Update voivodeship status
    if vs:
        vs.status = "zakonczone"
        vs.last_scan = datetime.now()
        vs.clients_count = db.query(Client).filter_by(voivodeship=voivodeship).count()
        vs.orders_count = db.query(Order).join(Client).filter(Client.voivodeship == voivodeship).count()
    db.commit()

    return {
        "voivodeship": voivodeship,
        "industries": industries,
        "total_found": len(all_profiles) + rejected,
        "accepted": accepted,
        "rejected": rejected,
        "sources": [{"source_type": st, "found": f} for st, f, _ in logs],
    }
