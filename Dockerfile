# syntax=docker/dockerfile:1
#
# InterviewAI production image.
#
# Two-stage: dependencies are built into a virtualenv in the builder, then only
# that venv and the application source are copied into the runtime image. This
# keeps build toolchains out of the shipped layer.
#
# Size notes, because this image is dominated by ML wheels:
#   * torch comes from PyTorch's CPU index. PyPI's default Linux wheel depends
#     on the NVIDIA CUDA runtime packages (~2 GB) that nothing here uses — YOLO
#     and faster-whisper both run on CPU. requirements.txt already carries the
#     --extra-index-url; the explicit --index-url below makes it non-negotiable.
#   * opencv-python-headless, not opencv-python: no GUI libraries, no libGL.
#   * The faster-whisper model is baked in at build time (see BAKE_WHISPER).

# ---------------------------------------------------------------------------
# Stage 1 — build dependencies
# ---------------------------------------------------------------------------
FROM python:3.11-slim AS builder

ENV PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1 \
    PYTHONDONTWRITEBYTECODE=1

# build-essential is needed by a few sdists; it stays in this stage only.
RUN apt-get update \
    && apt-get install -y --no-install-recommends build-essential \
    && rm -rf /var/lib/apt/lists/*

RUN python -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

COPY requirements.txt .

# torch first, pinned to the CPU index, so the resolver can never pull the CUDA
# build as a transitive dependency of ultralytics further down.
RUN pip install --upgrade pip \
    && pip install --index-url https://download.pytorch.org/whl/cpu "torch>=2.2.0" \
    && pip install -r requirements.txt \
    # ultralytics depends on opencv-python, so pip installs it *alongside*
    # opencv-python-headless. Both ship a `cv2` package, the non-headless one
    # wins at import, and it links against X11 (libxcb, libSM, libXext) that a
    # slim server image does not have — the container dies on `import cv2`.
    # Removing both and reinstalling only headless is the reliable fix; the
    # pin also keeps ultralytics from dragging in the untested OpenCV 5.x.
    && pip uninstall -y opencv-python opencv-python-headless \
    && pip install "opencv-python-headless>=4.9.0,<5.0"

# Pre-download the faster-whisper weights (~460 MB) into the image. Without
# this, the model is fetched on the first transcription — a multi-minute stall
# on a candidate's first spoken answer. Set --build-arg BAKE_WHISPER=0 to skip
# it and accept that cost (or mount a warm cache at runtime instead).
ARG BAKE_WHISPER=1
ENV HF_HOME=/opt/models
RUN if [ "$BAKE_WHISPER" = "1" ]; then \
        python -c "from faster_whisper import WhisperModel; WhisperModel('small', device='cpu', compute_type='int8')" ; \
    fi

# ---------------------------------------------------------------------------
# Stage 2 — runtime
# ---------------------------------------------------------------------------
FROM python:3.11-slim AS runtime

# libglib2.0-0 is the one shared library opencv-python-headless still links
# against. libgomp1 is OpenMP, used by torch and ctranslate2.
RUN apt-get update \
    && apt-get install -y --no-install-recommends libglib2.0-0 libgomp1 curl \
    && rm -rf /var/lib/apt/lists/*

COPY --from=builder /opt/venv /opt/venv
COPY --from=builder /opt/models /opt/models

ENV PATH="/opt/venv/bin:$PATH" \
    HF_HOME=/opt/models \
    PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    ENVIRONMENT=production

WORKDIR /app

# Run unprivileged. Nothing in the request path writes to disk — resumes are
# parsed in memory and never persisted — so the whole tree can stay read-only
# to the application user.
RUN useradd --create-home --uid 10001 appuser
COPY --chown=appuser:appuser . /app
RUN chown -R appuser:appuser /opt/models
USER appuser

EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=5s --start-period=90s --retries=3 \
    CMD curl -fsS http://127.0.0.1:8000/api/health || exit 1

# Single worker deliberately. Sessions and rate-limit counters live in Redis so
# multiple workers would be *correct*, but each one loads its own copy of torch
# and YOLO — multiplying memory for no throughput gain on CPU inference. Scale
# by running more containers, not more workers per container.
CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "1"]
