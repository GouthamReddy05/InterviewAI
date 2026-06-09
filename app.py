from fastapi import FastAPI, UploadFile, File, Form, HTTPException, Request
from fastapi.templating import Jinja2Templates
from fastapi.responses import JSONResponse
import os
from fastapi.staticfiles import StaticFiles


from question_generator import InterviewSessionManager
from dummy.extract_text import extract_text_from_file
from models import (
    AnswerSubmissionRequest,
)

app = FastAPI(title="InterviewAI", version="1.0.0")

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

@app.post("/api/upload-resume")
async def upload_resume(
    resume: UploadFile = File(...),
    job_role: str = Form(...)
):
    """
    Upload resume and start interview session.
    
    Returns:
    - session_id: Interview session ID
    - total_questions: Number of questions to be asked
    - first_question: First question to start the interview
    """
    try:
        # Extract text directly from UploadFile
        resume_text = extract_text_from_file(resume)
        
        # Create interview session
        session = session_manager.create_session(
            resume_text=resume_text,
            job_role=job_role,
            resume_name=resume.filename
        )
        
        # Get first question
        first_question = session_manager.get_current_question(session.session_id)
        
        return JSONResponse({
            "status": "success",
            "session_id": session.session_id,
            "total_questions": len(session.questions),
            "job_role": job_role,
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
    Submit answer to current question.
    
    Returns:
    - evaluation: Answer evaluation (rating, strengths, improvements)
    - follow_up: Follow-up question based on the answer
    - next_question_available: Whether there are more questions
    """
    try:
        session = session_manager.get_session(session_id)
        if not session:
            raise HTTPException(status_code=404, detail="Session not found")
        
        # Submit answer
        result = session_manager.submit_answer(session_id, request.answer)
        
        return JSONResponse({
            "status": "success",
            "evaluation": result["evaluation"],
            "follow_up": result["follow_up"],
            "next_question_available": result["next_question_available"]
        })
    
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/session/{session_id}/next-question")
async def next_question(session_id: str):
    """
    Move to next question after reviewing follow-up.
    
    Returns:
    - next_question: The next question or null if interview complete
    - interview_complete: Boolean indicating if interview is finished
    """
    try:
        session = session_manager.get_session(session_id)
        if not session:
            raise HTTPException(status_code=404, detail="Session not found")
        
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
async def get_comprehensive_report(session_id: str):
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
        
        return JSONResponse({
            "status": "success",
            "report": comprehensive_report
        })
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)