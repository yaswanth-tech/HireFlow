from datetime import datetime, timezone, timedelta

def test_pipeline_transition_rules(client):
    # 1. Setup Candidate
    cand_res = client.post("/api/v1/candidates", json={
        "first_name": "Alexander",
        "last_name": "Wright",
        "email": "alex.wright.test@example.com",
        "current_company": "Cloud Corp",
        "current_title": "Senior Engineer",
        "years_experience": 8.0,
        "skills": "Python, FastAPI, Postgres"
    })
    assert cand_res.status_code == 200
    candidate = cand_res.json()
    assert candidate["id"].startswith("CAND-")

    # 2. Setup Requisition
    req_res = client.post("/api/v1/requisitions", json={
        "title": "Staff Platform Engineer",
        "department": "Engineering",
        "hiring_manager_id": "HM-000002",
        "experience_level": "Lead",
        "min_salary": 180000,
        "max_salary": 230000
    })
    assert req_res.status_code == 200
    req = req_res.json()

    # 3. Create Application
    app_res = client.post("/api/v1/applications", json={
        "candidate_id": candidate["id"],
        "requisition_id": req["id"],
        "source": "LinkedIn"
    })
    assert app_res.status_code == 200
    app_data = app_res.json()
    app_id = app_data["id"]
    assert app_id == f"APP-{candidate['id']}-{req['id']}"
    assert app_data["stage"] == "APPLIED"

    # 4. Advance to SCREENING
    trans1 = client.post(f"/api/v1/applications/{app_id}/transition", json={
        "to_stage": "SCREENING",
        "notes": "Passed initial resume review"
    })
    assert trans1.status_code == 200
    assert trans1.json()["stage"] == "SCREENING"

    # 5. Attempt advancing to OFFER without scorecard (Should be blocked by rule)
    blocked_offer = client.post(f"/api/v1/applications/{app_id}/transition", json={
        "to_stage": "OFFER"
    })
    assert blocked_offer.status_code == 400
    assert "Cannot advance candidate to OFFER stage without at least one completed interview evaluation" in blocked_offer.json()["detail"]

    # 6. Schedule Interview & Submit Scorecard
    now = datetime.now(timezone.utc)
    int_res = client.post("/api/v1/interviews", json={
        "application_id": app_id,
        "interview_type": "TECHNICAL",
        "scheduled_start": (now + timedelta(hours=2)).isoformat(),
        "scheduled_end": (now + timedelta(hours=3)).isoformat(),
        "interviewer_id": "INTV-001",
        "interviewer_name": "Tech Lead"
    })
    assert int_res.status_code == 200
    int_id = int_res.json()["id"]

    sc_res = client.post("/api/v1/scorecards", json={
        "interview_id": int_id,
        "reviewer_id": "INTV-001",
        "reviewer_name": "Tech Lead",
        "technical_score": 5,
        "communication_score": 4,
        "problem_solving_score": 5,
        "role_relevance_score": 4,
        "recommendation": "STRONG_HIRE",
        "feedback": "Exceptional coding & architecture depth."
    })
    assert sc_res.status_code == 200
    assert sc_res.json()["weighted_score"] == 4.7

    # 7. Now advance to OFFER (Should succeed since scorecard exists)
    trans2 = client.post(f"/api/v1/applications/{app_id}/transition", json={
        "to_stage": "OFFER"
    })
    assert trans2.status_code == 200
    assert trans2.json()["stage"] == "OFFER"

    # 8. Attempt advancing to HIRED without approved offer (Should be blocked)
    blocked_hired = client.post(f"/api/v1/applications/{app_id}/transition", json={
        "to_stage": "HIRED"
    })
    assert blocked_hired.status_code == 400
    assert "Cannot transition candidate to HIRED without an approved and accepted employment offer" in blocked_hired.json()["detail"]
