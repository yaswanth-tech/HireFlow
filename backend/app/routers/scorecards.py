from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.models import User
from app.schemas.schemas import ScorecardCreate, ScorecardResponse
from app.services.scorecard_service import (
    create_scorecard, get_scorecard, list_scorecards_by_application, list_scorecards_by_interview,
    list_all_scorecards
)
from app.services.auth_service import get_current_user

router = APIRouter(prefix="/scorecards", tags=["Scorecards"])

@router.get("")
def list_scorecards(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    recommendation: Optional[str] = None,
    db: Session = Depends(get_db)
):
    return list_all_scorecards(db, skip=skip, limit=limit, recommendation=recommendation)

@router.post("")
def submit_evaluation_scorecard(
    data: ScorecardCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return create_scorecard(db, data, actor=current_user.name if current_user else "Interviewer")

@router.get("/{scorecard_id}")
def get_scorecard_by_id(scorecard_id: str, db: Session = Depends(get_db)):
    sc = get_scorecard(db, scorecard_id)
    if not sc:
        raise HTTPException(status_code=404, detail="Scorecard not found")
    return sc

@router.get("/by-application/{application_id}")
def get_scorecards_for_application(application_id: str, db: Session = Depends(get_db)):
    return list_scorecards_by_application(db, application_id)

@router.get("/by-interview/{interview_id}")
def get_scorecards_for_interview(interview_id: str, db: Session = Depends(get_db)):
    return list_scorecards_by_interview(db, interview_id)
