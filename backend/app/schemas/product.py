from typing import Optional
from pydantic import BaseModel, Field
from datetime import datetime
from app.schemas.category import CategoryOut


class ProductBase(BaseModel):
    name: str
    description: Optional[str] = None
    price: float = Field(gt=0)
    stock: int = Field(ge=0)
    image: Optional[str] = None
    category_id: Optional[int] = None


class ProductCreate(ProductBase):
    pass


class ProductUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    price: Optional[float] = Field(default=None, gt=0)
    stock: Optional[int] = Field(default=None, ge=0)
    image: Optional[str] = None
    category_id: Optional[int] = None


class ProductOut(ProductBase):
    id: int
    rating: float = 0.0
    rating_count: int = 0
    created_at: Optional[datetime] = None
    category: Optional[CategoryOut] = None

    class Config:
        from_attributes = True
