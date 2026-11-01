from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.models import User
from app.schemas.schemas import RequisitionCreate, RequisitionUpdate, RequisitionResponse
from app.services.requisition_service import (
    list_requisitions, get_requisition, create_requisition, update_requisition
)
from app.services.auth_service import get_current_user

router = APIRouter(prefix="/requisitions", tags=["Requisitions"])

@router.get("")
def get_all_requisitions(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    department: Optional[str] = None,
    status: Optional[str] = None,
    search: Optional[str] = None,
    db: Session = Depends(get_db)
):
    items, total = list_requisitions(db, skip=skip, limit=limit, department=department, status=status, search=search)
    return {
        "items": items,
        "total": total,
        "skip": skip,
        "limit": limit
    }

@router.get("/{requisition_id}")
def get_requisition_by_id(requisition_id: str, db: Session = Depends(get_db)):
    req = get_requisition(db, requisition_id)
    if not req:
        raise HTTPException(status_code=404, detail="Requisition not found")
    return req

@router.post("", response_model=None)
def create_new_requisition(
    req_in: RequisitionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return create_requisition(db, req_in, actor=current_user.name if current_user else "Admin")

@router.put("/{requisition_id}", response_model=None)
def update_existing_requisition(
    requisition_id: str,
    req_in: RequisitionUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    updated = update_requisition(db, requisition_id, req_in, actor=current_user.name if current_user else "Admin")
    if not updated:
        raise HTTPException(status_code=404, detail="Requisition not found")
    return updated
