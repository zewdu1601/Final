from pydantic import BaseModel
from datetime import datetime
from app.schemas.product import ProductOut


class CartItemBase(BaseModel):
    product_id: int
    quantity: int = 1


class CartItemCreate(CartItemBase):
    pass


class CartItemOut(CartItemBase):
    id: int
    user_id: int
    created_at: datetime
    product: ProductOut

    class Config:
        from_attributes = True
