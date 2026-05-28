"""Schemas for the food-recognition endpoint."""

from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, Field


class DetectedFood(BaseModel):
    """A single food item identified in the image (also the tool-use schema for Claude)."""

    name: str = Field(description="Common name of the food/ingredient, e.g. 'red bell pepper'")
    category: str = Field(
        description="High-level category, e.g. vegetable, fruit, protein, grain, dairy, sauce"
    )
    confidence: float = Field(ge=0, le=1, description="Model confidence 0–1")
    estimated_quantity: str | None = Field(
        default=None, description="Rough amount if estimable, e.g. '2 pieces', '~1 cup'"
    )
    # Chef-y nod to seasonality, e.g. "At peak in fall — sweeter after first frost".
    seasonal_note: str | None = Field(
        default=None,
        description="Short note about this ingredient's seasonal peak relative to now",
    )


class RecognitionResult(BaseModel):
    id: str
    foods: list[DetectedFood]
    image_path: str | None = None
    credits_spent: int
    balance: int


class RecognitionDetail(BaseModel):
    """A previously-saved recognition fetched by id (no metering / wallet fields)."""

    id: str
    foods: list[DetectedFood]
    image_path: str | None = None
    created_at: datetime


class RecognitionUpdate(BaseModel):
    """PATCH payload for editing the foods list on a saved recognition."""

    foods: list[DetectedFood]
