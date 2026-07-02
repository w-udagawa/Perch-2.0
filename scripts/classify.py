"""Classify audio file(s) with Perch 2.0 from the command line.

    python scripts/classify.py recording.wav [more.wav ...]
    python scripts/classify.py --top-k 8 --threshold 0.3 a.mp3 b.flac

Uses the real model by default (weights download from Kaggle on first run, then
cache). Set ``PERCH_MOCK=1`` for the weight-free mock backend. Honours the same
``PERCH_MODEL_NAME`` / ``PERCH_TOP_K`` / ``PERCH_THRESHOLD`` env vars as the web
app. Results are ranked by raw logit (the sigmoid probability saturates near 1.0
for confident species, so the logit separates the top detections).
"""

from __future__ import annotations

import argparse
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from backend.config import get_settings  # noqa: E402
from backend.model import load_model  # noqa: E402
from backend.service import run_detection  # noqa: E402


def main() -> int:
    parser = argparse.ArgumentParser(description="Classify audio with Perch 2.0.")
    parser.add_argument("audio", nargs="+", help="audio file(s): wav/flac/ogg/aiff/mp3")
    parser.add_argument("--top-k", type=int, default=None, help="top detections per 5 s window")
    parser.add_argument("--threshold", type=float, default=None, help="min probability to report")
    parser.add_argument(
        "--region-boost",
        action="store_true",
        help="favour species on the Japan checklist (backend.wamei) when ranking; reported scores are unaffected",
    )
    args = parser.parse_args()

    settings = get_settings()
    top_k = args.top_k or settings.top_k
    threshold = settings.threshold if args.threshold is None else args.threshold

    try:
        model = load_model(settings)
    except RuntimeError as exc:
        print(f"Failed to load model: {exc}", file=sys.stderr)
        return 2
    print(f"backend={model.backend}  classes={len(model.class_ids)}")

    exit_code = 0
    for path in args.audio:
        if not os.path.isfile(path):
            print(f"  ! not found: {path}", file=sys.stderr)
            exit_code = 1
            continue
        result = run_detection(model, path, top_k=top_k, threshold=threshold, region_boost=args.region_boost)
        print(f"\n{os.path.basename(path)}  ({result['duration_sec']}s, {result['n_windows']} window(s))")
        if not result["summary"]:
            print("  (no detections above threshold)")
        for s in result["summary"]:
            common = f" ({s['common_name']})" if s.get("common_name") else ""
            print(
                f"  {s['scientific_name']}{common}"
                f"  logit={s['max_logit']:.2f}  prob={s['max_score']:.3f}"
                f"  in {s['n_windows']} window(s)"
            )
    return exit_code


if __name__ == "__main__":
    raise SystemExit(main())
