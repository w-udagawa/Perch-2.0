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
from .wamei import WAMEI

# Perch has no notion of geographic range, so a Japanese recording of a common
# local species can be outranked by an acoustically-similar species from
# elsewhere in its ~14.8k-taxon catalogue. As a pragmatic (not scientific) fix,
# ``region_boost`` nudges the *ranking* toward species on our curated Japan
# checklist (backend.wamei.WAMEI) by this many logit units — enough to move a
# regionally-plausible species up a few ranks without ever touching the
# reported score/logit, which always reflect the model's true, un-nudged
# output. There is no seasonal component: we have no reliable per-species
# migration-timing data source, and fabricating one would be actively
# misleading for a real identification tool.
REGION_BONUS = 2.0


def _top_k_indices(row: np.ndarray, k: int) -> np.ndarray:
    """Indices of the ``k`` largest values in ``row``, highest first."""
    k = min(k, row.shape[0])
    idx = np.argpartition(row, -k)[-k:]
    return idx[np.argsort(row[idx])[::-1]]


def run_detection(
    model,
    file_path: str,
    top_k: int,
    threshold: float,
    region_boost: bool = False,
) -> dict:
    """Run Perch detection on a single audio file and build the JSON payload.

    ``region_boost``, when true, favours species on the curated Japan checklist
    (:data:`backend.wamei.WAMEI`) when picking each window's top-k — see
    :data:`REGION_BONUS`. Reported ``score``/``logit`` values are always the
    model's true, unmodified output; only which classes make the cut changes.
    """
    waveform, sample_rate = load_audio(file_path, model.sample_rate)
    duration = len(waveform) / float(sample_rate)

    logits = model.infer(waveform)  # [n_windows, n_classes] raw logits
    scores = sigmoid(logits)  # [0, 1] probabilities
    class_ids = model.class_ids
    common_names = getattr(model, "common_names", {}) or {}
    window_seconds = model.window_seconds
    n_windows = int(scores.shape[0])

    # Per-class "is this on the Japan checklist" mask, computed once per request.
    in_region = np.fromiter(
        (labels.scientific_name(cid) in WAMEI for cid in class_ids), dtype=bool, count=len(class_ids)
    )
    rank_logits = logits + (REGION_BONUS * in_region) if region_boost else logits

    windows: list[dict] = []
    summary: dict[str, dict] = {}

    for w in range(n_windows):
        start = round(w * window_seconds, 3)
        end = round(min((w + 1) * window_seconds, duration) if duration else (w + 1) * window_seconds, 3)
        detections: list[dict] = []
        for idx in _top_k_indices(rank_logits[w], top_k):  # rank by (boosted) logit
            score = round(float(scores[w][idx]), 4)  # true, unboosted probability
            if score < threshold:
                continue
            class_id = class_ids[idx]
            sci = labels.scientific_name(class_id)
            # Prefer a backend-supplied common name (the mock's English names),
            # otherwise fall back to the Japanese 和名 for common Japanese taxa.
            common = common_names.get(class_id) or labels.japanese_name(sci)
            logit = round(float(logits[w][idx]), 3)  # true, unboosted logit
            region = bool(in_region[idx])
            detections.append(
                {
                    "class_id": class_id,
                    "scientific_name": sci,
                    "common_name": common,
                    "score": score,
                    "logit": logit,
                    "in_region": region,
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
                    "in_region": region,
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
        "region_boost": region_boost,
        "summary": summary_list,
        "windows": windows,
    }
