from datetime import datetime, timezone
import uuid
from typing import List, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.models.models import (
    Application, Interview, Scorecard, Offer, Requisition, Candidate,
    GroundTruthException, ExceptionResolution
)
from app.services.audit_service import log_event

def to_naive(dt):
    if dt is None:
        return None
    if getattr(dt, 'tzinfo', None) is not None:
        return dt.astimezone(timezone.utc).replace(tzinfo=None)
    return dt

def detect_all_exceptions(db: Session, include_resolved: bool = False) -> List[Dict[str, Any]]:
    exceptions = []

    # Get set of resolved exception IDs
    resolved_ids = {r.exception_id for r in db.query(ExceptionResolution).all()}

    # 1. Salary Band Violations (Offers exceeding approved requisition max or under min)
    offers = db.query(Offer).join(Requisition).all()
    for off in offers:
        req = off.requisition
        if req:
            exc_id = f"EXC-SALARY-{off.id}"
            if exc_id in resolved_ids and not include_resolved:
                continue
            if off.base_salary > req.max_salary:
                exceptions.append({
                    "id": exc_id,
                    "type": "SALARY_BAND_VIOLATION",
                    "category": "Compensation Governance",
                    "severity": "CRITICAL",
                    "entity_type": "OFFER",
                    "entity_id": off.id,
                    "title": f"Offer Exceeds Maximum Approved Band ({off.id})",
                    "description": f"Offered base salary ${off.base_salary:,.0f} exceeds maximum approved compensation ceiling of ${req.max_salary:,.0f} for {req.title} ({req.id}).",
                    "violated_rule": "Compensation Policy §4.2: Employment offers must not exceed the executive-approved requisition salary ceiling without a documented waiver.",
                    "recommended_action": "Adjust offered base salary into approved band ($" + f"{req.min_salary:,.0f} - ${req.max_salary:,.0f}) or secure executive compensation waiver.",
                    "status": "RESOLVED" if exc_id in resolved_ids else "ACTIVE",
                    "detected_at": off.created_at,
                    "resolution_action": "Adjust offer base salary to within band, or request executive compensation waiver."
                })
            elif off.base_salary < req.min_salary:
                low_id = f"EXC-SALARY-LOW-{off.id}"
                if low_id in resolved_ids and not include_resolved:
                    continue
                exceptions.append({
                    "id": low_id,
                    "type": "SALARY_BAND_VIOLATION",
                    "category": "Pay Equity & Transparency",
                    "severity": "HIGH",
                    "entity_type": "OFFER",
                    "entity_id": off.id,
                    "title": f"Offer Below Minimum Approved Band ({off.id})",
                    "description": f"Offered base salary ${off.base_salary:,.0f} is below the minimum approved transparency threshold of ${req.min_salary:,.0f} for {req.title}.",
                    "violated_rule": "Pay Equity Transparency Act: Starting compensation must meet or exceed the published minimum band threshold.",
                    "recommended_action": "Revise base salary to comply with pay transparency floor requirements.",
                    "status": "RESOLVED" if low_id in resolved_ids else "ACTIVE",
                    "detected_at": off.created_at,
                    "resolution_action": "Revise base salary to comply with pay transparency minimum."
                })

    # 2. Interviewer Double-Bookings (Active interviews overlapping for same interviewer)
    active_interviews = db.query(Interview).filter(Interview.status == "SCHEDULED").all()
    seen_pairs = set()
    for i in range(len(active_interviews)):
        for j in range(i + 1, len(active_interviews)):
            int1 = active_interviews[i]
            int2 = active_interviews[j]
            if int1.interviewer_id == int2.interviewer_id:
                start1 = to_naive(int1.scheduled_start)
                end1 = to_naive(int1.scheduled_end)
                start2 = to_naive(int2.scheduled_start)
                end2 = to_naive(int2.scheduled_end)
                if start1 < end2 and end1 > start2:
                    pair_key = tuple(sorted([int1.id, int2.id]))
                    if pair_key not in seen_pairs:
                        seen_pairs.add(pair_key)
                        exc_id = f"EXC-DBL-{int1.id}-{int2.id}"
                        if exc_id in resolved_ids and not include_resolved:
                            continue
                        exceptions.append({
                            "id": exc_id,
                            "type": "DOUBLE_BOOKING",
                            "category": "Interviewer Availability & Scheduling",
                            "severity": "CRITICAL",
                            "entity_type": "INTERVIEW",
                            "entity_id": f"{int1.id}, {int2.id}",
                            "title": f"Interviewer Calendar Overlap: {int1.interviewer_name}",
                            "description": f"Interviewer {int1.interviewer_name} ({int1.interviewer_id}) is concurrently booked for interviews {int1.id} and {int2.id} overlapping at {int1.scheduled_start.strftime('%Y-%m-%d %H:%M') if hasattr(int1.scheduled_start, 'strftime') else str(int1.scheduled_start)}.",
                            "violated_rule": "Calendar Coordination Protocol: An interviewer cannot be booked across multiple simultaneous panel evaluations.",
                            "recommended_action": "Reschedule one of the conflicting panel sessions to an open slot.",
                            "status": "RESOLVED" if exc_id in resolved_ids else "ACTIVE",
                            "detected_at": datetime.now(timezone.utc),
                            "resolution_action": "Reschedule one of the conflicting interviews to an open availability slot."
                        })

    # 3. Candidates Advancing Without Required Reviews
    advanced_apps = db.query(Application).filter(Application.stage.in_(["OFFER", "HIRED"])).all()
    for app in advanced_apps:
        scorecard_count = db.query(func.count(Scorecard.id)).filter(Scorecard.application_id == app.id).scalar() or 0
        if scorecard_count == 0:
            exc_id = f"EXC-ADV-NOREV-{app.id}"
            if exc_id in resolved_ids and not include_resolved:
                continue
            exceptions.append({
                "id": exc_id,
                "type": "ADVANCED_WITHOUT_REVIEW",
                "category": "Pipeline Quality & Review Compliance",
                "severity": "HIGH",
                "entity_type": "APPLICATION",
                "entity_id": app.id,
                "title": f"Candidate Advanced Without Required Evaluation Scorecard ({app.id})",
                "description": f"Candidate application {app.id} progressed to '{app.stage}' without any recorded interview evaluation scorecard.",
                "violated_rule": "Hiring Evaluation Requirement §2.1: Candidates must possess at least one completed evaluation scorecard before receiving an offer.",
                "recommended_action": "Request interviewer to submit missing scorecard or regress application stage.",
                "status": "RESOLVED" if exc_id in resolved_ids else "ACTIVE",
                "detected_at": app.updated_at,
                "resolution_action": "Request interviewer to submit missing scorecard or regress application stage."
            })

    # 4. Withdrawn or Rejected Candidates Remaining Scheduled
    withdrawn_scheduled = (
        db.query(Interview)
        .join(Application)
        .filter(
            Application.stage.in_(["WITHDRAWN", "REJECTED"]),
            Interview.status == "SCHEDULED"
        )
        .all()
    )
    for w_int in withdrawn_scheduled:
        exc_id = f"EXC-WITHDRAWN-SCHED-{w_int.id}"
        if exc_id in resolved_ids and not include_resolved:
            continue
        exceptions.append({
            "id": exc_id,
            "type": "WITHDRAWN_CANDIDATE_SCHEDULED",
            "category": "Interviewer Resource Waste",
            "severity": "MEDIUM",
            "entity_type": "INTERVIEW",
            "entity_id": w_int.id,
            "title": f"Scheduled Session for Inactive Candidate ({w_int.id})",
            "description": f"Interview {w_int.id} remains active for application {w_int.application_id}, but candidate status is '{w_int.application.stage}'.",
            "violated_rule": "Resource Management Policy: Terminal stage applications (Withdrawn/Rejected) must have all future interviews cancelled.",
            "recommended_action": "Cancel the orphaned interview and release the interviewer's calendar slot.",
            "status": "RESOLVED" if exc_id in resolved_ids else "ACTIVE",
            "detected_at": w_int.created_at,
            "resolution_action": "Cancel the orphaned interview and release the interviewer's calendar slot."
        })

    # 5. Irrelevant Evaluation Criteria
    all_scorecards = db.query(Scorecard).all()
    for sc in all_scorecards:
        if sc.criteria_evaluated and "IRRELEVANT" in sc.criteria_evaluated.upper():
            exc_id = f"EXC-IRR-CRIT-{sc.id}"
            if exc_id in resolved_ids and not include_resolved:
                continue
            exceptions.append({
                "id": exc_id,
                "type": "IRRELEVANT_CRITERIA",
                "category": "Assessment Validity & Compliance",
                "severity": "MEDIUM",
                "entity_type": "SCORECARD",
                "entity_id": sc.id,
                "title": f"Non-Job-Related Evaluation Criteria ({sc.id})",
                "description": f"Scorecard {sc.id} evaluated criteria flagged as non-compliant or irrelevant to requisition competencies.",
                "violated_rule": "EEOC Uniform Guidelines §14: Interview evaluation criteria must be directly relevant to required job functions.",
                "recommended_action": "Review scorecard criteria and recalibrate evaluation against job skill requirements.",
                "status": "RESOLVED" if exc_id in resolved_ids else "ACTIVE",
                "detected_at": sc.submitted_at,
                "resolution_action": "Review scorecard criteria alignment with job description skill requirements."
            })

    return exceptions

def get_resolution_history(db: Session) -> List[Dict[str, Any]]:
    resolutions = db.query(ExceptionResolution).order_by(ExceptionResolution.resolved_at.desc()).all()
    return [
        {
            "id": r.id,
            "exception_id": r.exception_id,
            "exception_type": r.exception_type,
            "entity_type": r.entity_type,
            "entity_id": r.entity_id,
            "action_taken": r.action_taken,
            "resolved_by": r.resolved_by,
            "resolved_at": r.resolved_at,
            "notes": r.notes
        }
        for r in resolutions
    ]

def record_exception_resolution(
    db: Session,
    exception_id: str,
    action_taken: str,
    resolved_by: str = "Compliance Lead",
    notes: str = ""
) -> Dict[str, Any]:
    res_id = f"RES-{uuid.uuid4().hex[:10].upper()}"
    
    # Identify type and entity from exception ID
    exc_type = "GENERAL_EXCEPTION"
    entity_type = "GENERAL"
    entity_id = exception_id

    if "SALARY" in exception_id:
        exc_type = "SALARY_BAND_VIOLATION"
        entity_type = "OFFER"
        entity_id = exception_id.replace("EXC-SALARY-", "").replace("LOW-", "")
    elif "DBL" in exception_id:
        exc_type = "DOUBLE_BOOKING"
        entity_type = "INTERVIEW"
        entity_id = exception_id.replace("EXC-DBL-", "")
    elif "WITHDRAWN" in exception_id:
        exc_type = "WITHDRAWN_CANDIDATE_SCHEDULED"
        entity_type = "INTERVIEW"
        entity_id = exception_id.replace("EXC-WITHDRAWN-SCHED-", "")
    elif "ADV" in exception_id:
        exc_type = "ADVANCED_WITHOUT_REVIEW"
        entity_type = "APPLICATION"
        entity_id = exception_id.replace("EXC-ADV-NOREV-", "")
    elif "IRR" in exception_id:
        exc_type = "IRRELEVANT_CRITERIA"
        entity_type = "SCORECARD"
        entity_id = exception_id.replace("EXC-IRR-CRIT-", "")

    resolution = ExceptionResolution(
        id=res_id,
        exception_id=exception_id,
        exception_type=exc_type,
        entity_type=entity_type,
        entity_id=entity_id,
        action_taken=action_taken,
        resolved_by=resolved_by,
        resolved_at=datetime.now(timezone.utc),
        notes=notes or f"Resolved via corrective action: {action_taken}"
    )
    db.add(resolution)
    db.flush()

    log_event(
        db,
        actor=resolved_by,
        action="RESOLVE_EXCEPTION",
        entity_type=entity_type,
        entity_id=entity_id,
        new_state={"action_taken": action_taken, "exception_id": exception_id},
        metadata_info={"notes": notes}
    )

    db.commit()
    return {
        "status": "RESOLVED",
        "resolution_id": res_id,
        "exception_id": exception_id,
        "action_taken": action_taken,
        "message": f"Exception {exception_id} successfully marked as resolved in compliance audit log."
    }

def get_ground_truth_reconciliation(db: Session) -> Dict[str, Any]:
    gt_records = db.query(GroundTruthException).all()
    detected = detect_all_exceptions(db, include_resolved=True)

    tp = 0
    gt_items = []
    for g in gt_records:
        is_det = any(g.entity_id in e["entity_id"] for e in detected)
        if is_det:
            tp += 1
        gt_items.append({
            "id": g.id,
            "entity_type": g.entity_type,
            "entity_id": g.entity_id,
            "exception_type": g.exception_type,
            "description": g.description,
            "detected": is_det
        })

    total_gt = len(gt_records)
    precision = round(tp / len(detected), 2) if detected else 1.0
    recall = round(tp / total_gt, 2) if total_gt else 1.0

    return {
        "ground_truth_count": total_gt,
        "detected_count": len(detected),
        "true_positives": tp,
        "precision": precision,
        "recall": recall,
        "ground_truth_items": gt_items
    }
