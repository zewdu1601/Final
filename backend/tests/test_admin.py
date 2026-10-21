from io import BytesIO

import pytest
from fastapi.testclient import TestClient
from PIL import Image
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.core.config import settings
from app.core.database import Base, get_db
from app.core.security import create_access_token, get_password_hash
from app.main import app
from app.models.user import User
from data.create_admin import create_admin_account


@pytest.fixture
def admin_client():
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    test_session = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    Base.metadata.create_all(bind=engine)
    db = test_session()
    admin = User(
        email="admin@aistore.com",
        username="admin-test",
        hashed_password=get_password_hash("AdminPassword123"),
        is_admin=True,
        role="admin",
        is_active=True,
    )
    manager = User(
        email="manager@aistore.com",
        username="manager-test",
        hashed_password=get_password_hash("ManagerPassword123"),
        is_admin=False,
        role="manager",
        is_active=True,
    )
    db.add_all([admin, manager])
    db.commit()
    db.refresh(admin)
    db.refresh(manager)
    admin_token = create_access_token(admin.id, token_version=admin.token_version)
    manager_token = create_access_token(manager.id, token_version=manager.token_version)
    db.close()

    def override_get_db():
        session = test_session()
        try:
            yield session
        finally:
            session.close()

    app.dependency_overrides[get_db] = override_get_db
    try:
        with TestClient(app) as client:
            client.headers.update({"Authorization": f"Bearer {admin_token}"})
            yield client, manager_token
    finally:
        app.dependency_overrides.pop(get_db, None)
        engine.dispose()


def test_admin_dashboard_and_monitoring_use_live_data(admin_client):
    client, _ = admin_client

    stats_response = client.get("/api/admin/stats")
    assert stats_response.status_code == 200
    stats = stats_response.json()
    assert stats["total_users"] == 2
    assert stats["total_store_managers"] == 1
    assert stats["total_customers"] == 0

    monitoring_response = client.get("/api/admin/recommendations")
    assert monitoring_response.status_code == 200
    monitoring = monitoring_response.json()
    assert monitoring["total_requests"] == 0
    assert monitoring["events_by_type"] == []


def test_admin_reports_return_real_empty_period_totals(admin_client):
    client, _ = admin_client

    response = client.get(
        "/api/admin/reports",
        params={"start_date": "2020-01-01", "end_date": "2020-01-31"},
    )

    assert response.status_code == 200
    report = response.json()
    assert report["sales"] == {"paid_revenue": 0, "paid_orders": 0, "orders": 0}
    assert report["orders_by_status"] == []
    assert report["users_by_role"] == []


def test_store_manager_can_access_store_dashboard_but_not_admin_controls(admin_client):
    client, manager_token = admin_client
    headers = {"Authorization": f"Bearer {manager_token}"}

    dashboard_response = client.get(
        "/api/admin/stats",
        headers=headers,
    )
    admin_users_response = client.get(
        "/api/admin/users",
        headers=headers,
    )
    settings_response = client.get("/api/admin/settings", headers=headers)

    assert dashboard_response.status_code == 200
    assert dashboard_response.json()["total_products"] == 0
    assert dashboard_response.json()["total_stock"] == 0
    assert "total_users" not in dashboard_response.json()
    assert "total_store_managers" not in dashboard_response.json()
    assert "total_admins" not in dashboard_response.json()
    assert admin_users_response.status_code == 403
    assert settings_response.status_code == 403


def test_store_manager_can_access_store_operations(admin_client):
    client, manager_token = admin_client
    headers = {"Authorization": f"Bearer {manager_token}"}

    for endpoint in (
        "/api/admin/analytics",
        "/api/admin/reports",
        "/api/admin/orders",
        "/api/products/",
        "/api/categories/",
    ):
        response = client.get(endpoint, headers=headers)
        assert response.status_code == 200, f"{endpoint} returned {response.status_code}: {response.text}"

    manager_report = client.get("/api/admin/reports", headers=headers)
    manager_recommendations = client.get("/api/admin/recommendations", headers=headers)
    assert manager_report.json()["users_by_role"] == []
    assert manager_report.json()["recommendation_events"] == []
    assert manager_recommendations.status_code == 403


def test_order_lifecycle_separates_payment_tracks_stock_and_notifies_users(admin_client):
    client, manager_token = admin_client
    manager_headers = {"Authorization": f"Bearer {manager_token}"}
    product_response = client.post(
        "/api/products/",
        headers=manager_headers,
        json={"name": "Lifecycle product", "price": 20, "stock": 3},
    )
    assert product_response.status_code == 201
    product_id = product_response.json()["id"]

    registration = client.post(
        "/api/auth/register",
        json={
            "full_name": "Order Customer",
            "username": "order-customer",
            "email": "order-customer@example.com",
            "password": "OrderCustomer123",
        },
    )
    assert registration.status_code == 201
    login = client.post(
        "/api/auth/login",
        json={"username": "order-customer", "password": "OrderCustomer123"},
    )
    customer_headers = {"Authorization": f"Bearer {login.json()['access_token']}"}
    order_response = client.post(
        "/api/orders/",
        headers=customer_headers,
        json={
            "shipping_address": "10 Order Street, Sample City",
            "payment_method": "cash_on_delivery",
            "items": [{"product_id": product_id, "quantity": 2}],
        },
    )
    assert order_response.status_code == 201
    order_id = order_response.json()["id"]
    assert order_response.json()["status"] == "Pending"
    assert order_response.json()["payment_status"] == "Pending"
    assert client.get("/api/products/").json()[0]["stock"] == 1
    oversell = client.post(
        "/api/orders/",
        headers=customer_headers,
        json={
            "shipping_address": "10 Order Street, Sample City",
            "payment_method": "cash_on_delivery",
            "items": [{"product_id": product_id, "quantity": 2}],
        },
    )
    assert oversell.status_code == 400
    assert client.get(f"/api/products/{product_id}").json()["stock"] == 1

    manager_notifications = client.get("/api/orders/notifications", headers=manager_headers)
    customer_notifications = client.get("/api/orders/notifications", headers=customer_headers)
    assert any(item["title"] == "New order received" for item in manager_notifications.json())
    assert any(item["title"] == "Order placed" for item in customer_notifications.json())
    assert client.patch("/api/orders/notifications/read", headers=customer_headers).status_code == 204
    assert all(
        item["read_at"] is not None
        for item in client.get("/api/orders/notifications", headers=customer_headers).json()
    )

    invalid_skip = client.patch(
        f"/api/admin/orders/{order_id}",
        headers=manager_headers,
        json={"status": "Shipped"},
    )
    assert invalid_skip.status_code == 409
    confirmed = client.patch(
        f"/api/admin/orders/{order_id}",
        headers=manager_headers,
        json={"status": "Confirmed"},
    )
    assert confirmed.status_code == 200
    for next_status in ("Processing", "Shipped", "Delivered"):
        response = client.patch(
            f"/api/admin/orders/{order_id}",
            headers=manager_headers,
            json={"status": next_status},
        )
        assert response.status_code == 200
        assert response.json()["status"] == next_status
    delivered_order = client.get("/api/orders/", headers=customer_headers).json()[0]
    assert delivered_order["payment_status"] == "Pending"
    assert client.get("/api/admin/reports", headers=manager_headers).json()["sales"]["paid_revenue"] == 0
    payment_updated = client.patch(
        f"/api/admin/orders/{order_id}",
        headers=manager_headers,
        json={"payment_status": "Paid"},
    )
    assert payment_updated.json()["status"] == "Delivered"
    assert payment_updated.json()["payment_status"] == "Paid"

    report = client.get("/api/admin/reports", headers=manager_headers).json()
    assert report["sales"]["paid_revenue"] == 40
    assert report["sales"]["paid_orders"] == 1
    customer_order_notifications = client.get(
        "/api/orders/notifications",
        headers=customer_headers,
    ).json()
    assert any(item["title"] == "Order delivered" for item in customer_order_notifications)

    returned = client.patch(
        f"/api/admin/orders/{order_id}",
        headers=manager_headers,
        json={"status": "Returned"},
    )
    assert returned.status_code == 200
    assert client.get("/api/admin/reports", headers=manager_headers).json()["sales"]["paid_revenue"] == 0


def test_cancelling_order_restores_reserved_stock_once(admin_client):
    client, manager_token = admin_client
    manager_headers = {"Authorization": f"Bearer {manager_token}"}
    product = client.post(
        "/api/products/",
        headers=manager_headers,
        json={"name": "Cancel stock product", "price": 5, "stock": 1},
    ).json()
    client.post(
        "/api/auth/register",
        json={
            "full_name": "Cancel Customer",
            "username": "cancel-customer",
            "email": "cancel-customer@example.com",
            "password": "CancelCustomer123",
        },
    )
    token = client.post(
        "/api/auth/login",
        json={"username": "cancel-customer", "password": "CancelCustomer123"},
    ).json()["access_token"]
    customer_headers = {"Authorization": f"Bearer {token}"}
    order = client.post(
        "/api/orders/",
        headers=customer_headers,
        json={
            "shipping_address": "10 Cancel Street, Sample City",
            "payment_method": "cash_on_delivery",
            "items": [{"product_id": product["id"], "quantity": 1}],
        },
    ).json()
    cancelled = client.patch(
        f"/api/admin/orders/{order['id']}",
        headers=manager_headers,
        json={"status": "Cancelled"},
    )
    assert cancelled.status_code == 200
    assert client.get(f"/api/products/{product['id']}").json()["stock"] == 1
    duplicate_cancel = client.patch(
        f"/api/admin/orders/{order['id']}",
        headers=manager_headers,
        json={"status": "Pending"},
    )
    assert duplicate_cancel.status_code == 409
    assert client.get(f"/api/products/{product['id']}").json()["stock"] == 1


def test_order_accepts_preview_payment_methods_without_processing_payment(admin_client):
    client, manager_token = admin_client
    manager_headers = {"Authorization": f"Bearer {manager_token}"}
    product = client.post(
        "/api/products/",
        headers=manager_headers,
        json={"name": "Payment preview product", "price": 12, "stock": 10},
    ).json()
    client.post(
        "/api/auth/register",
        json={
            "full_name": "Payment Preview Customer",
            "username": "payment-preview-customer",
            "email": "payment-preview@example.com",
            "password": "PaymentPreview123",
        },
    )
    token = client.post(
        "/api/auth/login",
        json={"username": "payment-preview-customer", "password": "PaymentPreview123"},
    ).json()["access_token"]
    customer_headers = {"Authorization": f"Bearer {token}"}

    for method in ("cash_on_delivery", "telebirr", "cbe", "card"):
        response = client.post(
            "/api/orders/",
            headers=customer_headers,
            json={
                "shipping_address": "20 Payment Street, Sample City",
                "payment_method": method,
                "items": [{"product_id": product["id"], "quantity": 1}],
            },
        )
        assert response.status_code == 201
        assert response.json()["payment_method"] == method
        assert response.json()["payment_status"] == "Pending"
        assert response.json()["status"] == "Pending"

    unsupported = client.post(
        "/api/orders/",
        headers=customer_headers,
        json={
            "shipping_address": "20 Payment Street, Sample City",
            "payment_method": "unsupported_gateway",
            "items": [{"product_id": product["id"], "quantity": 1}],
        },
    )
    assert unsupported.status_code == 422


def test_admin_login_accepts_valid_credentials_and_rejects_invalid_credentials(admin_client):
    client, _ = admin_client

    valid_response = client.post(
        "/api/auth/login",
        json={"email": "admin@aistore.com", "password": "AdminPassword123"},
    )
    invalid_response = client.post(
        "/api/auth/login",
        json={"username": "admin-test", "password": "incorrect"},
    )

    assert valid_response.status_code == 200
    assert valid_response.json()["user"]["is_admin"] is True
    assert "hashed_password" not in valid_response.json()["user"]
    assert invalid_response.status_code == 401


def test_signed_in_user_can_update_own_profile(admin_client):
    client, _ = admin_client

    response = client.patch(
        "/api/auth/me",
        json={"full_name": "Updated Admin", "username": "updated-admin"},
    )

    assert response.status_code == 200
    assert response.json()["full_name"] == "Updated Admin"
    assert response.json()["username"] == "updated-admin"
    assert "hashed_password" not in response.json()


def test_profile_update_rejects_duplicate_username(admin_client):
    client, _ = admin_client

    response = client.patch("/api/auth/me", json={"username": "manager-test"})

    assert response.status_code == 409
    assert response.json()["detail"] == "That username is already in use."


def test_logout_invalidates_existing_admin_token(admin_client):
    client, _ = admin_client

    logout_response = client.post("/api/auth/logout")

    assert logout_response.status_code == 204
    assert client.get("/api/admin/stats").status_code == 401


def test_admin_can_create_and_filter_users(admin_client):
    client, _ = admin_client
    new_user = {
        "full_name": "New Store Manager",
        "username": "new-manager",
        "email": "new-manager@aistore.com",
        "role": "manager",
        "password": "StrongPassword123",
    }

    created_response = client.post("/api/admin/users", json=new_user)
    assert created_response.status_code == 201
    created = created_response.json()
    assert created["role"] == "manager"
    assert created["is_admin"] is False
    assert "hashed_password" not in created

    list_response = client.get(
        "/api/admin/users",
        params={"search": "new-manager", "role": "manager", "active": "true"},
    )
    assert list_response.status_code == 200
    assert list_response.json()["total"] == 1
    assert list_response.json()["items"][0]["id"] == created["id"]


def test_create_admin_account_sets_admin_role_and_hashes_password():
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    test_session = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    Base.metadata.create_all(bind=engine)
    db = test_session()
    try:
        admin = create_admin_account(
            db,
            email="new-admin@aistore.com",
            username="new-admin",
            full_name="New Admin",
            password="StrongAdminPassword123",
        )

        assert admin.role == "admin"
        assert admin.is_admin is True
        assert admin.is_active is True
        assert admin.hashed_password != "StrongAdminPassword123"

        with pytest.raises(ValueError, match="already in use"):
            create_admin_account(
                db,
                email="NEW-ADMIN@aistore.com",
                username="another-admin",
                full_name="Another Admin",
                password="StrongAdminPassword123",
            )

        with pytest.raises(ValueError) as error:
            create_admin_account(
                db,
                email="weak-admin@aistore.com",
                username="weak-admin",
                full_name="Weak Admin",
                password="weakpassword",
            )
        assert "weakpassword" not in str(error.value)
    finally:
        db.close()
        engine.dispose()


def test_admin_photo_upload_validates_and_stores_image(admin_client, tmp_path, monkeypatch):
    client, _ = admin_client
    monkeypatch.setattr(settings, "MEDIA_ROOT", str(tmp_path))
    image_bytes = BytesIO()
    Image.new("RGB", (8, 8), color="purple").save(image_bytes, format="PNG")

    response = client.post(
        "/api/admin/profile/photo",
        files={"photo": ("avatar.png", image_bytes.getvalue(), "image/png")},
    )

    assert response.status_code == 200
    photo_url = response.json()["photo_url"]
    assert photo_url.startswith("/media/profile-photos/")
    stored_photo = tmp_path / photo_url.removeprefix("/media/")
    assert stored_photo.is_file()

    invalid_response = client.post(
        "/api/admin/profile/photo",
        files={"photo": ("avatar.jpg", b"not an image", "image/jpeg")},
    )
    assert invalid_response.status_code == 415


def test_admin_password_change_invalidates_current_token(admin_client):
    client, _ = admin_client

    response = client.post(
        "/api/admin/change-password",
        json={
            "current_password": "AdminPassword123",
            "new_password": "NewAdminPassword456",
            "confirm_password": "NewAdminPassword456",
        },
    )

    assert response.status_code == 204
    assert client.get("/api/admin/stats").status_code == 401
