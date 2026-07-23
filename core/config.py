import os
from .settings import settings


OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
OPENAI_MODEL = os.getenv("OPENAI_MODEL", "gpt-4-turbo")
OPENAI_TEMPERATURE = float(os.getenv("OPENAI_TEMPERATURE", "0.7"))


QUESTIONS_PER_SKILL = 4
QUESTIONS_PER_PROJECT = 4
QUESTIONS_PER_EXPERIENCE = 4
QUESTIONS_PER_ACHIEVEMENT = 4

# Cap primary questions used in a live session (generation prompt asks for 8–12).
MAX_PRIMARY_QUESTIONS = 12


MAX_SESSION_DURATION_HOURS = 2
UPLOAD_FOLDER = "uploads"
MAX_UPLOAD_SIZE_MB = 50


LLM_MAX_RETRIES = 3
LLM_TIMEOUT_SECONDS = 60


DATABASE_URL = settings.database_url


SECRET_KEY = settings.jwt_secret_key.get_secret_value()
ALGORITHM = settings.jwt_algorithm
ACCESS_TOKEN_EXPIRE_MINUTES = settings.access_token_expire_minutes


LOG_LEVEL = os.getenv("LOG_LEVEL", "INFO")
