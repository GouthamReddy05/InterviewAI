from datetime import datetime, timezone

from sqlalchemy import JSON, Boolean, Column, DateTime, Float, ForeignKey, Integer, String
from sqlalchemy.orm import relationship

from core.database import Base


def _utcnow() -> datetime:
    """Timezone-aware UTC default (``datetime.utcnow`` is deprecated in 3.12+)."""
    return datetime.now(timezone.utc)


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(64), unique=True, index=True, nullable=False)
    email = Column(String(320), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    is_admin = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime(timezone=True), default=_utcnow, nullable=False)

    interviews = relationship(
        "InterviewSessionModel",
        back_populates="user",
        cascade="all, delete-orphan",
    )


class InterviewSessionModel(Base):
    __tablename__ = "interviews"

    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(String(64), unique=True, index=True, nullable=False)
    # Ownership is required: an interview with no owner cannot be access-checked.
    user_id = Column(
        Integer,
        ForeignKey("users.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    resume_name = Column(String(255))
    job_role = Column(String(128))
    status = Column(String(32), default="in_progress", nullable=False)
    score = Column(Float, nullable=True)
    created_at = Column(DateTime(timezone=True), default=_utcnow, nullable=False)

    report_data = Column(JSON, nullable=True)

    user = relationship("User", back_populates="interviews")
