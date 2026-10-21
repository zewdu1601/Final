from sqlalchemy import Column, Integer, String, Text
from sqlalchemy.orm import relationship
from app.core.database import Base


class Category(Base):
    __tablename__ = "categories"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), unique=True, index=True, nullable=False)
    slug = Column(String(120), unique=True, index=True, nullable=False)
    description = Column(Text, nullable=True)
    icon = Column(String(50), nullable=True)

    products = relationship("Product", back_populates="category")
