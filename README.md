# InterviewAI

An intelligent, AI-powered mock interview platform that simulates real-world job interviews. It uses computer vision, natural language processing, and real-time audio analysis to evaluate technical answers and physical presentation.

This repository contains a FastAPI backend with a vanilla HTML/JS frontend, plus integrations for embeddings, NLP, speech processing, and LLM-driven question generation.

## 🚀 Project Overview

InterviewAI helps job seekers practice for interviews by:

- Parsing resumes and extracting text to understand candidate background.
- Generating tailored, context-aware interview questions based on the candidate's resume and job role.
- Monitoring candidate presence and environment using face tracking and object detection during the interview.
- Transcribing candidate answers in real-time and synthesizing interviewer speech.
- Evaluating responses and providing comprehensive feedback on technical accuracy and communication skills.

## 📊 Data & Models

Key components used:

- Resume parsing: `pypdf2`, `python-docx`.
- Computer Vision: `MediaPipe` (Face Detection), `YOLOv8` (Object Detection).
- Speech Processing: `faster-whisper` (Speech-to-Text), `elevenlabs` (Text-to-Speech).
- NLP/LLM/Reasoning: `langchain`, `langchain-google-genai`, `langchain_groq`, and OpenAI.
- Database: Neon DB (Serverless PostgreSQL) for user and session data.

## 🛠 Tech Stack

- Frontend: HTML, CSS, JavaScript (Vanilla JS)
- Backend: Python, FastAPI, python-dotenv
- AI/ML Models: OpenCV, MediaPipe, Ultralytics YOLOv8, Faster-Whisper, ElevenLabs, LangChain
- Database: PostgreSQL (Neon DB) via SQLAlchemy & psycopg2

## 🚀 Quick Start (Development)

1. Clone the repository

```bash
git clone https://github.com/your-username/InterviewAI.git
cd InterviewAI
```

2. Backend (FastAPI)

```bash
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt

# Download YOLOv8 model on first run
python3 -c "from ultralytics import YOLO; YOLO('yolov8n.pt')"

# Create a .env file in the project root (see examples below)

# Run the FastAPI server (default host: 0.0.0.0, port: 8000)
uvicorn app:app --reload --host 0.0.0.0 --port 8000
```

3. Frontend (development)

The frontend is served statically by the FastAPI backend. Just open your browser to:

```text
http://localhost:8000
```

## 🌍 Environment Variables

Create a `.env` file in the project root with the following keys (replace placeholders):

- DATABASE_URL=postgresql://<user>:<password>@<host>/<dbname>?sslmode=require  # Your Neon DB connection string
- OPENAI_API_KEY=sk-...your-key...
- ELEVENLABS_API_KEY=your-elevenlabs-key

Add any other provider-specific keys your deployment requires (Groq API keys, Google Gemini keys, etc.).

## 🌐 API Endpoints (examples)

- POST /api/auth/signup - User registration
- POST /api/auth/login - User login
- GET /api/health - Check service health
- POST /api/upload-resume - Upload & process resume
- GET /api/session/{session_id}/question - Get next interview question
- POST /api/session/{session_id}/answer - Submit candidate answer
- POST /api/analyze-frame - Real-time face tracking and analysis
- POST /api/transcribe-audio - Convert speech to text
- POST /api/generate-speech - Synthesize text to speech

## 🚀 Example user flow

1. Sign up / Log in
2. Upload resume and specify job role
3. Begin mock interview session
4. System asks questions verbally and candidate responds
5. System tracks face and objects via webcam for focus metrics
6. System evaluates response and provides detailed feedback and scoring
