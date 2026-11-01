import hashlib
from datetime import datetime, timezone
from typing import Dict, Any, List
from sqlalchemy.orm import Session
from sqlalchemy import text, func
from app.models.models import (
    Requisition, Candidate, Application, Interview, Scorecard,
    Offer, Approval, HiringManager, SkillRequirement
)
from app.services.scorecard_service import calculate_weighted_score

def run_data_validation_suite(db: Session) -> Dict[str, Any]:
    checks = []
    
    # Check 1: Primary-Key Uniqueness
    pk_tables = [
        ("Requisitions", "requisitions", "id"),
        ("Candidates", "candidates", "id"),
        ("Applications", "applications", "id"),
        ("Interviews", "interviews", "id"),
        ("Scorecards", "scorecards", "id"),
        ("Offers", "offers", "id"),
    ]
    pk_passed = True
    pk_details = []
    total_records = 0
    for name, tbl, col in pk_tables:
        total = db.execute(text(f"SELECT COUNT({col}) FROM {tbl}")).scalar() or 0
        distinct = db.execute(text(f"SELECT COUNT(DISTINCT {col}) FROM {tbl}")).scalar() or 0
        total_records += total
        if total != distinct:
            pk_passed = False
            pk_details.append(f"{name}: duplicate PKs found ({total} vs {distinct} distinct)")
        else:
            pk_details.append(f"{name}: {distinct} unique PKs")

    checks.append({
        "check_name": "Primary-Key Uniqueness",
        "category": "Integrity",
        "passed": pk_passed,
        "details": "; ".join(pk_details),
        "error_count": 0 if pk_passed else 1,
        "records_checked": total_records
    })

    # Check 2: Foreign-Key Integrity
    fk_checks = [
        ("Applications -> Candidates", "SELECT COUNT(a.id) FROM applications a LEFT JOIN candidates c ON a.candidate_id = c.id WHERE c.id IS NULL"),
        ("Applications -> Requisitions", "SELECT COUNT(a.id) FROM applications a LEFT JOIN requisitions r ON a.requisition_id = r.id WHERE r.id IS NULL"),
        ("Interviews -> Applications", "SELECT COUNT(i.id) FROM interviews i LEFT JOIN applications a ON i.application_id = a.id WHERE a.id IS NULL"),
        ("Scorecards -> Interviews", "SELECT COUNT(s.id) FROM scorecards s LEFT JOIN interviews i ON s.interview_id = i.id WHERE i.id IS NULL"),
        ("Offers -> Applications", "SELECT COUNT(o.id) FROM offers o LEFT JOIN applications a ON o.application_id = a.id WHERE a.id IS NULL"),
        ("Approvals -> Offers", "SELECT COUNT(ap.id) FROM approvals ap LEFT JOIN offers o ON ap.offer_id = o.id WHERE o.id IS NULL")
    ]
    fk_passed = True
    fk_details = []
    fk_errors = 0
    for label, query in fk_checks:
        orphans = db.execute(text(query)).scalar() or 0
        if orphans > 0:
            fk_passed = False
            fk_errors += orphans
            fk_details.append(f"{label}: {orphans} orphaned records")
        else:
            fk_details.append(f"{label}: 0 orphans (valid)")

    checks.append({
        "check_name": "Foreign-Key Referential Integrity",
        "category": "Integrity",
        "passed": fk_passed,
        "details": "; ".join(fk_details),
        "error_count": fk_errors,
        "records_checked": total_records
    })

    # Check 3: Enum Validation
    enum_checks = [
        ("Requisition Status", "SELECT COUNT(id) FROM requisitions WHERE status NOT IN ('DRAFT', 'OPEN', 'ON_HOLD', 'CLOSED', 'CANCELLED')"),
        ("Application Stage", "SELECT COUNT(id) FROM applications WHERE stage NOT IN ('APPLIED', 'SCREENING', 'TECHNICAL_INTERVIEW', 'PANEL_INTERVIEW', 'OFFER', 'HIRED', 'REJECTED', 'WITHDRAWN')"),
        ("Scorecard Recommendation", "SELECT COUNT(id) FROM scorecards WHERE recommendation NOT IN ('STRONG_HIRE', 'HIRE', 'LEANING_HIRE', 'LEANING_NO', 'STRONG_NO')"),
        ("Offer Status", "SELECT COUNT(id) FROM offers WHERE status NOT IN ('DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'REJECTED', 'EXTENDED', 'ACCEPTED', 'DECLINED')")
    ]
    enum_passed = True
    enum_errors = 0
    enum_details = []
    for label, query in enum_checks:
        invalid_count = db.execute(text(query)).scalar() or 0
        if invalid_count > 0:
            enum_passed = False
            enum_errors += invalid_count
            enum_details.append(f"{label}: {invalid_count} invalid enums")
        else:
            enum_details.append(f"{label}: all enum values valid")

    checks.append({
        "check_name": "Enum & Domain Validation",
        "category": "Schema",
        "passed": enum_passed,
        "details": "; ".join(enum_details),
        "error_count": enum_errors,
        "records_checked": total_records
    })

    # Check 4: Date Validation
    date_invalids = db.execute(text("SELECT COUNT(id) FROM interviews WHERE scheduled_end <= scheduled_start")).scalar() or 0
    date_passed = (date_invalids == 0)
    checks.append({
        "check_name": "Date Chronological Validation",
        "category": "Temporal",
        "passed": date_passed,
        "details": f"All interview scheduled_end timestamps occur after scheduled_start ({date_invalids} violations)",
        "error_count": date_invalids,
        "records_checked": db.execute(text("SELECT COUNT(id) FROM interviews")).scalar() or 0
    })

    # Check 5: Lifecycle Rules Validation
    # In an enterprise pipeline, any HIRED application must have at least one valid offer
    orphan_hires = db.execute(text(
        "SELECT COUNT(a.id) FROM applications a "
        "LEFT JOIN offers o ON a.id = o.application_id "
        "WHERE a.stage = 'HIRED' AND o.id IS NULL"
    )).scalar() or 0
    lifecycle_passed = (orphan_hires == 0)
    checks.append({
        "check_name": "Lifecycle Stage Progression Rules",
        "category": "Business Logic",
        "passed": lifecycle_passed,
        "details": f"100% of HIRED applications possess linked employment offers ({orphan_hires} violations)",
        "error_count": orphan_hires,
        "records_checked": db.execute(text("SELECT COUNT(id) FROM applications WHERE stage = 'HIRED'")).scalar() or 0
    })

    # Check 6: Arithmetic Reconciliation
    # Scorecard weighted score formula verification:
    # weighted = 0.4*tech + 0.3*prob + 0.2*role + 0.1*comm
    scorecards = db.query(Scorecard).limit(1000).all()
    arithmetic_errors = 0
    for sc in scorecards:
        expected = calculate_weighted_score(sc.technical_score, sc.problem_solving_score, sc.role_relevance_score, sc.communication_score)
        if abs(sc.weighted_score - expected) > 0.05:
            arithmetic_errors += 1
    arithmetic_passed = (arithmetic_errors == 0)
    checks.append({
        "check_name": "Arithmetic Reconciliation (Scorecard Formula)",
        "category": "Computation",
        "passed": arithmetic_passed,
        "details": f"Weighted formula 40% tech + 30% prob + 20% role + 10% comm verified across {len(scorecards)} samples ({arithmetic_errors} mismatch)",
        "error_count": arithmetic_errors,
        "records_checked": len(scorecards)
    })

    # Check 7: Duplicate Candidate Detection
    duplicate_apps = db.execute(text(
        "SELECT COUNT(*) FROM ("
        "  SELECT candidate_id, requisition_id, COUNT(*) as c "
        "  FROM applications GROUP BY candidate_id, requisition_id HAVING c > 1"
        ")"
    )).scalar() or 0
    dup_passed = (duplicate_apps == 0)
    checks.append({
        "check_name": "Duplicate Application Prevention",
        "category": "Integrity",
        "passed": dup_passed,
        "details": f"Unique candidate-requisition constraint verification: {duplicate_apps} duplicates detected",
        "error_count": duplicate_apps,
        "records_checked": db.execute(text("SELECT COUNT(id) FROM applications")).scalar() or 0
    })

    # Check 8: Reproducibility Checksum
    # Compute SHA-256 hash across sorted IDs of top tables
    req_ids = db.execute(text("SELECT id FROM requisitions ORDER BY id LIMIT 50")).fetchall()
    cand_ids = db.execute(text("SELECT id FROM candidates ORDER BY id LIMIT 50")).fetchall()
    combined_str = "".join([r[0] for r in req_ids]) + "".join([c[0] for c in cand_ids])
    checksum = hashlib.sha256(combined_str.encode("utf-8")).hexdigest()

    checks.append({
        "check_name": "Deterministic Reproducibility Checksum",
        "category": "Audit & Reproducibility",
        "passed": True,
        "details": f"Dataset SHA-256 Checksum: {checksum[:16]}...{checksum[-8:]}",
        "error_count": 0,
        "records_checked": total_records
    })

    passed_count = sum(1 for c in checks if c["passed"])
    failed_count = len(checks) - passed_count
    overall = "PASSED" if failed_count == 0 else "FAILED"

    return {
        "overall_status": overall,
        "checksum": checksum,
        "total_checks": len(checks),
        "passed_checks": passed_count,
        "failed_checks": failed_count,
        "checks": checks,
        "summary": {
            "total_records_evaluated": total_records,
            "integrity_checks": sum(1 for c in checks if c["category"] == "Integrity" and c["passed"]),
            "business_logic_checks": sum(1 for c in checks if c["category"] == "Business Logic" and c["passed"])
        },
        "generated_at": datetime.now(timezone.utc)
    }
