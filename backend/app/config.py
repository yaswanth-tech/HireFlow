import os
from pydantic import BaseModel

class Settings(BaseModel):
    APP_NAME: str = "HireFlow – Smart Recruitment & Hiring Management System"
    API_V1_STR: str = "/api/v1"
    SECRET_KEY: str = os.getenv("SECRET_KEY", "hireflow-enterprise-recruitment-secret-key-20261022")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 24 hours
    
    # Database URL: default SQLite file for instant portability; supports Postgres via env var
    DATABASE_URL: str = os.getenv(
        "DATABASE_URL", 
        "sqlite:///./hireflow.db"
    )
    
    SEED_DEFAULT: int = 20261022
    CORS_ORIGINS: list[str] = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:8000",
        "http://127.0.0.1:8000",
        "*"
    ]

settings = Settings()
