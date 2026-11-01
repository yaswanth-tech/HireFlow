from datetime import datetime, timezone
import uuid
from typing import List, Optional
from fastapi import HTTPException
from sqlalchemy.orm import Session
from app.models.models import (
    Application, ApplicationStageHistory, Candidate, Requisition,
    Interview, Scorecard, Offer
)
from app.schemas.schemas import ApplicationCreate, ApplicationStageTransition
from app.services.audit_service import log_event

VALID_STAGES = [
    "APPLIED",
    "SCREENING",
    "TECHNICAL_INTERVIEW",
    "PANEL_INTERVIEW",
    "OFFER",
    "HIRED",
    "REJECTED",
    "WITHDRAWN"
]

STAGE_ORDER = {
    "APPLIED": 1,
    "SCREENING": 2,
    "TECHNICAL_INTERVIEW": 3,
    "PANEL_INTERVIEW": 4,
    "OFFER": 5,
    "HIRED": 6,
    "REJECTED": 99,
    "WITHDRAWN": 99
}

def create_application(db: Session, app_data: ApplicationCreate, actor: str = "Recruiter") -> dict:
    # Ensure candidate exists
    candidate = db.query(Candidate).filter(Candidate.id == app_data.candidate_id).first()
    if not candidate:
        raise HTTPException(status_code=404, detail="Candidate not found")

    # Ensure requisition exists
    req = db.query(Requisition).filter(Requisition.id == app_data.requisition_id).first()
    if not req:
        raise HTTPException(status_code=404, detail="Requisition not found")

    # Check duplicate application (Primary-key / unique rule)
    app_id = f"APP-{app_data.candidate_id}-{app_data.requisition_id}"
    existing = db.query(Application).filter(Application.id == app_id).first()
    if existing:
        raise HTTPException(status_code=400, detail="Candidate already applied to this requisition")

    new_app = Application(
        id=app_id,
        candidate_id=app_data.candidate_id,
        requisition_id=app_data.requisition_id,
        stage="APPLIED",
        source=app_data.source,
        applied_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc),
        notes=app_data.notes
    )
    db.add(new_app)
    db.flush()

    # Create initial stage history record
    history = ApplicationStageHistory(
        id=f"HIST-{uuid.uuid4().hex[:10].upper()}",
        application_id=app_id,
        from_stage=None,
        to_stage="APPLIED",
        transitioned_by=actor,
        transitioned_at=datetime.now(timezone.utc),
        notes=app_data.notes or "Initial candidate application submitted"
    )
    db.add(history)

    log_event(
        db,
        actor=actor,
        action="CREATE_APPLICATION",
        entity_type="APPLICATION",
        entity_id=app_id,
        new_state={"candidate_id": app_data.candidate_id, "requisition_id": app_data.requisition_id, "stage": "APPLIED"}
    )

    db.commit()
    return get_application(db, app_id)

def get_application(db: Session, application_id: str) -> Optional[dict]:
    app = db.query(Application).filter(Application.id == application_id).first()
    if not app:
        return None

    history = (
        db.query(ApplicationStageHistory)
        .filter(ApplicationStageHistory.application_id == application_id)
        .order_by(ApplicationStageHistory.transitioned_at.asc())
        .all()
    )

    interviews = (
        db.query(Interview)
        .filter(Interview.application_id == application_id)
        .order_by(Interview.scheduled_start.desc())
        .all()
    )

    scorecards = (
        db.query(Scorecard)
        .filter(Scorecard.application_id == application_id)
        .order_by(Scorecard.submitted_at.desc())
        .all()
    )

    offers = (
        db.query(Offer)
        .filter(Offer.application_id == application_id)
        .order_by(Offer.created_at.desc())
        .all()
    )

    return {
        "id": app.id,
        "candidate_id": app.candidate_id,
        "candidate_name": f"{app.candidate.first_name} {app.candidate.last_name}" if app.candidate else "Unknown",
        "candidate_email": app.candidate.email if app.candidate else None,
        "requisition_id": app.requisition_id,
        "requisition_title": app.requisition.title if app.requisition else "Unknown",
        "requisition_department": app.requisition.department if app.requisition else "Unknown",
        "stage": app.stage,
        "source": app.source,
        "applied_at": app.applied_at,
        "updated_at": app.updated_at,
        "rejection_reason": app.rejection_reason,
        "notes": app.notes,
        "stage_history": [
            {
                "id": h.id,
                "application_id": h.application_id,
                "from_stage": h.from_stage,
                "to_stage": h.to_stage,
                "transitioned_by": h.transitioned_by,
                "transitioned_at": h.transitioned_at,
                "notes": h.notes
            }
            for h in history
        ],
        "interviews": [
            {
                "id": i.id,
                "interview_type": i.interview_type,
                "scheduled_start": i.scheduled_start,
                "scheduled_end": i.scheduled_end,
                "status": i.status,
                "interviewer_name": i.interviewer_name
            }
            for i in interviews
        ],
        "scorecards": [
            {
                "id": s.id,
                "reviewer_name": s.reviewer_name,
                "weighted_score": s.weighted_score,
                "recommendation": s.recommendation,
                "feedback": s.feedback,
                "submitted_at": s.submitted_at
            }
            for s in scorecards
        ],
        "offers": [
            {
                "id": o.id,
                "base_salary": o.base_salary,
                "bonus": o.bonus,
                "equity_shares": o.equity_shares,
                "status": o.status,
                "is_salary_band_violation": o.is_salary_band_violation,
                "violation_reason": o.violation_reason,
                "start_date": o.start_date
            }
            for o in offers
        ]
    }

def list_applications(
    db: Session,
    skip: int = 0,
    limit: int = 100,
    stage: Optional[str] = None,
    requisition_id: Optional[str] = None,
    candidate_id: Optional[str] = None,
    search: Optional[str] = None
) -> tuple[List[dict], int]:
    query = db.query(Application).join(Candidate).join(Requisition)

    if stage:
        query = query.filter(Application.stage == stage)
    if requisition_id:
        query = query.filter(Application.requisition_id == requisition_id)
    if candidate_id:
        query = query.filter(Application.candidate_id == candidate_id)
    if search:
        query = query.filter(
            (Candidate.first_name.ilike(f"%{search}%")) |
            (Candidate.last_name.ilike(f"%{search}%")) |
            (Candidate.email.ilike(f"%{search}%")) |
            (Requisition.title.ilike(f"%{search}%")) |
            (Application.id.ilike(f"%{search}%"))
        )

    total = query.count()
    apps = query.order_by(Application.updated_at.desc()).offset(skip).limit(limit).all()

    results = []
    for a in apps:
        results.append({
            "id": a.id,
            "candidate_id": a.candidate_id,
            "candidate_name": f"{a.candidate.first_name} {a.candidate.last_name}" if a.candidate else "Unknown",
            "candidate_email": a.candidate.email if a.candidate else None,
            "requisition_id": a.requisition_id,
            "requisition_title": a.requisition.title if a.requisition else "Unknown",
            "requisition_department": a.requisition.department if a.requisition else "Unknown",
            "stage": a.stage,
            "source": a.source,
            "applied_at": a.applied_at,
            "updated_at": a.updated_at,
            "rejection_reason": a.rejection_reason,
            "notes": a.notes
        })

    return results, total

def transition_application_stage(
    db: Session,
    application_id: str,
    transition_data: ApplicationStageTransition,
    actor: str = "Recruiter",
    force_override: bool = False
) -> dict:
    app = db.query(Application).filter(Application.id == application_id).first()
    if not app:
        raise HTTPException(status_code=404, detail="Application not found")

    to_stage = transition_data.to_stage.upper()
    if to_stage not in VALID_STAGES:
        raise HTTPException(status_code=400, detail=f"Invalid target stage '{to_stage}'. Must be one of: {', '.join(VALID_STAGES)}")

    from_stage = app.stage
    if from_stage == to_stage:
        return get_application(db, application_id)

    # ================= Mandatory Transition Rules =================
    if not force_override:
        # Rule 1: Terminal Stage Protection
        if from_stage in ["WITHDRAWN", "REJECTED"] and to_stage not in ["APPLIED", "SCREENING"]:
            raise HTTPException(
                status_code=400,
                detail=f"Candidate application is currently '{from_stage}'. Must be formally reopened to APPLIED or SCREENING first."
            )

        # Rule 2: Advancing to OFFER requires at least one completed scorecard
        if to_stage == "OFFER":
            scorecard_count = db.query(Scorecard).filter(Scorecard.application_id == application_id).count()
            if scorecard_count == 0:
                raise HTTPException(
                    status_code=400,
                    detail="Compliance Violation: Cannot advance candidate to OFFER stage without at least one completed interview evaluation scorecard."
                )

        # Rule 3: Advancing to HIRED requires an APPROVED or ACCEPTED offer
        if to_stage == "HIRED":
            valid_offer = db.query(Offer).filter(
                Offer.application_id == application_id,
                Offer.status.in_(["APPROVED", "ACCEPTED", "EXTENDED"])
            ).first()
            if not valid_offer:
                raise HTTPException(
                    status_code=400,
                    detail="Compliance Violation: Cannot transition candidate to HIRED without an approved and accepted employment offer."
                )

    # Perform transition
    app.stage = to_stage
    app.updated_at = datetime.now(timezone.utc)
    if transition_data.rejection_reason:
        app.rejection_reason = transition_data.rejection_reason
    if transition_data.notes:
        app.notes = transition_data.notes

    # Add immutable stage history entry
    history = ApplicationStageHistory(
        id=f"HIST-{uuid.uuid4().hex[:10].upper()}",
        application_id=application_id,
        from_stage=from_stage,
        to_stage=to_stage,
        transitioned_by=actor,
        transitioned_at=datetime.now(timezone.utc),
        notes=transition_data.notes or f"Transitioned from {from_stage} to {to_stage}"
    )
    db.add(history)

    log_event(
        db,
        actor=actor,
        action="STAGE_TRANSITION",
        entity_type="APPLICATION",
        entity_id=application_id,
        previous_state={"stage": from_stage},
        new_state={"stage": to_stage, "reason": transition_data.rejection_reason},
        metadata_info={"notes": transition_data.notes}
    )

    db.commit()
    return get_application(db, application_id)
