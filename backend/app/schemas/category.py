from typing import Optional
from pydantic import BaseModel


class CategoryBase(BaseModel):
    name: str
    slug: str
    description: Optional[str] = None
    icon: Optional[str] = None


class CategoryCreate(CategoryBase):
    pass


class CategoryUpdate(BaseModel):
    name: Optional[str] = None
    slug: Optional[str] = None
    description: Optional[str] = None
    icon: Optional[str] = None


class CategoryOut(CategoryBase):
    id: int

    class Config:
        from_attributes = True
