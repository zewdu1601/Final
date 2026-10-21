from sqlalchemy import Column, DateTime, ForeignKey, Integer, String
from sqlalchemy.sql import func

from app.core.database import Base


class RecommendationEvent(Base):
    __tablename__ = "recommendation_events"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=True)
    event_type = Column(String(30), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
