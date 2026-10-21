def test_root_endpoint(client):
    response = client.get("/")
    assert response.status_code == 200
    assert "message" in response.json()

def test_health_endpoint(client):
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "healthy"}


def test_admin_endpoints_require_authentication(client):
    protected_endpoints = [
        "/api/admin/stats",
        "/api/admin/users",
        "/api/admin/profile",
        "/api/admin/settings",
        "/api/admin/recommendations",
        "/api/admin/reports",
        "/api/chat/conversations",
    ]

    for endpoint in protected_endpoints:
        response = client.get(endpoint)
        assert response.status_code == 401, endpoint
