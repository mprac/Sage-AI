"""Schemas for full recipes + the cooking playlist."""

from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, Field


class RecipeIngredient(BaseModel):
    item: str
    quantity: str | None = None


class RecipeStep(BaseModel):
    instruction: str
    tip: str | None = None


class PlaylistTrack(BaseModel):
    title: str
    artist: str


class Playlist(BaseModel):
    vibe: str = Field(description="Short description of the cooking soundtrack's vibe")
    search_query: str = Field(description="A query to open a matching playlist in Spotify")
    tracks: list[PlaylistTrack] = Field(default_factory=list)


class Recipe(BaseModel):
    """A full, structured recipe (the unit generated, saved, and cooked)."""

    title: str
    summary: str
    servings: int | None = None
    total_time_minutes: int | None = None
    ingredients: list[RecipeIngredient]
    steps: list[RecipeStep]
    playlist: Playlist | None = None
    session_id: str | None = Field(default=None, description="Chat that generated it")
    # A short chef-y note about how the recipe relates to the current season — e.g.
    # "Stars in-season butternut squash and apples". Set by the LLM at generation time.
    seasonal_note: str | None = None


class GenerateRecipeRequest(BaseModel):
    session_id: str | None = Field(default=None, description="Chat to draw context from")
    recognition_id: str | None = Field(default=None, description="Detected ingredients to use")
    request: str | None = Field(default=None, description="Optional specific ask, e.g. 'the pasta one'")


class GeneratedRecipe(BaseModel):
    recipe: Recipe
    credits_spent: int
    balance: int


class SavedRecipeId(BaseModel):
    id: str


class RecipeSummary(BaseModel):
    id: str
    title: str
    total_time_minutes: int | None = None
    session_id: str | None = None
    created_at: datetime
