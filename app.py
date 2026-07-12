from fastapi import FastAPI, UploadFile, File, Form, HTTPException, Request
from fastapi.templating import Jinja2Templates
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
import os
import sys
from fastapi.staticfiles import StaticFiles
import dotenv   
import base64
import numpy as np

dotenv.load_dotenv()

# Add ml folder to path for imports
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'ml'))

from core import database
from models.schemas import db_models
from core import auth
from api import auth_routes
from api import admin_routes
from sqlalchemy.orm import Session
from fastapi import Depends
from pydantic import BaseModel

from services.question_generator import InterviewSessionManager
from models.schemas import (
    AnswerSubmissionRequest,
)
# Import directly from ml folder
from ml.extract_text import extract_text_from_file

# Import ML libraries for detection
import cv2
if not hasattr(cv2, 'setNumThreads'):
    cv2.setNumThreads = lambda x: None
if not hasattr(cv2, 'imshow'):
    cv2.imshow = lambda *args, **kwargs: None
if not hasattr(cv2, 'imread'):
    cv2.imread = lambda *args, **kwargs: None
if not hasattr(cv2, 'imwrite'):
    cv2.imwrite = lambda *args, **kwargs: None
if not hasattr(cv2, 'waitKey'):
    cv2.waitKey = lambda *args, **kwargs: None
if not hasattr(cv2, 'destroyAllWindows'):
    cv2.destroyAllWindows = lambda *args, **kwargs: None
if not hasattr(cv2, 'IMREAD_COLOR'):
    cv2.IMREAD_COLOR = 1
if not hasattr(cv2, 'IMREAD_IGNORE_ORIENTATION'):
    cv2.IMREAD_IGNORE_ORIENTATION = 128

import mediapipe as mp
from ultralytics import YOLO
from faster_whisper import WhisperModel
from elevenlabs.client import ElevenLabs

# Initialize ML models
mp_face_mesh = mp.solutions.face_mesh
face_mesh = mp_face_mesh.FaceMesh(
    static_image_mode=False,
    max_num_faces=5,
    refine_landmarks=True,
    min_detection_confidence=0.5,
    min_tracking_confidence=0.5
)

# Load YOLOv8 model
model_path = "ml/yolov8n.pt" if os.path.exists("ml/yolov8n.pt") else "yolov8n.pt"

# Patch torch.load to fix PyTorch 2.6 weights_only=True compatibility issue with ultralytics
import torch
_original_torch_load = torch.load
def _patched_torch_load(*args, **kwargs):
    kwargs['weights_only'] = False
    return _original_torch_load(*args, **kwargs)
torch.load = _patched_torch_load

yolo_model = YOLO(model_path)

# Initialize Whisper
whisper_model = WhisperModel("small", device="cpu", compute_type="int8")

# Initialize ElevenLabs
elevenlabs_api_key = os.getenv("ELEVENLABS_API_KEY", "dbb0dafcd098a4b61eac7c9c038282f29ed39950fd87301d0ff6b65b1d8095a0")
elevenlabs_client = ElevenLabs(api_key=elevenlabs_api_key)

# Create database tables
database.Base.metadata.create_all(bind=database.engine)

app = FastAPI(title="InterviewAI", version="1.0.0")

# Include routers
app.include_router(auth_routes.router)
app.include_router(admin_routes.router)

# Enable CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

UPLOAD_FOLDER = "uploads"
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

# Initialize session manager (singleton)
session_manager = InterviewSessionManager()

templates = Jinja2Templates(directory="frontend")
app.mount("/css", StaticFiles(directory="frontend/css"), name="css")
app.mount("/js", StaticFiles(directory="frontend/js"), name="js")
app.mount("/pages", StaticFiles(directory="frontend/pages"), name="pages")

@app.get("/")
async def root(request: Request):
    return templates.TemplateResponse(
        request=request,
        name="index.html",
        context={
            "title": "InterviewAI - Home"
        }
    )

@app.get("/favicon.ico", include_in_schema=False)
async def favicon():
    from fastapi import Response
    return Response(status_code=204)


@app.post("/api/upload-resume")
async def upload_resume(
    resume: UploadFile = File(...),
    job_role: str = Form(...),
    resume_text: str = Form(None),
    current_user: db_models.User = Depends(auth.get_current_user),
    db: Session = Depends(database.get_db)
):
    """
    Upload resume and start interview session.
    
    Returns:
    - session_id: Interview session ID
    - total_questions: Number of questions to be asked
    - questions: Array of all interview questions
    - first_question: First question to start the interview
    """
    try:
        # Extract text directly from ml folder if not provided
        if resume_text:
            text_to_use = resume_text
        else:
            text_to_use = extract_text_from_file(resume)
        
        # Create interview session
        session = session_manager.create_session(
            resume_text=text_to_use,
            job_role=job_role,
            resume_name=resume.filename
        )
        
        # Save to database
        db_interview = db_models.InterviewSessionModel(
            session_id=session.session_id,
            user_id=current_user.id,
            resume_name=resume.filename,
            job_role=job_role,
            status="in_progress"
        )
        db.add(db_interview)
        db.commit()
        
        # Format all questions for frontend
        questions = []
        for i, q in enumerate(session.questions):
            questions.append({
                "question_number": i + 1,
                "total_questions": len(session.questions),
                "category": q.category,
                "name": q.name,
                "primary_question": q.primary_question,
                "context": q.context,
                "difficulty_level": q.difficulty_level
            })
        
        # Get first question
        first_question = session_manager.get_current_question(session.session_id)
        
        return JSONResponse({
            "status": "success",
            "session_id": session.session_id,
            "total_questions": len(session.questions),
            "job_role": job_role,
            "extracted_profile": session.extracted_profile,
            "questions": questions,
            "first_question": {
                "question_number": 1,
                "total_questions": len(session.questions),
                "category": first_question.category,
                "name": first_question.name,
                "primary_question": first_question.primary_question,
                "context": first_question.context,
                "difficulty_level": first_question.difficulty_level
            } if first_question else None
        }, status_code=201)
    
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error processing resume: {str(e)}")


@app.get("/api/session/{session_id}/question")
async def get_current_question(session_id: str):
    """
    Get the current question for a session.
    """
    try:
        session = session_manager.get_session(session_id)
        if not session:
            raise HTTPException(status_code=404, detail="Session not found")
        
        current_question = session_manager.get_current_question(session_id)
        
        if not current_question:
            raise HTTPException(status_code=400, detail="Interview already completed")
        
        question_number = session.current_question_index + 1
        
        return JSONResponse({
            "status": "success",
            "question": {
                "question_number": question_number,
                "total_questions": len(session.questions),
                "category": current_question.category,
                "name": current_question.name,
                "primary_question": current_question.primary_question,
                "context": current_question.context,
                "difficulty_level": current_question.difficulty_level
            }
        })
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/session/{session_id}/answer")
async def submit_answer(session_id: str, request: AnswerSubmissionRequest):
    """
    Submit answer to current question or follow-up.
    
    Returns:
    - action: "follow_up" (ask another follow-up question) or "next_question" (move to next primary question)
    - evaluation: Answer evaluation (rating, strengths, improvements)
    - follow_up_question: The follow-up question (if action="follow_up")
    - next_question: The next primary question (if action="next_question" and available)
    - next_question_available: Whether there are more primary questions
    - followup_depth: Current follow-up depth
    """
    try:
        session = session_manager.get_session(session_id)
        if not session:
            raise HTTPException(status_code=404, detail="Session not found")
        
        # Submit answer and get next action
        result = session_manager.submit_answer(session_id, request.answer)
        
        return JSONResponse({
            "status": "success",
            "action": result["action"],
            "evaluation": result["evaluation"],
            "follow_up_question": result.get("follow_up_question"),
            "followup_depth": result.get("followup_depth", 0),
            "next_question": result.get("next_question"),
            "next_question_available": result.get("next_question_available", False),
            "interview_complete": session.status == "completed"
        })
    
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/session/{session_id}/next-question")
async def next_question(session_id: str):
    """
    Skip follow-ups and move to next question.
    
    Note: This is a manual skip - normally progression happens automatically via submit_answer().
    Call this if user wants to skip remaining follow-ups for current question.
    
    Returns:
    - next_question: The next question or null if interview complete
    - interview_complete: Boolean indicating if interview is finished
    """
    try:
        session = session_manager.get_session(session_id)
        if not session:
            raise HTTPException(status_code=404, detail="Session not found")
        
        # Reset follow-up mode and move to next
        session.is_followup_mode = False
        session.current_followup_depth = 0
        session.conversation_history = []
        
        has_next = session_manager.proceed_to_next_question(session_id)
        
        if has_next:
            next_q = session_manager.get_current_question(session_id)
            question_number = session.current_question_index + 1
            
            return JSONResponse({
                "status": "success",
                "interview_complete": False,
                "next_question": {
                    "question_number": question_number,
                    "total_questions": len(session.questions),
                    "category": next_q.category,
                    "name": next_q.name,
                    "primary_question": next_q.primary_question,
                    "context": next_q.context,
                    "difficulty_level": next_q.difficulty_level
                }
            })
        else:
            return JSONResponse({
                "status": "success",
                "interview_complete": True,
                "next_question": None
            })
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/session/{session_id}/progress")
async def get_progress(session_id: str):
    """
    Get interview progress.
    """
    try:
        progress = session_manager.get_interview_progress(session_id)
        return JSONResponse({
            "status": "success",
            "progress": progress
        })
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/session/{session_id}/report")
async def get_report(session_id: str):
    """
    Get complete interview report (after interview is complete).
    """
    try:
        report = session_manager.get_interview_report(session_id)
        return JSONResponse({
            "status": "success",
            "report": report
        })
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/health")
async def health_check():
    """Health check endpoint"""
    return JSONResponse({
        "status": "healthy",
        "service": "InterviewAI"
    })


@app.get("/api/session/{session_id}/scores")
async def get_interview_scores(session_id: str):
    """
    Get interview scores and metrics.
    """
    try:
        session = session_manager.get_session(session_id)
        if not session:
            raise HTTPException(status_code=404, detail="Session not found")
        
        scores = session_manager.calculate_interview_score(session_id)
        
        return JSONResponse({
            "status": "success",
            "scores": scores
        })
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/session/{session_id}/improvement-plan")
async def get_improvement_plan(session_id: str):
    """
    Get personalized improvement plan based on interview performance.
    """
    try:
        session = session_manager.get_session(session_id)
        if not session:
            raise HTTPException(status_code=404, detail="Session not found")
        
        plan = session_manager.generate_improvement_plan(session_id)
        
        return JSONResponse({
            "status": "success",
            "improvement_plan": plan
        })
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/session/{session_id}/comprehensive-report")
async def get_comprehensive_report(
    session_id: str,
    db: Session = Depends(database.get_db)
):
    """
    Get comprehensive interview report with scores, analysis, and improvements.
    """
    try:
        session = session_manager.get_session(session_id)
        if not session:
            raise HTTPException(status_code=404, detail="Session not found")
        
        report = session_manager.get_interview_report(session_id)
        scores = session_manager.calculate_interview_score(session_id)
        improvement_plan = session_manager.generate_improvement_plan(session_id)
        
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
            "improvement_plan": improvement_plan
        }
        
        # Update database
        db_interview = db.query(db_models.InterviewSessionModel).filter(db_models.InterviewSessionModel.session_id == session_id).first()
        if db_interview:
            db_interview.status = "completed"
            db_interview.score = scores.get("overall_score")
            db.commit()
        
        return JSONResponse({
            "status": "success",
            "report": comprehensive_report
        })
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


class EndSessionRequest(BaseModel):
    score: float

@app.post("/api/session/{session_id}/end")
async def end_session(
    session_id: str,
    request: EndSessionRequest,
    db: Session = Depends(database.get_db)
):
    try:
        db_interview = db.query(db_models.InterviewSessionModel).filter(db_models.InterviewSessionModel.session_id == session_id).first()
        if db_interview:
            db_interview.status = "completed"
            db_interview.score = request.score
            db.commit()
            return {"status": "success"}
        else:
            raise HTTPException(status_code=404, detail="Interview not found")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# =====================================================
# AI MONITORING & ANALYSIS ROUTES (ML Integration)
# =====================================================

@app.post("/api/analyze-frame")
async def analyze_frame(frame: UploadFile = File(...)):
    """
    Analyze a video frame for face and object detection
    """
    try:
        frame_bytes = await frame.read()
        if not frame_bytes:
            return JSONResponse({
                "status": "error",
                "face_analysis": {"status": "no_face"},
                "object_analysis": {"person_count": 1, "phone_detected": False, "warnings": []},
                "cheating_detected": False,
                "warnings": []
            })
        
        # Decode frame
        nparr = np.frombuffer(frame_bytes, np.uint8)
        frame_img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        
        if frame_img is None or frame_img.size == 0:
            return JSONResponse({
                "status": "error",
                "face_analysis": {"status": "no_face"},
                "object_analysis": {"person_count": 1, "phone_detected": False, "warnings": []},
                "cheating_detected": False,
                "warnings": []
            })
        
        # ===== FACE DETECTION =====
        frame_img = cv2.flip(frame_img, 1)
        h, w = frame_img.shape[:2]
        rgb_frame = cv2.cvtColor(frame_img, cv2.COLOR_BGR2RGB)
        
        face_result = {"status": "no_face", "faces_detected": 0, "looking_away": False}
        
        try:
            results = face_mesh.process(rgb_frame)
            
            if results.multi_face_landmarks:
                face_count = len(results.multi_face_landmarks)
                face_result["faces_detected"] = face_count
                
                if face_count > 1:
                    face_result["status"] = "multiple_faces"
                else:
                    face_result["status"] = "face_detected"
                    # Simple gaze detection
                    face = results.multi_face_landmarks[0]
                    nose_tip = face.landmark[4]
                    
                    if nose_tip.x < 0.2 or nose_tip.x > 0.8:
                        face_result["looking_away"] = True
        except Exception as e:
            print(f"Face detection error: {e}")
            face_result["status"] = "error"
        
        # ===== OBJECT DETECTION =====
        object_result = {
            "person_count": 1, 
            "phone_detected": False, 
            "prohibited_objects": [],
            "status": "success", 
            "warnings": []
        }
        
        try:
            yolo_results = yolo_model(frame_img, verbose=False, conf=0.45)
            
            person_count = 0
            phone_detected = False
            prohibited_objects = []
            warnings = []
            
            # List of COCO classes that are considered prohibited/suspicious in an interview
            suspicious_classes = ['cell phone', 'laptop', 'book', 'bottle', 'cup', 'wine glass', 'remote', 'keyboard']
            
            if yolo_results and len(yolo_results) > 0:
                for result in yolo_results:
                    if result.boxes is not None:
                        for box in result.boxes:
                            cls = int(box.cls[0])
                            confidence = float(box.conf[0])
                            
                            if confidence < 0.45:
                                continue
                            
                            class_name = yolo_model.names.get(cls, "unknown").lower()
                            
                            if "person" in class_name:
                                person_count += 1
                            elif class_name in suspicious_classes or "phone" in class_name:
                                if "phone" in class_name:
                                    phone_detected = True
                                if class_name not in prohibited_objects:
                                    prohibited_objects.append(class_name)
                                    warnings.append(f"Suspicious object detected: {class_name.upper()}")
            
            if person_count > 1:
                warnings.append(f"Multiple persons detected ({person_count})")
            
            object_result["person_count"] = max(1, person_count)
            object_result["phone_detected"] = phone_detected
            object_result["prohibited_objects"] = prohibited_objects
            object_result["warnings"] = warnings
        except Exception as e:
            print(f"Object detection error: {e}")
            object_result["warnings"] = []
        
        # ===== COMBINE RESULTS =====
        cheating_detected = False
        warnings = []
        
        if face_result.get('status') == 'no_face':
            cheating_detected = True
            warnings.append("No face detected")
        elif face_result.get('status') == 'multiple_faces':
            cheating_detected = True
            warnings.append(f"Multiple faces detected")
        
        if face_result.get('looking_away'):
            warnings.append("⚠️ Looking away from screen")
        
        if object_result.get('phone_detected'):
            cheating_detected = True
            warnings.append("⚠️ Phone detected in frame!")
        
        if object_result.get('person_count', 1) > 1:
            cheating_detected = True
            warnings.append(f"⚠️ Multiple persons detected!")
        
        return JSONResponse({
            "status": "success",
            "face_analysis": face_result,
            "object_analysis": object_result,
            "cheating_detected": cheating_detected,
            "warnings": warnings
        })
    
    except Exception as e:
        print(f"Frame analysis error: {e}")
        return JSONResponse({
            "status": "error",
            "face_analysis": {"status": "error"},
            "object_analysis": {"person_count": 1, "phone_detected": False, "warnings": []},
            "cheating_detected": False,
            "warnings": [f"Analysis error: {str(e)}"]
        })


@app.post("/api/detect-face")
async def detect_face(frame: UploadFile = File(...)):
    """
    Detect face in video frame
    Returns face detection status and metrics
    """
    try:
        frame_bytes = await frame.read()
        
        # Decode frame
        nparr = np.frombuffer(frame_bytes, np.uint8)
        frame_img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        
        if frame_img is None:
            return JSONResponse({
                "status": "error",
                "message": "Invalid frame"
            }, status_code=400)
        
        frame_img = cv2.flip(frame_img, 1)
        rgb_frame = cv2.cvtColor(frame_img, cv2.COLOR_BGR2RGB)
        
        result = {"status": "no_face", "faces_detected": 0}
        results = face_mesh.process(rgb_frame)
        
        if results.multi_face_landmarks:
            face_count = len(results.multi_face_landmarks)
            result["faces_detected"] = face_count
            result["face_count"] = face_count
            
            if face_count > 1:
                result["status"] = "multiple_faces"
            else:
                result["status"] = "face_detected"
                # Analyze gaze
                face = results.multi_face_landmarks[0]
                nose_x = face.landmark[1].x
                left_face_x = face.landmark[234].x
                right_face_x = face.landmark[454].x
                face_width = right_face_x - left_face_x
                
                result["looking_away"] = False
                if face_width > 0:
                    ratio = (nose_x - left_face_x) / face_width
                    if ratio < 0.3 or ratio > 0.7:
                        result["looking_away"] = True
        
        return JSONResponse({
            "status": "success",
            "face_detection": result
        })
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Face detection failed: {str(e)}")


@app.post("/api/detect-objects")
async def detect_objects(frame: UploadFile = File(...)):
    """
    Detect objects (person, phone) in video frame
    Returns object detection status and warnings
    """
    try:
        frame_bytes = await frame.read()
        
        # Decode frame
        nparr = np.frombuffer(frame_bytes, np.uint8)
        frame_img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        
        if frame_img is None:
            return JSONResponse({
                "status": "error",
                "message": "Invalid frame"
            }, status_code=400)
        
        frame_img = cv2.flip(frame_img, 1)
        
        result = {"person_count": 1, "phone_detected": False, "status": "success", "warnings": []}
        
        yolo_results = yolo_model(frame_img, verbose=False)
        
        person_count = 0
        phone_detected = False
        warnings = []
        
        for detection_result in yolo_results:
            boxes = detection_result.boxes
            for box in boxes:
                cls = int(box.cls[0])
                class_name = yolo_model.names[cls]
                confidence = float(box.conf[0])
                
                if confidence < 0.50:
                    continue
                
                if class_name == "person":
                    person_count += 1
                elif class_name == "cell phone":
                    phone_detected = True
                    warnings.append("Phone detected in frame!")
        
        if person_count > 1:
            warnings.append(f"Multiple persons detected ({person_count})")
        
        result["person_count"] = max(1, person_count)
        result["phone_detected"] = phone_detected
        result["warnings"] = warnings
        
        return JSONResponse({
            "status": "success",
            "object_detection": result
        })
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Object detection failed: {str(e)}")


@app.post("/api/transcribe-audio")
async def transcribe_audio(audio: UploadFile = File(...)):
    """
    Transcribe audio to text using Whisper
    Returns transcription with confidence score
    """
    try:
        audio_bytes = await audio.read()
        
        # Convert bytes to numpy array
        audio_np = np.frombuffer(audio_bytes, dtype=np.int16).astype(np.float32) / 32768.0
        
        # Transcribe using Whisper
        segments, info = whisper_model.transcribe(
            audio_np,
            language="en",
            beam_size=5
        )
        
        text = " ".join([segment.text for segment in segments])
        
        result = {
            'text': text,
            'confidence': info.language_probability if hasattr(info, 'language_probability') else 0.9,
            'language': info.language if hasattr(info, 'language') else 'en',
            'status': 'success'
        }
        
        return JSONResponse({
            "status": "success",
            "transcription": result
        })
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Transcription failed: {str(e)}")


@app.post("/api/generate-speech")
async def generate_speech(text: str = Form(...), voice_id: str = Form("JBFqnCBsd6RMkjVDRZzb")):
    """
    Generate speech from text using ElevenLabs TTS
    Returns base64 encoded audio
    """
    try:
        if not text or len(text.strip()) == 0:
            raise ValueError("Text cannot be empty")
        
        # Call ElevenLabs API
        audio = elevenlabs_client.text_to_speech.convert(
            voice_id=voice_id,
            text=text,
            model_id="eleven_multilingual_v2"
        )
        
        # Combine audio chunks and encode to base64
        audio_bytes = b"".join(audio)
        audio_base64 = base64.b64encode(audio_bytes).decode('utf-8')
        
        return JSONResponse({
            "status": "success",
            "audio": audio_base64,
            "format": "mp3"
        })
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Speech generation failed: {str(e)}")


@app.get("/api/tts-voices")
async def get_tts_voices():
    """
    Get available TTS voice IDs
    """
    voices = [
        {"id": "JBFqnCBsd6RMkjVDRZzb", "name": "Default English", "language": "en"},
        {"id": "EXAVITQu4vr4xnSDxMaL", "name": "Bella", "language": "en"},
        {"id": "MF3mGyEYCHltNiPSt4nC", "name": "Elli", "language": "en"}
    ]
    
    return JSONResponse({
        "status": "success",
        "voices": voices
    })


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)