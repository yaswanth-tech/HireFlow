from datetime import datetime, timezone
import uuid
from typing import List, Optional
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.models.models import Requisition, SkillRequirement, HiringManager, Application
from app.schemas.schemas import RequisitionCreate, RequisitionUpdate
from app.services.audit_service import log_event

def generate_requisition_id(db: Session) -> str:
    # Pattern: REQ-2026-000001
    count = db.query(func.count(Requisition.id)).scalar() or 0
    next_num = count + 1
    # Check if exists (e.g. after deletes or synthetic imports)
    while db.query(Requisition).filter(Requisition.id == f"REQ-2026-{next_num:06d}").first():
        next_num += 1
    return f"REQ-2026-{next_num:06d}"

def list_requisitions(
    db: Session,
    skip: int = 0,
    limit: int = 100,
    department: Optional[str] = None,
    status: Optional[str] = None,
    search: Optional[str] = None
) -> tuple[List[dict], int]:
    query = db.query(Requisition)

    if department:
        query = query.filter(Requisition.department == department)
    if status:
        query = query.filter(Requisition.status == status)
    if search:
        query = query.filter(
            (Requisition.title.ilike(f"%{search}%")) |
            (Requisition.id.ilike(f"%{search}%")) |
            (Requisition.department.ilike(f"%{search}%"))
        )

    total = query.count()
    reqs = query.order_by(Requisition.created_at.desc()).offset(skip).limit(limit).all()

    results = []
    for r in reqs:
        app_count = db.query(func.count(Application.id)).filter(Application.requisition_id == r.id).scalar() or 0
        results.append({
            "id": r.id,
            "title": r.title,
            "department": r.department,
            "hiring_manager_id": r.hiring_manager_id,
            "hiring_manager_name": r.hiring_manager.name if r.hiring_manager else "Unknown",
            "experience_level": r.experience_level,
            "min_salary": r.min_salary,
            "max_salary": r.max_salary,
            "currency": r.currency,
            "location": r.location,
            "status": r.status,
            "openings_count": r.openings_count,
            "created_at": r.created_at,
            "updated_at": r.updated_at,
            "skills": [
                {
                    "id": s.id,
                    "requisition_id": s.requisition_id,
                    "skill_name": s.skill_name,
                    "importance": s.importance,
                    "min_years_experience": s.min_years_experience
                }
                for s in r.skills
            ],
            "applications_count": app_count
        })

    return results, total

def get_requisition(db: Session, requisition_id: str) -> Optional[dict]:
    r = db.query(Requisition).filter(Requisition.id == requisition_id).first()
    if not r:
        return None
    app_count = db.query(func.count(Application.id)).filter(Application.requisition_id == r.id).scalar() or 0
    return {
        "id": r.id,
        "title": r.title,
        "department": r.department,
        "hiring_manager_id": r.hiring_manager_id,
        "hiring_manager_name": r.hiring_manager.name if r.hiring_manager else "Unknown",
        "experience_level": r.experience_level,
        "min_salary": r.min_salary,
        "max_salary": r.max_salary,
        "currency": r.currency,
        "location": r.location,
        "status": r.status,
        "openings_count": r.openings_count,
        "created_at": r.created_at,
        "updated_at": r.updated_at,
        "skills": [
            {
                "id": s.id,
                "requisition_id": s.requisition_id,
                "skill_name": s.skill_name,
                "importance": s.importance,
                "min_years_experience": s.min_years_experience
            }
            for s in r.skills
        ],
        "applications_count": app_count
    }

def create_requisition(db: Session, req_data: RequisitionCreate, actor: str = "Admin") -> dict:
    req_id = generate_requisition_id(db)
    
    # Ensure hiring manager exists
    hm = db.query(HiringManager).filter(HiringManager.id == req_data.hiring_manager_id).first()
    if not hm:
        # Create a default manager if not present
        hm = HiringManager(
            id=req_data.hiring_manager_id,
            name="Primary Hiring Manager",
            email=f"{req_data.hiring_manager_id.lower()}@hireflow.internal",
            department=req_data.department,
            title="Director of Engineering"
        )
        db.add(hm)
        db.flush()

    new_req = Requisition(
        id=req_id,
        title=req_data.title,
        department=req_data.department,
        hiring_manager_id=req_data.hiring_manager_id,
        experience_level=req_data.experience_level,
        min_salary=req_data.min_salary,
        max_salary=req_data.max_salary,
        currency=req_data.currency,
        location=req_data.location,
        status=req_data.status,
        openings_count=req_data.openings_count,
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc)
    )
    db.add(new_req)
    db.flush()

    if req_data.skills:
        for sk in req_data.skills:
            sk_obj = SkillRequirement(
                id=f"SKL-{uuid.uuid4().hex[:8].upper()}",
                requisition_id=req_id,
                skill_name=sk.skill_name,
                importance=sk.importance,
                min_years_experience=sk.min_years_experience
            )
            db.add(sk_obj)
        db.flush()

    log_event(
        db,
        actor=actor,
        action="CREATE_REQUISITION",
        entity_type="REQUISITION",
        entity_id=req_id,
        new_state={"title": new_req.title, "department": new_req.department, "min_salary": new_req.min_salary, "max_salary": new_req.max_salary}
    )

    db.commit()
    return get_requisition(db, req_id)

def update_requisition(db: Session, requisition_id: str, req_data: RequisitionUpdate, actor: str = "Admin") -> Optional[dict]:
    r = db.query(Requisition).filter(Requisition.id == requisition_id).first()
    if not r:
        return None

    prev = {"title": r.title, "status": r.status, "min_salary": r.min_salary, "max_salary": r.max_salary}

    update_fields = req_data.dict(exclude_unset=True)
    for field, val in update_fields.items():
        setattr(r, field, val)
    r.updated_at = datetime.now(timezone.utc)

    log_event(
        db,
        actor=actor,
        action="UPDATE_REQUISITION",
        entity_type="REQUISITION",
        entity_id=requisition_id,
        previous_state=prev,
        new_state=update_fields
    )

    db.commit()
    return get_requisition(db, requisition_id)
