"""FastAPI app: upload audio, run Perch 2.0 detection, serve the frontend.

The model is loaded once at startup and reused for every request. Run with:

    uvicorn backend.main:app --reload            # real model (needs Kaggle)
    PERCH_MOCK=1 uvicorn backend.main:app        # weight-free mock backend
"""

from __future__ import annotations

import logging
import os
import tempfile
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, File, HTTPException, Query, UploadFile
from fastapi.staticfiles import StaticFiles

from . import schemas, service
from .audio import AudioDecodeError
from .config import get_settings
from .model import load_model

logger = logging.getLogger("perch")
logging.basicConfig(level=logging.INFO)

FRONTEND_DIR = Path(__file__).resolve().parent.parent / "frontend"

# Populated at startup by the lifespan handler.
_state: dict = {}


@asynccontextmanager
async def lifespan(app: FastAPI):
    settings = get_settings()
    logger.info("Loading Perch model (mock=%s, name=%s)…", settings.mock, settings.model_name)
    model = load_model(settings)
    _state["model"] = model
    _state["settings"] = settings
    logger.info("Model ready: backend=%s, %d classes", model.backend, len(model.class_ids))
    yield
    _state.clear()


app = FastAPI(
    title="Perch 2.0 Wildlife Audio Detector",
    version="0.1.0",
    lifespan=lifespan,
)


@app.get("/api/health", response_model=schemas.HealthResponse)
def health() -> schemas.HealthResponse:
    model = _state.get("model")
    settings = _state.get("settings")
    if model is None or settings is None:
        raise HTTPException(status_code=503, detail="model not loaded")
    return schemas.HealthResponse(
        status="ok",
        backend=model.backend,
        model_name="mock" if settings.mock else settings.model_name,
        n_classes=len(model.class_ids),
        window_seconds=model.window_seconds,
        sample_rate=model.sample_rate,
    )


@app.post("/api/predict", response_model=schemas.PredictResponse)
async def predict(
    file: UploadFile = File(...),
    top_k: int | None = Query(default=None, ge=1, le=20),
    threshold: float | None = Query(default=None, ge=0.0, le=1.0),
) -> dict:
    model = _state.get("model")
    settings = _state.get("settings")
    if model is None or settings is None:
        raise HTTPException(status_code=503, detail="model not loaded")

    ext = os.path.splitext(file.filename or "")[1].lower()
    if ext not in settings.allowed_extensions:
        allowed = ", ".join(settings.allowed_extensions)
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type '{ext}'. Allowed: {allowed}. "
            "(M4A/AAC are not supported — libsndfile cannot decode them.)",
        )

    data = await file.read()
    max_bytes = settings.max_upload_mb * 1024 * 1024
    if len(data) > max_bytes:
        raise HTTPException(status_code=413, detail=f"File too large (> {settings.max_upload_mb} MB).")
    if not data:
        raise HTTPException(status_code=400, detail="Empty file.")

    tmp = tempfile.NamedTemporaryFile(suffix=ext, delete=False)
    try:
        tmp.write(data)
        tmp.flush()
        tmp.close()
        result = service.run_detection(
            model,
            tmp.name,
            top_k=top_k or settings.top_k,
            threshold=settings.threshold if threshold is None else threshold,
        )
    except AudioDecodeError as exc:
        raise HTTPException(status_code=400, detail=f"Could not decode audio: {exc}")
    finally:
        try:
            os.unlink(tmp.name)
        except OSError:
            pass

    return result


# Serve the static frontend at the root. Mounted last so /api/* routes win.
if FRONTEND_DIR.is_dir():
    app.mount("/", StaticFiles(directory=str(FRONTEND_DIR), html=True), name="frontend")
