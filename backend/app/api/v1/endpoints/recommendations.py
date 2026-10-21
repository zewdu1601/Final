from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.product import Product
from app.schemas.product import ProductOut
from app.schemas.recommendation import RecommendationResponse
from app.ai_engine.recommender import recommender
from app.api.deps import get_optional_current_user
from app.models.recommendation_event import RecommendationEvent

router = APIRouter()


def record_recommendation(db: Session, user_id: int | None, product_id: int | None, event_type: str):
    db.add(RecommendationEvent(user_id=user_id, product_id=product_id, event_type=event_type))
    db.commit()


@router.get("/similar/{product_id}", response_model=List[ProductOut])
def get_similar_products(
    product_id: int,
    top_n: int = 4,
    db: Session = Depends(get_db),
    current_user=Depends(get_optional_current_user),
):
    """AI Content-Based Recommendation: Returns items similar to the given product."""
    similar_ids = recommender.recommend_similar_products(product_id, top_n=top_n)
    if not similar_ids:
        # Fallback to same category or top products
        current = db.query(Product).filter(Product.id == product_id).first()
        if current and current.category_id:
            products = (
                db.query(Product)
                .filter(Product.category_id == current.category_id, Product.id != product_id)
                .limit(top_n)
                .all()
            )
        else:
            products = db.query(Product).filter(Product.id != product_id).limit(top_n).all()
    else:
        products = db.query(Product).filter(Product.id.in_(similar_ids)).all()
    base_product_exists = db.query(Product.id).filter(Product.id == product_id).first() is not None
    record_recommendation(
        db,
        current_user.id if current_user else None,
        product_id if base_product_exists else None,
        "similar",
    )
    return products


@router.get("/personalized", response_model=RecommendationResponse)
def get_personalized_recommendations(
    top_n: int = 6,
    db: Session = Depends(get_db),
    current_user=Depends(get_optional_current_user),
):
    """AI Personalized Recommendation: Tailored to user's order history."""
    # Find products previously purchased by the user
    from app.models.order import Order, OrderItem
    if not current_user:
        raise HTTPException(status_code=401, detail="Authentication required")
    user_orders = db.query(Order).filter(Order.user_id == current_user.id).all()
    order_ids = [o.id for o in user_orders]
    purchased_items = db.query(OrderItem.product_id).filter(OrderItem.order_id.in_(order_ids)).all()
    purchased_product_ids = [item[0] for item in purchased_items]

    recommended_ids = recommender.recommend_for_user(purchased_product_ids, top_n=top_n)
    products = db.query(Product).filter(Product.id.in_(recommended_ids)).all()
    
    # If not enough, fill with top-rated products
    if len(products) < top_n:
        needed = top_n - len(products)
        existing_ids = [p.id for p in products] + purchased_product_ids
        fillers = db.query(Product).filter(~Product.id.in_(existing_ids)).order_by(Product.rating.desc()).limit(needed).all()
        products.extend(fillers)
    record_recommendation(db, current_user.id, None, "personalized")

    return RecommendationResponse(
        user_id=current_user.id,
        algorithm="collaborative_content_hybrid",
        products=products,
    )


@router.get("/trending", response_model=List[ProductOut])
def get_trending_products(
    limit: int = 4,
    db: Session = Depends(get_db),
    current_user=Depends(get_optional_current_user),
):
    """Returns top rated and trending products."""
    products = db.query(Product).order_by(Product.rating.desc()).limit(limit).all()
    record_recommendation(db, current_user.id if current_user else None, None, "trending")
    return products
