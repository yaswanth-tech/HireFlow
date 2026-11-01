from datetime import datetime, timezone
from typing import List, Optional, Dict, Any
from fastapi import HTTPException
from sqlalchemy.orm import Session
from app.models.models import Scorecard, Interview, Application, Candidate, Requisition
from app.schemas.schemas import ScorecardCreate
from app.services.audit_service import log_event

def calculate_weighted_score(
    technical: int,
    problem_solving: int,
    role_relevance: int,
    communication: int
) -> float:
    # 40% Technical, 30% Problem Solving, 20% Role Relevance, 10% Communication
    weighted = (
        0.40 * float(technical) +
        0.30 * float(problem_solving) +
        0.20 * float(role_relevance) +
        0.10 * float(communication)
    )
    return round(weighted, 2)

def create_scorecard(db: Session, data: ScorecardCreate, actor: str = "Interviewer") -> dict:
    interview = db.query(Interview).filter(Interview.id == data.interview_id).first()
    if not interview:
        raise HTTPException(status_code=404, detail="Interview not found")

    scorecard_id = f"SCORE-{data.interview_id}-{data.reviewer_id}"
    existing = db.query(Scorecard).filter(Scorecard.id == scorecard_id).first()
    if existing:
        raise HTTPException(status_code=400, detail="Scorecard already submitted by this reviewer for this interview")

    weighted = calculate_weighted_score(
        data.technical_score,
        data.problem_solving_score,
        data.role_relevance_score,
        data.communication_score
    )

    scorecard = Scorecard(
        id=scorecard_id,
        interview_id=data.interview_id,
        application_id=interview.application_id,
        reviewer_id=data.reviewer_id,
        reviewer_name=data.reviewer_name,
        technical_score=data.technical_score,
        communication_score=data.communication_score,
        problem_solving_score=data.problem_solving_score,
        role_relevance_score=data.role_relevance_score,
        weighted_score=weighted,
        recommendation=data.recommendation,
        feedback=data.feedback,
        criteria_evaluated=data.criteria_evaluated,
        submitted_at=datetime.now(timezone.utc)
    )
    db.add(scorecard)

    # Mark interview completed
    interview.status = "COMPLETED"

    log_event(
        db,
        actor=actor,
        action="SUBMIT_SCORECARD",
        entity_type="SCORECARD",
        entity_id=scorecard_id,
        new_state={
            "interview_id": data.interview_id,
            "weighted_score": weighted,
            "recommendation": data.recommendation
        }
    )

    db.commit()
    return get_scorecard(db, scorecard_id)

def get_scorecard(db: Session, scorecard_id: str) -> Optional[dict]:
    s = db.query(Scorecard).filter(Scorecard.id == scorecard_id).first()
    if not s:
        return None
    return {
        "id": s.id,
        "interview_id": s.interview_id,
        "application_id": s.application_id,
        "reviewer_id": s.reviewer_id,
        "reviewer_name": s.reviewer_name,
        "technical_score": s.technical_score,
        "communication_score": s.communication_score,
        "problem_solving_score": s.problem_solving_score,
        "role_relevance_score": s.role_relevance_score,
        "weighted_score": s.weighted_score,
        "recommendation": s.recommendation,
        "feedback": s.feedback,
        "criteria_evaluated": s.criteria_evaluated,
        "submitted_at": s.submitted_at
    }

def list_scorecards_by_application(db: Session, application_id: str) -> List[dict]:
    scorecards = db.query(Scorecard).filter(Scorecard.application_id == application_id).order_by(Scorecard.submitted_at.desc()).all()
    return [get_scorecard(db, s.id) for s in scorecards]

def list_scorecards_by_interview(db: Session, interview_id: str) -> List[dict]:
    scorecards = db.query(Scorecard).filter(Scorecard.interview_id == interview_id).all()
    return [get_scorecard(db, s.id) for s in scorecards]

def list_all_scorecards(
    db: Session,
    skip: int = 0,
    limit: int = 50,
    recommendation: Optional[str] = None
) -> Dict[str, Any]:
    query = (
        db.query(
            Scorecard,
            Candidate.first_name,
            Candidate.last_name,
            Requisition.title.label("requisition_title")
        )
        .join(Application, Scorecard.application_id == Application.id)
        .join(Candidate, Application.candidate_id == Candidate.id)
        .join(Requisition, Application.requisition_id == Requisition.id)
    )

    if recommendation:
        query = query.filter(Scorecard.recommendation == recommendation)

    total = query.count()
    records = query.order_by(Scorecard.submitted_at.desc()).offset(skip).limit(limit).all()

    items = []
    for sc, first_name, last_name, req_title in records:
        card = get_scorecard(db, sc.id)
        card["candidate_name"] = f"{first_name} {last_name}"
        card["requisition_title"] = req_title
        items.append(card)

    return {
        "total": total,
        "items": items
    }
