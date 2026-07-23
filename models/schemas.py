"""
Data Models for Interview System
"""

from pydantic import BaseModel, Field
from typing import List, Any
from datetime import datetime
from enum import Enum


class CategoryEnum(str, Enum):
    SKILL = "skill"
    GENERIC_SKILL = "generic_skill"
    PROJECT = "project"
    EXPERIENCE = "experience"
    ACHIEVEMENT = "achievement"
    SCENARIO = "scenario"
    BEHAVIORAL = "behavioral"


class DifficultyLevel(str, Enum):
    EASY = "easy"
    INTERMEDIATE = "intermediate"
    ADVANCED = "advanced"
    EXPERT = "expert"


class RatingEnum(str, Enum):
    POOR = "poor"
    FAIR = "fair"
    GOOD = "good"
    EXCELLENT = "excellent"


class InterviewQuestion(BaseModel):
    id: int
    category: CategoryEnum
    name: str
    primary_question: str
    context: str
    difficulty_level: DifficultyLevel
    follow_up_question: str = ""

    class Config:
        json_schema_extra = {
            "example": {
                "id": 1,
                "category": "skill",
                "name": "Python",
                "primary_question": "Describe a production issue you solved using Python.",
                "context": "Understanding real-world debugging and optimization",
                "difficulty_level": "advanced",
                "follow_up_question": "How did you verify the fix in production?"
            }
        }


class CandidateAnswer(BaseModel):
    question_id: int
    answer: str
    is_followup: bool = False
    followup_depth: int = 0
    timestamp: datetime = Field(default_factory=datetime.utcnow)


class AnswerEvaluation(BaseModel):
    rating: RatingEnum
    score: float = 6.0
    strengths: List[str]
    improvements: List[str]
    missing_concepts: List[str] = []
    follow_up_direction: str


class FollowUpQuestion(BaseModel):
    original_question_id: int
    depth: int
    question: str
    candidate_answer: str = ""
    evaluation: AnswerEvaluation
    timestamp: datetime = Field(default_factory=datetime.utcnow)


class InterviewSession(BaseModel):
    session_id: str
    resume_name: str
    job_role: str
    extracted_profile: dict = {}
    questions: List[InterviewQuestion]
    current_question_index: int = 0

    is_followup_mode: bool = False
    current_followup_depth: int = 0
    max_followup_depth: int = 3
    current_followup_question: str = ""

    answers: List[CandidateAnswer] = []
    follow_ups: List[FollowUpQuestion] = []

    # Plain-text history (JSON-safe). Replaces ConversationBufferMemory.
    conversation_history: str = ""
    # Legacy field kept for older serialized sessions; unused.
    memory: Any = None

    created_at: datetime = Field(default_factory=datetime.utcnow)
    status: str = "in_progress"

    class Config:
        arbitrary_types_allowed = True
        json_schema_extra = {
            "example": {
                "session_id": "session_123",
                "resume_name": "john_doe.pdf",
                "job_role": "Senior Backend Engineer",
                "questions": [],
                "current_question_index": 0,
                "answers": [],
                "follow_ups": [],
                "status": "in_progress"
            }
        }


class ResumeUploadRequest(BaseModel):
    job_role: str


class QuestionResponse(BaseModel):
    session_id: str
    question_number: int
    total_questions: int
    category: CategoryEnum
    name: str
    primary_question: str
    context: str
    difficulty_level: DifficultyLevel


class AnswerSubmissionRequest(BaseModel):
    answer: str


class FollowUpResponse(BaseModel):
    follow_up_question: str
    evaluation: AnswerEvaluation


class InterviewProgressResponse(BaseModel):
    session_id: str
    total_questions: int
    current_question: int
    completed_percentage: float
    status: str


class CommunicationAnalysis(BaseModel):
    """Analysis of candidate's communication skills"""
    speaking_speed_wpm: float
    filler_word_count: int
    average_pause_seconds: float
    confidence_score: float
    clarity_score: float

    class Config:
        json_schema_extra = {
            "example": {
                "speaking_speed_wpm": 140,
                "filler_word_count": 8,
                "average_pause_seconds": 2.5,
                "confidence_score": 82,
                "clarity_score": 85
            }
        }


class FaceAnalysis(BaseModel):
    """Analysis of face and eye contact during interview"""
    eye_contact_percentage: float
    face_detected_percentage: float
    head_position: str
    emotion: str
    looking_away_incidents: int
    face_missing_incidents: int

    class Config:
        json_schema_extra = {
            "example": {
                "eye_contact_percentage": 87,
                "face_detected_percentage": 95,
                "head_position": "centered",
                "emotion": "neutral",
                "looking_away_incidents": 2,
                "face_missing_incidents": 0
            }
        }


class CheatingDetectionResult(BaseModel):
    """Cheating detection analysis"""
    phone_detected: bool
    multiple_faces_detected: bool
    suspicious_behavior_detected: bool
    cheating_score: float
    flags: List[str] = []

    class Config:
        json_schema_extra = {
            "example": {
                "phone_detected": False,
                "multiple_faces_detected": False,
                "suspicious_behavior_detected": False,
                "cheating_score": 5,
                "flags": []
            }
        }


class InterviewMetrics(BaseModel):
    """Complete interview metrics and scoring"""
    technical_score: float
    communication_score: float
    confidence_score: float
    eye_contact_score: float
    resume_alignment_score: float
    problem_solving_score: float
    overall_score: float

    class Config:
        json_schema_extra = {
            "example": {
                "technical_score": 85,
                "communication_score": 78,
                "confidence_score": 82,
                "eye_contact_score": 87,
                "resume_alignment_score": 88,
                "problem_solving_score": 75,
                "overall_score": 82
            }
        }


class ImprovementPlan(BaseModel):
    """Personalized improvement recommendations"""
    strengths: List[str]
    weaknesses: List[str]
    recommendations: List[str]
    focus_areas: List[str]
    resources: List[str] = []

    class Config:
        json_schema_extra = {
            "example": {
                "strengths": [
                    "Strong Python knowledge",
                    "Good project explanation",
                    "Clear communication"
                ],
                "weaknesses": [
                    "Poor SQL understanding",
                    "Limited database design knowledge",
                    "Too many filler words"
                ],
                "recommendations": [
                    "Practice DBMS concepts",
                    "Study database design patterns",
                    "Practice speaking without filler words"
                ],
                "focus_areas": [
                    "Database fundamentals",
                    "Communication clarity",
                    "System design"
                ],
                "resources": [
                    "LeetCode Database Problems",
                    "System Design Primer"
                ]
            }
        }


class InterviewReport(BaseModel):
    """Complete interview report"""
    session_id: str
    resume_name: str
    job_role: str
    questions_answered: int
    total_questions: int

    metrics: InterviewMetrics
    communication_analysis: CommunicationAnalysis
    face_analysis: FaceAnalysis
    cheating_detection: CheatingDetectionResult

    q_and_a: List[dict]

    improvement_plan: ImprovementPlan

    created_at: datetime = Field(default_factory=datetime.utcnow)

    class Config:
        json_schema_extra = {
            "example": {
                "session_id": "session_123",
                "resume_name": "john_doe.pdf",
                "job_role": "Senior Backend Engineer",
                "questions_answered": 5,
                "total_questions": 10,
                "metrics": {},
                "communication_analysis": {},
                "face_analysis": {},
                "cheating_detection": {},
                "q_and_a": [],
                "improvement_plan": {}
            }
        }
