from datetime import datetime, timezone, timedelta

def test_offers_and_approvals(client):
    cand = client.post("/api/v1/candidates", json={
        "first_name": "Elena", "last_name": "Rostova", "email": "elena.test.offers@example.com"
    }).json()
    req = client.post("/api/v1/requisitions", json={
        "title": "Staff Security Engineer", "department": "Engineering", "hiring_manager_id": "HM-000004",
        "experience_level": "Lead", "min_salary": 160000, "max_salary": 200000
    }).json()
    app = client.post("/api/v1/applications", json={
        "candidate_id": cand["id"], "requisition_id": req["id"]
    }).json()

    now = datetime.now(timezone.utc)
    start_date = now + timedelta(days=30)

    # 1. Create Offer that VIOLATES max salary ($225k > $200k max)
    violating_offer_res = client.post("/api/v1/offers", json={
        "application_id": app["id"],
        "base_salary": 225000,
        "bonus": 25000,
        "equity_shares": 5000,
        "start_date": start_date.isoformat()
    })
    assert violating_offer_res.status_code == 200
    off_data = violating_offer_res.json()
    assert off_data["is_salary_band_violation"] is True
    assert "exceeds approved band maximum" in off_data["violation_reason"]
    assert len(off_data["approvals"]) == 3
    assert off_data["status"] == "PENDING_APPROVAL"

    # 2. Approve all 3 approval tiers
    for appr in off_data["approvals"]:
        action_res = client.post(f"/api/v1/offers/approvals/{appr['id']}/action", json={
            "status": "APPROVED",
            "comments": "Approved executive salary exception."
        })
        assert action_res.status_code == 200

    # 3. Check that offer is now fully APPROVED
    get_off = client.get(f"/api/v1/offers/{off_data['id']}").json()
    assert get_off["status"] == "APPROVED"

    # 4. Accept the offer
    accept_res = client.patch(f"/api/v1/offers/{off_data['id']}/status", json={
        "status": "ACCEPTED"
    })
    assert accept_res.status_code == 200
    assert accept_res.json()["status"] == "ACCEPTED"

    # 5. Check that application automatically transitioned to HIRED!
    updated_app = client.get(f"/api/v1/applications/{app['id']}").json()
    assert updated_app["stage"] == "HIRED"
