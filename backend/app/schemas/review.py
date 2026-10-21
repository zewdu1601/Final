from typing import Optional
from pydantic import BaseModel, Field
from datetime import datetime


class ReviewBase(BaseModel):
    product_id: int
    rating: float = Field(ge=1, le=5)
    comment: Optional[str] = Field(default=None, max_length=2000)


class ReviewCreate(ReviewBase):
    pass


class ReviewOut(ReviewBase):
    id: int
    user_id: int
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True
