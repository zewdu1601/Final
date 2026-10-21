from sqlalchemy import Column, Integer, String, Float, Text, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base


class Product(Base):
    __tablename__ = "products"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), index=True, nullable=False)
    description = Column(Text, nullable=True)
    price = Column(Float, nullable=False)
    stock = Column(Integer, default=0)
    image = Column(String(500), nullable=True)
    rating = Column(Float, default=0.0)
    rating_count = Column(Integer, default=0)
    category_id = Column(Integer, ForeignKey("categories.id"), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    category = relationship("Category", back_populates="products")
    reviews = relationship("Review", back_populates="product", cascade="all, delete-orphan")
    order_items = relationship("OrderItem", backref="product")
