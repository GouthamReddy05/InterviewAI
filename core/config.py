"""
Configuration for InterviewAI
"""

import os
# from typing import Optional

# OpenAI Configuration
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
OPENAI_MODEL = os.getenv("OPENAI_MODEL", "gpt-4-turbo")  # or "gpt-4o"
OPENAI_TEMPERATURE = float(os.getenv("OPENAI_TEMPERATURE", "0.7"))

# Number of questions to generate per category
QUESTIONS_PER_SKILL = 4
QUESTIONS_PER_PROJECT = 4
QUESTIONS_PER_EXPERIENCE = 4
QUESTIONS_PER_ACHIEVEMENT = 4

# Interview Configuration
MAX_SESSION_DURATION_HOURS = 2
UPLOAD_FOLDER = "uploads"
MAX_UPLOAD_SIZE_MB = 50

# LLM Retry Configuration
LLM_MAX_RETRIES = 3
LLM_TIMEOUT_SECONDS = 60

# Database Configuration
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://neondb_owner:npg_SZoulv6e7kfQ@ep-still-moon-ahliiwwj-pooler.c-3.us-east-1.aws.neon.tech/neondb?sslmode=require")

# JWT Configuration
SECRET_KEY = os.getenv("SECRET_KEY", "supersecretjwtkey_1234567890")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 7 # 7 days

# Logging Configuration
LOG_LEVEL = os.getenv("LOG_LEVEL", "INFO")
