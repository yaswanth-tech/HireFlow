from typing import Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.models import AuditLog

router = APIRouter(prefix="/audit", tags=["Audit Logs"])

@router.get("")
def get_audit_logs(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    entity_type: Optional[str] = None,
    action: Optional[str] = None,
    actor: Optional[str] = None,
    db: Session = Depends(get_db)
):
    query = db.query(AuditLog)

    if entity_type:
        query = query.filter(AuditLog.entity_type == entity_type.upper())
    if action:
        query = query.filter(AuditLog.action == action.upper())
    if actor:
        query = query.filter(AuditLog.actor.ilike(f"%{actor}%"))

    total = query.count()
    logs = query.order_by(AuditLog.timestamp.desc()).offset(skip).limit(limit).all()

    return {
        "items": [
            {
                "id": l.id,
                "timestamp": l.timestamp,
                "actor": l.actor,
                "action": l.action,
                "entity_type": l.entity_type,
                "entity_id": l.entity_id,
                "previous_state": l.previous_state,
                "new_state": l.new_state,
                "metadata_info": l.metadata_info
            }
            for l in logs
        ],
        "total": total,
        "skip": skip,
        "limit": limit
    }
