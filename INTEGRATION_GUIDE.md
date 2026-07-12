# InterviewAI - Full Stack Integration Guide

## System Overview

InterviewAI is a comprehensive AI-powered mock interview simulator that integrates:
- **Frontend**: Modern web interface for conducting interviews
- **Backend**: FastAPI server with AI monitoring and analysis
- **Monitoring**: Real-time face detection, object detection, transcription, and TTS

## Project Structure

```
/Applications/InterviewAI/
├── app.py                          # FastAPI backend with all routes
├── services.py                     # AI service layer (NEW)
├── config.py                       # Configuration
├── models.py                       # Pydantic data models
├── question_generator.py           # Interview question generation
├── prompts.py                      # LLM prompts
├── requirements.txt               # Python dependencies
├── frontend/
│   ├── index.html                # Main HTML file
│   ├── js/
│   │   ├── state.js             # Application state management
│   │   ├── data.js              # Static question data
│   │   ├── router.js            # Page routing
│   │   ├── api-service.js       # API layer (NEW)
│   │   ├── templates.js         # HTML templates (if exists)
│   ├── pages/
│   │   ├── landing.js           # Landing page
│   │   ├── upload.js            # Resume upload & profile setup (UPDATED)
│   │   ├── analysis.js          # Resume analysis progress
│   │   ├── setup.js             # Interview setup
│   │   ├── interview.js         # Active interview (UPDATED)
│   │   ├── results.js           # Results & report
│   └── css/
│       └── styles.css           # Tailwind styles
└── ml/                            # AI processing modules
    ├── extract_text.py          # PDF/DOCX text extraction
    ├── face_detection.py        # MediaPipe face detection
    ├── object_detection.py      # YOLOv8 object detection
    ├── realtimetrans.py         # Real-time transcription
    ├── tts.py                   # Text-to-speech (ElevenLabs)
    └── yolov8n.pt              # YOLOv8 model weights
```

## New Features

### 1. **Backend AI Services** (`services.py`)

All ml folder utilities are now wrapped into service classes:

#### FaceDetectionService
- Detects face presence and count
- Analyzes eye gaze (looking away)
- Returns face detection metrics

```python
face_result = face_detection_service.detect_faces(frame_bytes)
# Returns: {faces_detected, status, looking_away, confidence}
```

#### ObjectDetectionService
- Detects persons in frame
- Detects mobile phone usage
- Returns warnings for cheating detection

```python
object_result = object_detection_service.detect_objects(frame_bytes)
# Returns: {person_count, phone_detected, warnings}
```

#### TranscriptionService
- Transcribes audio to text using Whisper
- Supports multiple languages
- Returns confidence scores

```python
transcription = transcription_service.transcribe_audio(audio_bytes)
# Returns: {text, confidence, language}
```

#### TextToSpeechService
- Generates speech from text using ElevenLabs
- Returns base64 encoded MP3 audio
- Supports multiple voice IDs

```python
tts_result = tts_service.generate_speech(text, voice_id)
# Returns: {audio_base64, format}
```

### 2. **New Backend Routes** (app.py)

#### Frame Analysis Endpoints

**POST /api/analyze-frame**
- Accepts video frame (JPEG)
- Runs face detection + object detection
- Returns combined cheating analysis

**POST /api/detect-face**
- Face detection only
- Returns face metrics and warnings

**POST /api/detect-objects**
- Object detection only
- Returns person count and phone detection

#### Audio Processing Endpoints

**POST /api/transcribe-audio**
- Transcribes audio to text
- Returns text and confidence score

**POST /api/generate-speech**
- Text-to-speech conversion
- Returns base64 encoded audio

**GET /api/tts-voices**
- List available voice IDs for TTS

#### Enhanced Session Endpoints

All existing session endpoints now integrated with frame analysis and monitoring:
- `/api/session/{session_id}/question` - Get current question
- `/api/session/{session_id}/answer` - Submit answer
- `/api/session/{session_id}/next-question` - Move to next question
- `/api/session/{session_id}/scores` - Get interview scores
- `/api/session/{session_id}/comprehensive-report` - Full report

### 3. **Frontend API Layer** (`js/api-service.js` - NEW)

Centralized API service for all backend calls:

```javascript
// Resume upload
const response = await API.uploadResume(formData);

// Face detection
const faceResult = await API.detectFace(frameBlob);

// Object detection
const objectResult = await API.detectObjects(frameBlob);

// Combined frame analysis
const analysis = await API.analyzeFrame(frameBlob);

// Audio processing
const transcription = await API.transcribeAudio(audioBlob);
const speech = await API.generateSpeech(text, voiceId);

// Session management
const question = await API.getCurrentQuestion(sessionId);
const answer = await API.submitAnswer(sessionId, answerText);
const report = await API.getComprehensiveReport(sessionId);
```

### 4. **Real-Time Frame Analysis** (interview.js - UPDATED)

Interview page now:
- Captures frames every 2 seconds
- Sends to backend for analysis
- Updates UI with real-time monitoring
- Logs warnings for cheating detection
- Integrates face and object detection results

```javascript
startFrameAnalysis() // Periodic backend frame analysis
```

### 5. **Resume Upload Integration** (upload.js - UPDATED)

Upload page now:
- Uploads resume to backend
- Creates interview session
- Retrieves first question
- Prepares for interview flow

## Setup & Installation

### Prerequisites
- Python 3.8+
- Node.js/npm (optional, if using frontend build tools)
- Virtual environment

### Installation Steps

1. **Create and activate virtual environment**
```bash
cd /Applications/InterviewAI
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

2. **Install Python dependencies**
```bash
pip install -r requirements.txt
```

3. **Set up environment variables** (.env)
```
OPENAI_API_KEY=your_openai_key
ELEVENLABS_API_KEY=your_elevenlabs_key
DATABASE_URL=sqlite:///./interviews.db
```

4. **Download YOLOv8 model** (if not present)
```bash
python3 -c "from ultralytics import YOLO; YOLO('yolov8n.pt')"
```

## Running the Application

### Start Backend Server
```bash
cd /Applications/InterviewAI
source venv/bin/activate
python3 -m uvicorn app:app --reload --host 0.0.0.0 --port 8000
```

The API will be available at:
- **Main API**: http://localhost:8000
- **Interactive Docs**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc

### Access Frontend
Open browser to: http://localhost:8000

## API Testing

### Health Check
```bash
curl http://localhost:8000/api/health
```

### Test Resume Upload
```bash
curl -X POST http://localhost:8000/api/upload-resume \
  -F "resume=@your_resume.pdf" \
  -F "job_role=Data Scientist"
```

### Test Face Detection
```bash
curl -X POST http://localhost:8000/api/detect-face \
  -F "frame=@frame.jpg"
```

### Test Transcription
```bash
curl -X POST http://localhost:8000/api/transcribe-audio \
  -F "audio=@audio.wav"
```

### Test Text-to-Speech
```bash
curl -X POST http://localhost:8000/api/generate-speech \
  -F "text=Hello, this is a test" \
  -F "voice_id=JBFqnCBsd6RMkjVDRZzb"
```

## Frontend Pages & Flow

1. **Landing Page** (step: 0)
   - Introduction and CTA

2. **Upload Page** (step: 1)
   - Resume upload or quick-start profiles
   - Job role selection
   - Candidate name input
   - Calls backend to create session

3. **Analysis Page** (step: 2)
   - Shows agent status
   - Simulates resume analysis
   - Generates interview questions

4. **Setup Page** (step: 3)
   - Shows profile summary
   - Difficulty selection
   - Interview guidelines

5. **Active Interview** (step: 4)
   - Real-time video with face tracking
   - Chat interface with AI
   - Live metrics and monitoring
   - Frame analysis every 2 seconds
   - Periodic backend API calls

6. **Results Page** (step: 5)
   - Comprehensive score report
   - Cheating detection summary
   - Improvement recommendations
   - Agent feedback

## Key Integration Points

### Frontend → Backend Communication

1. **Resume Upload**
   - Form submission → POST /api/upload-resume
   - Creates interview session
   - Returns session_id and first_question

2. **During Interview**
   - Frame capture → POST /api/analyze-frame (every 2 seconds)
   - Updates cheating detection state
   - Transcript submission → POST /api/session/{id}/answer
   - Question progression → POST /api/session/{id}/next-question

3. **Interview Completion**
   - GET /api/session/{id}/comprehensive-report
   - Displays final scores and analysis

### Monitoring Stack

```
User Interview
    ↓
Frontend (video/audio/text input)
    ↓
Frame Capture (2-second interval)
    ↓
Backend Analysis
    ├─ Face Detection (MediaPipe)
    ├─ Object Detection (YOLOv8)
    ├─ Transcription (Whisper)
    └─ Evaluation (LLM)
    ↓
Real-time UI Updates
    ├─ Cheating warnings
    ├─ Metrics updates
    └─ Score calculations
```

## Troubleshooting

### Backend Not Responding
```bash
# Check if server is running
curl http://localhost:8000/api/health

# View server logs for errors
# Check port 8000 is not in use
lsof -i :8000
```

### Camera/Microphone Access
- Browser may block camera/mic access
- Check browser permissions
- Frontend gracefully falls back to simulation mode

### Frame Analysis Errors
- Non-critical errors don't interrupt interview
- Check console logs for details
- Analysis runs in background (non-blocking)

### Model Loading Issues
- YOLOv8 model auto-downloads on first use
- Ensure internet connection
- Check disk space for model caching

## Performance Considerations

### Frame Analysis Optimization
- Frames captured every 2 seconds (configurable)
- Runs asynchronously (non-blocking)
- Errors silently fail to maintain interview flow
- Canvas blob conversion is fast (~10ms)

### Transcription Service
- Uses CPU mode (can be changed to GPU)
- Small model (330M) for faster inference
- VAD filtering reduces false positives

### TTS Service
- Base64 encoding for easy transmission
- Cached responses possible
- Can use different voice IDs for variety

## Future Enhancements

1. WebSocket integration for real-time streaming
2. Database persistence for interview history
3. Admin dashboard for monitoring
4. Advanced metrics (eye contact percentage, speech patterns)
5. Multi-language support
6. Custom interview templates
7. Integration with ATS systems

## Support & Contributions

For issues or questions:
1. Check console logs (browser F12)
2. Review backend server logs
3. Test individual API endpoints
4. Check environment variables (.env)

---

**Last Updated**: 2024
**Version**: 1.0.0
**Status**: Fully Integrated & Functional
