"""Schemas for the Sage companion (Tamagotchi-style pet)."""

from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field

FeedSource = Literal["cook", "snack", "checkin"]
Season = Literal["spring", "summer", "fall", "winter"]


class SagePetOut(BaseModel):
    name: str
    vitality: int                  # current, after decay (0-100)
    mood: str                      # e.g. "Thriving", "Hungry"
    mood_emoji: str
    state: str                     # band key: thriving|content|peckish|hungry|weak|fainted
    message: str                   # a short personable line from Sage for the current mood
    level: int
    xp: int
    xp_to_next: int
    streak_days: int
    longest_streak: int
    bond_xp: int
    bond_level: int
    is_dormant: bool
    equipped: dict
    unlocked_cosmetics: list[str]
    # Whole hours until Sage drops into the "hungry" band — lets the client schedule a reminder.
    hours_until_hungry: float


class FeedRequest(BaseModel):
    source: FeedSource = "cook"
    # When source="cook", the id of the saved recipe being cooked — drives the seasonal harvest.
    recipe_id: str | None = None


class RenameRequest(BaseModel):
    name: str = Field(min_length=1, max_length=40)


class Cosmetic(BaseModel):
    id: str
    name: str
    type: str                  # hat | theme | accessory
    icon: str                  # lucide icon name (matches the mobile Icon map)
    color: str | None = None   # for `theme` cosmetics: recolors the avatar disc
    price_credits: int         # 0 if unlock-by-level only
    unlock_level: int          # 0 if purchasable at any level


class HarvestDelta(BaseModel):
    """The seasonal-harvest result of a single cook — what the client celebrates."""

    season: Season
    year: int
    new_slugs: list[str] = Field(default_factory=list)   # produce slugs added this cook
    total: int = 0                                       # ingredients_cooked count for the season
    target: int = 8                                      # threshold for the "harvester" award
    new_awards: list[str] = Field(default_factory=list)  # award slugs earned this cook


class FeedResult(BaseModel):
    pet: SagePetOut
    leveled_up: bool = False
    revived: bool = False
    credits_balance: int | None = None  # set when the action spent credits
    harvest_delta: HarvestDelta | None = None  # populated when a cook hit in-season ingredients
