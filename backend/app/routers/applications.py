from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.models import User
from app.schemas.schemas import ApplicationCreate, ApplicationStageTransition
from app.services.application_service import (
    list_applications, get_application, create_application, transition_application_stage
)
from app.services.auth_service import get_current_user

router = APIRouter(prefix="/applications", tags=["Applications"])

@router.get("")
def get_all_applications(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    stage: Optional[str] = None,
    requisition_id: Optional[str] = None,
    candidate_id: Optional[str] = None,
    search: Optional[str] = None,
    db: Session = Depends(get_db)
):
    items, total = list_applications(
        db, skip=skip, limit=limit, stage=stage,
        requisition_id=requisition_id, candidate_id=candidate_id, search=search
    )
    return {
        "items": items,
        "total": total,
        "skip": skip,
        "limit": limit
    }

@router.get("/{application_id}")
def get_application_by_id(application_id: str, db: Session = Depends(get_db)):
    app = get_application(db, application_id)
    if not app:
        raise HTTPException(status_code=404, detail="Application not found")
    return app

@router.post("")
def submit_new_application(
    app_in: ApplicationCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return create_application(db, app_in, actor=current_user.name if current_user else "Recruiter")

@router.post("/{application_id}/transition")
def transition_stage(
    application_id: str,
    transition_data: ApplicationStageTransition,
    force_override: bool = False,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return transition_application_stage(
        db, application_id, transition_data,
        actor=current_user.name if current_user else "Recruiter",
        force_override=force_override
    )
