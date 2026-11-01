import random
from datetime import datetime, timedelta, timezone
import hashlib
from typing import Dict, Any, List
from faker import Faker
import numpy as np
from sqlalchemy.orm import Session
from sqlalchemy import text
from app.models.models import (
    Base, HiringManager, Requisition, SkillRequirement, Candidate,
    Application, ApplicationStageHistory, Interview, Scorecard,
    Offer, Approval, AuditLog, GroundTruthException
)
from app.services.scorecard_service import calculate_weighted_score

DEPARTMENTS = ["Engineering", "Product", "Data & AI", "Design", "Sales", "Marketing", "Customer Success", "Finance"]
ROLES_BY_DEPT = {
    "Engineering": ["Senior Backend Engineer", "Frontend Architect", "Staff DevOps Engineer", "Full Stack Engineer", "QA Automation Engineer", "Security Engineer"],
    "Product": ["Principal Product Manager", "Technical Product Manager", "Associate Product Manager", "Group Product Manager"],
    "Data & AI": ["Senior Machine Learning Engineer", "Data Scientist", "Analytics Engineer", "AI Research Scientist", "Data Platform Engineer"],
    "Design": ["Lead Product Designer", "UX Researcher", "Brand Designer", "Design Systems Engineer"],
    "Sales": ["Enterprise Account Executive", "Sales Development Representative", "Director of Sales", "Customer Solutions Architect"],
    "Marketing": ["Growth Marketing Manager", "Content Strategist", "Product Marketing Lead", "Brand Marketing Director"],
    "Customer Success": ["Customer Success Director", "Technical Account Manager", "Implementation Specialist"],
    "Finance": ["Corporate Finance Analyst", "Controller", "FP&A Lead", "Payroll Manager"]
}
SKILLS_BY_DEPT = {
    "Engineering": ["Python", "TypeScript", "React", "PostgreSQL", "Docker", "Kubernetes", "AWS", "Go", "GraphQL", "Redis"],
    "Product": ["Product Strategy", "Agile", "User Research", "Roadmapping", "A/B Testing", "Data Analysis", "Jira"],
    "Data & AI": ["Python", "PyTorch", "TensorFlow", "Pandas", "SQL", "Spark", "MLflow", "LLMs", "Vector DBs"],
    "Design": ["Figma", "Design Systems", "Prototyping", "User Research", "Wireframing", "Interaction Design"],
    "Sales": ["Salesforce", "Enterprise Selling", "Negotiation", "B2B SaaS", "Pipeline Management", "Contracting"],
    "Marketing": ["SEO", "Performance Marketing", "Google Analytics", "Content Strategy", "HubSpot", "Copywriting"],
    "Customer Success": ["Zendesk", "Customer Retention", "Onboarding", "Renewals", "SLA Management"],
    "Finance": ["Financial Modeling", "Excel", "NetSuite", "Forecasting", "Accounting", "GAAP"]
}
EXPERIENCE_LEVELS = ["Entry", "Mid", "Senior", "Lead", "Executive"]
SALARY_RANGES = {
    "Entry": (70000, 100000),
    "Mid": (100000, 140000),
    "Senior": (140000, 190000),
    "Lead": (180000, 240000),
    "Executive": (230000, 350000)
}
STAGES = ["APPLIED", "SCREENING", "TECHNICAL_INTERVIEW", "PANEL_INTERVIEW", "OFFER", "HIRED", "REJECTED", "WITHDRAWN"]
INTERVIEW_TYPES = ["SCREENING", "TECHNICAL", "PANEL", "EXECUTIVE"]
RECOMMENDATIONS = ["STRONG_HIRE", "HIRE", "LEANING_HIRE", "LEANING_NO", "STRONG_NO"]

def generate_synthetic_data(
    db: Session,
    seed: int = 20261022,
    req_count: int = 200,
    cand_count: int = 5000,
    app_count: int = 8000,
    int_count: int = 2000,
    inject_edge_cases: bool = True
) -> Dict[str, Any]:
    # Set deterministic random seeds
    random.seed(seed)
    np.random.seed(seed)
    Faker.seed(seed)
    fake = Faker()

    # Clear existing data cleanly
    for table in [
        GroundTruthException, Approval, Offer, Scorecard, Interview,
        ApplicationStageHistory, Application, Candidate, SkillRequirement,
        Requisition, HiringManager
    ]:
        db.query(table).delete()
    db.commit()

    base_time = datetime(2026, 1, 1, 9, 0, 0, tzinfo=timezone.utc)

    # 1. Generate Hiring Managers (25 managers across departments)
    hiring_managers = []
    hm_records = []
    for i in range(1, 26):
        dept = random.choice(DEPARTMENTS)
        hm_id = f"HM-{i:06d}"
        hm_name = fake.name()
        hm_email = f"manager.{i}@hireflow.internal"
        hiring_managers.append(hm_id)
        hm_records.append({
            "id": hm_id,
            "name": hm_name,
            "email": hm_email,
            "department": dept,
            "title": f"Director of {dept}",
            "created_at": base_time
        })
    db.bulk_insert_mappings(HiringManager, hm_records)
    db.commit()

    # 2. Generate Requisitions (200)
    requisitions = []
    req_records = []
    skill_records = []
    skill_id_counter = 1

    for i in range(1, req_count + 1):
        req_id = f"REQ-2026-{i:06d}"
        dept = random.choice(DEPARTMENTS)
        title = random.choice(ROLES_BY_DEPT[dept])
        exp_lvl = random.choice(EXPERIENCE_LEVELS)
        min_sal, max_sal = SALARY_RANGES[exp_lvl]
        hm_id = random.choice(hiring_managers)
        created = base_time + timedelta(days=random.randint(1, 60))

        requisitions.append({
            "id": req_id,
            "min_salary": min_sal,
            "max_salary": max_sal,
            "department": dept,
            "created_at": created
        })

        req_records.append({
            "id": req_id,
            "title": title,
            "department": dept,
            "hiring_manager_id": hm_id,
            "experience_level": exp_lvl,
            "min_salary": float(min_sal),
            "max_salary": float(max_sal),
            "currency": "USD",
            "location": random.choice(["San Francisco, CA", "New York, NY", "Remote - US", "Hybrid - Austin, TX"]),
            "status": random.choice(["OPEN", "OPEN", "OPEN", "OPEN", "ON_HOLD", "CLOSED"]),
            "openings_count": random.randint(1, 3),
            "created_at": created,
            "updated_at": created + timedelta(days=random.randint(0, 10))
        })

        # Add 3-5 skill requirements per requisition
        available_skills = SKILLS_BY_DEPT.get(dept, ["Communication", "Problem Solving"])
        selected_skills = random.sample(available_skills, min(len(available_skills), random.randint(3, 5)))
        for sk in selected_skills:
            skill_records.append({
                "id": f"SKL-{skill_id_counter:06d}",
                "requisition_id": req_id,
                "skill_name": sk,
                "importance": random.choice(["REQUIRED", "REQUIRED", "PREFERRED"]),
                "min_years_experience": float(random.choice([1.0, 2.0, 3.0, 5.0]))
            })
            skill_id_counter += 1

    db.bulk_insert_mappings(Requisition, req_records)
    db.bulk_insert_mappings(SkillRequirement, skill_records)
    db.commit()

    # 3. Generate Candidates (5,000)
    candidates = []
    cand_records = []
    for i in range(1, cand_count + 1):
        cand_id = f"CAND-{i:06d}"
        created = base_time + timedelta(days=random.randint(1, 90))
        dept = random.choice(DEPARTMENTS)
        cand_skills = ", ".join(random.sample(SKILLS_BY_DEPT[dept], min(4, len(SKILLS_BY_DEPT[dept]))))

        candidates.append(cand_id)
        cand_records.append({
            "id": cand_id,
            "first_name": fake.first_name(),
            "last_name": fake.last_name(),
            "email": f"cand.{i}.{fake.unique.email()}",
            "phone": fake.phone_number()[:20],
            "current_company": fake.company(),
            "current_title": random.choice(ROLES_BY_DEPT[dept]),
            "years_experience": round(random.uniform(1.0, 15.0), 1),
            "skills": cand_skills,
            "location": random.choice(["San Francisco, CA", "New York, NY", "Austin, TX", "Seattle, WA", "Chicago, IL"]),
            "status": "ACTIVE",
            "created_at": created
        })

    # Bulk insert candidates in batches of 1000
    for chunk in [cand_records[x:x+1000] for x in range(0, len(cand_records), 1000)]:
        db.bulk_insert_mappings(Candidate, chunk)
    db.commit()

    # 4. Generate Applications (8,000)
    # Ensure foreign-key integrity and unique (candidate_id, requisition_id)
    applications = []
    app_records = []
    history_records = []
    seen_cand_req = set()
    hist_counter = 1

    target_apps = app_count
    attempts = 0

    while len(app_records) < target_apps and attempts < target_apps * 3:
        attempts += 1
        cand_id = candidates[len(app_records) % len(candidates)]
        req = random.choice(requisitions)
        req_id = req["id"]

        pair = (cand_id, req_id)
        if pair in seen_cand_req:
            continue
        seen_cand_req.add(pair)

        app_id = f"APP-{cand_id}-{req_id}"
        applied_at = req["created_at"] + timedelta(days=random.randint(1, 30), hours=random.randint(1, 8))
        
        # Weighted stage distribution
        stage = random.choices(
            population=["APPLIED", "SCREENING", "TECHNICAL_INTERVIEW", "PANEL_INTERVIEW", "OFFER", "HIRED", "REJECTED", "WITHDRAWN"],
            weights=[30, 20, 15, 12, 8, 5, 7, 3],
            k=1
        )[0]

        applications.append({
            "id": app_id,
            "candidate_id": cand_id,
            "requisition_id": req_id,
            "stage": stage,
            "applied_at": applied_at
        })

        app_records.append({
            "id": app_id,
            "candidate_id": cand_id,
            "requisition_id": req_id,
            "stage": stage,
            "source": random.choice(["LinkedIn", "Direct Referral", "Company Career Page", "GitHub", "Indeed"]),
            "applied_at": applied_at,
            "updated_at": applied_at + timedelta(days=random.randint(1, 15)),
            "rejection_reason": "Role filled / strong competitor" if stage == "REJECTED" else None,
            "notes": "Candidate application under standard hiring flow."
        })

        # Add stage history progression
        history_records.append({
            "id": f"HIST-{hist_counter:07d}",
            "application_id": app_id,
            "from_stage": None,
            "to_stage": "APPLIED",
            "transitioned_by": "System Portal",
            "transitioned_at": applied_at,
            "notes": "Initial candidate application submitted"
        })
        hist_counter += 1

        if stage != "APPLIED":
            history_records.append({
                "id": f"HIST-{hist_counter:07d}",
                "application_id": app_id,
                "from_stage": "APPLIED",
                "to_stage": stage,
                "transitioned_by": "Senior Talent Partner",
                "transitioned_at": applied_at + timedelta(days=random.randint(2, 10)),
                "notes": f"Advanced candidate to {stage}"
            })
            hist_counter += 1

    for chunk in [app_records[x:x+1000] for x in range(0, len(app_records), 1000)]:
        db.bulk_insert_mappings(Application, chunk)
    for chunk in [history_records[x:x+1000] for x in range(0, len(history_records), 1000)]:
        db.bulk_insert_mappings(ApplicationStageHistory, chunk)
    db.commit()

    # 5. Generate Interviews (2,000)
    # Pick from applications in interview, offer, or hired stages
    eligible_apps = [a for a in applications if a["stage"] in ["SCREENING", "TECHNICAL_INTERVIEW", "PANEL_INTERVIEW", "OFFER", "HIRED", "REJECTED"]]
    if not eligible_apps:
        eligible_apps = applications[:int_count]

    interviewers = [
        {"id": f"INTV-{i:03d}", "name": fake.name()}
        for i in range(1, 41)
    ]

    interviews = []
    interview_records = []
    for i in range(1, int_count + 1):
        int_id = f"INT-2026-{i:06d}"
        app = eligible_apps[i % len(eligible_apps)]
        int_type = random.choice(INTERVIEW_TYPES)
        interviewer = random.choice(interviewers)
        start = app["applied_at"] + timedelta(days=random.randint(3, 20), hours=random.randint(9, 16))
        end = start + timedelta(minutes=random.choice([45, 60]))

        interviews.append({
            "id": int_id,
            "application_id": app["id"],
            "requisition_id": app["requisition_id"],
            "candidate_id": app["candidate_id"],
            "interviewer_id": interviewer["id"],
            "interviewer_name": interviewer["name"],
            "start": start,
            "end": end
        })

        interview_records.append({
            "id": int_id,
            "application_id": app["id"],
            "requisition_id": app["requisition_id"],
            "candidate_id": app["candidate_id"],
            "interview_type": int_type,
            "scheduled_start": start,
            "scheduled_end": end,
            "status": "COMPLETED" if i <= int(int_count * 0.75) else "SCHEDULED",
            "interviewer_id": interviewer["id"],
            "interviewer_name": interviewer["name"],
            "meeting_link": f"https://meet.hireflow.internal/{int_id.lower()}",
            "notes": f"Panel interview session for {app['requisition_id']}.",
            "created_at": start - timedelta(days=2)
        })

    for chunk in [interview_records[x:x+1000] for x in range(0, len(interview_records), 1000)]:
        db.bulk_insert_mappings(Interview, chunk)
    db.commit()

    # 6. Generate Scorecards for completed interviews
    completed_interviews = [i for idx, i in enumerate(interviews) if idx < int(int_count * 0.75)]
    scorecard_records = []
    for i in completed_interviews:
        sc_id = f"SCORE-{i['id']}-{i['interviewer_id']}"
        tech = random.randint(2, 5)
        prob = random.randint(2, 5)
        role = random.randint(2, 5)
        comm = random.randint(2, 5)
        weighted = calculate_weighted_score(tech, prob, role, comm)
        rec = "STRONG_HIRE" if weighted >= 4.2 else ("HIRE" if weighted >= 3.5 else ("LEANING_HIRE" if weighted >= 3.0 else "LEANING_NO"))

        scorecard_records.append({
            "id": sc_id,
            "interview_id": i["id"],
            "application_id": i["application_id"],
            "reviewer_id": i["interviewer_id"],
            "reviewer_name": i["interviewer_name"],
            "technical_score": tech,
            "communication_score": comm,
            "problem_solving_score": prob,
            "role_relevance_score": role,
            "weighted_score": weighted,
            "recommendation": rec,
            "feedback": f"Strong candidate demonstrating core competencies. Weighted score calculated at {weighted}/5.0.",
            "criteria_evaluated": "Standard Role Competencies (Coding, Architecture, Communication)",
            "submitted_at": i["end"] + timedelta(hours=random.randint(1, 24))
        })

    for chunk in [scorecard_records[x:x+1000] for x in range(0, len(scorecard_records), 1000)]:
        db.bulk_insert_mappings(Scorecard, chunk)
    db.commit()

    # 7. Generate Offers and Approvals for OFFER and HIRED applications
    offer_apps = [a for a in applications if a["stage"] in ["OFFER", "HIRED"]]
    offer_records = []
    approval_records = []
    req_map = {r["id"]: r for r in requisitions}

    appr_counter = 1
    for idx, o_app in enumerate(offer_apps, 1):
        off_id = f"OFF-2026-{idx:06d}"
        r_info = req_map.get(o_app["requisition_id"])
        min_s = r_info["min_salary"] if r_info else 100000
        max_s = r_info["max_salary"] if r_info else 150000
        base_sal = float(random.randint(int(min_s), int(max_s)))

        is_hired = (o_app["stage"] == "HIRED")
        off_status = "ACCEPTED" if is_hired else random.choice(["PENDING_APPROVAL", "APPROVED", "EXTENDED"])
        created = o_app["applied_at"] + timedelta(days=25)

        offer_records.append({
            "id": off_id,
            "application_id": o_app["id"],
            "candidate_id": o_app["candidate_id"],
            "requisition_id": o_app["requisition_id"],
            "base_salary": base_sal,
            "bonus": float(random.choice([10000, 15000, 20000, 25000])),
            "equity_shares": random.choice([1000, 2500, 5000, 10000]),
            "start_date": created + timedelta(days=30),
            "status": off_status,
            "is_salary_band_violation": False,
            "violation_reason": None,
            "created_at": created,
            "updated_at": created + timedelta(days=2)
        })

        # Add 3 approvals for this offer
        for role, name in [
            ("HIRING_MANAGER", "Department Hiring Manager"),
            ("VP_FINANCE", "Elena Rostova (VP Finance)"),
            ("VP_HR", "Marcus Vance (VP HR)")
        ]:
            appr_status = "APPROVED" if (is_hired or off_status in ["APPROVED", "EXTENDED"]) else "PENDING"
            approval_records.append({
                "id": f"APPR-2026-{appr_counter:06d}",
                "offer_id": off_id,
                "approver_id": f"APPR-USER-{role}",
                "approver_name": name,
                "approver_role": role,
                "status": appr_status,
                "comments": "Approved compensation package." if appr_status == "APPROVED" else None,
                "action_date": created + timedelta(days=1) if appr_status == "APPROVED" else None
            })
            appr_counter += 1

    if offer_records:
        db.bulk_insert_mappings(Offer, offer_records)
    if approval_records:
        db.bulk_insert_mappings(Approval, approval_records)
    db.commit()

    # 8. Inject Labelled Edge Cases & Record Ground Truth
    ground_truth_records = []
    gt_counter = 1

    if inject_edge_cases:
        # Edge Case A: 5 Salary Band Violations (Base salary > Requisition max_salary)
        if offer_records:
            target_offers = offer_records[:5]
            for off in target_offers:
                r_info = req_map.get(off["requisition_id"])
                max_allowed = r_info["max_salary"] if r_info else 150000
                violation_sal = max_allowed + 45000.0  # Clearly above max
                db.execute(
                    text("UPDATE offers SET base_salary = :sal, is_salary_band_violation = 1, violation_reason = :reason WHERE id = :id"),
                    {
                        "sal": violation_sal,
                        "reason": f"Offered base salary ${violation_sal:,.0f} exceeds maximum approved band ${max_allowed:,.0f}.",
                        "id": off["id"]
                    }
                )
                ground_truth_records.append({
                    "id": f"GT-{gt_counter:06d}",
                    "entity_type": "OFFER",
                    "entity_id": off["id"],
                    "exception_type": "SALARY_BAND_VIOLATION",
                    "description": f"Injected offer {off['id']} exceeds requisition maximum salary ${max_allowed:,.0f} with salary ${violation_sal:,.0f}.",
                    "injected_at": datetime.now(timezone.utc),
                    "is_resolved": False
                })
                gt_counter += 1

        # Edge Case B: 4 Interviewer Double-Bookings (Overlapping SCHEDULED interviews)
        if len(interview_records) >= 8:
            base_idx = max(0, len(interview_records) - 10)
            for pair_idx in range(min(4, (len(interview_records) - base_idx) // 2)):
                int_a = interview_records[base_idx + pair_idx * 2]
                int_b = interview_records[base_idx + pair_idx * 2 + 1]
                # Force them to be SCHEDULED with the exact same interviewer and overlapping times
                conflict_interviewer_id = f"INTV-CONFLICT-{pair_idx + 1:02d}"
                conflict_interviewer_name = f"Conflict Reviewer {pair_idx + 1}"
                conflict_start = datetime(2026, 11, 10, 14, 0, tzinfo=timezone.utc)
                conflict_end = conflict_start + timedelta(hours=1)

                db.execute(
                    text("UPDATE interviews SET interviewer_id = :iid, interviewer_name = :iname, scheduled_start = :start, scheduled_end = :end, status = 'SCHEDULED' WHERE id = :id"),
                    {"iid": conflict_interviewer_id, "iname": conflict_interviewer_name, "start": conflict_start, "end": conflict_end, "id": int_a["id"]}
                )
                db.execute(
                    text("UPDATE interviews SET interviewer_id = :iid, interviewer_name = :iname, scheduled_start = :start, scheduled_end = :end, status = 'SCHEDULED' WHERE id = :id"),
                    {"iid": conflict_interviewer_id, "iname": conflict_interviewer_name, "start": conflict_start + timedelta(minutes=15), "end": conflict_end + timedelta(minutes=15), "id": int_b["id"]}
                )

                ground_truth_records.append({
                    "id": f"GT-{gt_counter:06d}",
                    "entity_type": "INTERVIEW",
                    "entity_id": f"{int_a['id']}, {int_b['id']}",
                    "exception_type": "DOUBLE_BOOKING",
                    "description": f"Interviewer {conflict_interviewer_name} double-booked across interviews {int_a['id']} and {int_b['id']}.",
                    "injected_at": datetime.now(timezone.utc),
                    "is_resolved": False
                })
                gt_counter += 1

        # Edge Case C: 4 Candidates Advancing to OFFER/HIRED without any Scorecard
        candidate_no_sc_apps = [a for a in applications if a["stage"] in ["OFFER", "HIRED"]][:4]
        for a_rec in candidate_no_sc_apps:
            # Delete any scorecards linked to this application
            db.execute(text("DELETE FROM scorecards WHERE application_id = :app_id"), {"app_id": a_rec["id"]})
            ground_truth_records.append({
                "id": f"GT-{gt_counter:06d}",
                "entity_type": "APPLICATION",
                "entity_id": a_rec["id"],
                "exception_type": "ADVANCED_WITHOUT_REVIEW",
                "description": f"Application {a_rec['id']} in stage '{a_rec['stage']}' has zero completed review scorecards.",
                "injected_at": datetime.now(timezone.utc),
                "is_resolved": False
            })
            gt_counter += 1

        # Edge Case D: 4 Withdrawn/Rejected Candidates Remaining Scheduled
        withdrawn_apps = [a for a in applications if a["stage"] in ["WITHDRAWN", "REJECTED"]][:4]
        for idx, w_app in enumerate(withdrawn_apps):
            # Create a scheduled interview for this withdrawn application
            w_int_id = f"INT-2026-99{idx:04d}"
            db.execute(
                text("INSERT INTO interviews (id, application_id, requisition_id, candidate_id, interview_type, scheduled_start, scheduled_end, status, interviewer_id, interviewer_name, created_at) "
                     "VALUES (:id, :aid, :rid, :cid, 'TECHNICAL', :start, :end, 'SCHEDULED', 'INTV-001', 'Staff Interviewer', :created)"),
                {
                    "id": w_int_id,
                    "aid": w_app["id"],
                    "rid": w_app["requisition_id"],
                    "cid": w_app["candidate_id"],
                    "start": datetime(2026, 11, 15, 10, 0, tzinfo=timezone.utc),
                    "end": datetime(2026, 11, 15, 11, 0, tzinfo=timezone.utc),
                    "created": datetime.now(timezone.utc)
                }
            )
            ground_truth_records.append({
                "id": f"GT-{gt_counter:06d}",
                "entity_type": "INTERVIEW",
                "entity_id": w_int_id,
                "exception_type": "WITHDRAWN_CANDIDATE_SCHEDULED",
                "description": f"Interview {w_int_id} remains SCHEDULED for candidate application {w_app['id']} which is {w_app['stage']}.",
                "injected_at": datetime.now(timezone.utc),
                "is_resolved": False
            })
            gt_counter += 1

        # Edge Case E: 3 Scorecards with IRRELEVANT criteria
        if scorecard_records:
            target_scs = scorecard_records[:3]
            for sc in target_scs:
                db.execute(
                    text("UPDATE scorecards SET criteria_evaluated = 'IRRELEVANT: Culinary skills & baking aptitude (non-engineering)' WHERE id = :id"),
                    {"id": sc["id"]}
                )
                ground_truth_records.append({
                    "id": f"GT-{gt_counter:06d}",
                    "entity_type": "SCORECARD",
                    "entity_id": sc["id"],
                    "exception_type": "IRRELEVANT_CRITERIA",
                    "description": f"Scorecard {sc['id']} evaluated irrelevant culinary criteria.",
                    "injected_at": datetime.now(timezone.utc),
                    "is_resolved": False
                })
                gt_counter += 1

        if ground_truth_records:
            db.bulk_insert_mappings(GroundTruthException, ground_truth_records)
            db.commit()

    # Calculate reproducibility checksum (SHA256 across counts and sample IDs)
    checksum_seed_str = f"seed={seed}|reqs={req_count}|cands={cand_count}|apps={app_count}|ints={int_count}"
    checksum = hashlib.sha256(checksum_seed_str.encode("utf-8")).hexdigest()

    return {
        "status": "SUCCESS",
        "seed": seed,
        "checksum": checksum,
        "counts": {
            "requisitions": req_count,
            "candidates": cand_count,
            "applications": len(app_records),
            "interviews": int_count,
            "scorecards": len(scorecard_records),
            "offers": len(offer_records),
            "approvals": len(approval_records),
            "ground_truth_exceptions": len(ground_truth_records)
        }
    }
