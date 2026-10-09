import os
from pydantic_settings import BaseSettings
from typing import List


class Settings(BaseSettings):
    PROJECT_NAME: str = "TaskFlow API"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api"
    
    # Database (TiDB Cloud MySQL / PostgreSQL)
    DATABASE_URL: str = os.getenv(
        "DATABASE_URL", 
        "mysql+pymysql://4XXTzBfEArgpf8v.root:7owWoheWqVI3wLy7@gateway01.ap-southeast-1.prod.aws.tidbcloud.com:4000/taskflow?ssl_verify_cert=false"
    )
    
    # JWT
    JWT_SECRET_KEY: str = os.getenv("JWT_SECRET_KEY", "09d25e094faa6ca2556c818166b7a9563b93f7099f6f0f4caa6cf63b88e8d3e7")
    ALGORITHM: str = os.getenv("JWT_ALGORITHM", "HS256")
    ACCESS_TOKEN_EXPIRE_MINUTES: int = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "1440"))  # 24 hours
    
    # CORS
    BACKEND_CORS_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://localhost:5173",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:5173",
        "*"
    ]

    class Config:
        case_sensitive = True
        env_file = ".env"


settings = Settings()

# Fix Render / Neon postgres:// to postgresql://
if settings.DATABASE_URL.startswith("postgres://"):
    settings.DATABASE_URL = settings.DATABASE_URL.replace("postgres://", "postgresql://", 1)
elif settings.DATABASE_URL.startswith("mysql://"):
    settings.DATABASE_URL = settings.DATABASE_URL.replace("mysql://", "mysql+pymysql://", 1)
