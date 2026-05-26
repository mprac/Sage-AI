"""Thin wrapper around the Anthropic + Voyage SDKs.

Centralises client construction so services don't each instantiate their own, and exposes a
small ``Usage`` dataclass so metering reads the same shape everywhere (including cache tokens).
"""

from __future__ import annotations

from dataclasses import dataclass
from functools import lru_cache

import anthropic
import voyageai

from app.core.config import settings


@dataclass
class Usage:
    """Normalised token usage. ``input_tokens`` folds in cache tokens so metering is simple."""

    input_tokens: int
    output_tokens: int

    @classmethod
    def from_anthropic(cls, usage) -> "Usage":
        # Cache reads are ~0.1x and writes ~1.25x real cost; we fold them into input for a
        # simple, slightly-conservative meter. Tune in services/credits.py if needed.
        cached = (getattr(usage, "cache_read_input_tokens", 0) or 0) + (
            getattr(usage, "cache_creation_input_tokens", 0) or 0
        )
        return cls(
            input_tokens=(usage.input_tokens or 0) + cached,
            output_tokens=usage.output_tokens or 0,
        )


@lru_cache
def get_anthropic() -> anthropic.AsyncAnthropic:
    return anthropic.AsyncAnthropic(api_key=settings.anthropic_api_key)


@lru_cache
def get_voyage() -> voyageai.AsyncClient:
    return voyageai.AsyncClient(api_key=settings.voyage_api_key)


async def embed(text: str) -> list[float]:
    """Embed a single string for pgvector storage/recall (Voyage)."""
    result = await get_voyage().embed(
        [text], model=settings.embedding_model, input_type="document"
    )
    return result.embeddings[0]
