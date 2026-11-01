def test_register_and_login(client):
    # Test registration
    reg_payload = {
        "email": "test.recruiter@hireflow.internal",
        "name": "Jane Recruiter",
        "password": "SecurePassword123!",
        "role": "RECRUITER"
    }
    response = client.post("/api/v1/auth/register", json=reg_payload)
    assert response.status_code == 200, response.text
    data = response.json()
    assert data["email"] == "test.recruiter@hireflow.internal"
    assert data["name"] == "Jane Recruiter"

    # Test login
    login_payload = {
        "email": "test.recruiter@hireflow.internal",
        "password": "SecurePassword123!"
    }
    login_res = client.post("/api/v1/auth/login", json=login_payload)
    assert login_res.status_code == 200
    token_data = login_res.json()
    assert "access_token" in token_data
    assert token_data["token_type"] == "bearer"
    assert token_data["user"]["email"] == "test.recruiter@hireflow.internal"

    # Test invalid credentials
    bad_login = client.post("/api/v1/auth/login", json={"email": "test.recruiter@hireflow.internal", "password": "wrong"})
    assert bad_login.status_code == 401
