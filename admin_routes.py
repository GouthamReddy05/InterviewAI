from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from database import get_db
import db_models
import auth
from typing import List

router = APIRouter(prefix="/api/admin", tags=["admin"])

@router.get("/users")
def get_all_users(db: Session = Depends(get_db), current_admin: db_models.User = Depends(auth.get_current_admin)):
    users = db.query(db_models.User).all()
    return [
        {
            "id": u.id,
            "username": u.username,
            "email": u.email,
            "is_admin": u.is_admin,
            "created_at": u.created_at
        } for u in users
    ]

@router.get("/interviews")
def get_all_interviews(db: Session = Depends(get_db), current_admin: db_models.User = Depends(auth.get_current_admin)):
    interviews = db.query(db_models.InterviewSessionModel).all()
    result = []
    for interview in interviews:
        user = db.query(db_models.User).filter(db_models.User.id == interview.user_id).first()
        result.append({
            "id": interview.id,
            "session_id": interview.session_id,
            "username": user.username if user else "Unknown",
            "job_role": interview.job_role,
            "status": interview.status,
            "score": interview.score,
            "created_at": interview.created_at
        })
    return result
