from datetime import datetime, timezone
from typing import List, Optional
from fastapi import HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.models.models import Interview, Application, Candidate, Requisition, Availability, Scorecard
from app.schemas.schemas import InterviewCreate, InterviewUpdate
from app.services.audit_service import log_event

def generate_interview_id(db: Session) -> str:
    # Pattern: INT-2026-000001
    count = db.query(func.count(Interview.id)).scalar() or 0
    next_num = count + 1
    while db.query(Interview).filter(Interview.id == f"INT-2026-{next_num:06d}").first():
        next_num += 1
    return f"INT-2026-{next_num:06d}"

def to_naive(dt):
    if dt is None:
        return None
    if getattr(dt, 'tzinfo', None) is not None:
        return dt.astimezone(timezone.utc).replace(tzinfo=None)
    return dt

def check_interviewer_conflict(
    db: Session,
    interviewer_id: str,
    start_time: datetime,
    end_time: datetime,
    exclude_interview_id: Optional[str] = None
) -> Optional[Interview]:
    s = to_naive(start_time)
    e = to_naive(end_time)
    query = db.query(Interview).filter(
        Interview.interviewer_id == interviewer_id,
        Interview.status == "SCHEDULED",
        Interview.scheduled_start < e,
        Interview.scheduled_end > s
    )
    if exclude_interview_id:
        query = query.filter(Interview.id != exclude_interview_id)
    return query.first()

def check_candidate_conflict(
    db: Session,
    candidate_id: str,
    start_time: datetime,
    end_time: datetime,
    exclude_interview_id: Optional[str] = None
) -> Optional[Interview]:
    s = to_naive(start_time)
    e = to_naive(end_time)
    query = db.query(Interview).filter(
        Interview.candidate_id == candidate_id,
        Interview.status == "SCHEDULED",
        Interview.scheduled_start < e,
        Interview.scheduled_end > s
    )
    if exclude_interview_id:
        query = query.filter(Interview.id != exclude_interview_id)
    return query.first()

def schedule_interview(
    db: Session,
    data: InterviewCreate,
    actor: str = "Recruiter",
    allow_conflict_override: bool = False
) -> dict:
    app = db.query(Application).filter(Application.id == data.application_id).first()
    if not app:
        raise HTTPException(status_code=404, detail="Application not found")

    if app.stage in ["WITHDRAWN", "REJECTED"]:
        raise HTTPException(
            status_code=400,
            detail=f"Cannot schedule interview: Candidate application is currently '{app.stage}'."
        )

    if data.scheduled_end <= data.scheduled_start:
        raise HTTPException(status_code=400, detail="Interview end time must be after start time")

    # Conflict detection
    if not allow_conflict_override:
        interviewer_conflict = check_interviewer_conflict(
            db, data.interviewer_id, data.scheduled_start, data.scheduled_end
        )
        if interviewer_conflict:
            raise HTTPException(
                status_code=409,
                detail=f"Interviewer conflict: {data.interviewer_name} is already booked for interview {interviewer_conflict.id} between {interviewer_conflict.scheduled_start.strftime('%H:%M')} and {interviewer_conflict.scheduled_end.strftime('%H:%M')}."
            )

        cand_conflict = check_candidate_conflict(
            db, app.candidate_id, data.scheduled_start, data.scheduled_end
        )
        if cand_conflict:
            raise HTTPException(
                status_code=409,
                detail=f"Candidate conflict: Candidate already has an interview {cand_conflict.id} scheduled during this time slot."
            )

    int_id = generate_interview_id(db)
    new_interview = Interview(
        id=int_id,
        application_id=data.application_id,
        requisition_id=app.requisition_id,
        candidate_id=app.candidate_id,
        interview_type=data.interview_type,
        scheduled_start=data.scheduled_start,
        scheduled_end=data.scheduled_end,
        status="SCHEDULED",
        interviewer_id=data.interviewer_id,
        interviewer_name=data.interviewer_name,
        meeting_link=data.meeting_link or f"https://meet.hireflow.internal/{int_id.lower()}",
        notes=data.notes,
        created_at=datetime.now(timezone.utc)
    )
    db.add(new_interview)
    db.flush()

    # Automatically advance application to appropriate interview stage if still in APPLIED/SCREENING
    if app.stage in ["APPLIED", "SCREENING"]:
        app.stage = "TECHNICAL_INTERVIEW" if data.interview_type == "TECHNICAL" else "SCREENING"
        app.updated_at = datetime.now(timezone.utc)

    log_event(
        db,
        actor=actor,
        action="SCHEDULE_INTERVIEW",
        entity_type="INTERVIEW",
        entity_id=int_id,
        new_state={
            "application_id": data.application_id,
            "interviewer": data.interviewer_name,
            "type": data.interview_type,
            "scheduled_start": str(data.scheduled_start),
            "scheduled_end": str(data.scheduled_end)
        }
    )

    db.commit()
    return get_interview(db, int_id)

def get_interview(db: Session, interview_id: str) -> Optional[dict]:
    i = db.query(Interview).filter(Interview.id == interview_id).first()
    if not i:
        return None
    scorecard = db.query(Scorecard).filter(Scorecard.interview_id == interview_id).first()
    return {
        "id": i.id,
        "application_id": i.application_id,
        "requisition_id": i.requisition_id,
        "candidate_id": i.candidate_id,
        "candidate_name": f"{i.candidate.first_name} {i.candidate.last_name}" if i.candidate else "Unknown",
        "requisition_title": i.requisition.title if i.requisition else "Unknown",
        "interview_type": i.interview_type,
        "scheduled_start": i.scheduled_start,
        "scheduled_end": i.scheduled_end,
        "status": i.status,
        "interviewer_id": i.interviewer_id,
        "interviewer_name": i.interviewer_name,
        "meeting_link": i.meeting_link,
        "notes": i.notes,
        "created_at": i.created_at,
        "has_scorecard": scorecard is not None
    }

def list_interviews(
    db: Session,
    skip: int = 0,
    limit: int = 100,
    status: Optional[str] = None,
    interviewer_id: Optional[str] = None,
    interview_type: Optional[str] = None,
    date_from: Optional[datetime] = None,
    date_to: Optional[datetime] = None
) -> tuple[List[dict], int]:
    query = db.query(Interview)

    if status:
        query = query.filter(Interview.status == status)
    if interviewer_id:
        query = query.filter(Interview.interviewer_id == interviewer_id)
    if interview_type:
        query = query.filter(Interview.interview_type == interview_type)
    if date_from:
        query = query.filter(Interview.scheduled_start >= date_from)
    if date_to:
        query = query.filter(Interview.scheduled_end <= date_to)

    total = query.count()
    interviews = query.order_by(Interview.scheduled_start.desc()).offset(skip).limit(limit).all()

    results = []
    for i in interviews:
        scorecard = db.query(Scorecard).filter(Scorecard.interview_id == i.id).first()
        results.append({
            "id": i.id,
            "application_id": i.application_id,
            "requisition_id": i.requisition_id,
            "candidate_id": i.candidate_id,
            "candidate_name": f"{i.candidate.first_name} {i.candidate.last_name}" if i.candidate else "Unknown",
            "requisition_title": i.requisition.title if i.requisition else "Unknown",
            "interview_type": i.interview_type,
            "scheduled_start": i.scheduled_start,
            "scheduled_end": i.scheduled_end,
            "status": i.status,
            "interviewer_id": i.interviewer_id,
            "interviewer_name": i.interviewer_name,
            "meeting_link": i.meeting_link,
            "notes": i.notes,
            "created_at": i.created_at,
            "has_scorecard": scorecard is not None
        })

    return results, total

def reschedule_interview(
    db: Session,
    interview_id: str,
    new_start: datetime,
    new_end: datetime,
    actor: str = "Recruiter",
    allow_override: bool = False
) -> dict:
    int_obj = db.query(Interview).filter(Interview.id == interview_id).first()
    if not int_obj:
        raise HTTPException(status_code=404, detail="Interview not found")

    if new_end <= new_start:
        raise HTTPException(status_code=400, detail="End time must be after start time")

    if not allow_override:
        conflict = check_interviewer_conflict(db, int_obj.interviewer_id, new_start, new_end, exclude_interview_id=interview_id)
        if conflict:
            raise HTTPException(
                status_code=409,
                detail=f"Reschedule conflict: Interviewer has an active interview {conflict.id} at this time."
            )

    prev = {"start": str(int_obj.scheduled_start), "end": str(int_obj.scheduled_end), "status": int_obj.status}
    int_obj.scheduled_start = new_start
    int_obj.scheduled_end = new_end
    int_obj.status = "RESCHEDULED"

    log_event(
        db,
        actor=actor,
        action="RESCHEDULE_INTERVIEW",
        entity_type="INTERVIEW",
        entity_id=interview_id,
        previous_state=prev,
        new_state={"start": str(new_start), "end": str(new_end), "status": "RESCHEDULED"}
    )

    db.commit()
    return get_interview(db, interview_id)

def cancel_interview(db: Session, interview_id: str, reason: str = "Cancelled by recruiter", actor: str = "Recruiter") -> dict:
    int_obj = db.query(Interview).filter(Interview.id == interview_id).first()
    if not int_obj:
        raise HTTPException(status_code=404, detail="Interview not found")

    prev_status = int_obj.status
    int_obj.status = "CANCELLED"
    int_obj.notes = f"{int_obj.notes or ''} [Cancelled: {reason}]"

    log_event(
        db,
        actor=actor,
        action="CANCEL_INTERVIEW",
        entity_type="INTERVIEW",
        entity_id=interview_id,
        previous_state={"status": prev_status},
        new_state={"status": "CANCELLED", "reason": reason}
    )

    db.commit()
    return get_interview(db, interview_id)
