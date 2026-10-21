from typing import List

from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.database import get_db
from app.models.order import Order, OrderItem
from app.models.product import Product
from app.models.review import Review
from app.schemas.review import ReviewCreate, ReviewOut

router = APIRouter()


@router.get("/{product_id}", response_model=List[ReviewOut])
def get_product_reviews(product_id: int, db: Session = Depends(get_db)):
    if not db.query(Product.id).filter(Product.id == product_id).first():
        raise HTTPException(status_code=404, detail="Product not found")
    return (
        db.query(Review)
        .filter(Review.product_id == product_id)
        .order_by(Review.created_at.desc(), Review.id.desc())
        .all()
    )


@router.post("/", response_model=ReviewOut)
def create_or_update_review(
    review_in: ReviewCreate,
    response: Response,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    product = db.query(Product).filter(Product.id == review_in.product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    purchased = (
        db.query(OrderItem.id)
        .join(Order, Order.id == OrderItem.order_id)
        .filter(
            Order.user_id == current_user.id,
            Order.status != "Cancelled",
            OrderItem.product_id == review_in.product_id,
        )
        .first()
    )
    if not purchased:
        raise HTTPException(status_code=403, detail="You can review products from your order history.")

    review = (
        db.query(Review)
        .filter(Review.user_id == current_user.id, Review.product_id == review_in.product_id)
        .first()
    )
    if review:
        review.rating = review_in.rating
        review.comment = review_in.comment
    else:
        review = Review(
            user_id=current_user.id,
            product_id=review_in.product_id,
            rating=review_in.rating,
            comment=review_in.comment,
        )
        db.add(review)
        response.status_code = status.HTTP_201_CREATED

    db.flush()
    rating, count = (
        db.query(func.avg(Review.rating), func.count(Review.id))
        .filter(Review.product_id == review_in.product_id)
        .one()
    )
    product.rating = float(rating or 0)
    product.rating_count = count
    db.commit()
    db.refresh(review)
    return review
