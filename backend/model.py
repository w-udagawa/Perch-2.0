"""Perch 2.0 model wrappers and inference.

Two interchangeable backends implement the same tiny interface
(``sample_rate``, ``window_seconds``, ``window_samples``, ``class_ids`` and
``infer(waveform) -> scores[n_windows, n_classes]``):

* :class:`MockPerchModel` — a deterministic stand-in that needs no weights.
  Enabled with ``PERCH_MOCK=1``. Lets the full pipeline (upload → decode →
  window → score → API → UI) be exercised anywhere, including environments
  where the Kaggle model download is blocked.
* :class:`HopliteModel` — the real Perch 2.0, loaded through ``perch-hoplite``.
  Downloads the weights from Kaggle on first use (network access required).

Perch 2.0 consumes 5-second windows of 32 kHz mono audio and emits, per window,
a vector of per-class scores over ~14.8k taxa. The wrapper turns the raw model
logits into [0, 1] probabilities with a sigmoid (the classifier is multi-label:
several species can be present in the same window).
"""

from __future__ import annotations

import math
import threading

import numpy as np

# Perch 2.0 input specification (fixed by the model).
SAMPLE_RATE = 32_000
WINDOW_SECONDS = 5.0
WINDOW_SAMPLES = int(SAMPLE_RATE * WINDOW_SECONDS)  # 160_000

# Logit-head names we recognise as the species classifier, in priority order.
# The real key is derived from a bundled CSV filename and is read at runtime;
# these are only a fast path before falling back to "the head with most classes".
_LABEL_KEY_PREFERENCES = ("label", "labels")


def frame_audio(waveform: np.ndarray, window_samples: int = WINDOW_SAMPLES) -> np.ndarray:
    """Split a 1-D waveform into non-overlapping windows, zero-padding the last.

    Mirrors how Perch frames audio internally (window == hop == 5 s), so window
    ``i`` always covers ``[i * 5s, (i + 1) * 5s)``.
    """
    waveform = np.asarray(waveform, dtype=np.float32).reshape(-1)
    n = waveform.shape[0]
    if n == 0:
        return np.zeros((0, window_samples), dtype=np.float32)
    n_windows = max(1, math.ceil(n / window_samples))
    pad = n_windows * window_samples - n
    if pad:
        waveform = np.concatenate([waveform, np.zeros(pad, dtype=np.float32)])
    return waveform.reshape(n_windows, window_samples)


def _sigmoid(x: np.ndarray) -> np.ndarray:
    return 1.0 / (1.0 + np.exp(-x))


class MockPerchModel:
    """Deterministic, weight-free stand-in for Perch 2.0.

    Produces reproducible, energy-modulated scores over a small catalogue of
    common backyard species so the end-to-end app can be demonstrated without
    downloading the real model. NOT a real classifier — labels are illustrative.
    """

    backend = "mock"
    sample_rate = SAMPLE_RATE
    window_seconds = WINDOW_SECONDS
    window_samples = WINDOW_SAMPLES

    def __init__(self) -> None:
        catalog = [
            ("turdus_migratorius", "American Robin"),
            ("cardinalis_cardinalis", "Northern Cardinal"),
            ("cyanocitta_cristata", "Blue Jay"),
            ("zenaida_macroura", "Mourning Dove"),
            ("poecile_atricapillus", "Black-capped Chickadee"),
            ("spinus_tristis", "American Goldfinch"),
            ("corvus_brachyrhynchos", "American Crow"),
            ("melospiza_melodia", "Song Sparrow"),
            ("haemorhous_mexicanus", "House Finch"),
            ("sciurus_carolinensis", "Eastern Gray Squirrel"),
        ]
        self.class_ids = [code for code, _ in catalog]
        self.common_names = {code: name for code, name in catalog}

    def infer(self, waveform: np.ndarray) -> np.ndarray:
        frames = frame_audio(waveform, self.window_samples)
        n_windows = frames.shape[0]
        n_classes = len(self.class_ids)
        scores = np.zeros((n_windows, n_classes), dtype=np.float32)
        for w in range(n_windows):
            rms = float(np.sqrt(np.mean(frames[w] ** 2)) + 1e-8)
            energy = min(1.0, rms * 8.0)  # silence -> ~0, so nothing is detected
            for c in range(n_classes):
                phase = math.sin((w + 1) * (c + 1) * 1.7) * 0.5 + 0.5
                score = energy * phase
                if (w + c) % n_classes < 2:  # make 1-2 species stand out per window
                    score = min(1.0, score + 0.4 * energy)
                scores[w, c] = score
        return scores


class HopliteModel:
    """Wraps a loaded perch-hoplite model and exposes the common interface."""

    backend = "perch-hoplite"
    sample_rate = SAMPLE_RATE
    window_seconds = WINDOW_SECONDS
    window_samples = WINDOW_SAMPLES

    def __init__(self, model) -> None:
        self._model = model
        self._lock = threading.Lock()  # TF SavedModels are not thread-safe
        self.common_names: dict[str, str] = {}
        self._logit_key, self.class_ids = self._discover()

    def _discover(self) -> tuple[str, list[str]]:
        """Find the species logit head and its ordered class list.

        Runs one dummy inference because the head's dict key is derived from a
        bundled CSV filename (e.g. ``labels`` / ``label``) that we cannot know
        statically. Falls back to the head with the most classes.
        """
        dummy = np.zeros(self.window_samples, dtype=np.float32)
        outputs = self._model.embed(dummy)
        logits = dict(outputs.logits)
        keys = list(logits.keys())
        if not keys:
            raise RuntimeError("Perch model returned no logit heads")
        key = next((k for k in _LABEL_KEY_PREFERENCES if k in keys), None)
        if key is None:
            key = max(keys, key=lambda k: np.asarray(logits[k]).shape[-1])
        class_ids = [str(c) for c in self._model.class_list[key].classes]
        return key, class_ids

    def infer(self, waveform: np.ndarray) -> np.ndarray:
        waveform = np.ascontiguousarray(waveform, dtype=np.float32)
        with self._lock:
            outputs = self._model.embed(waveform)
        arr = np.asarray(outputs.logits[self._logit_key], dtype=np.float32)
        arr = np.squeeze(arr)  # drop singleton channel axes the wrapper may add
        if arr.ndim == 1:
            arr = arr[None, :]
        elif arr.ndim > 2:
            arr = arr.reshape(arr.shape[0], -1)
        return _sigmoid(arr)


def load_model(settings) -> "MockPerchModel | HopliteModel":
    """Construct the configured model backend."""
    if settings.mock:
        return MockPerchModel()
    return _load_hoplite(settings.model_name)


def _load_hoplite(model_name: str) -> HopliteModel:
    try:
        from perch_hoplite.zoo import model_configs
    except ImportError as exc:  # pragma: no cover - depends on optional heavy deps
        raise RuntimeError(
            "perch-hoplite is not installed. Install the model extras with "
            "`pip install -r requirements-model.txt`, or run in mock mode "
            "(PERCH_MOCK=1)."
        ) from exc

    try:
        model = model_configs.load_model_by_name(model_name)
    except Exception as exc:  # pragma: no cover - network/policy dependent
        raise RuntimeError(
            f"Failed to load Perch model '{model_name}'. Weights are fetched from "
            "Kaggle on first use, so this needs network access to kaggle.com "
            "(or a pre-populated kagglehub cache). See README for offline options. "
            f"Original error: {exc!r}"
        ) from exc
    return HopliteModel(model)
