"""Audio decoding and resampling into Perch's input format (32 kHz mono float32).

Uses ``soundfile`` (bundled libsndfile) for decoding and ``soxr`` for
high-quality resampling. This covers WAV/FLAC/OGG/AIFF without any system
packages. MP3/M4A would need an ffmpeg backend and are not supported here.
"""

from __future__ import annotations

import numpy as np
import soundfile as sf
import soxr

from .model import SAMPLE_RATE


class AudioDecodeError(Exception):
    """Raised when an uploaded file cannot be decoded as audio."""


def load_audio(path: str, target_sr: int = SAMPLE_RATE) -> tuple[np.ndarray, int]:
    """Decode ``path`` to a mono float32 waveform at ``target_sr``.

    Returns ``(waveform, target_sr)``.
    """
    try:
        data, src_sr = sf.read(path, dtype="float32", always_2d=False)
    except Exception as exc:  # libsndfile raises various errors
        raise AudioDecodeError(str(exc)) from exc

    if data.ndim == 2:  # (frames, channels) -> mono
        data = data.mean(axis=1)
    data = np.ascontiguousarray(data, dtype=np.float32)

    if src_sr != target_sr:
        data = soxr.resample(data, src_sr, target_sr).astype(np.float32)

    return data, target_sr
