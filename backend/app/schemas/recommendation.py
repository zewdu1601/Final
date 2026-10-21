from typing import List, Optional
from pydantic import BaseModel
from app.schemas.product import ProductOut


class RecommendationResponse(BaseModel):
    user_id: Optional[int] = None
    algorithm: str  # e.g., "collaborative_filtering", "content_based", "trending"
    products: List[ProductOut] = []
