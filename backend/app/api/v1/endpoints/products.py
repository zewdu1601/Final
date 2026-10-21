from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.product import Product
from app.models.category import Category
from app.schemas.product import ProductOut, ProductCreate, ProductUpdate
from app.api.deps import get_current_store_manager

router = APIRouter()


@router.get("/", response_model=List[ProductOut])
def get_products(
    db: Session = Depends(get_db),
    category: Optional[str] = None,
    search: Optional[str] = None,
    skip: int = 0,
    limit: int = 20,
):
    query = db.query(Product)
    if category:
        query = query.join(Product.category).filter(Category.slug == category)
    if search:
        query = query.filter(Product.name.ilike(f"%{search}%") | Product.description.ilike(f"%{search}%"))
    return query.offset(skip).limit(limit).all()


@router.get("/{product_id}", response_model=ProductOut)
def get_product(product_id: int, db: Session = Depends(get_db)):
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    return product


@router.post("/", response_model=ProductOut, status_code=status.HTTP_201_CREATED)
def create_product(
    product_in: ProductCreate,
    db: Session = Depends(get_db),
    admin=Depends(get_current_store_manager),
):
    if product_in.category_id is not None and not db.query(Category).filter(Category.id == product_in.category_id).first():
        raise HTTPException(status_code=400, detail="Selected category does not exist")
    product = Product(**product_in.model_dump())
    db.add(product)
    db.commit()
    db.refresh(product)
    return product


@router.patch("/{product_id}", response_model=ProductOut)
def update_product(
    product_id: int,
    product_in: ProductUpdate,
    db: Session = Depends(get_db),
    admin=Depends(get_current_store_manager),
):
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    update_data = product_in.model_dump(exclude_unset=True)
    category_id = update_data.get("category_id", product.category_id)
    if category_id is not None and not db.query(Category).filter(Category.id == category_id).first():
        raise HTTPException(status_code=400, detail="Selected category does not exist")
    for field, value in update_data.items():
        setattr(product, field, value)
    db.commit()
    db.refresh(product)
    return product


@router.delete("/{product_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_product(
    product_id: int,
    db: Session = Depends(get_db),
    admin=Depends(get_current_store_manager),
):
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    if product.order_items:
        raise HTTPException(status_code=409, detail="This product is in order history and cannot be deleted")
    db.delete(product)
    db.commit()
