"""Perch 2.0 model wrappers and inference.

Two interchangeable backends share one small interface — the class attributes
``sample_rate`` / ``window_seconds`` / ``window_samples``, the instance
attributes ``class_ids`` / ``common_names`` and ``infer(waveform)``:

* :class:`MockPerchModel` — a deterministic, weight-free stand-in (enabled with
  ``PERCH_MOCK=1``). Lets the full pipeline (upload → decode → window → score →
  API → UI) be exercised anywhere, including environments where the Kaggle model
  download is blocked. NOT a real classifier — its labels are illustrative.
* :class:`HopliteModel` — the real Perch 2.0, loaded through ``perch-hoplite``.
  Downloads the weights from Kaggle on first use (network access required).

``infer`` returns **raw per-class logits** shaped ``[n_windows, n_classes]``.
Callers turn them into [0, 1] probabilities with :func:`sigmoid`. The raw logits
are kept alongside the probability because the sigmoid saturates near 1.0 for
confident detections (several top species all read ~1.000), so the logit is the
more discriminative ranking and display signal.

Perch 2.0 consumes 5-second windows of 32 kHz mono audio and scores ~14.8k taxa
per window. It is multi-label: several species can be present in one window.
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


def sigmoid(x: np.ndarray) -> np.ndarray:
    """Map raw logits to [0, 1] probabilities (multi-label, per class)."""
    return 1.0 / (1.0 + np.exp(-np.asarray(x, dtype=np.float32)))


class PerchBackend:
    """Common spec shared by the interchangeable backends.

    Subclasses set ``backend`` and populate ``class_ids`` (and optionally
    ``common_names``), then implement :meth:`infer` to return raw per-class
    logits shaped ``[n_windows, n_classes]``.
    """

    backend = "base"
    sample_rate = SAMPLE_RATE
    window_seconds = WINDOW_SECONDS
    window_samples = WINDOW_SAMPLES

    def __init__(self) -> None:
        self.class_ids: list[str] = []
        self.common_names: dict[str, str] = {}

    def infer(self, waveform: np.ndarray) -> np.ndarray:  # pragma: no cover
        raise NotImplementedError


class MockPerchModel(PerchBackend):
    """Deterministic, weight-free stand-in for Perch 2.0.

    Produces reproducible, energy-modulated logits over a small catalogue of
    common backyard species so the end-to-end app can be demonstrated without
    downloading the real model. NOT a real classifier — labels are illustrative.
    """

    backend = "mock"

    def __init__(self) -> None:
        super().__init__()
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
        # Energy-modulated logits: silence -> strongly negative (sigmoid ~ 0, so
        # nothing is detected); louder windows lift 1-2 species into positives.
        w = np.arange(n_windows)[:, None]  # window index, column vector
        c = np.arange(n_classes)[None, :]  # class index, row vector
        rms = np.sqrt(np.mean(frames ** 2, axis=1)) + 1e-8  # per-window loudness
        energy = np.minimum(1.0, rms * 8.0)[:, None]
        phase = np.sin((w + 1) * (c + 1) * 1.7) * 0.5 + 0.5  # deterministic spread
        logits = -6.0 + energy * (2.0 + phase * 10.0)
        logits += np.where((w + c) % n_classes < 2, 4.0 * energy, 0.0)  # standouts
        return logits.astype(np.float32)


class HopliteModel(PerchBackend):
    """Wraps a loaded perch-hoplite model and exposes the common interface."""

    backend = "perch-hoplite"

    def __init__(self, model) -> None:
        super().__init__()
        self._model = model
        self._lock = threading.Lock()  # TF SavedModels are not thread-safe
        self._logit_key, self.class_ids = self._discover()

    def _discover(self) -> tuple[str, list[str]]:
        """Find the species logit head and its ordered class list.

        Runs one dummy inference because the head's dict key is derived from a
        bundled CSV filename that we cannot know statically. The logits head and
        the class list can be keyed differently — Perch 2.0 exposes the species
        logits under ``label`` but the class list under ``labels`` — so the
        class list is matched by name variant, then by class count.
        """
        dummy = np.zeros(self.window_samples, dtype=np.float32)
        outputs = self._model.embed(dummy)
        logits = dict(outputs.logits)
        keys = list(logits.keys())
        if not keys:
            raise RuntimeError("Perch model returned no logit heads")
        logit_key = next((k for k in _LABEL_KEY_PREFERENCES if k in keys), None)
        if logit_key is None:
            logit_key = max(keys, key=lambda k: np.asarray(logits[k]).shape[-1])
        n_classes = int(np.asarray(logits[logit_key]).shape[-1])
        return logit_key, self._class_ids_for(logit_key, n_classes)

    def _class_ids_for(self, logit_key: str, n_classes: int) -> list[str]:
        """Resolve the ordered class list for a logit head.

        The class-list key can differ from the logits key (e.g. ``label`` vs
        ``labels``), so try name variants first, then a list whose length
        matches the logit width, then the largest list.
        """
        class_list = dict(self._model.class_list)
        if not class_list:
            raise RuntimeError("Perch model exposed no class lists")

        def classes_of(cl) -> list[str]:
            return [str(c) for c in cl.classes]

        for k in (logit_key, logit_key + "s", logit_key.rstrip("s")):
            if k in class_list:
                return classes_of(class_list[k])
        for cl in class_list.values():
            try:
                if len(cl.classes) == n_classes:
                    return classes_of(cl)
            except Exception:
                continue
        return classes_of(max(class_list.values(), key=lambda v: len(v.classes)))

    def infer(self, waveform: np.ndarray) -> np.ndarray:
        # Frame to whole 5 s windows (zero-padding the last) before inference so
        # the window count matches the rest of the app and the trailing partial
        # window is analysed rather than dropped by the model's internal framing.
        frames = frame_audio(waveform, self.window_samples)
        padded = np.ascontiguousarray(frames.reshape(-1), dtype=np.float32)
        with self._lock:
            outputs = self._model.embed(padded)
        arr = np.asarray(outputs.logits[self._logit_key], dtype=np.float32)
        arr = np.squeeze(arr)  # drop singleton channel axes the wrapper may add
        if arr.ndim == 1:
            arr = arr[None, :]
        elif arr.ndim > 2:
            arr = arr.reshape(arr.shape[0], -1)
        return arr  # raw logits; the service applies sigmoid for [0, 1] scores


def load_model(settings) -> PerchBackend:
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
