"""Audio decoding and resampling into Perch's input format (32 kHz mono float32).

Uses ``soundfile`` (bundled libsndfile) for decoding and ``soxr`` for
high-quality resampling. That covers WAV/FLAC/OGG/AIFF/MP3 without any system
packages. Formats libsndfile can't read (notably **m4a/AAC**) fall back to
``ffmpeg`` when it is available (the Docker image ships it); otherwise a clear
error is raised.
"""

from __future__ import annotations

import shutil
import subprocess

import numpy as np
import soundfile as sf
import soxr

from .model import SAMPLE_RATE


class AudioDecodeError(Exception):
    """Raised when an uploaded file cannot be decoded as audio."""


def _ffmpeg_exe() -> str | None:
    """Locate an ffmpeg binary: system PATH first, then a pip-bundled one."""
    exe = shutil.which("ffmpeg")
    if exe:
        return exe
    try:  # imageio-ffmpeg ships a static binary, handy where apt isn't available
        import imageio_ffmpeg

        return imageio_ffmpeg.get_ffmpeg_exe()
    except Exception:  # noqa: BLE001 - any import/lookup failure means "no ffmpeg"
        return None


def _decode_with_ffmpeg(path: str, target_sr: int, cause: Exception | None = None) -> np.ndarray:
    """Decode any ffmpeg-supported file to mono float32 at ``target_sr``.

    Fallback for formats libsndfile can't handle (m4a/AAC, etc.). ffmpeg does the
    downmix + resample for us, so the result is already Perch-ready.
    """
    exe = _ffmpeg_exe()
    if exe is None:
        raise AudioDecodeError(
            "could not decode this file: libsndfile does not support it "
            "(e.g. m4a/AAC) and no ffmpeg backend is available."
        ) from cause
    cmd = [
        exe, "-nostdin", "-v", "error",
        "-i", path,
        "-f", "f32le", "-ac", "1", "-ar", str(target_sr),
        "-",
    ]
    try:
        proc = subprocess.run(cmd, capture_output=True, check=True)
    except subprocess.CalledProcessError as exc:
        detail = exc.stderr.decode("utf-8", "replace").strip() or "ffmpeg could not decode the file"
        raise AudioDecodeError(detail) from exc
    audio = np.frombuffer(proc.stdout, dtype=np.float32)
    if audio.size == 0:
        raise AudioDecodeError("decoded audio is empty")
    return np.ascontiguousarray(audio, dtype=np.float32)


def load_audio(path: str, target_sr: int = SAMPLE_RATE) -> tuple[np.ndarray, int]:
    """Decode ``path`` to a mono float32 waveform at ``target_sr``.

    Returns ``(waveform, target_sr)``.
    """
    try:
        data, src_sr = sf.read(path, dtype="float32", always_2d=False)
    except Exception as exc:  # libsndfile can't read it (e.g. m4a) -> try ffmpeg
        return _decode_with_ffmpeg(path, target_sr, exc), target_sr

    if data.ndim == 2:  # (frames, channels) -> mono
        data = data.mean(axis=1)
    data = np.ascontiguousarray(data, dtype=np.float32)

    if src_sr != target_sr:
        data = soxr.resample(data, src_sr, target_sr).astype(np.float32)

    return data, target_sr
