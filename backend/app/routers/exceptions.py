from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sqlalchemy import text
from app.database import get_db
from app.models.models import User
from app.services.exception_service import (
    detect_all_exceptions, get_ground_truth_reconciliation,
    get_resolution_history, record_exception_resolution
)
from app.services.auth_service import get_current_user

router = APIRouter(prefix="/exceptions", tags=["Exception Intelligence"])

class ResolveExceptionRequest(BaseModel):
    action: str  # CANCEL_INTERVIEW, ADJUST_SALARY, REQUEST_SCORECARD, DISMISS, GRANT_WAIVER
    notes: str = ""

@router.get("")
def get_exceptions(db: Session = Depends(get_db)):
    exceptions = detect_all_exceptions(db, include_resolved=False)
    return {
        "total_exceptions": len(exceptions),
        "items": exceptions
    }

@router.get("/history")
def get_history(db: Session = Depends(get_db)):
    history = get_resolution_history(db)
    return {
        "total_resolved": len(history),
        "items": history
    }

@router.get("/reconciliation")
def get_reconciliation_report(db: Session = Depends(get_db)):
    return get_ground_truth_reconciliation(db)

@router.post("/{exception_id}/resolve")
def resolve_exception(
    exception_id: str,
    data: ResolveExceptionRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    actor_name = current_user.name if current_user else "Compliance Lead"

    # Action dispatch on entity
    if "EXC-WITHDRAWN-SCHED" in exception_id or data.action == "CANCEL_INTERVIEW":
        int_id = exception_id.replace("EXC-WITHDRAWN-SCHED-", "")
        db.execute(text("UPDATE interviews SET status = 'CANCELLED' WHERE id = :id"), {"id": int_id})
        db.commit()

    elif "EXC-SALARY" in exception_id or data.action in ["ADJUST_SALARY", "GRANT_WAIVER"]:
        off_id = exception_id.replace("EXC-SALARY-", "").replace("LOW-", "")
        db.execute(text("UPDATE offers SET is_salary_band_violation = 0 WHERE id = :id"), {"id": off_id})
        db.commit()

    res = record_exception_resolution(
        db,
        exception_id=exception_id,
        action_taken=data.action,
        resolved_by=actor_name,
        notes=data.notes
    )
    return res
