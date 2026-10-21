from sqlalchemy import Column, Integer, String, Float, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base


class Order(Base):
    __tablename__ = "orders"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    total_amount = Column(Float, nullable=False)
    status = Column(String(50), default="Pending")  # Pending, Confirmed, Processing, Shipped, Delivered, Cancelled, Returned
    shipping_address = Column(String(500), nullable=False)
    payment_method = Column(String(50), default="cash_on_delivery")
    payment_status = Column(String(50), default="Pending")
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    items = relationship("OrderItem", back_populates="order", cascade="all, delete-orphan")


class OrderItem(Base):
    __tablename__ = "order_items"

    id = Column(Integer, primary_key=True, index=True)
    order_id = Column(Integer, ForeignKey("orders.id"), nullable=False)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False)
    quantity = Column(Integer, default=1)
    price = Column(Float, nullable=False)

    order = relationship("Order", back_populates="items")
