import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.core.database import Base, get_db
from app.core.security import create_access_token, get_password_hash
from app.main import app
from app.models.user import User


@pytest.fixture
def chat_client():
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    test_session = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    Base.metadata.create_all(bind=engine)
    db = test_session()
    admin = User(
        email="chat-admin@example.com",
        username="chat-admin",
        full_name="Chat Admin",
        hashed_password=get_password_hash("AdminPassword123"),
        is_admin=True,
        role="admin",
        is_active=True,
    )
    manager = User(
        email="chat-manager@example.com",
        username="chat-manager",
        full_name="Chat Manager",
        hashed_password=get_password_hash("ManagerPassword123"),
        role="manager",
        is_active=True,
    )
    customer = User(
        email="chat-customer@example.com",
        username="chat-customer",
        full_name="Chat Customer",
        hashed_password=get_password_hash("CustomerPassword123"),
        role="customer",
        is_active=True,
    )
    other_customer = User(
        email="other-customer@example.com",
        username="other-customer",
        full_name="Other Customer",
        hashed_password=get_password_hash("CustomerPassword123"),
        role="customer",
        is_active=True,
    )
    db.add_all([admin, manager, customer, other_customer])
    db.commit()
    users = {user.username: user for user in (admin, manager, customer, other_customer)}
    tokens = {
        username: create_access_token(user.id, token_version=user.token_version)
        for username, user in users.items()
    }
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
            yield client, tokens
    finally:
        app.dependency_overrides.pop(get_db, None)
        engine.dispose()


def auth(token):
    return {"Authorization": f"Bearer {token}"}


def test_customer_support_and_staff_room_are_separate(chat_client):
    client, tokens = chat_client
    manager_headers = auth(tokens["chat-manager"])
    admin_headers = auth(tokens["chat-admin"])
    customer_headers = auth(tokens["chat-customer"])
    other_customer_headers = auth(tokens["other-customer"])

    manager_conversations = client.get("/api/chat/conversations", headers=manager_headers)
    assert manager_conversations.status_code == 200
    staff_room = manager_conversations.json()[0]
    assert staff_room["kind"] == "staff"
    manager_message = client.post(
        f"/api/chat/conversations/{staff_room['id']}/messages",
        headers=manager_headers,
        json={"content": "Inventory update: shipment arrived."},
    )
    assert manager_message.status_code == 201

    admin_conversations = client.get("/api/chat/conversations", headers=admin_headers)
    assert admin_conversations.status_code == 200
    assert admin_conversations.json()[0]["id"] == staff_room["id"]
    assert admin_conversations.json()[0]["unread_count"] == 1
    admin_messages = client.get(
        f"/api/chat/conversations/{staff_room['id']}/messages",
        headers=admin_headers,
    )
    assert admin_messages.status_code == 200
    assert admin_messages.json()[0]["content"] == "Inventory update: shipment arrived."
    read_response = client.post(
        f"/api/chat/conversations/{staff_room['id']}/read",
        headers=admin_headers,
        json={"last_read_message_id": admin_messages.json()[-1]["id"]},
    )
    assert read_response.status_code == 204
    refreshed_admin_conversations = client.get("/api/chat/conversations", headers=admin_headers)
    assert refreshed_admin_conversations.json()[0]["unread_count"] == 0

    customer_conversations = client.get("/api/chat/conversations", headers=customer_headers)
    assert customer_conversations.status_code == 200
    assert [item["kind"] for item in customer_conversations.json()] == ["support", "admin_support"]
    support_room = customer_conversations.json()[0]
    admin_room = customer_conversations.json()[1]
    assert support_room["kind"] == "support"
    assert support_room["customer_id"] is not None
    assert admin_room["kind"] == "admin_support"
    assert admin_room["customer_id"] == support_room["customer_id"]

    blocked_staff_room = client.get(
        f"/api/chat/conversations/{staff_room['id']}/messages",
        headers=customer_headers,
    )
    assert blocked_staff_room.status_code == 403

    blocked_other_customer_room = client.get(
        f"/api/chat/conversations/{support_room['id']}/messages",
        headers=other_customer_headers,
    )
    assert blocked_other_customer_room.status_code == 403
    blocked_manager_from_admin_conversation = client.get(
        f"/api/chat/conversations/{admin_room['id']}/messages",
        headers=manager_headers,
    )
    assert blocked_manager_from_admin_conversation.status_code == 403


def test_chat_messages_are_shared_with_authorized_roles_and_validated(chat_client):
    client, tokens = chat_client
    customer_headers = auth(tokens["chat-customer"])
    manager_headers = auth(tokens["chat-manager"])
    admin_headers = auth(tokens["chat-admin"])

    customer_conversations = client.get(
        "/api/chat/conversations",
        headers=customer_headers,
    ).json()
    support_conversation = next(item for item in customer_conversations if item["kind"] == "support")
    admin_conversation = next(item for item in customer_conversations if item["kind"] == "admin_support")
    first_message = client.post(
        f"/api/chat/conversations/{support_conversation['id']}/messages",
        headers=customer_headers,
        json={"content": "  I need help with my order.  "},
    )
    assert first_message.status_code == 201
    assert first_message.json()["content"] == "I need help with my order."
    assert first_message.json()["sender_role"] == "customer"

    manager_conversations = client.get(
        "/api/chat/conversations",
        headers=manager_headers,
    )
    staff_support = next(
        item for item in manager_conversations.json()
        if item["id"] == support_conversation["id"]
    )
    staff_room_id = next(
        item["id"] for item in manager_conversations.json()
        if item["kind"] == "staff"
    )
    assert staff_support["customer_name"] == "Chat Customer"
    assert staff_support["unread_count"] == 1
    assert staff_support["last_message_sender_role"] == "customer"
    assert staff_support["last_message_sender_name"] == "Chat Customer"
    assert manager_conversations.json()[0]["id"] == support_conversation["id"]
    assert all(item["kind"] != "admin_support" for item in manager_conversations.json())

    reply = client.post(
        f"/api/chat/conversations/{support_conversation['id']}/messages",
        headers=manager_headers,
        json={"content": "We can help with that."},
    )
    assert reply.status_code == 201
    assert reply.json()["sender_role"] == "manager"
    admin_reply = client.post(
        f"/api/chat/conversations/{admin_conversation['id']}/messages",
        headers=admin_headers,
        json={"content": "An Admin can help with payment questions too."},
    )
    assert admin_reply.status_code == 201
    assert admin_reply.json()["sender_role"] == "admin"
    messages = client.get(
        f"/api/chat/conversations/{support_conversation['id']}/messages",
        headers=customer_headers,
    )
    assert [message["content"] for message in messages.json()] == [
        "I need help with my order.",
        "We can help with that.",
    ]
    assert [message["sender_role"] for message in messages.json()] == [
        "customer",
        "manager",
    ]
    admin_messages = client.get(
        f"/api/chat/conversations/{admin_conversation['id']}/messages",
        headers=customer_headers,
    )
    assert [message["content"] for message in admin_messages.json()] == [
        "An Admin can help with payment questions too.",
    ]
    assert [message["sender_role"] for message in admin_messages.json()] == ["admin"]
    customer_conversations_after_reply = client.get(
        "/api/chat/conversations",
        headers=customer_headers,
    )
    manager_thread = next(item for item in customer_conversations_after_reply.json() if item["kind"] == "support")
    admin_thread = next(item for item in customer_conversations_after_reply.json() if item["kind"] == "admin_support")
    assert manager_thread["unread_count"] == 1
    assert manager_thread["last_message_sender_role"] == "manager"
    assert admin_thread["unread_count"] == 1
    assert admin_thread["last_message_sender_role"] == "admin"
    mark_read = client.post(
        f"/api/chat/conversations/{support_conversation['id']}/read",
        headers=customer_headers,
        json={"last_read_message_id": messages.json()[-1]["id"]},
    )
    assert mark_read.status_code == 204
    customer_conversations_after_read = client.get(
        "/api/chat/conversations",
        headers=customer_headers,
    )
    assert next(item for item in customer_conversations_after_read.json() if item["kind"] == "support")["unread_count"] == 0
    assert next(item for item in customer_conversations_after_read.json() if item["kind"] == "admin_support")["unread_count"] == 1

    admin_read = client.post(
        f"/api/chat/conversations/{admin_conversation['id']}/read",
        headers=customer_headers,
        json={"last_read_message_id": admin_messages.json()[-1]["id"]},
    )
    assert admin_read.status_code == 204
    customer_conversations_fully_read = client.get("/api/chat/conversations", headers=customer_headers)
    assert all(item["unread_count"] == 0 for item in customer_conversations_fully_read.json())

    manager_staff_message = client.post(
        f"/api/chat/conversations/{staff_room_id}/messages",
        headers=manager_headers,
        json={"content": "Internal stock follow-up"},
    )
    assert manager_staff_message.status_code == 201
    refreshed_conversations = client.get(
        "/api/chat/conversations",
        headers=manager_headers,
    )
    assert refreshed_conversations.json()[0]["kind"] == "staff"
    assert refreshed_conversations.json()[1]["kind"] == "support"

    invalid_message = client.post(
        f"/api/chat/conversations/{staff_room_id}/messages",
        headers=manager_headers,
        json={"content": "   "},
    )
    assert invalid_message.status_code == 422
