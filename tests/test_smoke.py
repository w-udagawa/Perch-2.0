"""Offline smoke tests — run entirely in mock mode (no model download needed).

    PERCH_MOCK=1 pytest        # (the test sets it automatically)
"""

import os

os.environ.setdefault("PERCH_MOCK", "1")

import numpy as np
import soundfile as sf
from fastapi.testclient import TestClient


def _make_wav(path, seconds=12.0, sr=22050):
    """Write a short tone+noise WAV so windows have non-zero energy."""
    t = np.linspace(0, seconds, int(seconds * sr), endpoint=False)
    sig = 0.2 * np.sin(2 * np.pi * 2000 * t) + 0.1 * np.sin(2 * np.pi * 3500 * t)
    sig += 0.02 * np.random.RandomState(0).randn(len(t))
    sf.write(path, sig.astype(np.float32), sr)


def test_frame_audio_pads_last_window():
    from backend.model import WINDOW_SAMPLES, frame_audio

    frames = frame_audio(np.zeros(WINDOW_SAMPLES * 2 + 10, dtype=np.float32))
    assert frames.shape == (3, WINDOW_SAMPLES)


def test_mock_infer_shape_and_range():
    from backend.model import WINDOW_SAMPLES, MockPerchModel

    model = MockPerchModel()
    scores = model.infer(np.ones(WINDOW_SAMPLES * 2, dtype=np.float32))
    assert scores.shape == (2, len(model.class_ids))
    assert scores.min() >= 0.0 and scores.max() <= 1.0


def test_silence_yields_no_detections():
    from backend.model import WINDOW_SAMPLES, MockPerchModel
    from backend.service import run_detection
    import tempfile

    model = MockPerchModel()
    with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as f:
        sf.write(f.name, np.zeros(32000 * 6, dtype=np.float32), 32000)
        result = run_detection(model, f.name, top_k=5, threshold=0.1)
    os.unlink(f.name)
    assert result["summary"] == []


def test_scientific_name_formatting():
    from backend.labels import scientific_name

    assert scientific_name("turdus_migratorius") == "Turdus migratorius"


def test_predict_endpoint(tmp_path):
    from backend.main import app

    wav = tmp_path / "test.wav"
    _make_wav(str(wav))
    with TestClient(app) as client:
        health = client.get("/api/health").json()
        assert health["backend"] == "mock"
        assert health["n_classes"] > 0

        with open(wav, "rb") as fh:
            resp = client.post("/api/predict", files={"file": ("test.wav", fh, "audio/wav")})
        assert resp.status_code == 200, resp.text
        data = resp.json()
        assert data["n_windows"] >= 2
        assert data["duration_sec"] > 10
        assert len(data["windows"]) == data["n_windows"]
        # tone has energy, so we expect at least one detection somewhere
        assert sum(len(w["detections"]) for w in data["windows"]) > 0


def test_rejects_unsupported_extension(tmp_path):
    from backend.main import app

    mp3 = tmp_path / "x.mp3"
    mp3.write_bytes(b"not really audio")
    with TestClient(app) as client:
        resp = client.post("/api/predict", files={"file": ("x.mp3", open(mp3, "rb"), "audio/mpeg")})
    assert resp.status_code == 400
