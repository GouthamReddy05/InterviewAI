import os

from .settings import settings


OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
OPENAI_MODEL = os.getenv("OPENAI_MODEL", "gpt-4-turbo")
OPENAI_TEMPERATURE = float(os.getenv("OPENAI_TEMPERATURE", "0.7"))


QUESTIONS_PER_SKILL = 4
QUESTIONS_PER_PROJECT = 4
QUESTIONS_PER_EXPERIENCE = 4
QUESTIONS_PER_ACHIEVEMENT = 4

# Cap primary questions used in a live session (generation prompt asks for 8-12).
MAX_PRIMARY_QUESTIONS = 12

# Bound on a single submitted answer, to keep LLM prompts (and cost) sane.
MAX_ANSWER_CHARS = 20000
# Bound on resume text forwarded to the LLM.
MAX_RESUME_CHARS = 40000
# Bound on text accepted by the TTS endpoint.
MAX_TTS_CHARS = 5000


MAX_SESSION_DURATION_HOURS = 2
UPLOAD_FOLDER = "uploads"
MAX_UPLOAD_SIZE_MB = settings.max_upload_size_mb
MAX_UPLOAD_SIZE_BYTES = MAX_UPLOAD_SIZE_MB * 1024 * 1024
ALLOWED_RESUME_EXTENSIONS = {".pdf", ".docx"}


LLM_MAX_RETRIES = 3
LLM_TIMEOUT_SECONDS = 60


DATABASE_URL = settings.database_url


SECRET_KEY = settings.jwt_secret_key.get_secret_value()
ALGORITHM = settings.jwt_algorithm
ACCESS_TOKEN_EXPIRE_MINUTES = settings.access_token_expire_minutes

ENVIRONMENT = settings.environment
IS_PRODUCTION = settings.is_production
DEBUG = settings.debug

LOG_LEVEL = os.getenv("LOG_LEVEL", "INFO")
