from datetime import datetime
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.models import User
from app.schemas.schemas import InterviewCreate
from app.services.interview_service import (
    list_interviews, get_interview, schedule_interview, reschedule_interview, cancel_interview
)
from app.services.auth_service import get_current_user

router = APIRouter(prefix="/interviews", tags=["Interviews"])

class RescheduleRequest(BaseModel):
    new_start: datetime
    new_end: datetime
    allow_override: bool = False

class CancelRequest(BaseModel):
    reason: str = "Candidate cancelled"

@router.get("")
def get_all_interviews(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    status: Optional[str] = None,
    interviewer_id: Optional[str] = None,
    interview_type: Optional[str] = None,
    db: Session = Depends(get_db)
):
    items, total = list_interviews(
        db, skip=skip, limit=limit, status=status,
        interviewer_id=interviewer_id, interview_type=interview_type
    )
    return {
        "items": items,
        "total": total,
        "skip": skip,
        "limit": limit
    }

@router.get("/{interview_id}")
def get_interview_by_id(interview_id: str, db: Session = Depends(get_db)):
    res = get_interview(db, interview_id)
    if not res:
        raise HTTPException(status_code=404, detail="Interview not found")
    return res

@router.post("")
def schedule_new_interview(
    data: InterviewCreate,
    allow_conflict_override: bool = False,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return schedule_interview(
        db, data,
        actor=current_user.name if current_user else "Recruiter",
        allow_conflict_override=allow_conflict_override
    )

@router.post("/{interview_id}/reschedule")
def reschedule_existing_interview(
    interview_id: str,
    data: RescheduleRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return reschedule_interview(
        db, interview_id,
        new_start=data.new_start,
        new_end=data.new_end,
        actor=current_user.name if current_user else "Recruiter",
        allow_override=data.allow_override
    )

@router.post("/{interview_id}/cancel")
def cancel_existing_interview(
    interview_id: str,
    data: CancelRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return cancel_interview(
        db, interview_id,
        reason=data.reason,
        actor=current_user.name if current_user else "Recruiter"
    )
