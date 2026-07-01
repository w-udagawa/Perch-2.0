"""Detection service: decode audio, run the model, assemble structured results.

The model returns raw per-class logits; we keep both the logit and its sigmoid
probability. Detections are ranked by logit because the sigmoid saturates near
1.0 for confident species (so probabilities alone cannot separate the top few),
while the threshold is applied to the [0, 1] probability for an intuitive knob.
"""

from __future__ import annotations

import numpy as np

from . import labels
from .audio import load_audio
from .model import sigmoid


def _top_k_indices(row: np.ndarray, k: int) -> np.ndarray:
    """Indices of the ``k`` largest values in ``row``, highest first."""
    k = min(k, row.shape[0])
    idx = np.argpartition(row, -k)[-k:]
    return idx[np.argsort(row[idx])[::-1]]


def run_detection(model, file_path: str, top_k: int, threshold: float) -> dict:
    """Run Perch detection on a single audio file and build the JSON payload."""
    waveform, sample_rate = load_audio(file_path, model.sample_rate)
    duration = len(waveform) / float(sample_rate)

    logits = model.infer(waveform)  # [n_windows, n_classes] raw logits
    scores = sigmoid(logits)  # [0, 1] probabilities
    class_ids = model.class_ids
    common_names = getattr(model, "common_names", {}) or {}
    window_seconds = model.window_seconds
    n_windows = int(scores.shape[0])

    windows: list[dict] = []
    summary: dict[str, dict] = {}

    for w in range(n_windows):
        start = round(w * window_seconds, 3)
        end = round(min((w + 1) * window_seconds, duration) if duration else (w + 1) * window_seconds, 3)
        detections: list[dict] = []
        for idx in _top_k_indices(logits[w], top_k):  # rank by logit (no saturation ties)
            score = round(float(scores[w][idx]), 4)
            if score < threshold:
                continue
            class_id = class_ids[idx]
            sci = labels.scientific_name(class_id)
            # Prefer a backend-supplied common name (the mock's English names),
            # otherwise fall back to the Japanese 和名 for common Japanese taxa.
            common = common_names.get(class_id) or labels.japanese_name(sci)
            logit = round(float(logits[w][idx]), 3)
            detections.append(
                {
                    "class_id": class_id,
                    "scientific_name": sci,
                    "common_name": common,
                    "score": score,
                    "logit": logit,
                }
            )
            entry = summary.setdefault(
                class_id,
                {
                    "class_id": class_id,
                    "scientific_name": sci,
                    "common_name": common,
                    "max_score": 0.0,
                    "max_logit": float("-inf"),
                    "n_windows": 0,
                },
            )
            entry["max_score"] = max(entry["max_score"], score)
            entry["max_logit"] = max(entry["max_logit"], logit)
            entry["n_windows"] += 1
        windows.append({"index": w, "start": start, "end": end, "detections": detections})

    summary_list = sorted(summary.values(), key=lambda e: e["max_logit"], reverse=True)

    return {
        "duration_sec": round(duration, 3),
        "sample_rate": sample_rate,
        "window_seconds": window_seconds,
        "n_windows": n_windows,
        "backend": getattr(model, "backend", "unknown"),
        "summary": summary_list,
        "windows": windows,
    }
