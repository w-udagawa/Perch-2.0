"""Pre-download the Perch 2.0 weights and verify inference works.

Run this once (in an environment with network access to Kaggle) to warm the
kagglehub cache so the web app starts instantly afterwards:

    python scripts/download_model.py            # perch_v2
    python scripts/download_model.py perch_v2_cpu

In restricted environments where kaggle.com egress is blocked this will fail
with a network/policy error — that is expected. See the README for the
offline / mock options.
"""

from __future__ import annotations

import sys


def main() -> int:
    try:
        from perch_hoplite.zoo import model_configs
    except ImportError:
        print(
            "perch-hoplite is not installed. Run: pip install -r requirements-model.txt",
            file=sys.stderr,
        )
        return 1

    name = sys.argv[1] if len(sys.argv) > 1 else "perch_v2"
    print(f"Loading Perch model '{name}' (downloads from Kaggle on first run)…")
    try:
        model = model_configs.load_model_by_name(name)
    except Exception as exc:  # noqa: BLE001 - report any failure clearly
        print(f"FAILED: {exc!r}", file=sys.stderr)
        print(
            "If this is a connection/policy error, Kaggle egress is not permitted "
            "in this environment. Pre-download elsewhere and copy the kagglehub "
            "cache, or run the app with PERCH_MOCK=1.",
            file=sys.stderr,
        )
        return 2

    import numpy as np

    outputs = model.embed(np.zeros(5 * 32_000, dtype=np.float32))
    heads = list(outputs.logits.keys())
    print("OK — model loaded and inference succeeded.")
    print(f"  logit heads: {heads}")
    for head in heads:
        try:
            n = len(model.class_list[head].classes)
            print(f"  head '{head}': {n} classes")
        except Exception:  # noqa: BLE001
            pass
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
