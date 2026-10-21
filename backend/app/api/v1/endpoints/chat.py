from datetime import datetime, timezone
from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.database import get_db
from app.models.chat import ChatConversation, ChatMessage, ChatReadState
from app.models.user import User
from app.schemas.chat import ChatConversationOut, ChatMessageCreate, ChatMessageOut, ChatReadUpdate

router = APIRouter()


def _is_staff(user: User) -> bool:
    return user.is_admin or user.role in ("admin", "manager")


def _ensure_staff_room(db: Session) -> ChatConversation:
    conversation = db.query(ChatConversation).filter(ChatConversation.kind == "staff").first()
    if conversation:
        return conversation

    conversation = ChatConversation(kind="staff")
    db.add(conversation)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        conversation = db.query(ChatConversation).filter(ChatConversation.kind == "staff").first()
        if conversation is None:
            raise
        return conversation
    db.refresh(conversation)
    return conversation


def _get_or_create_support_conversation(db: Session, customer: User) -> ChatConversation:
    conversation = db.query(ChatConversation).filter(
        ChatConversation.kind == "support",
        ChatConversation.customer_id == customer.id,
    ).first()
    if conversation:
        return conversation

    conversation = ChatConversation(kind="support", customer_id=customer.id)
    db.add(conversation)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        conversation = db.query(ChatConversation).filter(
            ChatConversation.kind == "support",
            ChatConversation.customer_id == customer.id,
        ).first()
        if conversation is None:
            raise
        return conversation
    db.refresh(conversation)
    return conversation


def _get_or_create_admin_conversation(db: Session, customer: User) -> ChatConversation:
    conversation = db.query(ChatConversation).filter(
        ChatConversation.kind == "admin_support",
        ChatConversation.owner_id == customer.id,
    ).first()
    if conversation:
        return conversation

    conversation = ChatConversation(kind="admin_support", owner_id=customer.id)
    db.add(conversation)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        conversation = db.query(ChatConversation).filter(
            ChatConversation.kind == "admin_support",
            ChatConversation.owner_id == customer.id,
        ).first()
        if conversation is None:
            raise
        return conversation
    db.refresh(conversation)
    return conversation


def _get_accessible_conversation(
    db: Session,
    conversation_id: int,
    user: User,
) -> ChatConversation:
    conversation = db.query(ChatConversation).filter(
        ChatConversation.id == conversation_id
    ).first()
    if conversation is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Chat conversation not found")
    if conversation.kind == "staff":
        if not _is_staff(user):
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Staff chat is not available to customers")
    elif conversation.kind == "support":
        if _is_staff(user):
            if user.role != "manager":
                raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="This conversation is assigned to Store Managers")
        elif conversation.customer_id != user.id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You cannot access this support conversation")
    elif conversation.kind == "admin_support":
        if _is_staff(user):
            if user.role != "admin" and not user.is_admin:
                raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="This conversation is assigned to Admins")
        elif conversation.owner_id != user.id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You cannot access this support conversation")
    return conversation


def _message_out(message: ChatMessage, sender: User) -> ChatMessageOut:
    return ChatMessageOut(
        id=message.id,
        conversation_id=message.conversation_id,
        sender_id=message.sender_id,
        sender_name=sender.full_name or sender.username,
        sender_role=sender.role,
        content=message.content,
        created_at=message.created_at,
    )


def _get_read_state(db: Session, conversation_id: int, user_id: int) -> ChatReadState:
    state = db.query(ChatReadState).filter(
        ChatReadState.conversation_id == conversation_id,
        ChatReadState.user_id == user_id,
    ).first()
    if state:
        return state

    state = ChatReadState(
        conversation_id=conversation_id,
        user_id=user_id,
        last_read_message_id=0,
    )
    db.add(state)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        state = db.query(ChatReadState).filter(
            ChatReadState.conversation_id == conversation_id,
            ChatReadState.user_id == user_id,
        ).first()
        if state is None:
            raise
        return state
    db.refresh(state)
    return state


@router.get("/conversations", response_model=List[ChatConversationOut])
def get_conversations(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if _is_staff(current_user):
        _ensure_staff_room(db)
        support_kind = "admin_support" if current_user.is_admin or current_user.role == "admin" else "support"
        latest_message_id = db.query(func.max(ChatMessage.id)).filter(
            ChatMessage.conversation_id == ChatConversation.id
        ).correlate(ChatConversation).scalar_subquery()
        conversations = db.query(ChatConversation).filter(
            ChatConversation.kind.in_((support_kind, "staff"))
        ).order_by(
            func.coalesce(latest_message_id, 0).desc(),
            ChatConversation.updated_at.desc(),
            ChatConversation.id.desc(),
        ).all()
    elif current_user.role == "customer":
        manager_conversation = _get_or_create_support_conversation(db, current_user)
        admin_conversation = _get_or_create_admin_conversation(db, current_user)
        conversations = [manager_conversation, admin_conversation]
    else:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Chat is not available to this account")

    results = []
    for conversation in conversations:
        customer_id = conversation.customer_id or conversation.owner_id
        customer = db.query(User).filter(User.id == customer_id).first() if customer_id else None
        last_message = db.query(ChatMessage).filter(
            ChatMessage.conversation_id == conversation.id
        ).order_by(ChatMessage.created_at.desc(), ChatMessage.id.desc()).first()
        last_sender = db.query(User).filter(
            User.id == last_message.sender_id
        ).first() if last_message else None
        read_state = db.query(ChatReadState).filter(
            ChatReadState.conversation_id == conversation.id,
            ChatReadState.user_id == current_user.id,
        ).first()
        last_read_message_id = read_state.last_read_message_id if read_state else 0
        unread_count = db.query(ChatMessage).filter(
            ChatMessage.conversation_id == conversation.id,
            ChatMessage.sender_id != current_user.id,
            ChatMessage.id > last_read_message_id,
        ).count()
        results.append(ChatConversationOut(
            id=conversation.id,
            kind=conversation.kind,
            customer_id=customer_id,
            customer_name=(customer.full_name or customer.username) if customer else None,
            customer_email=customer.email if customer else None,
            last_message=last_message.content if last_message else None,
            last_message_sender_id=last_sender.id if last_sender else None,
            last_message_sender_name=(last_sender.full_name or last_sender.username) if last_sender else None,
            last_message_sender_role=last_sender.role if last_sender else None,
            last_message_at=last_message.created_at if last_message else None,
            unread_count=unread_count,
            updated_at=conversation.updated_at,
        ))
    return results


@router.get("/conversations/{conversation_id}/messages", response_model=List[ChatMessageOut])
def get_messages(
    conversation_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _get_accessible_conversation(db, conversation_id, current_user)
    rows = db.query(ChatMessage, User).join(
        User, User.id == ChatMessage.sender_id
    ).filter(
        ChatMessage.conversation_id == conversation_id
    ).order_by(
        ChatMessage.created_at.desc(), ChatMessage.id.desc()
    ).limit(100).all()
    rows.reverse()
    return [_message_out(message, sender) for message, sender in rows]


@router.post("/conversations/{conversation_id}/read", status_code=status.HTTP_204_NO_CONTENT)
def mark_conversation_read(
    conversation_id: int,
    read_update: ChatReadUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _get_accessible_conversation(db, conversation_id, current_user)
    latest_message_id = db.query(ChatMessage.id).filter(
        ChatMessage.conversation_id == conversation_id,
        ChatMessage.id <= read_update.last_read_message_id,
    ).order_by(ChatMessage.id.desc()).limit(1).scalar() or 0
    read_state = _get_read_state(db, conversation_id, current_user.id)
    read_state.last_read_message_id = max(read_state.last_read_message_id, latest_message_id)
    db.commit()


@router.post(
    "/conversations/{conversation_id}/messages",
    response_model=ChatMessageOut,
    status_code=status.HTTP_201_CREATED,
)
def send_message(
    conversation_id: int,
    message_in: ChatMessageCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    conversation = _get_accessible_conversation(db, conversation_id, current_user)
    message = ChatMessage(
        conversation_id=conversation.id,
        sender_id=current_user.id,
        content=message_in.content,
    )
    conversation.updated_at = datetime.now(timezone.utc)
    db.add(message)
    db.commit()
    db.refresh(message)
    read_state = _get_read_state(db, conversation.id, current_user.id)
    read_state.last_read_message_id = max(read_state.last_read_message_id, message.id)
    db.commit()
    return _message_out(message, current_user)
