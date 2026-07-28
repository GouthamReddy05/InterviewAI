# InterviewAI — Code Audit & Remediation

Full-stack review of frontend, backend, APIs, database, dependencies and configuration.
All fixes verified by `tests_smoke.py` (49 checks) and `tests_frontend.js` (28 checks).

---

## ⚠️ Action required from you

**Rotate the ElevenLabs API key.** A live key was hardcoded in `app.py` as a fallback and
is present in **3 commits** of git history. Removing it from the working tree does not
remove it from history — treat it as compromised, revoke it in the ElevenLabs dashboard,
and put the new one in `.env` as `ELEVENLABS_API_KEY`.

---

## Critical

| # | Issue | Fix |
|---|---|---|
| 1 | **Hardcoded API key.** `app.py` fell back to a real ElevenLabs key. The `.env` also used `ELEVEN_LABS_API_KEY` while the code read `ELEVENLABS_API_KEY`, so the hardcoded key is what actually ran in production. | Key removed. Managed via `settings`, accepts both env spellings. TTS returns `503` when unconfigured. |
| 2 | **IDOR — any user could read any interview.** Every `/api/session/{id}/*` endpoint (question, answer, report, scores, improvement plan, end) was completely unauthenticated. A session UUID was the only thing protecting a candidate's full transcript, evaluations and scores. | New `get_owned_interview` dependency: requires a valid token and verifies the interview belongs to the caller. Returns `404` (not `403`) so IDs cannot be probed. Admins retain access. |
| 3 | **Privilege escalation at signup.** `is_admin` was granted to anyone registering with username `goutham` + email `codecpp05@gmail.com` — a publicly-readable check in the source. | Removed. Signup can never grant admin; promote deliberately in the database. |
| 4 | **Stored XSS, no escaping anywhere in the frontend.** Username and email rendered raw into the admin table (a malicious username fires in the admin's browser), plus chat messages, LLM output, filenames, job roles and proctoring warnings. | Added `frontend/js/utils.js` with `escapeHtml` / `escapeAttr` / `escapeJsString`; applied to every user-, DB- and LLM-controlled sink. |
| 5 | **CORS `allow_origins=["*"]` with `allow_credentials=True`.** Invalid per spec and unsafe. | Configurable allowlist; credentials only sent for a real allowlist; `"*"` rejected outright when `ENVIRONMENT=production`. |
| 6 | **`dev-secret` JWT signing key default.** Anyone knowing the default could forge tokens for any user, including admins. | Random per-process default; production boot fails unless a strong (≥32 char) `JWT_SECRET_KEY` is set. |
| 7 | **Unauthenticated ML endpoints.** `analyze-frame`, `detect-face`, `detect-objects`, `transcribe-audio`, `generate-speech` were open to the internet — free GPU/Whisper/ElevenLabs compute for anyone. | All now require authentication, with request size caps. |

## High

- **Internal errors leaked to clients.** Handlers did `detail=str(e)`, exposing SQL fragments, file paths and upstream API errors. Now logged server-side; clients get a safe message.
- **404s and 400s turned into 500s.** A broad `except Exception` wrapped `raise HTTPException(404)`, so "session not found" came back as a server error. `HTTPException` is now re-raised untouched.
- **No upload validation.** Any file, any size. Now extension-checked (`.pdf`/`.docx`) and streamed with an abort at the size cap (`413`), so oversized uploads are never fully buffered.
- **No signup validation.** Any string was a valid email; a 1-character password was fine. Now `EmailStr`, username pattern, and an 8+ char password requiring a letter and a digit.
- **bcrypt 72-byte limit unhandled** — longer passwords raised a `500` on newer bcrypt. Normalised, and a malformed stored hash now fails the login instead of crashing.
- **Blocking ML inference on the event loop.** YOLO, MediaPipe and Whisper ran inside `async def`, freezing *every* concurrent request for the duration. Moved to `run_in_threadpool`; MediaPipe (not thread-safe) is lock-guarded.
- **Global `torch.load` monkeypatch** permanently disabled `weights_only` deserialization protection process-wide. Now scoped to the single YOLO checkpoint load.
- **Username enumeration** via distinguishable login errors — unified.

## Medium

- **Broken report rendering.** `results.js` used backslash-escaped `\${strengthsHtml}` inside template literals, so the improvement-plan section printed the literal placeholder text instead of the content. `_planItemEnhanced` was broken the same way.
- **Second interview never saved its score.** `state.sessionEnded` was set to `true` and never reset, silently suppressing the end-session call on every subsequent run.
- **Stale state across runs.** `resetState()` didn't clear `resumeRawText`, `tempExtracted` or `reportData`; logout left the previous user's transcript and report in memory for the next person on that browser.
- **`[object Object]` error messages.** FastAPI returns `detail` as an array for 422s; the login/signup pages rendered it directly. Added `formatApiError`.
- **401s ignored mid-interview.** Only `uploadResume` checked for 401. All calls now route through one `_request` helper that handles expired tokens and non-JSON error bodies.
- **Silent SQLite fallback.** `create_engine` is lazy, so the `try/except` around it never fired. Connectivity is now verified at startup and is fatal in production.
- **Sessions never expired** in Redis. Added a configurable TTL (default 6h).
- **N+1 query** in `/api/admin/interviews` (one user lookup per row) — now a single join, with pagination.
- **`datetime.utcnow()`** (deprecated in 3.12+) replaced with timezone-aware equivalents throughout.
- **`user_id` was nullable** on interviews — an unowned interview cannot be access-checked. Now required, with cascade delete.

## Low / quality

- `except (json.JSONDecodeError, Exception)` — the second arm already caught the first.
- `print()` debugging replaced with structured logging.
- Models loaded at import time (slow boot, memory in every worker, untestable) → lazily cached.
- API docs (`/docs`, `/openapi.json`) now disabled in production.
- Security headers added: `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, HSTS in production.
- `uvicorn` default bind changed from `0.0.0.0` to `127.0.0.1`.
- DOCX table extraction added — resumes often keep skills and contact details in tables, which the paragraph-only walk skipped entirely.
- Encrypted PDFs now give a clear message instead of an opaque parser error.
- `.DS_Store` untracked; `.gitignore` extended; `.env.example` added.

### Dependencies

`requirements.txt` was fully unpinned. Now version-bounded, plus:

- `pydantic>=1.7.0` → `>=2.7` — the code uses v2-only APIs (`model_validator`, `model_dump_json`), so a v1 install would have crashed at import.
- Added missing runtime deps that were imported but never declared: `pydantic-settings`, `jinja2`, `numpy`, `bcrypt`, `email-validator`, `langchain-core`.
- `passlib[bcrypt]` removed (never imported — the code uses `bcrypt` directly).
- `langchain`, `langchain-google-genai` removed (never imported).
- `PyPDF2` → `pypdf` (successor; the old package is unmaintained).
- `sounddevice` / `silero_vad` commented out — only used by the standalone `ml/realtimetrans.py` demo script, not the API.

---

## Remaining recommendations

Not done, because each is a judgement call or a larger change:

1. **Rotate the ElevenLabs key** (see top) and consider scrubbing history with `git filter-repo`.
2. **Rate limiting** on `/api/auth/login` and `/api/auth/signup` — nothing currently slows down credential stuffing. `slowapi` is the easy option.
3. **Database migrations.** `create_all()` won't apply the new constraints (`user_id NOT NULL`, column lengths) to an existing database. Adopt Alembic before the next schema change.
4. **Token storage.** JWTs live in `localStorage`, which is readable by any script on the page. With XSS now closed the immediate risk is much lower, but httpOnly cookies + CSRF protection is the stronger design.
5. **Token revocation.** No logout-side invalidation; a stolen token is valid until it expires. Consider short-lived access tokens plus refresh tokens.
6. **Proctoring scores are proxies.** `eye_contact_score`, `confidence_score` and `communication_score` are derived from answer length and technical score — the live face/object telemetry is computed per frame but never persisted to the session. Either wire it in or relabel these in the UI, since the report presents them as measured.
7. **Frontend is 14 globally-scoped scripts** sharing one mutable `state` object. Works, but a build step and modules would make it far easier to reason about.
8. **No CI.** `tests_smoke.py` and `tests_frontend.js` are in the repo root — worth wiring into GitHub Actions.
9. **Accessibility** was not audited in depth; the dynamic chat region needs ARIA live-region attributes for screen readers.

---

## Verification

```bash
python3 tests_smoke.py     # 49 passed  (auth, IDOR, validation, config, regressions)
node tests_frontend.js     # 28 passed  (XSS payloads, escaping, state reset, error formatting)
```

The smoke test stubs the ML/LLM dependencies, so it runs without model weights or a Groq key.
