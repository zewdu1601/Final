from fastapi import APIRouter
from app.api.v1.endpoints import (
    auth,
    products,
    categories,
    orders,
    reviews,
    recommendations,
    admin,
    chat,
)

api_router = APIRouter()

api_router.include_router(auth.router, prefix="/auth", tags=["Authentication"])
api_router.include_router(products.router, prefix="/products", tags=["Products"])
api_router.include_router(categories.router, prefix="/categories", tags=["Categories"])
api_router.include_router(orders.router, prefix="/orders", tags=["Orders"])
api_router.include_router(reviews.router, prefix="/reviews", tags=["Product Reviews"])
api_router.include_router(recommendations.router, prefix="/recommendations", tags=["AI Recommendations"])
api_router.include_router(admin.router, prefix="/admin", tags=["Admin"])
api_router.include_router(chat.router, prefix="/chat", tags=["Chat"])
