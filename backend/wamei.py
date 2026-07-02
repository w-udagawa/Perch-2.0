"""Scientific name -> Japanese common name (和名) lookup table.

Perch 2.0's species head is keyed by binomial scientific names (eBird/Clements
style, e.g. ``Zosterops japonicus``). This maps the ones common in Japan to their
和名 (katakana) so the UI can show a familiar name in the "種" column, and also
serves as the curated checklist used for the region-boost heuristic in
:mod:`backend.service` (see ``REGION_BONUS``). Species not listed here fall back
to the scientific name — this is intentionally a curated subset of a few hundred
common taxa, not the full ~14.8k class list.

The data itself lives in ``backend/data/wamei_ja.json`` (plain ``{scientific
name: 和名}``, easy to hand-edit without touching code). Keys must match
:func:`backend.labels.scientific_name` output ("Genus species"). Where a
species' taxonomy is unstable, common synonyms are included as extra keys
pointing to the same 和名, to maximise hits against whatever name Perch emits.
"""

from __future__ import annotations

import json
from pathlib import Path

_DATA_PATH = Path(__file__).resolve().parent / "data" / "wamei_ja.json"

with _DATA_PATH.open(encoding="utf-8") as _f:
    WAMEI: dict[str, str] = json.load(_f)
