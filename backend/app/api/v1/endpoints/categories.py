from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from app.core.database import get_db
from app.models.category import Category
from app.schemas.category import CategoryOut, CategoryCreate, CategoryUpdate
from app.models.product import Product
from app.api.deps import get_current_store_manager

router = APIRouter()


@router.get("/", response_model=List[CategoryOut])
def get_categories(db: Session = Depends(get_db)):
    return db.query(Category).all()


@router.post("/", response_model=CategoryOut, status_code=status.HTTP_201_CREATED)
def create_category(
    category_in: CategoryCreate,
    db: Session = Depends(get_db),
    admin=Depends(get_current_store_manager),
):
    category = Category(**category_in.model_dump())
    db.add(category)
    try:
        db.commit()
    except IntegrityError as error:
        db.rollback()
        raise HTTPException(status_code=409, detail="A category with this name or URL slug already exists") from error
    db.refresh(category)
    return category


@router.patch("/{category_id}", response_model=CategoryOut)
def update_category(
    category_id: int,
    category_in: CategoryUpdate,
    db: Session = Depends(get_db),
    admin=Depends(get_current_store_manager),
):
    category = db.query(Category).filter(Category.id == category_id).first()
    if not category:
        raise HTTPException(status_code=404, detail="Category not found")
    for field, value in category_in.model_dump(exclude_unset=True).items():
        setattr(category, field, value)
    try:
        db.commit()
    except IntegrityError as error:
        db.rollback()
        raise HTTPException(status_code=409, detail="A category with this name or URL slug already exists") from error
    db.refresh(category)
    return category


@router.delete("/{category_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_category(
    category_id: int,
    db: Session = Depends(get_db),
    admin=Depends(get_current_store_manager),
):
    category = db.query(Category).filter(Category.id == category_id).first()
    if not category:
        raise HTTPException(status_code=404, detail="Category not found")
    if db.query(Product).filter(Product.category_id == category_id).first():
        raise HTTPException(status_code=409, detail="Move or remove this category's products before deleting it")
    db.delete(category)
    db.commit()
