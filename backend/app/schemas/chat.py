from datetime import datetime
from typing import Literal, Optional

from pydantic import BaseModel, Field, field_validator


class ChatMessageCreate(BaseModel):
    content: str = Field(min_length=1, max_length=2000)

    @field_validator("content")
    @classmethod
    def trim_content(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("Message cannot be blank")
        return value


class ChatReadUpdate(BaseModel):
    last_read_message_id: int = Field(ge=0)


class ChatMessageOut(BaseModel):
    id: int
    conversation_id: int
    sender_id: int
    sender_name: str
    sender_role: Literal["admin", "manager", "customer"]
    content: str
    created_at: datetime


class ChatConversationOut(BaseModel):
    id: int
    kind: Literal["support", "admin_support", "staff"]
    customer_id: Optional[int] = None
    customer_name: Optional[str] = None
    customer_email: Optional[str] = None
    last_message: Optional[str] = None
    last_message_sender_id: Optional[int] = None
    last_message_sender_name: Optional[str] = None
    last_message_sender_role: Optional[Literal["admin", "manager", "customer"]] = None
    last_message_at: Optional[datetime] = None
    unread_count: int = 0
    updated_at: datetime
