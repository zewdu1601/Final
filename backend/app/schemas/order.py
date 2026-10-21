from typing import List, Literal, Optional
from pydantic import BaseModel, Field, model_validator
from datetime import datetime


class OrderItemCreate(BaseModel):
    product_id: int = Field(gt=0)
    quantity: int = Field(gt=0)


class OrderItemBase(OrderItemCreate):
    price: float


class OrderItemOut(OrderItemBase):
    id: int

    class Config:
        from_attributes = True


class OrderCreate(BaseModel):
    shipping_address: str = Field(min_length=5, max_length=500)
    payment_method: Literal["cash_on_delivery", "telebirr", "cbe", "card"] = "cash_on_delivery"
    items: List[OrderItemCreate] = Field(min_length=1)


class OrderStatusUpdate(BaseModel):
    status: Optional[Literal["Pending", "Confirmed", "Processing", "Shipped", "Delivered", "Cancelled", "Returned"]] = None
    payment_status: Optional[Literal["Pending", "Paid", "Failed", "Refunded"]] = None

    @model_validator(mode="after")
    def require_update(self):
        if self.status is None and self.payment_status is None:
            raise ValueError("Provide an order status or payment status to update")
        return self


class OrderNotificationOut(BaseModel):
    id: int
    order_id: int
    title: str
    message: str
    created_at: Optional[datetime] = None
    read_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class OrderOut(BaseModel):
    id: int
    user_id: int
    total_amount: float
    status: str
    shipping_address: str
    payment_method: str
    payment_status: str
    created_at: Optional[datetime] = None
    items: List[OrderItemOut] = []

    class Config:
        from_attributes = True
