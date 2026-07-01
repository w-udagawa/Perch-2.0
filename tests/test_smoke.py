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
    from backend.model import WINDOW_SAMPLES, MockPerchModel, sigmoid

    model = MockPerchModel()
    logits = model.infer(np.ones(WINDOW_SAMPLES * 2, dtype=np.float32))
    assert logits.shape == (2, len(model.class_ids))
    probs = sigmoid(logits)  # logits are unbounded; probabilities are in [0, 1]
    assert probs.min() >= 0.0 and probs.max() <= 1.0


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
        dets = [d for w in data["windows"] for d in w["detections"]]
        assert len(dets) > 0
        assert all("logit" in d and "score" in d for d in dets)
        assert all(s["max_logit"] is not None for s in data["summary"])


def test_rejects_unsupported_extension(tmp_path):
    from backend.main import app

    bad = tmp_path / "x.txt"
    bad.write_bytes(b"not really audio")
    with TestClient(app) as client:
        resp = client.post("/api/predict", files={"file": ("x.txt", open(bad, "rb"), "text/plain")})
    assert resp.status_code == 400


def test_accepts_mp3(tmp_path):
    """MP3 is decodable via libsndfile's bundled MPEG component (no ffmpeg)."""
    from backend.main import app

    mp3 = tmp_path / "tone.mp3"
    t = np.linspace(0, 6.0, int(6.0 * 32000), endpoint=False)
    sig = 0.2 * np.sin(2 * np.pi * 2000 * t)
    try:
        sf.write(str(mp3), sig.astype(np.float32), 32000, format="MP3")
    except Exception:
        import pytest

        pytest.skip("libsndfile build cannot encode MP3")
    with TestClient(app) as client:
        with open(mp3, "rb") as fh:
            resp = client.post("/api/predict", files={"file": ("tone.mp3", fh, "audio/mpeg")})
    assert resp.status_code == 200, resp.text
    assert resp.json()["n_windows"] >= 1


def test_m4a_extension_allowed():
    """m4a is now an accepted upload type (decoded via the ffmpeg fallback)."""
    from backend.config import get_settings

    assert ".m4a" in get_settings().allowed_extensions


def test_accepts_m4a_if_ffmpeg(tmp_path):
    """m4a decodes end-to-end when an ffmpeg backend is available."""
    import subprocess

    import pytest

    from backend.audio import _ffmpeg_exe
    from backend.main import app

    exe = _ffmpeg_exe()
    if exe is None:
        pytest.skip("no ffmpeg backend available")

    wav = tmp_path / "tone.wav"
    m4a = tmp_path / "tone.m4a"
    t = np.linspace(0, 6.0, int(6.0 * 32000), endpoint=False)
    sf.write(str(wav), (0.2 * np.sin(2 * np.pi * 2000 * t)).astype(np.float32), 32000)
    try:
        subprocess.run([exe, "-y", "-v", "error", "-i", str(wav), str(m4a)], check=True)
    except Exception:
        pytest.skip("ffmpeg cannot encode m4a/AAC")

    with TestClient(app) as client:
        with open(m4a, "rb") as fh:
            resp = client.post("/api/predict", files={"file": ("tone.m4a", fh, "audio/mp4")})
    assert resp.status_code == 200, resp.text
    assert resp.json()["n_windows"] >= 1


def test_japanese_name_lookup():
    from backend.labels import japanese_name

    assert japanese_name("Zosterops japonicus") == "メジロ"
    assert japanese_name("Horornis diphone") == "ウグイス"
    assert japanese_name("Definitely notaspecies") is None


def test_service_fills_japanese_common_name(tmp_path):
    """A Japanese taxon's 和名 flows into the detection's common_name."""
    from backend.model import PerchBackend, frame_audio
    from backend.service import run_detection

    class _Stub(PerchBackend):
        backend = "stub"

        def __init__(self):
            super().__init__()
            self.class_ids = ["Zosterops japonicus"]

        def infer(self, waveform):
            frames = frame_audio(waveform)
            return np.full((frames.shape[0], 1), 8.0, dtype=np.float32)

    wav = tmp_path / "s.wav"
    sf.write(str(wav), np.zeros(32000 * 6, dtype=np.float32), 32000)
    result = run_detection(_Stub(), str(wav), top_k=1, threshold=0.0)
    names = {d["common_name"] for w in result["windows"] for d in w["detections"]}
    assert "メジロ" in names
