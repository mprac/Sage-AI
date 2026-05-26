"""Schemas for the food-recognition endpoint."""

from __future__ import annotations

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


class RecognitionResult(BaseModel):
    id: str
    foods: list[DetectedFood]
    image_path: str | None = None
    credits_spent: int
    balance: int
