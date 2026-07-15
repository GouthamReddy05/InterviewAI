from pydantic_settings import BaseSettings
from pydantic import Field, SecretStr
from typing import Optional

class Settings(BaseSettings):
    """Application configuration loaded from environment variables.

    All critical secrets and configurable parameters are defined here. Using
    Pydantic's validation ensures the app fails fast if required values are
    missing or malformed. During development missing secrets are given a safe
    placeholder.
    """

    # Core FastAPI settings
    app_name: str = Field(default="InterviewAI", description="Application name")
    environment: str = Field(default="development", description="Running environment (dev / prod)")
    debug: bool = Field(default=True, description="Enable FastAPI debug mode")

    # Database settings
    database_url: str = Field(..., env="DATABASE_URL", description="SQLAlchemy connection URL")

    # JWT authentication (optional placeholder for dev)
    jwt_secret_key: SecretStr = Field(default=SecretStr("dev-secret"), env="JWT_SECRET_KEY", description="Secret key for signing JWTs")
    jwt_algorithm: str = Field(default="HS256", description="Algorithm for JWT encoding")
    access_token_expire_minutes: int = Field(default=60, description="JWT expiry in minutes")

    # Groq LLM API
    groq_api_key: SecretStr = Field(..., env="GROQ_API_KEY", description="Groq API key for LLM calls")

    # Redis (optional – only required if the Redis session store is enabled)
    redis_url: Optional[str] = Field(default=None, env="REDIS_URL", description="Redis connection URL, e.g., redis://localhost:6379/0")

    model_config = {
        "env_file": ".env",
        "env_file_encoding": "utf-8",
        "extra": "ignore",
    }

# Export a singleton for easy import throughout the project
settings = Settings()
