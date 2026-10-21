from sqlalchemy import Column, DateTime, ForeignKey, Index, Integer, String, Text, UniqueConstraint, text
from sqlalchemy.sql import func

from app.core.database import Base


class ChatConversation(Base):
    __tablename__ = "chat_conversations"
    __table_args__ = (
        UniqueConstraint("customer_id", name="uq_chat_support_customer"),
        Index(
            "uq_chat_staff_room",
            "kind",
            unique=True,
            postgresql_where=text("kind = 'staff'"),
            sqlite_where=text("kind = 'staff'"),
        ),
        Index(
            "uq_chat_admin_support_owner",
            "owner_id",
            unique=True,
            postgresql_where=text("kind = 'admin_support'"),
            sqlite_where=text("kind = 'admin_support'"),
        ),
    )

    id = Column(Integer, primary_key=True, index=True)
    kind = Column(String(20), nullable=False, index=True)
    customer_id = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)
    owner_id = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False, index=True)


class ChatMessage(Base):
    __tablename__ = "chat_messages"

    id = Column(Integer, primary_key=True, index=True)
    conversation_id = Column(Integer, ForeignKey("chat_conversations.id", ondelete="CASCADE"), nullable=False, index=True)
    sender_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    content = Column(Text, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False, index=True)


class ChatReadState(Base):
    __tablename__ = "chat_read_states"
    __table_args__ = (
        UniqueConstraint("conversation_id", "user_id", name="uq_chat_read_state_user"),
    )

    id = Column(Integer, primary_key=True, index=True)
    conversation_id = Column(Integer, ForeignKey("chat_conversations.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    last_read_message_id = Column(Integer, nullable=False, default=0)
