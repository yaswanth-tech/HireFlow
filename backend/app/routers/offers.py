from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.models import User
from app.schemas.schemas import OfferCreate, ApprovalAction
from app.services.offer_service import (
    create_offer, get_offer, list_offers, process_approval, update_offer_status
)
from app.services.auth_service import get_current_user

router = APIRouter(prefix="/offers", tags=["Offers"])

class OfferStatusUpdate(BaseModel):
    status: str

@router.get("")
def get_all_offers(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    status: Optional[str] = None,
    violations_only: bool = False,
    db: Session = Depends(get_db)
):
    items, total = list_offers(db, skip=skip, limit=limit, status=status, violations_only=violations_only)
    return {
        "items": items,
        "total": total,
        "skip": skip,
        "limit": limit
    }

@router.get("/{offer_id}")
def get_offer_by_id(offer_id: str, db: Session = Depends(get_db)):
    off = get_offer(db, offer_id)
    if not off:
        raise HTTPException(status_code=404, detail="Offer not found")
    return off

@router.post("")
def generate_new_offer(
    data: OfferCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return create_offer(db, data, actor=current_user.name if current_user else "Recruiter")

@router.post("/approvals/{approval_id}/action")
def act_on_approval(
    approval_id: str,
    action_data: ApprovalAction,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return process_approval(
        db, approval_id, action_data,
        actor=current_user.name if current_user else "Approver"
    )

@router.patch("/{offer_id}/status")
def change_offer_status(
    offer_id: str,
    status_data: OfferStatusUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return update_offer_status(
        db, offer_id, status_data.status,
        actor=current_user.name if current_user else "Recruiter"
    )
