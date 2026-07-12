from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Text, Float, JSON
from sqlalchemy.orm import relationship
from datetime import datetime
from database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    is_admin = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationship to interviews
    interviews = relationship("InterviewSessionModel", back_populates="user")

class InterviewSessionModel(Base):
    __tablename__ = "interviews"

    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(String, unique=True, index=True, nullable=False) # Maps to in-memory session_id
    user_id = Column(Integer, ForeignKey("users.id"))
    resume_name = Column(String)
    job_role = Column(String)
    status = Column(String, default="in_progress")
    score = Column(Float, nullable=True) # Overall score once completed
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Optional: store full report JSON when completed
    report_data = Column(JSON, nullable=True)

    user = relationship("User", back_populates="interviews")
