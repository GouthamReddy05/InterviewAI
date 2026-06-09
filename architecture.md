"""
InterviewAI - Complete Architecture & Implementation Guide

This document explains the complete system design, data flow, and how to use it.
"""

# ============================================================================
# 1. SYSTEM OVERVIEW
# ============================================================================

"""
InterviewAI is an AI-powered technical interview platform that:

✓ Accepts resume uploads (PDF, DOCX, TXT)
✓ Generates 4 realistic interview questions per:
  - Technical skill
  - Project
  - Work/Internship/Research/Leadership experience
  - Achievement/Certification

✓ Conducts dynamic interviews with:
  - Evaluation of each answer (rating + feedback)
  - Contextual follow-up questions based on answers
  - Real-world scenario questions (not textbook definitions)

✓ Provides comprehensive reports with:
  - All Q&A pairs with evaluations
  - Interview statistics
  - Performance metrics
"""

# ============================================================================
# 2. DATA FLOW
# ============================================================================

"""
┌──────────────────────────────────────────────────────────────────────┐
│                         COMPLETE DATA FLOW                           │
└──────────────────────────────────────────────────────────────────────┘

PHASE 1: RESUME UPLOAD & PROCESSING
───────────────────────────────────

User: Upload resume (PDF/DOCX/TXT) + Job Role
  ↓
  → POST /api/upload-resume
  ↓
ResumeExtractor:
  - Parse PDF/DOCX/TXT
  - Extract plain text
  - Clean and normalize
  ↓
Resume Text → GPT-4 API

PHASE 2: QUESTION GENERATION
──────────────────────────────

Resume Text → QUESTION_GENERATION_PROMPT
  ↓
GPT-4 generates:
  - 4 questions per skill
  - 4 questions per project
  - 4 questions per experience
  - 4 questions per achievement
  ↓
JSON Response → InterviewQuestion objects
  ↓
InterviewSession created:
  {
    session_id: UUID,
    questions: [InterviewQuestion],
    current_question_index: 0,
    answers: [],
    follow_ups: [],
    status: "in_progress"
  }

PHASE 3: INTERVIEW LOOP
───────────────────────

┌─ Start Loop ─────────────────────────────────┐
│                                               │
│  1. GET /api/session/{id}/question           │
│     → Display current question                │
│                                               │
│  2. Candidate answers via UI/API             │
│                                               │
│  3. POST /api/session/{id}/answer            │
│     ↓                                         │
│     Answer → ANSWER_EVALUATION_PROMPT        │
│     ↓                                         │
│     GPT-4 Evaluates:                         │
│     - Rating (poor|fair|good|excellent)      │
│     - Strengths (2-3 points)                 │
│     - Improvements (2-3 points)              │
│     ↓                                         │
│     Answer + Evaluation                      │
│     → FOLLOWUP_QUESTION_PROMPT               │
│     ↓                                         │
│     GPT-4 Generates Follow-Up                │
│     ↓                                         │
│     Return:                                  │
│     {                                        │
│       evaluation: {...},                     │
│       follow_up: "Follow-up question",       │
│       next_available: true                   │
│     }                                        │
│                                               │
│  4. Display evaluation + follow-up           │
│                                               │
│  5. Candidate answers follow-up              │
│     (Same process as step 3)                 │
│                                               │
│  6. POST /api/session/{id}/next-question     │
│     ↓                                         │
│     Increment current_question_index         │
│     ↓                                         │
│     More questions? → Back to 1              │
│     No more? → End loop                      │
│                                               │
└──────────────────────────────────────────────┘

PHASE 4: REPORT GENERATION
──────────────────────────

GET /api/session/{id}/report
  ↓
Compile all Q&A pairs with:
  - Original question
  - Category (skill|project|experience|achievement)
  - Candidate answer
  - AI evaluation
  - Follow-up question
  ↓
Return comprehensive report as JSON
"""

# ============================================================================
# 3. ARCHITECTURE
# ============================================================================

"""
┌─────────────────────────────────────────────────────────────────┐
│                          SYSTEM COMPONENTS                       │
└─────────────────────────────────────────────────────────────────┘

┌───────────────────┐
│   FastAPI App     │  REST API endpoints
│   (app.py)        │  Request routing & validation
└─────────┬─────────┘
          │
    ┌─────┴─────┬─────────────────┬───────────────────┐
    │           │                 │                   │
    ↓           ↓                 ↓                   ↓
┌─────────┐ ┌──────────┐ ┌──────────────┐  ┌────────────┐
│ Models  │ │ Prompts  │ │ Question     │  │ Resume     │
│ (models│ │ (prompts │ │ Generator    │  │ Extractor  │
│ .py)   │ │ .py)     │ │ (question    │  │ (question_ │
│        │ │          │ │ _generator   │  │ generator  │
│        │ │          │ │ .py)         │  │ .py)       │
└─────────┘ └──────────┘ └──────────────┘  └────────────┘
    ↓           ↓              ↓                ↓
    └─────────────────────────────────────────┘
                    │
                    ↓
        ┌──────────────────────┐
        │   Session Manager    │  In-memory storage
        │ (question_generator  │  (for MVP)
        │ .py)                 │  [Can be replaced
        │                      │   with database]
        └──────────────────────┘
                    │
                    ↓
        ┌──────────────────────┐
        │   OpenAI GPT-4 API   │  LLM calls for:
        │                      │  - Generate questions
        │                      │  - Evaluate answers
        │                      │  - Generate follow-ups
        └──────────────────────┘
"""

# ============================================================================
# 4. KEY FILES & RESPONSIBILITIES
# ============================================================================

"""
app.py (170+ lines)
├─ FastAPI application setup
├─ API endpoints:
│  ├─ POST /api/upload-resume
│  ├─ GET  /api/session/{id}/question
│  ├─ POST /api/session/{id}/answer
│  ├─ POST /api/session/{id}/next-question
│  ├─ GET  /api/session/{id}/progress
│  ├─ GET  /api/session/{id}/report
│  └─ GET  /api/health
└─ Error handling & response formatting

models.py (150+ lines)
├─ Pydantic models for type safety:
│  ├─ InterviewQuestion
│  ├─ CandidateAnswer
│  ├─ AnswerEvaluation
│  ├─ FollowUpQuestion
│  ├─ InterviewSession
│  └─ Request/Response DTOs
└─ Enums for categories, difficulty, ratings

question_generator.py (400+ lines)
├─ ResumeExtractor class
│  ├─ _extract_pdf()
│  ├─ _extract_docx()
│  └─ _extract_txt()
├─ InterviewQuestionGenerator class
│  ├─ generate_questions()
│  ├─ generate_followup()
│  └─ evaluate_answer()
└─ InterviewSessionManager class
   ├─ create_session()
   ├─ get_session()
   ├─ submit_answer()
   ├─ proceed_to_next_question()
   ├─ get_interview_progress()
   └─ get_interview_report()

prompts.py (200+ lines)
├─ QUESTION_GENERATION_PROMPT (detailed system prompt)
├─ FOLLOWUP_QUESTION_PROMPT (follow-up generation)
└─ ANSWER_EVALUATION_PROMPT (evaluation criteria)

config.py (30+ lines)
├─ OPENAI_API_KEY
├─ OPENAI_MODEL
├─ Questions per category configuration
├─ Interview settings
└─ Database & logging config

requirements.txt
├─ FastAPI & uvicorn
├─ OpenAI client
├─ PDF/DOCX parsing libraries
├─ Other dependencies
└─ Version specifications

example_client.py (300+ lines)
├─ InterviewAIClient class
├─ Methods for each API call
├─ Interactive interview loop
└─ Report generation

tests.py (250+ lines)
├─ Unit tests for models
├─ Resume extractor tests
├─ Question generator tests
├─ Session manager tests
└─ Integration tests

QUICKSTART.md & README_SYSTEM.md
├─ Setup instructions
├─ API documentation
├─ Configuration guide
├─ Troubleshooting
└─ Production considerations
"""

# ============================================================================
# 5. QUESTION TYPES & EXAMPLES
# ============================================================================

"""
SKILL QUESTIONS (e.g., "Python")
─────────────────────────────────

Level 1 (Understanding):
"Describe a production issue you debugged using Python that
revealed a misunderstanding about memory management or performance."

Level 2 (Implementation):
"Walk me through how you optimized a Python function processing
millions of records. What were the bottlenecks? How did you identify them?"

Level 3 (Optimization):
"Tell me about a time you fixed a memory leak in Python. How did you find it?
What tools did you use? What was the root cause?"

Level 4 (Design & Tradeoffs):
"Design a Python service that handles 10,000 requests per second
on commodity hardware. What concurrency model would you use?
Why not alternatives like threading or multiprocessing?"


PROJECT QUESTIONS (e.g., "Built recommendation engine")
─────────────────────────────────────────────────────

Q1: "Why did you choose [technology/architecture] for this project
instead of alternatives?"

Q2: "What was the biggest technical challenge you faced? How did you solve it?
What would you do differently knowing what you know now?"

Q3: "How did you handle [specific concern: scalability, latency, accuracy]?
What metrics did you optimize for? How did you measure success?"

Q4: "If traffic increased 100x, what would break? How would you redesign?"


EXPERIENCE QUESTIONS (e.g., "Senior Engineer at Company")
──────────────────────────────────────────────────────

Q1: "Tell me about the most impactful feature/system you built.
Why was it important? What was your specific contribution?"

Q2: "Describe a time you had to make an architectural decision that
affected many teams. How did you approach it?"

Q3: "Tell me about a disagreement with a colleague about technical approach.
How did you resolve it? What did you learn?"

Q4: "What was the most difficult bug you debugged in a production system?
How did you approach finding and fixing it?"


ACHIEVEMENT QUESTIONS (e.g., "Open source contributor")
────────────────────────────────────────────────────────

Q1: "Walk through your preparation strategy for this achievement.
What did you learn? What surprised you?"

Q2: "What was the most challenging part? How did you overcome obstacles?"

Q3: "Tell me about a technique or concept you learned deeply during this.
How has it influenced your subsequent work?"

Q4: "If you could redo it, what would you change? Why?"
"""

# ============================================================================
# 6. FOLLOW-UP STRATEGY
# ============================================================================

"""
Follow-ups are context-aware and based on the candidate's answer:

Rule 1: Vague Answer
┌──────────────────────────────────────────────────────┐
│ Candidate: "I used caching to improve performance"   │
│ Follow-up: "Be specific - what did you cache? What  │
│ cache eviction strategy did you use? TTL? LRU?"      │
└──────────────────────────────────────────────────────┘

Rule 2: Technology Mentioned
┌──────────────────────────────────────────────────────┐
│ Candidate: "We used Redis for caching"               │
│ Follow-up: "Why Redis over Memcached or other       │
│ solutions? What trade-offs did you accept?"          │
└──────────────────────────────────────────────────────┘

Rule 3: Algorithm/Model Mentioned
┌──────────────────────────────────────────────────────┐
│ Candidate: "We used CNN for image classification"    │
│ Follow-up: "What activation functions? Batch norm?   │
│ Why that architecture over Vision Transformers?"     │
└──────────────────────────────────────────────────────┘

Rule 4: Challenge Mentioned
┌──────────────────────────────────────────────────────┐
│ Candidate: "We had latency issues in production"     │
│ Follow-up: "How did you identify the bottleneck?    │
│ What monitoring/profiling tools did you use?"        │
└──────────────────────────────────────────────────────┘

Rule 5: Trade-off Mentioned
┌──────────────────────────────────────────────────────┐
│ Candidate: "We chose consistency over availability"  │
│ Follow-up: "Can you give a concrete scenario where   │
│ your choice mattered? What would breaking this do?"  │
└──────────────────────────────────────────────────────┘

Rule 6: Personal Contribution Unclear
┌──────────────────────────────────────────────────────┐
│ Candidate: "Our team built a distributed system"     │
│ Follow-up: "What was YOUR specific responsibility?   │
│ What components did you own end-to-end?"             │
└──────────────────────────────────────────────────────┘
"""

# ============================================================================
# 7. EVALUATION CRITERIA
# ============================================================================

"""
Answers are evaluated on:

RATING: poor | fair | good | excellent

Poor:
  - Vague or incomplete answer
  - Demonstrates lack of hands-on experience
  - Cannot explain reasoning
  - Textbook answers with no real-world application

Fair:
  - Correct but surface-level understanding
  - Limited practical examples
  - Good communication but weak depth
  - Shows awareness but not expertise

Good:
  - Clear explanation with practical examples
  - Demonstrates hands-on experience
  - Good technical depth
  - Can explain reasoning and tradeoffs
  - Identifies potential issues

Excellent:
  - Exceptional clarity and depth
  - Rich practical examples
  - Discusses tradeoffs thoughtfully
  - Shows systems thinking
  - Mentions edge cases and optimization
  - Demonstrates learning mindset

STRENGTHS: 2-3 specific positive aspects of the answer
  Example: ["Clear technical explanation", "Good awareness of tradeoffs"]

IMPROVEMENTS: 2-3 areas the candidate could improve
  Example: ["Could provide more specific metrics", "Missing discussion of alternatives"]

FOLLOW-UP DIRECTION: What interviewer should probe next
  Example: "Ask about production deployment and monitoring"
"""

# ============================================================================
# 8. SESSION LIFECYCLE
# ============================================================================

"""
1. CREATION
   - Resume uploaded
   - Text extracted
   - Questions generated (~20-30 questions)
   - Session stored with status="in_progress"

2. IN PROGRESS
   - Current question displayed
   - Candidate answers
   - Answer evaluated
   - Follow-up generated & displayed
   - Candidate answers follow-up
   - Move to next question
   - Repeat until all questions answered

3. COMPLETION
   - All questions answered
   - Session status="completed"
   - Report generated
   - Report available for download

4. DATA RETENTION
   - All Q&A pairs stored
   - All evaluations retained
   - Session can be reviewed later
   - Report can be regenerated
"""

# ============================================================================
# 9. ERROR HANDLING
# ============================================================================

"""
The system handles:

Resume Upload Errors:
  - Invalid file format (not PDF/DOCX/TXT)
  - Corrupted files
  - Encryption issues
  - Permission issues

LLM API Errors:
  - API key invalid
  - Rate limiting
  - Timeout
  - Invalid JSON response
  - Connection errors

Session Errors:
  - Invalid session ID
  - Session expired
  - No current question
  - Interview already completed

Validation Errors:
  - Missing required fields
  - Invalid enum values
  - Malformed requests

Graceful Degradation:
  - Returns meaningful error messages
  - Suggests remediation steps
  - Maintains session state
  - Allows retry
"""

# ============================================================================
# 10. SCALING & OPTIMIZATION
# ============================================================================

"""
Current Implementation (MVP):
  ✓ In-memory session storage
  ✓ Synchronous LLM calls
  ✓ Basic error handling
  ✓ Single-threaded

Production Enhancements:

Database:
  ✓ Replace in-memory storage with PostgreSQL
  ✓ Persist all sessions, answers, evaluations
  ✓ Enable session recovery
  ✓ Analytics on performance

Asynchronous Processing:
  ✓ Async question generation (Celery/Airflow)
  ✓ Async follow-up generation
  ✓ Background report generation
  ✓ Async resume processing

Caching:
  ✓ Cache generated questions for same resume
  ✓ Cache LLM responses
  ✓ Redis for session management

Optimization:
  ✓ Batch LLM API calls where possible
  ✓ Streaming LLM responses
  ✓ Lazy loading of questions
  ✓ Concurrent answer processing

Monitoring:
  ✓ Track API latencies
  ✓ Monitor LLM usage and costs
  ✓ Interview completion rates
  ✓ User engagement metrics
"""

# ============================================================================
# 11. CUSTOMIZATION GUIDE
# ============================================================================

"""
To customize question style:

1. Edit QUESTION_GENERATION_PROMPT in prompts.py
   - Adjust difficulty distribution
   - Change question focus areas
   - Modify tone/style

2. Edit FOLLOWUP_QUESTION_PROMPT in prompts.py
   - Adjust follow-up strategy
   - Add specific probing techniques
   - Customize conversational style

3. Adjust questions per category in config.py
   - QUESTIONS_PER_SKILL
   - QUESTIONS_PER_PROJECT
   - QUESTIONS_PER_EXPERIENCE
   - QUESTIONS_PER_ACHIEVEMENT

4. Modify evaluation criteria in ANSWER_EVALUATION_PROMPT
   - Change rating thresholds
   - Adjust evaluation focus
   - Add custom criteria

5. Change LLM model in config.py
   - Switch between gpt-4-turbo, gpt-4o
   - Adjust temperature for consistency/creativity

Example: For Sales Interview Questions
  - Create sales-specific prompts
  - Adjust categories to: skills, experience, achievements
  - Focus on communication, negotiation, relationship building
  - Use different evaluation criteria
"""

# ============================================================================
# 12. DEPLOYMENT CHECKLIST
# ============================================================================

"""
Before going to production:

☐ Database integration (PostgreSQL)
☐ User authentication & authorization
☐ Rate limiting & quota management
☐ Logging & monitoring setup
☐ Error tracking (Sentry)
☐ Performance monitoring
☐ Load testing
☐ Security audit
☐ GDPR/privacy compliance review
☐ Backup & disaster recovery plan
☐ Deployment pipeline (CI/CD)
☐ Documentation complete
☐ API versioning strategy
☐ Rollback plan
☐ Cost estimation for OpenAI API
"""

# ============================================================================
# 13. TROUBLESHOOTING GUIDE
# ============================================================================

"""
See QUICKSTART.md for detailed troubleshooting.

Quick Reference:

Q: "Questions are too similar/generic"
A: Edit QUESTION_GENERATION_PROMPT to be more specific

Q: "Follow-ups don't relate to answers"
A: Check FOLLOWUP_QUESTION_PROMPT, consider using gpt-4o

Q: "Session lost after server restart"
A: Add database integration to persist sessions

Q: "LLM calls timeout frequently"
A: Increase timeout in config.py, check network

Q: "API rate limits hit quickly"
A: Implement request queuing, add retry logic

Q: "OpenAI costs too high"
A: Use gpt-3.5-turbo, cache responses, batch requests
"""
