"""Runtime configuration, driven by environment variables.

All settings have sensible defaults so the app runs out of the box. The most
important switch is ``PERCH_MOCK``: set it to ``1`` to run without the real
model weights (useful for development, CI, or any environment where the Kaggle
download is unavailable).
"""

from __future__ import annotations

import os
from dataclasses import dataclass


def _env_bool(name: str, default: bool = False) -> bool:
    value = os.environ.get(name)
    if value is None:
        return default
    return value.strip().lower() in {"1", "true", "yes", "on"}


# Audio extensions libsndfile can decode without ffmpeg. mp3/m4a are
# intentionally excluded because they require an ffmpeg backend (not installed
# in the default environment).
DEFAULT_EXTENSIONS = (".wav", ".flac", ".ogg", ".oga", ".aif", ".aiff")


@dataclass(frozen=True)
class Settings:
    mock: bool
    model_name: str
    top_k: int
    threshold: float
    max_upload_mb: int
    allowed_extensions: tuple[str, ...]


def get_settings() -> Settings:
    return Settings(
        mock=_env_bool("PERCH_MOCK", False),
        model_name=os.environ.get("PERCH_MODEL_NAME", "perch_v2"),
        top_k=int(os.environ.get("PERCH_TOP_K", "5")),
        threshold=float(os.environ.get("PERCH_THRESHOLD", "0.1")),
        max_upload_mb=int(os.environ.get("PERCH_MAX_UPLOAD_MB", "50")),
        allowed_extensions=DEFAULT_EXTENSIONS,
    )
