"""Schemas for the user's taste profile (the 'personal chef' memory)."""

from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field

Hemisphere = Literal["N", "S"]


class TasteProfileOut(BaseModel):
    likes: list[str] = Field(default_factory=list)
    dislikes: list[str] = Field(default_factory=list)
    allergies: list[str] = Field(default_factory=list)
    dietary_restrictions: list[str] = Field(default_factory=list)
    favorite_cuisines: list[str] = Field(default_factory=list)
    spice_tolerance: str | None = None
    cooking_skill: str | None = None
    household_size: int | None = None
    hemisphere: Hemisphere = "N"
    memory_summary: str = ""


class TasteProfileUpdate(BaseModel):
    """Partial update — only provided fields are changed."""

    likes: list[str] | None = None
    dislikes: list[str] | None = None
    allergies: list[str] | None = None
    dietary_restrictions: list[str] | None = None
    favorite_cuisines: list[str] | None = None
    spice_tolerance: str | None = None
    cooking_skill: str | None = None
    household_size: int | None = None
    hemisphere: Hemisphere | None = None
