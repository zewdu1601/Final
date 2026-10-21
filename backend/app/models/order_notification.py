from sqlalchemy import Column, DateTime, ForeignKey, Integer, String
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.core.database import Base


class OrderNotification(Base):
    __tablename__ = "order_notifications"

    id = Column(Integer, primary_key=True, index=True)
    recipient_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    order_id = Column(Integer, ForeignKey("orders.id"), nullable=False, index=True)
    title = Column(String(120), nullable=False)
    message = Column(String(500), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    read_at = Column(DateTime(timezone=True), nullable=True)

    recipient = relationship("User")
    order = relationship("Order")
