import json
from datetime import datetime, timezone
import uuid
from sqlalchemy.orm import Session
from app.models.models import AuditLog

def log_event(
    db: Session,
    actor: str,
    action: str,
    entity_type: str,
    entity_id: str,
    previous_state: dict = None,
    new_state: dict = None,
    metadata_info: dict = None
) -> AuditLog:
    audit_id = f"AUD-{uuid.uuid4().hex[:12].upper()}"
    log_entry = AuditLog(
        id=audit_id,
        timestamp=datetime.now(timezone.utc),
        actor=actor,
        action=action,
        entity_type=entity_type,
        entity_id=entity_id,
        previous_state=json.dumps(previous_state, default=str) if previous_state else None,
        new_state=json.dumps(new_state, default=str) if new_state else None,
        metadata_info=json.dumps(metadata_info, default=str) if metadata_info else None
    )
    db.add(log_entry)
    db.flush()
    return log_entry
