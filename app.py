import logging
import os

# Quieten native TF/glog chatter before those libraries are imported.
os.environ.setdefault("TF_CPP_MIN_LOG_LEVEL", "3")
os.environ.setdefault("GLOG_minloglevel", "2")

import base64
import io
import sys
import threading
from functools import lru_cache
from pathlib import Path
from typing import Optional

import dotenv
import numpy as np
from fastapi import Depends, FastAPI, File, Form, HTTPException, Request, Response, UploadFile
from fastapi.concurrency import run_in_threadpool
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from pydantic import BaseModel, Field
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

dotenv.load_dotenv()

BASE_DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(BASE_DIR / "ml"))

from core import auth, config, database
from core.settings import settings
from api import admin_routes, auth_routes
from ml.extract_text import extract_text_from_file
from models import db_models
from models.schemas import AnswerSubmissionRequest
from services.question_generator import InterviewSessionManager

logging.basicConfig(
    level=getattr(logging, str(config.LOG_LEVEL).upper(), logging.INFO),
    format="%(asctime)s %(levelname)s %(name)s: %(message)s",
)
logger = logging.getLogger("interviewai")

import cv2

# ---------------------------------------------------------------------------
# Heavy ML models
#
# These were previously constructed at import time, which made the process take
# tens of seconds to boot, allocated GPU/CPU memory in every worker regardless of
# use, and made the module impossible to import in a test or CI environment.
# They are now built on first use and cached.
# ---------------------------------------------------------------------------

# MediaPipe FaceMesh keeps internal graph state and is not safe to call from
# multiple threads at once; requests are serialised through this lock.
_face_mesh_lock = threading.Lock()


@lru_cache(maxsize=1)
def get_face_mesh():
    import mediapipe as mp

    return mp.solutions.face_mesh.FaceMesh(
        static_image_mode=False,
        max_num_faces=5,
        refine_landmarks=True,
        min_detection_confidence=0.5,
        min_tracking_confidence=0.5,
    )


@lru_cache(maxsize=1)
def get_yolo_model():
    import torch
    from ultralytics import YOLO

    weights = BASE_DIR / "ml" / "yolov8n.pt"
    model_path = str(weights) if weights.exists() else "yolov8n.pt"

    # Ultralytics checkpoints are pickles that torch>=2.6 refuses to load under
    # the default weights_only=True. Patch only for the duration of this load
    # instead of disabling the protection process-wide, as the previous code did.
    original_load = torch.load

    def _load_trusted_checkpoint(*args, **kwargs):
        kwargs["weights_only"] = False
        return original_load(*args, **kwargs)

    torch.load = _load_trusted_checkpoint
    try:
        return YOLO(model_path)
    finally:
        torch.load = original_load


@lru_cache(maxsize=1)
def get_whisper_model():
    from faster_whisper import WhisperModel

    return WhisperModel("small", device="cpu", compute_type="int8")


@lru_cache(maxsize=1)
def get_elevenlabs_client():
    """Return a configured ElevenLabs client, or None when no key is set.

    There is deliberately no fallback API key: an unset key disables TTS rather
    than silently billing someone else's account.
    """
    if not settings.elevenlabs_api_key:
        return None
    from elevenlabs.client import ElevenLabs

    return ElevenLabs(api_key=settings.elevenlabs_api_key.get_secret_value())


database.Base.metadata.create_all(bind=database.engine)

app = FastAPI(
    title="InterviewAI",
    version="1.0.0",
    debug=settings.debug,
    # Interactive API docs are useful in development but expose the full surface
    # area (and every schema) publicly in production.
    docs_url=None if settings.is_production else "/docs",
    redoc_url=None if settings.is_production else "/redoc",
    openapi_url=None if settings.is_production else "/openapi.json",
)

app.include_router(auth_routes.router)
app.include_router(admin_routes.router)

_allowed_origins = settings.allowed_origins
app.add_middleware(
    CORSMiddleware,
    allow_origins=_allowed_origins,
    # A wildcard origin is incompatible with credentialed requests; browsers
    # reject the combination outright. Only send credentials for a real allowlist.
    allow_credentials="*" not in _allowed_origins,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type"],
)


@app.middleware("http")
async def security_headers(request: Request, call_next):
    response = await call_next(request)
    response.headers.setdefault("X-Content-Type-Options", "nosniff")
    response.headers.setdefault("X-Frame-Options", "DENY")
    response.headers.setdefault("Referrer-Policy", "strict-origin-when-cross-origin")
    if settings.is_production:
        response.headers.setdefault(
            "Strict-Transport-Security", "max-age=31536000; includeSubDomains"
        )
    return response


UPLOAD_FOLDER = BASE_DIR / config.UPLOAD_FOLDER
UPLOAD_FOLDER.mkdir(parents=True, exist_ok=True)

session_manager = InterviewSessionManager()

templates = Jinja2Templates(directory=str(BASE_DIR / "frontend"))
app.mount("/css", StaticFiles(directory=str(BASE_DIR / "frontend" / "css")), name="css")
app.mount("/js", StaticFiles(directory=str(BASE_DIR / "frontend" / "js")), name="js")
app.mount("/pages", StaticFiles(directory=str(BASE_DIR / "frontend" / "pages")), name="pages")


# ---------------------------------------------------------------------------
# Shared helpers
# ---------------------------------------------------------------------------


def _fail(status_code: int, public_detail: str, exc: Exception, context: str) -> HTTPException:
    """Log the real error, return a message safe to show a client.

    The previous handlers interpolated ``str(e)`` straight into the response,
    which leaked stack-level detail (SQL fragments, file paths, API errors) to
    anyone who could trigger a failure.
    """
    logger.exception("%s failed: %s", context, exc)
    return HTTPException(status_code=status_code, detail=public_detail)


def get_owned_interview(
    session_id: str,
    current_user: db_models.User = Depends(auth.get_current_user),
    db: Session = Depends(database.get_db),
) -> db_models.InterviewSessionModel:
    """Resolve an interview and confirm the caller owns it.

    Session IDs are UUIDs but were previously the only thing guarding an
    interview's transcript, evaluations and scores. Admins may read any session.
    """
    interview = (
        db.query(db_models.InterviewSessionModel)
        .filter(db_models.InterviewSessionModel.session_id == session_id)
        .first()
    )
    if interview is None:
        raise HTTPException(status_code=404, detail="Session not found")
    if interview.user_id != current_user.id and not current_user.is_admin:
        # 404 rather than 403 so the endpoint does not confirm that an
        # unknown-to-this-user session ID exists.
        raise HTTPException(status_code=404, detail="Session not found")
    return interview


def _load_live_session(session_id: str):
    session = session_manager.get_session(session_id)
    if not session:
        raise HTTPException(
            status_code=404,
            detail="Interview session has expired or is no longer available",
        )
    return session


def _question_payload(question, question_number: int, total_questions: int) -> dict:
    return {
        "question_number": question_number,
        "total_questions": total_questions,
        "category": getattr(question.category, "value", question.category),
        "name": question.name,
        "primary_question": question.primary_question,
        "context": question.context,
        "difficulty_level": getattr(
            question.difficulty_level, "value", question.difficulty_level
        ),
    }


@app.get("/")
async def root(request: Request):
    return templates.TemplateResponse(
        request=request,
        name="index.html",
        context={"title": "InterviewAI - Home"},
    )


@app.get("/favicon.ico", include_in_schema=False)
async def favicon():
    return Response(status_code=204)


# ---------------------------------------------------------------------------
# Interview lifecycle
# ---------------------------------------------------------------------------


async def _read_resume_upload(resume: UploadFile) -> bytes:
    """Read an upload while enforcing the extension and size limits."""
    filename = (resume.filename or "").strip()
    if not filename:
        raise HTTPException(status_code=400, detail="No file name provided")

    suffix = Path(filename).suffix.lower()
    if suffix not in config.ALLOWED_RESUME_EXTENSIONS:
        allowed = ", ".join(sorted(config.ALLOWED_RESUME_EXTENSIONS))
        raise HTTPException(
            status_code=400, detail=f"Unsupported file type. Allowed: {allowed}"
        )

    # Read in chunks and abort as soon as the cap is passed, so an oversized
    # upload is never fully buffered in memory.
    limit = config.MAX_UPLOAD_SIZE_BYTES
    chunks: list[bytes] = []
    total = 0
    while chunk := await resume.read(1024 * 1024):
        total += len(chunk)
        if total > limit:
            raise HTTPException(
                status_code=413,
                detail=f"File too large. Maximum size is {config.MAX_UPLOAD_SIZE_MB} MB.",
            )
        chunks.append(chunk)

    if total == 0:
        raise HTTPException(status_code=400, detail="Uploaded file is empty")

    await resume.seek(0)
    return b"".join(chunks)


@app.post("/api/upload-resume", status_code=201)
async def upload_resume(
    resume: UploadFile = File(...),
    job_role: str = Form(...),
    resume_text: Optional[str] = Form(None),
    current_user: db_models.User = Depends(auth.get_current_user),
    db: Session = Depends(database.get_db),
):
    """Upload a resume and start an interview session."""
    job_role = (job_role or "").strip()
    if not job_role:
        raise HTTPException(status_code=400, detail="Job role is required")
    if len(job_role) > 128:
        raise HTTPException(status_code=400, detail="Job role is too long")

    raw = await _read_resume_upload(resume)

    if resume_text and resume_text.strip():
        text_to_use = resume_text.strip()
    else:
        try:
            text_to_use = await run_in_threadpool(
                extract_text_from_file, io.BytesIO(raw), resume.filename
            )
        except ValueError as exc:
            raise HTTPException(status_code=400, detail=str(exc))
        except Exception as exc:
            raise _fail(
                400,
                "Could not read that resume. Please upload a text-based PDF or DOCX.",
                exc,
                "Resume text extraction",
            )

    if not text_to_use or not text_to_use.strip():
        raise HTTPException(
            status_code=400,
            detail="No text could be extracted from the resume. If it is a scanned "
            "document, please upload a text-based PDF instead.",
        )

    # Bound the prompt sent to the LLM.
    text_to_use = text_to_use[: config.MAX_RESUME_CHARS]

    try:
        session = await run_in_threadpool(
            session_manager.create_session,
            resume_text=text_to_use,
            job_role=job_role,
            resume_name=resume.filename,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    except Exception as exc:
        raise _fail(
            502,
            "Could not generate interview questions right now. Please try again.",
            exc,
            "Question generation",
        )

    if not session.questions:
        session_manager.session_store.delete(session.session_id)
        raise HTTPException(
            status_code=502,
            detail="No interview questions could be generated from this resume.",
        )

    db_interview = db_models.InterviewSessionModel(
        session_id=session.session_id,
        user_id=current_user.id,
        resume_name=resume.filename,
        job_role=job_role,
        status="in_progress",
    )
    db.add(db_interview)
    try:
        db.commit()
    except SQLAlchemyError as exc:
        db.rollback()
        # Without the DB row the session can never be ownership-checked, so it
        # must not be left dangling in Redis.
        session_manager.session_store.delete(session.session_id)
        raise _fail(500, "Could not start the interview session.", exc, "Interview persistence")

    total = len(session.questions)
    questions = [_question_payload(q, i + 1, total) for i, q in enumerate(session.questions)]
    first_question = session_manager.get_current_question(session.session_id)

    return JSONResponse(
        {
            "status": "success",
            "session_id": session.session_id,
            "total_questions": total,
            "job_role": job_role,
            "extracted_profile": session.extracted_profile,
            "questions": questions,
            "first_question": _question_payload(first_question, 1, total)
            if first_question
            else None,
        },
        status_code=201,
    )


@app.get("/api/session/{session_id}/question")
async def get_current_question(
    session_id: str,
    interview: db_models.InterviewSessionModel = Depends(get_owned_interview),
):
    """Get the current question for a session."""
    session = _load_live_session(session_id)
    current_question = session_manager.get_current_question(session_id)
    if not current_question:
        raise HTTPException(status_code=400, detail="Interview already completed")

    return JSONResponse(
        {
            "status": "success",
            "question": _question_payload(
                current_question,
                session.current_question_index + 1,
                len(session.questions),
            ),
        }
    )


@app.post("/api/session/{session_id}/answer")
async def submit_answer(
    session_id: str,
    request: AnswerSubmissionRequest,
    interview: db_models.InterviewSessionModel = Depends(get_owned_interview),
):
    """Submit an answer to the current question or follow-up."""
    _load_live_session(session_id)

    try:
        result = await run_in_threadpool(
            session_manager.submit_answer, session_id, request.answer
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    except Exception as exc:
        raise _fail(
            502,
            "Could not evaluate that answer right now. Please try again.",
            exc,
            "Answer submission",
        )

    # Re-read the session so interview_complete reflects post-submit status.
    updated = session_manager.get_session(session_id)
    interview_complete = bool(updated and updated.status == "completed")

    return JSONResponse(
        {
            "status": "success",
            "action": result["action"],
            "evaluation": result["evaluation"],
            "follow_up_question": result.get("follow_up_question"),
            "followup_depth": result.get("followup_depth", 0),
            "next_question": result.get("next_question"),
            "next_question_available": result.get("next_question_available", False),
            "interview_complete": interview_complete,
        }
    )


@app.post("/api/session/{session_id}/next-question")
async def next_question(
    session_id: str,
    interview: db_models.InterviewSessionModel = Depends(get_owned_interview),
):
    """Skip remaining follow-ups and move to the next primary question."""
    session = _load_live_session(session_id)

    try:
        has_next = await run_in_threadpool(
            session_manager.proceed_to_next_question, session_id
        )
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc))
    except Exception as exc:
        raise _fail(500, "Could not advance the interview.", exc, "Next question")

    if not has_next:
        return JSONResponse(
            {"status": "success", "interview_complete": True, "next_question": None}
        )

    next_q = session_manager.get_current_question(session_id)
    updated = session_manager.get_session(session_id) or session
    if next_q is None:
        return JSONResponse(
            {"status": "success", "interview_complete": True, "next_question": None}
        )

    return JSONResponse(
        {
            "status": "success",
            "interview_complete": False,
            "next_question": _question_payload(
                next_q, updated.current_question_index + 1, len(updated.questions)
            ),
        }
    )


@app.get("/api/session/{session_id}/progress")
async def get_progress(
    session_id: str,
    interview: db_models.InterviewSessionModel = Depends(get_owned_interview),
):
    """Get interview progress."""
    _load_live_session(session_id)
    try:
        progress = session_manager.get_interview_progress(session_id)
    except ValueError:
        raise HTTPException(status_code=404, detail="Session not found")
    except Exception as exc:
        raise _fail(500, "Could not load interview progress.", exc, "Progress")

    return JSONResponse({"status": "success", "progress": progress})


@app.get("/api/session/{session_id}/report")
async def get_report(
    session_id: str,
    interview: db_models.InterviewSessionModel = Depends(get_owned_interview),
):
    """Get the complete interview report."""
    _load_live_session(session_id)
    try:
        report = session_manager.get_interview_report(session_id)
    except ValueError:
        raise HTTPException(status_code=404, detail="Session not found")
    except Exception as exc:
        raise _fail(500, "Could not build the interview report.", exc, "Report")

    return JSONResponse({"status": "success", "report": report})


@app.get("/api/health")
async def health_check():
    """Health check endpoint."""
    return JSONResponse({"status": "healthy", "service": "InterviewAI"})


@app.get("/api/session/{session_id}/scores")
async def get_interview_scores(
    session_id: str,
    interview: db_models.InterviewSessionModel = Depends(get_owned_interview),
):
    """Get interview scores and metrics."""
    _load_live_session(session_id)
    try:
        scores = session_manager.calculate_interview_score(session_id)
    except ValueError:
        raise HTTPException(status_code=404, detail="Session not found")
    except Exception as exc:
        raise _fail(500, "Could not calculate interview scores.", exc, "Scores")

    return JSONResponse({"status": "success", "scores": scores})


@app.get("/api/session/{session_id}/improvement-plan")
async def get_improvement_plan(
    session_id: str,
    interview: db_models.InterviewSessionModel = Depends(get_owned_interview),
):
    """Get a personalised improvement plan based on interview performance."""
    _load_live_session(session_id)
    try:
        plan = await run_in_threadpool(
            session_manager.generate_improvement_plan, session_id
        )
    except ValueError:
        raise HTTPException(status_code=404, detail="Session not found")
    except Exception as exc:
        raise _fail(500, "Could not build an improvement plan.", exc, "Improvement plan")

    return JSONResponse({"status": "success", "improvement_plan": plan})


@app.get("/api/session/{session_id}/comprehensive-report")
async def get_comprehensive_report(
    session_id: str,
    interview: db_models.InterviewSessionModel = Depends(get_owned_interview),
    db: Session = Depends(database.get_db),
):
    """Get the full interview report with scores, analysis and improvements."""
    session = _load_live_session(session_id)

    try:
        report = session_manager.get_interview_report(session_id)
        scores = session_manager.calculate_interview_score(session_id)
        improvement_plan = await run_in_threadpool(
            session_manager.generate_improvement_plan, session_id
        )
    except ValueError:
        raise HTTPException(status_code=404, detail="Session not found")
    except Exception as exc:
        raise _fail(500, "Could not build the interview report.", exc, "Comprehensive report")

    comprehensive_report = {
        "session_id": session_id,
        "resume_name": session.resume_name,
        "job_role": session.job_role,
        "questions_answered": len(session.answers),
        "total_questions": len(session.questions),
        "status": session.status,
        "created_at": session.created_at.isoformat(),
        "metrics": scores,
        "qa_pairs": report.get("qa_pairs", []),
        "improvement_plan": improvement_plan,
    }

    try:
        interview.status = "completed"
        interview.score = scores.get("overall_score", 0.0)
        interview.report_data = comprehensive_report
        db.commit()
    except SQLAlchemyError as exc:
        # Report generation succeeded; persisting it is best-effort.
        db.rollback()
        logger.warning("Could not persist report for %s: %s", session_id, exc)

    return JSONResponse({"status": "success", "comprehensive_report": comprehensive_report})


class EndSessionRequest(BaseModel):
    score: float = Field(..., ge=0, le=100)


@app.post("/api/session/{session_id}/end")
async def end_session(
    session_id: str,
    request: EndSessionRequest,
    interview: db_models.InterviewSessionModel = Depends(get_owned_interview),
    db: Session = Depends(database.get_db),
):
    """Mark an interview completed in the session store and the database."""
    session = session_manager.get_session(session_id)
    if session:
        session.status = "completed"
        session_manager.session_store.set(session_id, session)

    try:
        interview.status = "completed"
        interview.score = request.score
        db.commit()
    except SQLAlchemyError as exc:
        db.rollback()
        raise _fail(500, "Could not end the interview session.", exc, "End session")

    return {"status": "success"}


# ---------------------------------------------------------------------------
# Proctoring / media
# ---------------------------------------------------------------------------

_EMPTY_FRAME_RESPONSE = {
    "status": "error",
    "face_analysis": {"status": "no_face"},
    "object_analysis": {"person_count": 1, "phone_detected": False, "warnings": []},
    "cheating_detected": False,
    "warnings": [],
}

_MAX_FRAME_BYTES = 8 * 1024 * 1024
_MAX_AUDIO_BYTES = 25 * 1024 * 1024


async def _read_bounded(upload: UploadFile, limit: int, label: str) -> bytes:
    data = await upload.read()
    if len(data) > limit:
        raise HTTPException(
            status_code=413,
            detail=f"{label} exceeds the {limit // (1024 * 1024)} MB limit",
        )
    return data


def _decode_frame(frame_bytes: bytes):
    nparr = np.frombuffer(frame_bytes, np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    if img is None or img.size == 0:
        return None
    return cv2.flip(img, 1)


def _looking_away(face_landmarks) -> bool:
    """Estimate gaze direction from nose position within the face bounding width.

    The previous analyze-frame check compared the raw nose x against fixed 0.2/0.8
    thresholds, which flagged anyone sitting off-centre in the webcam rather than
    anyone actually looking away.
    """
    try:
        nose_x = face_landmarks.landmark[1].x
        left_x = face_landmarks.landmark[234].x
        right_x = face_landmarks.landmark[454].x
        width = right_x - left_x
        if width <= 0:
            return False
        ratio = (nose_x - left_x) / width
        return ratio < 0.3 or ratio > 0.7
    except (IndexError, AttributeError):
        return False


def _analyse_face(frame_img) -> dict:
    result = {"status": "no_face", "faces_detected": 0, "looking_away": False}
    try:
        rgb = cv2.cvtColor(frame_img, cv2.COLOR_BGR2RGB)
        with _face_mesh_lock:
            results = get_face_mesh().process(rgb)

        if results.multi_face_landmarks:
            count = len(results.multi_face_landmarks)
            result["faces_detected"] = count
            result["face_count"] = count
            if count > 1:
                result["status"] = "multiple_faces"
            else:
                result["status"] = "face_detected"
                result["looking_away"] = _looking_away(results.multi_face_landmarks[0])
    except Exception as exc:
        logger.warning("Face detection error: %s", exc)
        result["status"] = "error"
    return result


_SUSPICIOUS_CLASSES = {
    "cell phone",
    "laptop",
    "book",
    "bottle",
    "cup",
    "wine glass",
    "remote",
    "keyboard",
}


def _analyse_objects(frame_img, min_confidence: float = 0.45) -> dict:
    result = {
        "person_count": 1,
        "phone_detected": False,
        "prohibited_objects": [],
        "status": "success",
        "warnings": [],
    }
    try:
        model = get_yolo_model()
        yolo_results = model(frame_img, verbose=False, conf=min_confidence)

        person_count = 0
        phone_detected = False
        prohibited: list[str] = []
        warnings: list[str] = []

        for detection in yolo_results or []:
            if detection.boxes is None:
                continue
            for box in detection.boxes:
                if float(box.conf[0]) < min_confidence:
                    continue
                cls = int(box.cls[0])
                class_name = str(model.names.get(cls, "unknown")).lower()

                if "person" in class_name:
                    person_count += 1
                elif class_name in _SUSPICIOUS_CLASSES or "phone" in class_name:
                    if "phone" in class_name:
                        phone_detected = True
                    if class_name not in prohibited:
                        prohibited.append(class_name)
                        warnings.append(f"Suspicious object detected: {class_name.upper()}")

        if person_count > 1:
            warnings.append(f"Multiple persons detected ({person_count})")

        result["person_count"] = max(1, person_count)
        result["phone_detected"] = phone_detected
        result["prohibited_objects"] = prohibited
        result["warnings"] = warnings
    except Exception as exc:
        logger.warning("Object detection error: %s", exc)
        result["status"] = "error"
    return result


def _analyse_frame_sync(frame_bytes: bytes) -> dict:
    frame_img = _decode_frame(frame_bytes)
    if frame_img is None:
        return dict(_EMPTY_FRAME_RESPONSE)

    face_result = _analyse_face(frame_img)
    object_result = _analyse_objects(frame_img)

    cheating_detected = False
    warnings: list[str] = []

    if face_result.get("status") == "no_face":
        cheating_detected = True
        warnings.append("No face detected")
    elif face_result.get("status") == "multiple_faces":
        cheating_detected = True
        warnings.append("Multiple faces detected")

    if face_result.get("looking_away"):
        warnings.append("Looking away from screen")

    if object_result.get("phone_detected"):
        cheating_detected = True
        warnings.append("Phone detected in frame")

    if object_result.get("person_count", 1) > 1:
        cheating_detected = True
        warnings.append("Multiple persons detected")

    return {
        "status": "success",
        "face_analysis": face_result,
        "object_analysis": object_result,
        "cheating_detected": cheating_detected,
        "warnings": warnings,
    }


@app.post("/api/analyze-frame")
async def analyze_frame(
    frame: UploadFile = File(...),
    current_user: db_models.User = Depends(auth.get_current_user),
):
    """Analyse a video frame for face and object detection."""
    frame_bytes = await _read_bounded(frame, _MAX_FRAME_BYTES, "Frame")
    if not frame_bytes:
        return JSONResponse(dict(_EMPTY_FRAME_RESPONSE))

    try:
        # CPU-bound inference must not run on the event loop; doing so blocked
        # every other request for the duration of the model call.
        result = await run_in_threadpool(_analyse_frame_sync, frame_bytes)
    except Exception as exc:
        logger.exception("Frame analysis failed: %s", exc)
        payload = dict(_EMPTY_FRAME_RESPONSE)
        payload["warnings"] = ["Analysis unavailable"]
        return JSONResponse(payload)

    return JSONResponse(result)


@app.post("/api/detect-face")
async def detect_face(
    frame: UploadFile = File(...),
    current_user: db_models.User = Depends(auth.get_current_user),
):
    """Detect faces in a video frame."""
    frame_bytes = await _read_bounded(frame, _MAX_FRAME_BYTES, "Frame")

    def _run():
        img = _decode_frame(frame_bytes)
        if img is None:
            return None
        return _analyse_face(img)

    try:
        result = await run_in_threadpool(_run)
    except Exception as exc:
        raise _fail(500, "Face detection failed", exc, "Face detection")

    if result is None:
        return JSONResponse({"status": "error", "message": "Invalid frame"}, status_code=400)

    return JSONResponse({"status": "success", "face_detection": result})


@app.post("/api/detect-objects")
async def detect_objects(
    frame: UploadFile = File(...),
    current_user: db_models.User = Depends(auth.get_current_user),
):
    """Detect objects (people, phones) in a video frame."""
    frame_bytes = await _read_bounded(frame, _MAX_FRAME_BYTES, "Frame")

    def _run():
        img = _decode_frame(frame_bytes)
        if img is None:
            return None
        return _analyse_objects(img, min_confidence=0.50)

    try:
        result = await run_in_threadpool(_run)
    except Exception as exc:
        raise _fail(500, "Object detection failed", exc, "Object detection")

    if result is None:
        return JSONResponse({"status": "error", "message": "Invalid frame"}, status_code=400)

    return JSONResponse({"status": "success", "object_detection": result})


@app.post("/api/transcribe-audio")
async def transcribe_audio(
    audio: UploadFile = File(...),
    current_user: db_models.User = Depends(auth.get_current_user),
):
    """Transcribe audio to text using Whisper."""
    audio_bytes = await _read_bounded(audio, _MAX_AUDIO_BYTES, "Audio")
    if not audio_bytes:
        raise HTTPException(status_code=400, detail="Empty audio upload")

    def _run():
        segments, info = get_whisper_model().transcribe(
            io.BytesIO(audio_bytes), language="en", beam_size=5
        )
        text = " ".join(segment.text for segment in segments).strip()
        return {
            "text": text,
            "confidence": getattr(info, "language_probability", 0.9),
            "language": getattr(info, "language", "en"),
            "status": "success",
        }

    try:
        result = await run_in_threadpool(_run)
    except Exception as exc:
        raise _fail(500, "Transcription failed", exc, "Transcription")

    return JSONResponse({"status": "success", "transcription": result})


_VOICES = [
    {"id": "JBFqnCBsd6RMkjVDRZzb", "name": "Default English", "language": "en"},
    {"id": "EXAVITQu4vr4xnSDxMaL", "name": "Bella", "language": "en"},
    {"id": "MF3mGyEYCHltNiPSt4nC", "name": "Elli", "language": "en"},
]
_VOICE_IDS = {v["id"] for v in _VOICES}


@app.post("/api/generate-speech")
async def generate_speech(
    text: str = Form(...),
    voice_id: str = Form("JBFqnCBsd6RMkjVDRZzb"),
    current_user: db_models.User = Depends(auth.get_current_user),
):
    """Generate speech from text using ElevenLabs TTS."""
    client = get_elevenlabs_client()
    if client is None:
        raise HTTPException(
            status_code=503,
            detail="Text-to-speech is not configured. Set ELEVENLABS_API_KEY to enable it.",
        )

    text = (text or "").strip()
    if not text:
        raise HTTPException(status_code=400, detail="Text cannot be empty")
    if len(text) > config.MAX_TTS_CHARS:
        raise HTTPException(
            status_code=400,
            detail=f"Text exceeds the {config.MAX_TTS_CHARS} character limit",
        )
    if not _VOICE_IDS or voice_id not in _VOICE_IDS:
        raise HTTPException(status_code=400, detail="Unknown voice_id")

    def _run():
        audio = client.text_to_speech.convert(
            voice_id=voice_id, text=text, model_id="eleven_multilingual_v2"
        )
        return base64.b64encode(b"".join(audio)).decode("utf-8")

    try:
        audio_base64 = await run_in_threadpool(_run)
    except Exception as exc:
        raise _fail(502, "Speech generation failed", exc, "Speech generation")

    return JSONResponse({"status": "success", "audio": audio_base64, "format": "mp3"})


@app.get("/api/tts-voices")
async def get_tts_voices():
    """Get available TTS voice IDs."""
    return JSONResponse({"status": "success", "voices": _VOICES})


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="127.0.0.1", port=8000)
