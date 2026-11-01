def test_synthetic_data_generation_and_validation(client):
    # 1. Trigger synthetic generator with fixed seed
    gen_payload = {
        "seed": 20261022,
        "requisitions_count": 25,
        "candidates_count": 100,
        "applications_count": 150,
        "interviews_count": 60,
        "inject_edge_cases": True
    }
    gen_res = client.post("/api/v1/data/generate", json=gen_payload)
    assert gen_res.status_code == 200, gen_res.text
    gen_data = gen_res.json()
    assert gen_data["status"] == "SUCCESS"
    assert gen_data["seed"] == 20261022
    assert "checksum" in gen_data
    assert gen_data["counts"]["requisitions"] == 25
    assert gen_data["counts"]["candidates"] == 100

    # 2. Run Data Validation Suite
    val_res = client.get("/api/v1/data/validate")
    assert val_res.status_code == 200
    report = val_res.json()
    assert report["total_checks"] == 8
    assert "checksum" in report
    
    # Verify all critical integrity checks pass
    checks = {c["check_name"]: c for c in report["checks"]}
    assert checks["Primary-Key Uniqueness"]["passed"] is True
    assert checks["Foreign-Key Referential Integrity"]["passed"] is True
    assert checks["Enum & Domain Validation"]["passed"] is True
    assert checks["Date Chronological Validation"]["passed"] is True
    assert checks["Arithmetic Reconciliation (Scorecard Formula)"]["passed"] is True
    assert checks["Duplicate Application Prevention"]["passed"] is True

    # 3. Test Exports
    json_export = client.get("/api/v1/data/export/json")
    assert json_export.status_code == 200
    assert len(json_export.json()["requisitions"]) == 25

    gt_export = client.get("/api/v1/data/export/ground-truth")
    assert gt_export.status_code == 200
    assert gt_export.json()["dataset_seed"] == 20261022

    sql_export = client.get("/api/v1/data/export/sql")
    assert sql_export.status_code == 200
    assert "INSERT INTO requisitions" in sql_export.text

    csv_export = client.get("/api/v1/data/export/csv")
    assert csv_export.status_code == 200
    assert csv_export.headers["content-type"] == "application/zip"
