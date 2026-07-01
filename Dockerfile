# Perch 2.0 Wildlife Audio Detector — production image (real model by default).
#
# One image runs both backends:
#   * default            → real Perch 2.0 (perch_v2_cpu), weights fetched from
#                           Kaggle on first start into $KAGGLEHUB_CACHE.
#   * PERCH_MOCK=1        → weight-free mock backend (no download, tiny RAM).
#
# Works on Hugging Face Spaces (Docker SDK), Cloud Run, Fly.io, Render, Railway,
# or any container host. The server honours $PORT (defaults to 7860 for HF).
FROM python:3.11-slim

# libgomp1: OpenMP runtime TensorFlow/numpy link against at import time.
# NOTE: we deliberately do NOT apt-install libsndfile — the `soundfile` wheel
# bundles its own libsndfile with the MPEG component, which is what gives us
# native MP3 decoding. A distro libsndfile could shadow it and drop MP3 support.
RUN apt-get update \
 && apt-get install -y --no-install-recommends libgomp1 \
 && rm -rf /var/lib/apt/lists/*

# Non-root user. UID 1000 is what Hugging Face Spaces expects.
RUN useradd -m -u 1000 app

ENV PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    # CPU model variant (perch_v2 is the GPU build); overridable at runtime.
    PERCH_MODEL_NAME=perch_v2_cpu \
    # Kaggle weights cache — must be writable by the app user and is the path to
    # mount a volume on for persistence across restarts.
    KAGGLEHUB_CACHE=/home/app/.cache/kagglehub \
    HF_HOME=/home/app/.cache/huggingface \
    PORT=7860

WORKDIR /app

# Dependencies first for better layer caching. Real model = base + model extras.
COPY requirements.txt requirements-model.txt ./
RUN pip install --no-cache-dir -r requirements.txt -r requirements-model.txt

# Application code.
COPY backend/ backend/
COPY frontend/ frontend/
COPY scripts/ scripts/

RUN mkdir -p /home/app/.cache && chown -R app:app /home/app /app
USER app

# Optionally bake the ~388 MB weights into the image at build time (fast, offline
# cold starts — recommended for scale-to-zero platforms like Cloud Run):
#     docker build --build-arg BAKE_MODEL=true -t perch .
# Requires Kaggle egress during the build. Default off so a build never depends
# on the network; without baking, weights download on first server start.
ARG BAKE_MODEL=false
RUN if [ "$BAKE_MODEL" = "true" ]; then python scripts/download_model.py "$PERCH_MODEL_NAME"; fi

EXPOSE 7860

# First boot downloads weights + initialises TensorFlow, so allow a long grace.
HEALTHCHECK --interval=30s --timeout=10s --start-period=600s --retries=3 \
  CMD python -c "import os,urllib.request; urllib.request.urlopen('http://127.0.0.1:'+os.environ.get('PORT','7860')+'/api/health').read()" || exit 1

# Shell form so ${PORT} is expanded at runtime (Cloud Run/Render inject their own).
CMD uvicorn backend.main:app --host 0.0.0.0 --port ${PORT:-7860}
