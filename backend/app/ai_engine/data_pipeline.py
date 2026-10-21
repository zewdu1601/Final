from typing import List, Dict, Any
from sqlalchemy.orm import Session
from app.models.product import Product
from app.ai_engine.recommender import recommender


def sync_recommender_data(db: Session):
    """Load latest products from database and train/update recommender in-memory model."""
    products = db.query(Product).all()
    data: List[Dict[str, Any]] = []
    for p in products:
        data.append({
            "id": p.id,
            "name": p.name,
            "category": p.category.name if p.category else "",
            "description": p.description or "",
            "price": p.price,
            "rating": p.rating
        })
    recommender.fit_content_based(data)
