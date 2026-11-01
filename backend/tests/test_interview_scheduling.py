from datetime import datetime, timezone, timedelta

def test_interview_conflict_prevention(client):
    # Setup candidate & requisition & application
    cand = client.post("/api/v1/candidates", json={
        "first_name": "Maya", "last_name": "Lin", "email": "maya.lin.conflict@example.com"
    }).json()
    req = client.post("/api/v1/requisitions", json={
        "title": "Data Architect", "department": "Data & AI", "hiring_manager_id": "HM-000003",
        "experience_level": "Senior", "min_salary": 150000, "max_salary": 200000
    }).json()
    app = client.post("/api/v1/applications", json={
        "candidate_id": cand["id"], "requisition_id": req["id"]
    }).json()

    now = datetime.now(timezone.utc)
    slot_start = (now + timedelta(days=2, hours=10)).replace(microsecond=0)
    slot_end = slot_start + timedelta(hours=1)

    # 1. Schedule initial interview
    int1_res = client.post("/api/v1/interviews", json={
        "application_id": app["id"],
        "interview_type": "TECHNICAL",
        "scheduled_start": slot_start.isoformat(),
        "scheduled_end": slot_end.isoformat(),
        "interviewer_id": "INTV-CONFLICT-CHECK",
        "interviewer_name": "Dr. Alan Grant"
    })
    assert int1_res.status_code == 200
    int1 = int1_res.json()
    assert int1["status"] == "SCHEDULED"

    # 2. Setup second candidate & app to test conflict with same interviewer
    cand2 = client.post("/api/v1/candidates", json={
        "first_name": "Sam", "last_name": "Neill", "email": "sam.neill.conflict@example.com"
    }).json()
    app2 = client.post("/api/v1/applications", json={
        "candidate_id": cand2["id"], "requisition_id": req["id"]
    }).json()

    # 3. Schedule overlapping interview with SAME interviewer (Should raise 409 Conflict)
    overlap_start = slot_start + timedelta(minutes=15)
    overlap_end = overlap_start + timedelta(hours=1)

    int2_conflict = client.post("/api/v1/interviews", json={
        "application_id": app2["id"],
        "interview_type": "PANEL",
        "scheduled_start": overlap_start.isoformat(),
        "scheduled_end": overlap_end.isoformat(),
        "interviewer_id": "INTV-CONFLICT-CHECK",
        "interviewer_name": "Dr. Alan Grant"
    })
    assert int2_conflict.status_code == 409
    assert "Interviewer conflict" in int2_conflict.json()["detail"]

    # 4. Reschedule interview 1 to non-conflicting slot
    new_start = slot_start + timedelta(days=1)
    new_end = new_start + timedelta(hours=1)
    resched_res = client.post(f"/api/v1/interviews/{int1['id']}/reschedule", json={
        "new_start": new_start.isoformat(),
        "new_end": new_end.isoformat()
    })
    assert resched_res.status_code == 200
    assert resched_res.json()["status"] == "RESCHEDULED"

    # 5. Cancel interview
    cancel_res = client.post(f"/api/v1/interviews/{int1['id']}/cancel", json={
        "reason": "Candidate accepted another position"
    })
    assert cancel_res.status_code == 200
    assert cancel_res.json()["status"] == "CANCELLED"
