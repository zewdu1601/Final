import os
from typing import List
from urllib.parse import quote

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        case_sensitive=True,
        extra="ignore",
    )

    PROJECT_NAME: str = "AI Store System API"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api"

    SECRET_KEY: str = os.getenv("SECRET_KEY", "ai-store-super-secret-key-change-in-prod")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 24 hours

    DATABASE_URL: str = "sqlite:///./ai_store.db"
    POSTGRES_DB: str | None = None
    POSTGRES_USER: str | None = None
    POSTGRES_PASSWORD: str | None = None
    POSTGRES_HOST: str | None = None
    POSTGRES_PORT: str | None = None
    MEDIA_ROOT: str = os.getenv("MEDIA_ROOT", os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "media"))
    MAX_PROFILE_PHOTO_BYTES: int = 5 * 1024 * 1024

    CORS_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://127.0.0.1:3000"
    ]

    def __init__(self, **values):
        if "DATABASE_URL" not in values and not os.getenv("DATABASE_URL"):
            pg_db = values.get("POSTGRES_DB") or os.getenv("POSTGRES_DB")
            pg_user = values.get("POSTGRES_USER") or os.getenv("POSTGRES_USER")
            pg_password = values.get("POSTGRES_PASSWORD") or os.getenv("POSTGRES_PASSWORD")
            pg_host = values.get("POSTGRES_HOST") or os.getenv("POSTGRES_HOST")
            pg_port = values.get("POSTGRES_PORT") or os.getenv("POSTGRES_PORT") or "5432"
            if pg_db and pg_user and pg_host:
                password = quote(pg_password or "")
                user = quote(pg_user)
                values["DATABASE_URL"] = f"postgresql://{user}:{password}@{pg_host}:{pg_port}/{pg_db}"
        super().__init__(**values)


settings = Settings()
