from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from pathlib import Path
from sqlalchemy import inspect, text
from fastapi.staticfiles import StaticFiles

from app.core.config import settings
from app.core.database import Base, engine, SessionLocal
from app.api.v1.api_router import api_router
from app.ai_engine.data_pipeline import sync_recommender_data
from app.models import RecommendationEvent


def ensure_user_admin_columns():
    existing_columns = {column["name"] for column in inspect(engine).get_columns("users")}
    migrations = {
        "role": "VARCHAR(30) NOT NULL DEFAULT 'customer'",
        "photo_url": "VARCHAR(500)",
        "token_version": "INTEGER NOT NULL DEFAULT 0",
        "contact_phone": "VARCHAR(40) NOT NULL DEFAULT ''",
        "address": "VARCHAR(500) NOT NULL DEFAULT ''",
    }
    with engine.begin() as connection:
        for name, column_definition in migrations.items():
            if name not in existing_columns:
                connection.execute(text(f"ALTER TABLE users ADD COLUMN {name} {column_definition}"))
        connection.execute(text("UPDATE users SET role = 'admin' WHERE is_admin = TRUE AND role != 'admin'"))
        connection.execute(text("UPDATE users SET is_admin = TRUE WHERE role = 'admin' AND is_admin = FALSE"))


def ensure_chat_owner_column():
    existing_columns = {column["name"] for column in inspect(engine).get_columns("chat_conversations")}
    if "owner_id" not in existing_columns:
        with engine.begin() as connection:
            connection.execute(text(
                "ALTER TABLE chat_conversations ADD COLUMN owner_id INTEGER REFERENCES users(id)"
            ))


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: create tables and warm up AI recommender engine
    Base.metadata.create_all(bind=engine)
    ensure_user_admin_columns()
    ensure_chat_owner_column()
    db = SessionLocal()
    try:
        sync_recommender_data(db)
    finally:
        db.close()
    yield
    # Shutdown logic if any


app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    docs_url=f"{settings.API_V1_STR}/docs",
    redoc_url=f"{settings.API_V1_STR}/redoc",
    lifespan=lifespan,
)
Path(settings.MEDIA_ROOT).mkdir(parents=True, exist_ok=True)
app.mount("/media", StaticFiles(directory=settings.MEDIA_ROOT), name="media")

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API routes
app.include_router(api_router, prefix=settings.API_V1_STR)


@app.get("/")
def root():
    return {
        "message": "Welcome to AI Store System API",
        "docs": f"{settings.API_V1_STR}/docs",
        "version": settings.VERSION,
    }


@app.get("/health")
def health_check():
    return {"status": "healthy"}
