# InterviewAI

An AI-powered mock interview platform. It reads a candidate's résumé, generates
questions grounded in what that résumé actually shows, asks adaptive follow-ups,
evaluates each answer, and produces a scored report — while a webcam feed is
checked for a phone or a second person in frame.

A single FastAPI process serves both the API and the frontend. There is no
separate frontend server, no worker queue and no message broker.

---

## How it works

```
upload résumé + role  ──▶  setup (difficulty)  ──▶  one Groq call generates 8–12 questions
                                                              │
                                                              ▼
          report  ◀──  answer loop: evaluate ─▶ follow up or advance
```

Three stores, each with one job:

| Store | Holds |
|---|---|
| **Redis** | The live interview — questions, answers, evaluations, turn counter. 6-hour TTL. |
| **Postgres** | Who owns the interview, and the finished report once generated. |
| **Browser** | Real-time UX: the camera overlay, live transcript, attention measurement. |

---

## Stack

| Layer | Choice | Why |
|---|---|---|
| API | FastAPI + Uvicorn | Async routing, Pydantic validation, `run_in_threadpool` for blocking ML calls |
| LLM | Groq · `llama-3.3-70b-versatile` | Latency. Every turn is two sequential LLM calls, so per-token speed decides how the conversation *feels* |
| Live state | Redis | Every answer rewrites the whole session blob 30–40 times a session — a `SET` that expires itself, not a large row update |
| Records | Postgres + SQLAlchemy 2.x | Ownership and finished reports |
| Auth | JWT (HS256) + bcrypt | Per-request DB lookup so `is_admin` is never trusted from the token |
| Vision | YOLOv8n | Phone and extra-person detection — the only server-verified integrity signals |
| Attention | Browser MediaPipe FaceMesh | Iris-based gaze at camera rate. Reported as feedback, never scored |
| Speech in | Web Speech API | In-browser streaming recognition, written live into the answer box. Chrome/Edge only — other browsers type |
| Speech out | ElevenLabs | Returns 503 when no key is set — no fallback key |
| Frontend | Vanilla JS | One `state` object, a `switch` router over `state.step`, `innerHTML` rendering with explicit escaping |

**No embeddings, no vector store, no retrieval.** Evaluation is a single
stateless prompt containing the question and the answer.

---

## Quick start

```bash
git clone https://github.com/your-username/InterviewAI.git
cd InterviewAI

python3 -m venv venv
source venv/bin/activate          # Windows: venv\Scripts\activate
pip install -r requirements.txt

cp .env.example .env              # then fill in GROQ_API_KEY and DATABASE_URL
uvicorn app:app --reload --port 8000
```

Open <http://localhost:8000>.

YOLO weights ship in the repo at `ml/yolov8n.pt` — no download step. No
speech model is downloaded: transcription happens in the browser.

Redis is optional in development: without it the app falls back to a
process-local dict and logs a warning. In production an unreachable Redis
**fails the boot** — the fallback is single-worker only and would silently lose
interviews across workers.

### Tests

```bash
python -m pytest        # 45 tests, no network, no models loaded
```

---

## Configuration

See `.env.example` (development) and `.env.production.example` (deployment).
Required: `DATABASE_URL`, `GROQ_API_KEY`. Optional: `ELEVENLABS_API_KEY`
(TTS is disabled without it), `REDIS_URL`.

Configuration is validated at import, and a misconfigured production deploy
**refuses to start** rather than running quietly insecure. With
`ENVIRONMENT=production`, the app will not boot if:

- `JWT_SECRET_KEY` is missing, weak, or under 32 characters
- `DEBUG=true`
- `CORS_ALLOW_ORIGINS` is `*`
- Redis is unreachable

In development the JWT secret defaults to a *per-process random value*, so
tokens do not survive a restart. That is deliberate — it makes a well-known
signing key impossible to ship by accident.

---

## API

**Auth** — `POST /api/auth/signup` · `POST /api/auth/login` ·
`POST /api/auth/refresh` · `GET /api/auth/me`

**Interview** — `POST /api/upload-resume` ·
`POST /api/session/{id}/answer` · `GET /api/session/{id}/comprehensive-report` ·
`POST /api/session/{id}/end` · `POST /api/session/{id}/attention`

**Media** — `POST /api/analyze-frame` ·
`POST /api/generate-speech`

**Ops** — `GET /api/health` (also reports the session-store mode and the
evaluation parse-failure counter)

Every `/api/session/{id}/*` route depends on `get_owned_interview`, which
returns **404 rather than 403** when the caller does not own the session — 403
would confirm the ID exists and turn the endpoint into an enumeration oracle.

All endpoints that cost money or CPU are rate-limited: login, signup, upload,
answer, frame analysis and TTS.

---

## Design decisions worth knowing

**The final score is computed server-side and only server-side.**
`POST /api/session/{id}/end` takes no request body. The score is derived from
the real per-answer evaluations plus YOLO's own frame verdicts, as a weighted
percentage over the components that could actually be measured.

**Attention is measured in the browser and never scored.** The browser runs
MediaPipe FaceMesh at camera rate with an iris-based gaze estimate — a better
measurement than anything recoverable from one 320×240 JPEG every three seconds,
and it tracks duration, which frame counts cannot. Because it is client-sourced
it is presented as feedback and does not grade anyone. The integrity penalty is
sourced only from YOLO.

**Answer submissions are idempotent.** Each carries a turn token; a replayed or
duplicated submission is rejected with a 409 *before* either LLM call, rather
than two read-modify-writes silently losing an answer.

**Unparseable evaluations are excluded from the score.** When the model returns
JSON that cannot be parsed, the evaluation is tagged `unscored` — the fallback
rating still drives interview flow, but the placeholder value never inflates the
final number.

**Transcription is browser-only, on purpose.** A server-side faster-whisper
pass used to re-transcribe the recorded clip and overwrite the live text. It was
supposed to be gated on quality, but the gate read `info.language_probability` —
the model's confidence that the audio is *English*, which sits at 1.000 on
ordinary speech — so it never rejected anything. The result was ~6.7 s of blocking
CPU per answer (measured, `small`/int8, 35 s clip, RTF 0.19) to replace text that
was already correct. Removed. The cost is that Safari and Firefox have no voice
input and candidates there type.

**Résumé files are never written to disk.** They are parsed in memory and
discarded.

---

## Deployment

```bash
cp .env.production.example .env.production   # then fill it in
docker compose up --build
```

Brings up the app with Postgres and Redis. Notes baked into the image:

- **CPU-only torch.** PyPI's default Linux wheel depends on ~2 GB of NVIDIA CUDA
  packages that nothing here uses.
- **`opencv-python-headless`.** The API calls only `imdecode`, `flip` and
  `IMREAD_COLOR`; the regular wheel drags in X11 libraries and is the usual
  cause of `ImportError: libGL.so.1` in a container.
- **Single worker.** Sessions and rate limits live in Redis so more workers would
  be correct, but each loads its own copy of torch and YOLO. Scale with more
  containers, not more workers.

Needs ~2 GB RAM, nearly all of it torch and YOLO.

---

## Known limitations

Stated plainly rather than discovered later.

1. **Prompt injection is unmitigated.** Résumé text goes verbatim into the
   generation prompt. Field normalisation and output escaping contain the blast
   radius, but a crafted résumé can still steer question content.
2. **Escaping is per-call-site.** The known XSS sinks are fixed; the pattern that
   allowed them is unchanged until rendering goes through an escape-by-default
   tagged template.
3. **Proctoring can be defeated by silence.** A client can stop uploading frames.
   The scoring *policy* is not client-controlled, but detecting a quiet client
   needs an expected-frame heartbeat.
4. **No migrations.** `create_all()` builds the schema on first boot; a later
   schema change will not apply to a live table.
5. **Minimal observability.** One parse-failure counter on `/api/health`. No
   metrics, no structured logs, no alerting.
6. **Score weights are a judgement, not a calibration.** They are defensible but
   were chosen, not derived from outcome data — and since communication,
   confidence and résumé alignment are all derived from the technical score, the
   effective weight on technical performance is far higher than its nominal 0.35.

`FIXES_REPORT.md` documents the 26 defects found in a self-audit of this
codebase and how each was fixed.

---

## Repository layout

```
app.py                    FastAPI app, routes, YOLO/TTS handlers
api/                      auth and admin routers
core/                     settings, auth, database, Redis store, rate limiting
models/                   SQLAlchemy tables and Pydantic schemas
services/                 question generation, prompts, LLM JSON recovery
ml/extract_text.py        PDF/DOCX text extraction (walks tables)
ml/*.py                   standalone webcam/mic prototypes, not imported
frontend/                 vanilla JS SPA served by the same process
tests/                    45 tests — state machine, evaluation parsing, JSON recovery
```
