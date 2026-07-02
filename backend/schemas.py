"""Pydantic response models for the API."""

from __future__ import annotations

from pydantic import BaseModel


class Detection(BaseModel):
    class_id: str
    scientific_name: str
    common_name: str | None = None
    score: float  # sigmoid probability in [0, 1] (never boosted)
    logit: float  # raw model logit (never boosted; discriminative ranking signal)
    in_region: bool = False  # on the curated Japan checklist (backend.wamei.WAMEI)


class WindowResult(BaseModel):
    index: int
    start: float
    end: float
    detections: list[Detection]


class SummaryItem(BaseModel):
    class_id: str
    scientific_name: str
    common_name: str | None = None
    max_score: float  # highest sigmoid probability across windows
    max_logit: float  # highest raw logit across windows (summary is sorted by this)
    n_windows: int
    in_region: bool = False


class PredictResponse(BaseModel):
    duration_sec: float
    sample_rate: int
    window_seconds: float
    n_windows: int
    backend: str
    region_boost: bool = False
    summary: list[SummaryItem]
    windows: list[WindowResult]


class HealthResponse(BaseModel):
    status: str
    backend: str
    model_name: str
    n_classes: int
    window_seconds: float
    sample_rate: int
