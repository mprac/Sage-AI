"""Schemas for the seasonal-journey API (current season, almanac, hemisphere)."""

from __future__ import annotations

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field

Hemisphere = Literal["N", "S"]
Season = Literal["spring", "summer", "fall", "winter"]


class ProduceOut(BaseModel):
    slug: str
    display_name: str
    icon: str  # lucide icon name


class HarvestProgressOut(BaseModel):
    """The user's progress through the current season's harvest."""

    cooked: list[str] = Field(default_factory=list)   # slugs already cooked this season
    cooks_count: int = 0
    target: int = 8                                   # threshold for the "harvester" award
    total: int = 12                                   # size of the catalog (== "bumper crop")
    awards_earned: list[str] = Field(default_factory=list)
    started_at: datetime | None = None
    completed_at: datetime | None = None


class SeasonOut(BaseModel):
    """GET /seasons/current — what's in season for this user, plus their harvest progress."""

    season: Season
    year: int
    hemisphere: Hemisphere
    produce: list[ProduceOut]
    harvest: HarvestProgressOut


class AlmanacEntry(BaseModel):
    """One row in the user's almanac timeline."""

    season: Season
    year: int
    hemisphere: Hemisphere
    ingredients_cooked: list[str]
    cooks_count: int
    awards_earned: list[str]
    started_at: datetime
    completed_at: datetime | None = None


class HemisphereUpdate(BaseModel):
    hemisphere: Hemisphere
