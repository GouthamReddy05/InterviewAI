# InterviewAI — Fix Report

Every issue documented in `interview-guide.html` was traced back to the code,
confirmed, and fixed. This report lists what was wrong, what changed, and how
each fix was verified.

**Verification:** 45 new tests pass (`python -m pytest`), the app imports and
serves (`/api/health`, signup, refresh, ownership 404, rate-limit 429 all
confirmed against a live `TestClient`), and every JS file passes `node --check`.

---

## Summary

| | Count |
|---|---|
| Issues fixed | 26 |
| Files modified | 17 |
| Files added | 5 |
| Files deleted | 2 |
| Lines of dead code removed | ~700 |
| Tests added (from zero) | 45 |

**Added:** `services/llm_json.py`, `core/rate_limit.py`, `tests/conftest.py`,
`tests/test_llm_json.py`, `tests/test_evaluation_parsing.py`,
`tests/test_state_machine.py`, `pytest.ini`
**Deleted:** `frontend/pages/login.js`, `frontend/pages/signup.js`

---

## 1. Security

### 1.1 Stored XSS through LLM output — **fixed**
`_questionInfo` interpolated `question.text` (the LLM-generated
`primary_question`) into `innerHTML` unescaped, and `_ragEvaluatorPanel` did the
same for `idealAnswer`, every entry of `conceptsMentioned` / `missingConcepts`,
and `feedback`. The escaping helpers existed in `utils.js` and were applied
everywhere else in the same file — these five sinks were simply missed.

Chained with the attacker-controlled resume text (§1.2) and the JWT in
`localStorage`, this was a path from a crafted resume to account takeover.

**Fixed** — `frontend/pages/interview.js`: `escapeHtml()` on all five sinks.

### 1.2 DOCX resumes were never parsed; client text fully attacker-controlled — **fixed**
`handleFileUpload` ran `pdf.js` on *every* file type. For a `.docx` it threw,
the catch wrote the placeholder `"Resume PDF: {filename}. Candidate: {name}."`,
that string was non-empty so it was sent as `resume_text`, and the server
preferred it — generating the entire interview from a filename while
`ml/extract_text.py`'s DOCX path (which walks tables, where resumes keep skills
and contact details) stayed unreachable.

**Fixed** — two layers:
- `frontend/pages/upload.js`: `pdf.js` runs only for `.pdf`; a failed parse now
  leaves the text **empty** rather than writing a placeholder, so the server
  falls back to its own extractor.
- `app.py`: client-supplied `resume_text` is accepted **only** when the file
  extension is `.pdf`.

### 1.3 No rate limiting anywhere — **fixed**
Nothing stood between a caller and unlimited login attempts, Whisper inference,
YOLO inference or ElevenLabs billing. ML endpoints required a token but had no
ceiling and no session binding.

**Fixed** — new `core/rate_limit.py`: fixed-window limiter, Redis-backed when
available (so limits hold across workers) with a process-local fallback.
Authenticated callers are keyed by user id so one account cannot spread its
quota across IPs; anonymous callers by IP.

| Endpoint | Limit |
|---|---|
| `/api/auth/login` | 10 / 5 min per IP |
| `/api/auth/signup` | 5 / hour per IP |
| `/api/upload-resume` | 6 / 5 min per user |
| `/api/session/{id}/answer` | 40 / min per user |
| `/api/analyze-frame`, `/detect-face`, `/detect-objects` | 40 / min per user |
| `/api/transcribe-audio` | 12 / min per user |
| `/api/generate-speech` | 20 / min per user |

Verified: an 8-request signup burst returns `429` after the 5th.

### 1.4 JWT expiry cliff mid-interview — **fixed**
`ACCESS_TOKEN_EXPIRE_MINUTES` was 60, inside the plausible length of a
12-question interview with up to three follow-ups each. At minute 61 the next
submission 401'd, `handleUnauthorized` called `logoutUser` → `resetState()`, and
the session id was destroyed — stranding a session that was still alive in Redis
for another five hours with no reconnect path.

**Fixed**:
- `core/settings.py`: default raised to 480 minutes, past the 6-hour session TTL.
- `api/auth_routes.py`: new `POST /api/auth/refresh`.
- `frontend/js/api-service.js`: `tokenSecondsRemaining()` /
  `refreshIfExpiringSoon()`; `frontend/pages/interview.js` renews every 5 minutes
  while the interview is active and clears the timer on `endInterview`.

---

## 2. Trust boundary and scoring

### 2.1 The browser computed the final score and the server stored it — **fixed**
`/comprehensive-report` wrote the backend's score to `interviews.score`, then
`results.js` immediately called `/end` with its **own** weighted formula over
browser-tracked metrics minus browser-counted integrity penalties, overwriting
it. The `float, ge=0, le=100` validator checked the shape of a value that should
never have crossed the trust boundary — anyone could POST a 100.

**Fixed**:
- `app.py`: `/api/session/{id}/end` takes **no** request body. It recomputes the
  score server-side via `calculate_interview_score` and stores that.
  `EndSessionRequest` deleted.
- `frontend/js/api-service.js`: `endSession(sessionId)` — the score parameter is
  gone.
- `frontend/pages/results.js`: every ring, bar and tile now renders
  `reportData.metrics` from the server. The client formula and its penalty block
  are deleted. Previously the report was fetched and only `improvement_plan` was
  read out of it.

### 2.2 Proctoring was a nudge, not evidence — **fixed**
`/api/analyze-frame` was stateless: it returned a verdict and wrote nothing. All
proctoring lived in `state.cheatingStats` in the browser and was never sent
anywhere, so there was no data from which to compute a real integrity score.

**Fixed**:
- `app.py`: `/api/analyze-frame` accepts an optional `session_id`, enforces the
  same ownership rule as every other session route, and records its own verdict.
- `core/redis_session_store.py`: `increment_proctoring()` / `get_proctoring()`
  using `HINCRBY` on a **separate** key. Deliberately not folded into the session
  blob — frames arrive every 3 seconds while an answer submission is doing a
  read-modify-write of the whole session, so that would make every frame a chance
  to clobber an answer.
- `frontend/js/api-service.js` + `interview.js`: frames are sent with the session id.

### 2.3 Fabricated "measured" metrics — **fixed**
`eye_contact = avg_technical * 0.90`, `resume_align = × 0.93`,
`problem_solving = × 0.90` — pure rescalings of one number, clamped to [40, 95]
so they always looked plausible. The code's own comment admitted eye contact was
a proxy. A number that looks measured and isn't is worse than an empty state,
because the candidate acts on it.

**Fixed** — `services/question_generator.py`:
- `eye_contact_score` is computed from real frame counts
  `(frames - looking_away - no_face) / frames`, and is `None` when no frames were
  analysed. `results.js` omits the bar entirely in that case and says so.
- `integrity_penalty` is computed server-side from server-observed frames:
  −15 phone, −10 extra person, −5 for sustained look-away (>20% of frames — a
  pattern, not one blip).
- Response now carries `proctoring`, `eye_contact_measured`, `integrity_penalty`
  and `score_basis`.

### 2.4 Parse failures silently inflated the score — **fixed**
On any evaluation failure the candidate silently got `rating=GOOD, score=8.0`,
indistinguishable from a real evaluation downstream. 8.0 is above the scale's
midpoint, so a run of failures inflated the final number.

**Fixed**:
- `models/schemas.py`: `AnswerEvaluation.unscored: bool`.
- The fallback still rates "good" — that choice was correct, since "fair" would
  escalate an LLM hiccup into three more probes — but is now tagged.
- `calculate_interview_score` excludes unscored evaluations and reports
  `unscored_evaluations`; `results.js` surfaces the count to the candidate.
- `/api/health` exposes a cumulative `evaluation_parse_failures` counter. It was
  previously one `logger.warning` with no metric — invisible from outside.

### 2.5 The overall was a mean over a varying number of terms — **fixed**
Once eye contact could legitimately be absent, the overall became an average of
four components for a camera-off session and five for a camera-on one. Those sit
on subtly different scales and nothing said so, making two candidates
incomparable.

**Fixed** — `services/question_generator.py`: the overall is now an explicit
**weighted percentage** via `SCORE_WEIGHTS` and `_overall_percentage()`.

| Component | Weight (all five) | Weight (no camera) |
|---|---|---|
| `technical_score` | 0.35 | 0.412 |
| `communication_score` | 0.20 | 0.235 |
| `confidence_score` | 0.15 | 0.176 |
| `resume_alignment_score` | 0.15 | 0.176 |
| `eye_contact_score` | 0.15 | — |

An unmeasurable component has its weight redistributed across the rest **in
proportion**, so the weights always re-sum to 1.0 and the result is always
"percent of the criteria that were actually assessed". `problem_solving_score`
is deliberately excluded — it is a pure rescaling of the technical score, so
including it would count the same signal twice.

The response carries a `score_basis` object (`components`, `weights`,
`eye_contact_included`) so a missing component is visible rather than silently
absorbed, and `results.js` renders the figure as a percentage and names the
basis under the grade.

Verified by five new tests, including
`test_a_perfect_candidate_scores_100_with_or_without_a_camera` — under the old
mean that property held by accident; under a weighted sum it only holds if the
weights renormalise.
### 2.6 Proctoring could be defeated by silence — **fixed**
Moving the scoring policy server-side (§2.1) stopped a client dictating its own
grade, but a client could still simply **stop uploading frames**. That dodged
the integrity penalty *and* dropped `eye_contact_score` out of the weighted
percentage, handing its 0.15 weight back to the remaining components — so going
dark was strictly *profitable*. Selective uploading was worse: thirty flawless
frames out of two hundred read as a perfect session.

**Fixed** — `services/question_generator.py`, `_expected_frames()` and
`_coverage_penalty()`:

- **Ground truth the client cannot touch.** `CandidateAnswer.timestamp` is set
  by `default_factory` when the answer is received and is never read from the
  request body, so the span between first and last answer is an unforgeable
  duration. Frames arrive every 3 s, so `expected = span / 3` and
  `coverage = received / expected`. The window deliberately excludes time before
  the first answer and after the last, which under-counts — biasing towards
  *not* accusing.
- **Three distinct cases**, and keeping them distinct is the design:

| Case | Eye contact | Penalty |
|---|---|---|
| Zero frames (no webcam / denied) | dropped, weight redistributed | **none** — legitimate, nothing claimed |
| Coverage ≥ 50% | scored over frames received | none |
| Frames then silence | scored over frames **expected** | graduated, ≤ 10 pts |

The third row is the fix. An earlier attempt suppressed eye contact when
coverage was bad — treating it as unmeasured, which sounds principled but left
evasion ahead by 4–6 points, because suppressing the component *is* the reward.
Scoring the unaccounted-for time against the candidate inverts it:

```
caught looking away 80%    67.3%
caught with a phone        69.3%
went dark instead          62.8%   <- now the worst outcome
```

Threshold and cap are set low on purpose: background-tab throttling can halve
the frame rate legitimately, and a false accusation costs more than a missed
one. A 60%-coverage session is not penalised at all.

Verified by 9 new tests, including `test_going_dark_never_beats_being_caught`,
which pins the inequality the whole mechanism exists to create, and
`test_no_camera_at_all_is_never_penalised`.

### 2.7 Server-side MediaPipe removed; attention re-sourced from the browser — **changed**
Not a defect fix — a design correction following from §2.6. The server ran its
own MediaPipe FaceMesh purely so the gaze number would be server-attested. But
the browser already runs FaceMesh on every frame and derives gaze from **iris
position between the eye corners**, while the server approximated it from
**nose position within the face bounding box** on one 320×240 frame every three
seconds. The server was running a second, worse implementation, and nothing in
this product acts on that number adversarially.

**Changed** — the split is now measurement vs. verification:

| Source | Provides | Role |
|---|---|---|
| Browser MediaPipe | gaze, face presence, look-away duration | **feedback** — shown, never scored |
| Server YOLO | phone in frame, extra person | **evidence** — the only integrity penalty |

- Removed: `get_face_mesh`, `_face_mesh_lock`, `_analyse_face`, `_looking_away`,
  `/api/detect-face` (which had no caller), and the `mediapipe` dependency
  (121 MB). Verified the app imports with `mediapipe` blocked at the import hook.
- Added: `POST /api/session/{id}/attention` and `RedisSessionStore.set_proctoring()`.
  Totals are cumulative, so they are written with `HSET` rather than `HINCRBY` —
  a resend settles on the same value instead of inflating it.
- `eye_contact_score` is gone from `SCORE_WEIGHTS`; its 0.15 redistributes
  across the four remaining components, which `_overall_percentage()` already
  handled. `_integrity_penalty` no longer reads any browser-sourced field.
- The coverage/anti-evasion machinery from §2.6 was **deleted**. It existed to
  stop someone faking an attentiveness measurement; once attention is
  self-reported by design there is nothing to protect.

The trap avoided: leaving `eye_contact_score` in place with its inputs gone
would have made it compute to exactly **100% forever** — the fabricated-metric
bug of §2.3 reintroduced through the back door. Removing the component was
mandatory, not cosmetic.

The report labels the figure *"Attention (self-measured) … does not affect your
score"*, which is what it always was — §2.3's real finding was not that the
browser measured it, but that it was presented as verified.

---

## 3. Data correctness

### 3.1 Report duplicated every question — **fixed**
`get_interview_report` iterated `session.answers`, which contains an entry for
every answer *including follow-up answers*, all carrying the primary question's
`question_id`. One question with three follow-ups emitted four identical
`qa_pairs`, each repeating the full follow-up list. `CandidateAnswer.is_followup`
was written correctly at submit time and never read.

**Fixed** — filter on `is_followup`; the thread nests underneath, with the
primary turn's own evaluation on the pair. Pinned by
`test_report_emits_one_row_per_primary_question`.

### 3.2 Stored follow-ups paired the wrong question with the answer — **fixed**
In the probing branch the record was built as
`question=follow_up_q` (the *next* question) with `candidate_answer=answer` and
`evaluation=evaluation` (the *previous* turn's). Every record but the last in
each thread was mispaired — data wrong at rest, which reads as data rather than
as a bug.

**Fixed** — one record per submitted answer in both branches, `question` always
meaning "the question this answer answers", `depth` always the depth the answer
was given at, and a new `next_question` field holding what was asked afterwards
so the two can never be confused. Pinned by
`test_stored_question_always_matches_its_answer`.

### 3.3 Answers lost when the second LLM call failed — **fixed**
`generate_followup` raising unwound the whole request. `_save_session` was the
last line, so nothing was persisted and the route returned 502 — the candidate
had to retype an answer that had already been evaluated.

**Fixed** — the failure is caught and falls back to
`current_question.follow_up_question`, the seed the generation prompt already
produced for every question and which was sitting unused. The turn is never
lost. Pinned by `test_follow_up_failure_falls_back_to_the_seed_question`.

### 3.4 Concurrent submissions silently lost an answer — **fixed**
Every mutation was a read-modify-write of the whole session with no lock and no
compare-and-set. Two concurrent submits (double-Enter, double-click — there was
no in-flight guard) both read the same state and the second `SET` won, losing an
answer, its evaluation and its follow-up.

**Fixed** — idempotency rather than locking, because a lock would have to be held
across two sequential LLM calls and would have a TTL that could expire mid-call:
- `InterviewSession.turn` monotonic counter; `AnswerSubmissionRequest.turn`
  echoed back by the client; a stale turn raises `StaleTurnError` → **409**,
  before either LLM call.
- `frontend/pages/interview.js`: `state.submitInFlight` guard plus
  `setComposerEnabled()` disabling the input and send button during submission;
  a 409 is treated as a duplicate and dropped silently.

### 3.5 Report unreachable after the 6-hour Redis TTL — **fixed**
Every report endpoint gated on the *live* session. `report_data` in Postgres held
a complete report and was read by nothing — a durable copy that was unreachable.
Worse, every refresh inside the TTL paid for a fresh improvement-plan LLM call.

**Fixed** — `/comprehensive-report` returns the stored `report_data` when one
exists, and only recomputes when it does not. Fixes the TTL cliff and the
repeated billing with the same change.

---

## 4. Failure handling and reliability

### 4.1 Redis silently degraded to a per-process dict in production — **fixed**
An unreachable Redis logged a warning and fell back to a process-local dict. With
`--workers 4` each worker got its own, so a candidate's answer landed on a worker
that had never seen their session: "Interview session has expired" mid-interview,
at random. The docstring said "single-worker development only", but a docstring
is not an enforcement mechanism — and `core/settings.py` already had the
fail-fast pattern for the JWT secret.

**Fixed** — `RedisUnavailableError` raised at construction when
`ENVIRONMENT=production`. The dev fallback is unchanged, so the repo still runs
with no Redis installed.

### 4.2 LLM timeout and retry constants were dead — **fixed**
`LLM_MAX_RETRIES = 3` and `LLM_TIMEOUT_SECONDS = 60` sat in `core/config.py` and
nothing imported them. `ChatGroq` was built without either, so an unbounded call
inside a threadpool worker could pin a request thread until the upstream gave up.

**Fixed** — both wired into the `ChatGroq` constructor.

### 4.3 Fragile JSON extraction, duplicated three times — **fixed**
The same fence-strip + first-`{`-to-last-`}` slice appeared in
`generate_questions`, `evaluate_answer` and `generate_improvement_plan`. The
slice produces invalid JSON the moment the model emits two objects or appends a
trailing note containing a brace.

**Fixed** — new `services/llm_json.py` using `json.JSONDecoder().raw_decode()`,
which parses the first complete object and reports where it stopped. All three
call sites use it; ~40 lines of duplicated string surgery deleted. Ten tests
cover fences, preambles, trailing prose, two objects, truncation and empty input.

### 4.4 Silent placeholder substitution in prompts — **fixed**
`_fill_prompt` did a blind `.replace` with no error when a key was missing, so a
typo shipped a literal `{resume_text}` to the model undetected.

**Fixed** — leftover placeholders are detected and logged at ERROR. (`str.format`
still cannot be used: the templates embed the JSON schema the model must emit.)

### 4.5 Whisper unconditionally clobbered the live transcript — **fixed**
`input.value = state.transcript` with no comparison, so a worse Whisper pass
destroyed what Web Speech had produced. The confidence value was in the response
and ignored.

**Fixed** — the overwrite is gated on `confidence >= 0.6`, or on there being no
live text to lose.

---

## 5. Computer vision

### 5.1 Shared FaceMesh carried tracking state across candidates — **fixed**
The single shared instance used `static_image_mode=False`, telling MediaPipe to
treat inputs as one continuous video — while being fed interleaved frames from
different candidates on different webcams. The lock made that deterministic; it
did not make it correct.

**Fixed** — `static_image_mode=True`. Frames arrive every 3 seconds, so there was
no tracking continuity to lose.

### 5.2 Proctoring warnings were mostly noise — **fixed**
`_SUSPICIOUS_CLASSES` included `bottle`, `cup`, `wine glass`, `laptop`, `book`,
`remote` and `keyboard`. Every match raised "Suspicious object detected: BOTTLE"
in the candidate's face while setting no cheating flag — and the UI gave no way
to tell a real signal from noise.

**Fixed** — cut to `cell phone`. Phone and extra-person are the two signals with
a real interpretation.

### 5.3 The first candidate paid the model load — **fixed**
Nothing warmed the lazy loaders, so the first frame ate the YOLO weights read and
the MediaPipe graph construction on the request thread while the frontend's
3-second timer kept firing.

**Fixed** — a background startup hook touches both loaders. The functions stay
lazy (which is what keeps `app.py` importable in a test without torch); the hook
is what is eager. `SKIP_MODEL_WARMUP=1` disables it for tests.

---

## 6. Interview flow

### 6.1 The difficulty picker did nothing — **fixed**
Warm-up / Balanced / Stretch set `state.difficulty`, which was rendered back on
screen and never sent anywhere. It *couldn't* be: the picker was step 3 and the
questions were generated at step 2. Its only reader was dead code.

**Fixed** — the cheap-and-correct option: the picker now runs **before**
generation.
- `frontend/js/router.js`: steps 2 and 3 swapped (setup, then analysis).
- `upload.js` "Continue" → setup; `setup.js` "Start interview" →
  `beginSession()` → analysis, which uploads with `difficulty`.
- `app.py` accepts `difficulty`; `InterviewSession.difficulty` stores it.
- `services/prompts.py`: new `DIFFICULTY_DIRECTIVES` and a `STEP 2b` block that
  applies the choice as an adjustment to the band ceiling — never overriding the
  resume-derived band by more than one step, so a fresher still can't be handed
  expert questions.

### 6.2 The worst answers got the longest interrogation — **fixed**
Only "excellent" or the depth cap could stop a follow-up thread. A candidate who
plainly did not know a topic got three consecutive probes on it. The prompt asked
the model to compensate, but that is a soft instruction, not a guarantee.

**Fixed** — `InterviewSession.consecutive_poor`; two consecutive "poor" ratings
end the thread alongside "excellent", so the loop terminates on certainty in
either direction. Reset on any better answer and on question change.

### 6.3 Three Redis GETs per answer — **fixed**
The route re-read the whole session purely to check whether `status` had flipped
to "completed", when `submit_answer` already had the object in hand.

**Fixed** — `submit_answer` returns `interview_complete`; the third GET is gone.

---

## 7. Dead code and stale configuration

| Removed | Was |
|---|---|
| `frontend/js/data.js` — 559 → 26 lines | `QUESTION_BANK`, `FOLLOWUP_BANK`, `generateQuestions()` — the pre-LLM static bank, shipped to every visitor on every page load. Only `JOB_ROLES` and `FILLER_WORDS` were ever read. |
| `evaluateAnswerAgainstIdeal()` | The keyword-overlap scorer the concept lists fed. Uncalled. |
| `frontend/pages/login.js`, `signup.js` | Full auth pages at steps 6/7, reachable only from each other — the landing page uses an inline modal. Deleted, script tags removed from `index.html`, router cases dropped. |
| `OPENAI_API_KEY`, `OPENAI_MODEL`, `OPENAI_TEMPERATURE` | Defined, never read. This app only ever used `langchain-groq`. |
| `QUESTIONS_PER_SKILL` + 3 siblings | From the deleted static bank. |
| `MAX_SESSION_DURATION_HOURS` | Superseded by the Redis TTL. |
| `UPLOAD_FOLDER` + its `mkdir` at boot | Resumes are parsed in memory and discarded (a privacy win), so the directory was created and never written to. |
| Two premature `</div>` tags | `_warningsPanel` and `_agentStatusPanel` closed their card immediately after the title, so the list rendered *outside* the card. |

---

## 8. Testing — from zero

There was no `tests/`, no pytest config, no CI. `package.json` listed `jsdom`
with nothing using it; `AUDIT.md` referenced two test files not in the tree.

**Added** — 45 tests across three files, targeting exactly the two things worth
testing:

- **`tests/test_state_machine.py` (27)** — branching (first answer always probes;
  excellent closes; depth cap; two-poor exit; counter reset; completion), record
  integrity (question matches answer, one record per answer, correct depth, one
  report row per question, history wiped between questions), failure handling
  (seed fallback, unscored exclusion, unmeasured eye contact, server-computed
  penalty), idempotency (turn increments, replay rejected, legacy path).
- **`tests/test_evaluation_parsing.py` (8)** — 0–100 rescale, clamping, unknown
  rating, non-numeric score, fenced+preamble, unparseable → `unscored`,
  transport error → `unscored`.
- **`tests/test_llm_json.py` (10)** — the parser's full failure surface.

Every seam these use already existed — the LLM behind `self.generator`, the store
behind `RedisSessionStore`, the CV models behind lazy loaders. Nothing had been
pushed through them.

---

## Files changed

**Backend** — `app.py`, `api/auth_routes.py`, `core/config.py`,
`core/redis_session_store.py`, `core/settings.py`, `models/schemas.py`,
`services/prompts.py`, `services/question_generator.py`
**Backend (new)** — `core/rate_limit.py`, `services/llm_json.py`
**Frontend** — `frontend/index.html`, `frontend/js/api-service.js`,
`frontend/js/data.js`, `frontend/js/router.js`, `frontend/js/state.js`,
`frontend/pages/analysis.js`, `frontend/pages/interview.js`,
`frontend/pages/results.js`, `frontend/pages/setup.js`,
`frontend/pages/upload.js`
**Frontend (deleted)** — `frontend/pages/login.js`, `frontend/pages/signup.js`
**Tests (new)** — `pytest.ini`, `tests/conftest.py`, `tests/test_llm_json.py`,
`tests/test_evaluation_parsing.py`, `tests/test_state_machine.py`

---

## Known remaining limitations

Stated honestly, because an interviewer will ask.

1. **Prompt injection is still possible.** Resume text goes verbatim into the
   generation prompt. The output is normalised field-by-field and now escaped on
   render, so injection cannot produce an invalid category, an out-of-range score
   or executing markup — but it can still steer question content.
2. **Still one process.** Groq calls, YOLO, Whisper and HTTP share it. That is the
   right size for what this is; the failures it had were correctness and trust
   failures, not capacity ones.
3. **Overall percentage weights are a judgement, not a calibration.** They are
   defensible (technical dominant, soft metrics secondary) but they were chosen,
   not derived from outcome data. Two of the weighted components — communication
   and confidence — are also partly derived from the technical score, so the
   0.35 weight understates how much technical performance actually drives the
   result. Worth stating plainly rather than presenting the number as more
   principled than it is.
4. **Stale docs.** `README.md` still lists OpenAI/Gemini, `INTEGRATION_GUIDE.md`
   documents a pre-refactor flat layout, `architecture.md` describes "4 questions
   per skill". Out of scope for a code fix pass, but they should be rewritten.
5. **`ml/` prototype scripts remain** (`face_detection.py`, `object_detection.py`,
   `tts.py`, `realtimetrans.py`). Kept deliberately: running them against a live
   webcam is faster than instrumenting the API when a bounding box looks wrong.
