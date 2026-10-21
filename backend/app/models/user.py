from sqlalchemy import Column, Integer, String, Boolean, DateTime
from sqlalchemy.sql import func
from app.core.database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    username = Column(String(100), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    full_name = Column(String(255), nullable=True)
    contact_phone = Column(String(40), nullable=False, default="")
    address = Column(String(500), nullable=False, default="")
    is_active = Column(Boolean, default=True)
    is_admin = Column(Boolean, default=False)
    role = Column(String(30), nullable=False, default="customer")
    photo_url = Column(String(500), nullable=True)
    token_version = Column(Integer, nullable=False, default=0)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
