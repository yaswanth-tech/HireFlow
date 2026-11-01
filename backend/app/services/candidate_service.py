from datetime import datetime, timezone
from typing import List, Optional
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.models.models import Candidate, Application
from app.schemas.schemas import CandidateCreate, CandidateUpdate
from app.services.audit_service import log_event

def generate_candidate_id(db: Session) -> str:
    # Pattern: CAND-000001
    count = db.query(func.count(Candidate.id)).scalar() or 0
    next_num = count + 1
    while db.query(Candidate).filter(Candidate.id == f"CAND-{next_num:06d}").first():
        next_num += 1
    return f"CAND-{next_num:06d}"

def list_candidates(
    db: Session,
    skip: int = 0,
    limit: int = 100,
    search: Optional[str] = None,
    status: Optional[str] = None
) -> tuple[List[dict], int]:
    query = db.query(Candidate)

    if status:
        query = query.filter(Candidate.status == status)
    if search:
        query = query.filter(
            (Candidate.first_name.ilike(f"%{search}%")) |
            (Candidate.last_name.ilike(f"%{search}%")) |
            (Candidate.email.ilike(f"%{search}%")) |
            (Candidate.skills.ilike(f"%{search}%")) |
            (Candidate.current_company.ilike(f"%{search}%")) |
            (Candidate.current_title.ilike(f"%{search}%")) |
            (Candidate.id.ilike(f"%{search}%"))
        )

    total = query.count()
    candidates = query.order_by(Candidate.created_at.desc()).offset(skip).limit(limit).all()

    results = []
    for c in candidates:
        active_apps = db.query(func.count(Application.id)).filter(
            Application.candidate_id == c.id,
            Application.stage.notin_(["REJECTED", "WITHDRAWN", "HIRED"])
        ).scalar() or 0

        results.append({
            "id": c.id,
            "first_name": c.first_name,
            "last_name": c.last_name,
            "email": c.email,
            "phone": c.phone,
            "current_company": c.current_company,
            "current_title": c.current_title,
            "years_experience": c.years_experience,
            "skills": c.skills,
            "location": c.location,
            "status": c.status,
            "created_at": c.created_at,
            "active_applications_count": active_apps
        })

    return results, total

def get_candidate(db: Session, candidate_id: str) -> Optional[dict]:
    c = db.query(Candidate).filter(Candidate.id == candidate_id).first()
    if not c:
        return None
    active_apps = db.query(func.count(Application.id)).filter(
        Application.candidate_id == c.id,
        Application.stage.notin_(["REJECTED", "WITHDRAWN", "HIRED"])
    ).scalar() or 0

    return {
        "id": c.id,
        "first_name": c.first_name,
        "last_name": c.last_name,
        "email": c.email,
        "phone": c.phone,
        "current_company": c.current_company,
        "current_title": c.current_title,
        "years_experience": c.years_experience,
        "skills": c.skills,
        "location": c.location,
        "status": c.status,
        "created_at": c.created_at,
        "active_applications_count": active_apps
    }

def create_candidate(db: Session, c_data: CandidateCreate, actor: str = "Recruiter") -> dict:
    cand_id = generate_candidate_id(db)

    cand = Candidate(
        id=cand_id,
        first_name=c_data.first_name,
        last_name=c_data.last_name,
        email=c_data.email,
        phone=c_data.phone,
        current_company=c_data.current_company,
        current_title=c_data.current_title,
        years_experience=c_data.years_experience,
        skills=c_data.skills,
        location=c_data.location,
        status=c_data.status,
        created_at=datetime.now(timezone.utc)
    )
    db.add(cand)
    db.flush()

    log_event(
        db,
        actor=actor,
        action="CREATE_CANDIDATE",
        entity_type="CANDIDATE",
        entity_id=cand_id,
        new_state={"name": f"{cand.first_name} {cand.last_name}", "email": cand.email, "title": cand.current_title}
    )

    db.commit()
    return get_candidate(db, cand_id)

def update_candidate(db: Session, candidate_id: str, c_data: CandidateUpdate, actor: str = "Recruiter") -> Optional[dict]:
    cand = db.query(Candidate).filter(Candidate.id == candidate_id).first()
    if not cand:
        return None

    prev = {"status": cand.status, "company": cand.current_company, "title": cand.current_title}
    for field, val in c_data.dict(exclude_unset=True).items():
        setattr(cand, field, val)

    log_event(
        db,
        actor=actor,
        action="UPDATE_CANDIDATE",
        entity_type="CANDIDATE",
        entity_id=candidate_id,
        previous_state=prev,
        new_state=c_data.dict(exclude_unset=True)
    )

    db.commit()
    return get_candidate(db, candidate_id)
