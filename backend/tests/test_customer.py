import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.core.database import Base, get_db
from app.core.security import create_access_token, get_password_hash
from app.main import app
from app.models.order import Order, OrderItem
from app.models.product import Product
from app.models.user import User


@pytest.fixture
def customer_client():
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    test_session = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    Base.metadata.create_all(bind=engine)
    db = test_session()

    customer = User(
        email="customer@example.com",
        username="customer-test",
        full_name="Test Customer",
        hashed_password=get_password_hash("CustomerPassword123"),
        is_active=True,
        is_admin=False,
        role="customer",
    )
    purchased_product = Product(name="Purchased item", price=25, stock=5)
    other_product = Product(name="Not purchased", price=15, stock=5)
    db.add_all([customer, purchased_product, other_product])
    db.flush()
    order = Order(
        user_id=customer.id,
        total_amount=25,
        status="Pending",
        shipping_address="1 Test Street, Test City",
        payment_method="Cash on Delivery",
        payment_status="Pending",
    )
    db.add(order)
    db.flush()
    db.add(OrderItem(order_id=order.id, product_id=purchased_product.id, quantity=1, price=25))
    db.commit()

    token = create_access_token(customer.id, token_version=customer.token_version)
    purchased_product_id = purchased_product.id
    other_product_id = other_product.id
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
            client.headers.update({"Authorization": f"Bearer {token}"})
            yield client, purchased_product_id, other_product_id
    finally:
        app.dependency_overrides.pop(get_db, None)
        engine.dispose()


def test_customer_registration_and_profile_store_contact_details(customer_client):
    client, _, _ = customer_client

    registration = client.post(
        "/api/auth/register",
        json={
            "full_name": "New Customer",
            "username": "new-customer",
            "email": "new-customer@example.com",
            "contact_phone": "555-0100",
            "address": "10 New Street",
            "password": "NewCustomer123",
        },
    )

    assert registration.status_code == 201
    assert registration.json()["contact_phone"] == "555-0100"
    assert registration.json()["address"] == "10 New Street"

    profile_update = client.patch(
        "/api/auth/me",
        json={"contact_phone": "555-0199", "address": "20 Updated Street"},
    )

    assert profile_update.status_code == 200
    assert profile_update.json()["contact_phone"] == "555-0199"
    assert profile_update.json()["address"] == "20 Updated Street"


def test_customer_can_review_only_purchased_products_and_update_rating(customer_client):
    client, purchased_product_id, other_product_id = customer_client

    review = client.post(
        "/api/reviews/",
        json={"product_id": purchased_product_id, "rating": 4, "comment": "Good quality"},
    )

    assert review.status_code == 201
    assert review.json()["rating"] == 4

    updated_review = client.post(
        "/api/reviews/",
        json={"product_id": purchased_product_id, "rating": 5, "comment": "Excellent"},
    )
    assert updated_review.status_code == 200
    assert updated_review.json()["id"] == review.json()["id"]

    reviews = client.get(f"/api/reviews/{purchased_product_id}")
    assert reviews.status_code == 200
    assert len(reviews.json()) == 1
    assert reviews.json()[0]["rating"] == 5

    denied_review = client.post(
        "/api/reviews/",
        json={"product_id": other_product_id, "rating": 3},
    )
    assert denied_review.status_code == 403


def test_customer_password_change_revokes_old_session(customer_client):
    client, _, _ = customer_client

    response = client.post(
        "/api/auth/password",
        json={
            "current_password": "CustomerPassword123",
            "new_password": "UpdatedCustomerPassword456",
            "confirm_password": "UpdatedCustomerPassword456",
        },
    )
    assert response.status_code == 204
    assert client.get("/api/auth/me").status_code == 401

    login = client.post(
        "/api/auth/login",
        json={"username": "customer-test", "password": "UpdatedCustomerPassword456"},
    )
    assert login.status_code == 200
