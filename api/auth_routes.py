import logging
import re

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from pydantic import BaseModel, EmailStr, Field, field_validator
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from core import auth
from core.database import get_db
from models import db_models

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/auth", tags=["auth"])

_USERNAME_RE = re.compile(r"^[A-Za-z0-9_.-]{3,32}$")


class UserCreate(BaseModel):
    username: str = Field(..., min_length=3, max_length=32)
    email: EmailStr
    password: str = Field(..., min_length=8, max_length=128)

    @field_validator("username")
    @classmethod
    def _validate_username(cls, v: str) -> str:
        v = v.strip()
        if not _USERNAME_RE.match(v):
            raise ValueError(
                "Username must be 3-32 characters and contain only letters, "
                "numbers, dots, underscores or hyphens."
            )
        return v

    @field_validator("password")
    @classmethod
    def _validate_password(cls, v: str) -> str:
        if len(v.encode("utf-8")) > 72:
            # bcrypt's hard limit; reject rather than silently truncate.
            raise ValueError("Password must be at most 72 bytes.")
        if not re.search(r"[A-Za-z]", v) or not re.search(r"\d", v):
            raise ValueError("Password must contain at least one letter and one number.")
        return v


class Token(BaseModel):
    access_token: str
    token_type: str


@router.post("/signup", response_model=Token, status_code=status.HTTP_201_CREATED)
def signup(user: UserCreate, db: Session = Depends(get_db)):
    username = user.username.strip()
    email = str(user.email).strip().lower()

    if db.query(db_models.User).filter(db_models.User.username == username).first():
        raise HTTPException(status_code=400, detail="Username already registered")

    if db.query(db_models.User).filter(db_models.User.email == email).first():
        raise HTTPException(status_code=400, detail="Email already registered")

    # Admin rights are never granted from user-supplied signup data. Promote an
    # account deliberately, e.g. UPDATE users SET is_admin = true WHERE ...
    new_user = db_models.User(
        username=username,
        email=email,
        hashed_password=auth.get_password_hash(user.password),
        is_admin=False,
    )
    db.add(new_user)
    try:
        db.commit()
    except IntegrityError:
        # Two concurrent signups can both pass the checks above.
        db.rollback()
        raise HTTPException(status_code=400, detail="Username or email already registered")
    db.refresh(new_user)

    access_token = auth.create_access_token(data={"sub": new_user.username})
    return {"access_token": access_token, "token_type": "bearer"}


@router.post("/login", response_model=Token)
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = (
        db.query(db_models.User)
        .filter(db_models.User.username == form_data.username.strip())
        .first()
    )
    if not user or not auth.verify_password(form_data.password, user.hashed_password):
        # Deliberately identical message for unknown user and bad password so the
        # endpoint cannot be used to enumerate valid usernames.
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    access_token = auth.create_access_token(data={"sub": user.username})
    return {"access_token": access_token, "token_type": "bearer"}


@router.get("/me")
def get_me(current_user: db_models.User = Depends(auth.get_current_user)):
    return {
        "id": current_user.id,
        "username": current_user.username,
        "email": current_user.email,
        "is_admin": current_user.is_admin,
    }
