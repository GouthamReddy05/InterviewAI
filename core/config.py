import os
from .settings import settings

# OpenAI Configuration (unchanged, read directly from env)
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
OPENAI_MODEL = os.getenv("OPENAI_MODEL", "gpt-4-turbo")  # or "gpt-4o"
OPENAI_TEMPERATURE = float(os.getenv("OPENAI_TEMPERATURE", "0.7"))

# Number of questions to generate per category (unchanged)
QUESTIONS_PER_SKILL = 4
QUESTIONS_PER_PROJECT = 4
QUESTIONS_PER_EXPERIENCE = 4
QUESTIONS_PER_ACHIEVEMENT = 4

# Interview Configuration (unchanged)
MAX_SESSION_DURATION_HOURS = 2
UPLOAD_FOLDER = "uploads"
MAX_UPLOAD_SIZE_MB = 50

# LLM Retry Configuration (unchanged)
LLM_MAX_RETRIES = 3
LLM_TIMEOUT_SECONDS = 60

# Database Configuration – now sourced from Settings
DATABASE_URL = settings.database_url

# JWT Configuration – now sourced from Settings
SECRET_KEY = settings.jwt_secret_key.get_secret_value()
ALGORITHM = settings.jwt_algorithm
ACCESS_TOKEN_EXPIRE_MINUTES = settings.access_token_expire_minutes

# Logging Configuration (unchanged)
LOG_LEVEL = os.getenv("LOG_LEVEL", "INFO")
