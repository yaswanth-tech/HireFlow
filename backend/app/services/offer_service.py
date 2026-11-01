from datetime import datetime, timezone
from typing import List, Optional
from fastapi import HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.models.models import Offer, Approval, Application, Requisition, Candidate
from app.schemas.schemas import OfferCreate, OfferUpdate, ApprovalAction
from app.services.audit_service import log_event

def generate_offer_id(db: Session) -> str:
    count = db.query(func.count(Offer.id)).scalar() or 0
    next_num = count + 1
    while db.query(Offer).filter(Offer.id == f"OFF-2026-{next_num:06d}").first():
        next_num += 1
    return f"OFF-2026-{next_num:06d}"

def generate_approval_id(db: Session) -> str:
    count = db.query(func.count(Approval.id)).scalar() or 0
    next_num = count + 1
    while db.query(Approval).filter(Approval.id == f"APPR-2026-{next_num:06d}").first():
        next_num += 1
    return f"APPR-2026-{next_num:06d}"

def create_offer(db: Session, data: OfferCreate, actor: str = "Recruiter") -> dict:
    app = db.query(Application).filter(Application.id == data.application_id).first()
    if not app:
        raise HTTPException(status_code=404, detail="Application not found")

    req = app.requisition
    if not req:
        raise HTTPException(status_code=404, detail="Associated requisition not found")

    # Salary band validation check
    is_violation = False
    violation_reason = None
    if data.base_salary > req.max_salary:
        is_violation = True
        violation_reason = f"Base salary ${data.base_salary:,.2f} exceeds approved band maximum ${req.max_salary:,.2f}."
    elif data.base_salary < req.min_salary:
        is_violation = True
        violation_reason = f"Base salary ${data.base_salary:,.2f} is below approved band minimum ${req.min_salary:,.2f}."

    offer_id = generate_offer_id(db)
    offer = Offer(
        id=offer_id,
        application_id=data.application_id,
        candidate_id=app.candidate_id,
        requisition_id=app.requisition_id,
        base_salary=data.base_salary,
        bonus=data.bonus,
        equity_shares=data.equity_shares,
        start_date=data.start_date,
        status="PENDING_APPROVAL",
        is_salary_band_violation=is_violation,
        violation_reason=violation_reason,
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc)
    )
    db.add(offer)
    db.flush()

    # Automatically set up 3 required executive approval tiers
    approvers = [
        {"role": "HIRING_MANAGER", "name": req.hiring_manager.name if req.hiring_manager else "Hiring Manager", "id": req.hiring_manager_id or "HM-001"},
        {"role": "VP_FINANCE", "name": "Elena Rostova (VP Finance)", "id": "APPR-FIN-01"},
        {"role": "VP_HR", "name": "Marcus Vance (VP People)", "id": "APPR-HR-01"}
    ]

    for appr in approvers:
        approval_obj = Approval(
            id=generate_approval_id(db),
            offer_id=offer_id,
            approver_id=appr["id"],
            approver_name=appr["name"],
            approver_role=appr["role"],
            status="PENDING"
        )
        db.add(approval_obj)
        db.flush()

    # Update application stage to OFFER
    app.stage = "OFFER"
    app.updated_at = datetime.now(timezone.utc)

    log_event(
        db,
        actor=actor,
        action="CREATE_OFFER",
        entity_type="OFFER",
        entity_id=offer_id,
        new_state={
            "application_id": data.application_id,
            "base_salary": data.base_salary,
            "is_salary_band_violation": is_violation,
            "violation_reason": violation_reason
        }
    )

    db.commit()
    return get_offer(db, offer_id)

def get_offer(db: Session, offer_id: str) -> Optional[dict]:
    o = db.query(Offer).filter(Offer.id == offer_id).first()
    if not o:
        return None

    approvals = db.query(Approval).filter(Approval.offer_id == offer_id).all()
    req = o.requisition
    cand = o.candidate

    return {
        "id": o.id,
        "application_id": o.application_id,
        "candidate_id": o.candidate_id,
        "candidate_name": f"{cand.first_name} {cand.last_name}" if cand else "Unknown",
        "requisition_id": o.requisition_id,
        "requisition_title": req.title if req else "Unknown",
        "salary_range": f"${req.min_salary:,.0f} - ${req.max_salary:,.0f}" if req else "N/A",
        "base_salary": o.base_salary,
        "bonus": o.bonus,
        "equity_shares": o.equity_shares,
        "start_date": o.start_date,
        "status": o.status,
        "is_salary_band_violation": o.is_salary_band_violation,
        "violation_reason": o.violation_reason,
        "created_at": o.created_at,
        "updated_at": o.updated_at,
        "approvals": [
            {
                "id": a.id,
                "offer_id": a.offer_id,
                "approver_id": a.approver_id,
                "approver_name": a.approver_name,
                "approver_role": a.approver_role,
                "status": a.status,
                "comments": a.comments,
                "action_date": a.action_date
            }
            for a in approvals
        ]
    }

def list_offers(
    db: Session,
    skip: int = 0,
    limit: int = 100,
    status: Optional[str] = None,
    violations_only: bool = False
) -> tuple[List[dict], int]:
    query = db.query(Offer)

    if status:
        query = query.filter(Offer.status == status)
    if violations_only:
        query = query.filter(Offer.is_salary_band_violation == True)

    total = query.count()
    offers = query.order_by(Offer.created_at.desc()).offset(skip).limit(limit).all()

    return [get_offer(db, o.id) for o in offers], total

def process_approval(
    db: Session,
    approval_id: str,
    action_data: ApprovalAction,
    actor: str = "Approver"
) -> dict:
    approval = db.query(Approval).filter(Approval.id == approval_id).first()
    if not approval:
        raise HTTPException(status_code=404, detail="Approval task not found")

    status_val = action_data.status.upper()
    if status_val not in ["APPROVED", "REJECTED"]:
        raise HTTPException(status_code=400, detail="Approval action must be APPROVED or REJECTED")

    approval.status = status_val
    approval.comments = action_data.comments
    approval.action_date = datetime.now(timezone.utc)

    offer = approval.offer
    offer.updated_at = datetime.now(timezone.utc)

    # Check if any rejection
    all_approvals = db.query(Approval).filter(Approval.offer_id == offer.id).all()
    if any(a.status == "REJECTED" for a in all_approvals):
        offer.status = "REJECTED"
    elif all(a.status == "APPROVED" for a in all_approvals):
        offer.status = "APPROVED"

    log_event(
        db,
        actor=actor,
        action="APPROVAL_DECISION",
        entity_type="APPROVAL",
        entity_id=approval_id,
        new_state={"status": status_val, "offer_id": offer.id, "offer_status": offer.status}
    )

    db.commit()
    return get_offer(db, offer.id)

def update_offer_status(
    db: Session,
    offer_id: str,
    new_status: str,
    actor: str = "Recruiter"
) -> dict:
    offer = db.query(Offer).filter(Offer.id == offer_id).first()
    if not offer:
        raise HTTPException(status_code=404, detail="Offer not found")

    new_status = new_status.upper()
    prev = offer.status
    offer.status = new_status
    offer.updated_at = datetime.now(timezone.utc)

    # If accepted, trigger stage transition to HIRED
    if new_status == "ACCEPTED":
        app = offer.application
        if app:
            app.stage = "HIRED"
            app.updated_at = datetime.now(timezone.utc)

    log_event(
        db,
        actor=actor,
        action="UPDATE_OFFER_STATUS",
        entity_type="OFFER",
        entity_id=offer_id,
        previous_state={"status": prev},
        new_state={"status": new_status}
    )

    db.commit()
    return get_offer(db, offer_id)
