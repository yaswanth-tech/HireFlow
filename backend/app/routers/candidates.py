from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.models import User
from app.schemas.schemas import CandidateCreate, CandidateUpdate
from app.services.candidate_service import (
    list_candidates, get_candidate, create_candidate, update_candidate
)
from app.services.auth_service import get_current_user

router = APIRouter(prefix="/candidates", tags=["Candidates"])

@router.get("")
def get_all_candidates(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    status: Optional[str] = None,
    search: Optional[str] = None,
    db: Session = Depends(get_db)
):
    items, total = list_candidates(db, skip=skip, limit=limit, status=status, search=search)
    return {
        "items": items,
        "total": total,
        "skip": skip,
        "limit": limit
    }

@router.get("/{candidate_id}")
def get_candidate_by_id(candidate_id: str, db: Session = Depends(get_db)):
    cand = get_candidate(db, candidate_id)
    if not cand:
        raise HTTPException(status_code=404, detail="Candidate not found")
    return cand

@router.post("")
def create_new_candidate(
    cand_in: CandidateCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return create_candidate(db, cand_in, actor=current_user.name if current_user else "Recruiter")

@router.put("/{candidate_id}")
def update_existing_candidate(
    candidate_id: str,
    cand_in: CandidateUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    updated = update_candidate(db, candidate_id, cand_in, actor=current_user.name if current_user else "Recruiter")
    if not updated:
        raise HTTPException(status_code=404, detail="Candidate not found")
    return updated
