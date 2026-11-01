def test_requisition_lifecycle(client):
    # Create Requisition
    req_payload = {
        "title": "Principal Distributed Systems Engineer",
        "department": "Engineering",
        "hiring_manager_id": "HM-000001",
        "experience_level": "Senior",
        "min_salary": 160000,
        "max_salary": 220000,
        "currency": "USD",
        "location": "Remote - US",
        "status": "OPEN",
        "openings_count": 2,
        "skills": [
            {"skill_name": "Go", "importance": "REQUIRED", "min_years_experience": 5.0},
            {"skill_name": "Kubernetes", "importance": "REQUIRED", "min_years_experience": 3.0}
        ]
    }
    create_res = client.post("/api/v1/requisitions", json=req_payload)
    assert create_res.status_code == 200, create_res.text
    req = create_res.json()
    assert req["id"].startswith("REQ-2026-")
    assert req["title"] == "Principal Distributed Systems Engineer"
    assert len(req["skills"]) == 2

    # Get Requisition
    get_res = client.get(f"/api/v1/requisitions/{req['id']}")
    assert get_res.status_code == 200
    assert get_res.json()["id"] == req["id"]

    # Update Requisition
    update_res = client.put(f"/api/v1/requisitions/{req['id']}", json={"status": "CLOSED", "openings_count": 0})
    assert update_res.status_code == 200
    assert update_res.json()["status"] == "CLOSED"
