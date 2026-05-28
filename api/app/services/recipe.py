"""Recipe generation — Claude Sonnet + forced tool-use for a complete structured recipe.

Takes the user's detected ingredients, taste profile, and recent chat context and returns a
full recipe (ingredients + ordered steps + a matching cooking playlist). Structured so the app
can render it and walk the steps in Cook Mode.
"""

from __future__ import annotations

from app.core.config import settings
from app.schemas.profile import TasteProfileOut
from app.schemas.recipe import Recipe
from app.schemas.recognition import DetectedFood
from app.services.anthropic_client import Usage, get_anthropic

_SYSTEM = """\
You are Sage, a master chef. Turn the user's ingredients into the most amazing meal they've had.
Produce ONE complete, restaurant-quality recipe with clear, confidence-building steps a home cook
can follow. Absolutely respect the user's allergies and dietary restrictions — never include a
conflicting ingredient. Prefer the ingredients they have on hand; assume common pantry staples.
Also suggest a fun cooking playlist whose vibe matches the cuisine/meal. Return everything via the
`provide_recipe` tool.
"""

_TOOL = {
    "name": "provide_recipe",
    "description": "Return one complete structured recipe with a matching cooking playlist.",
    "input_schema": {
        "type": "object",
        "properties": {
            "title": {"type": "string"},
            "summary": {"type": "string", "description": "1-2 appetizing sentences"},
            "servings": {"type": "integer"},
            "total_time_minutes": {"type": "integer"},
            "ingredients": {
                "type": "array",
                "items": {
                    "type": "object",
                    "properties": {
                        "item": {"type": "string"},
                        "quantity": {"type": "string"},
                    },
                    "required": ["item"],
                },
            },
            "steps": {
                "type": "array",
                "items": {
                    "type": "object",
                    "properties": {
                        "instruction": {"type": "string"},
                        "tip": {"type": "string", "description": "Optional pro tip for this step"},
                    },
                    "required": ["instruction"],
                },
            },
            "playlist": {
                "type": "object",
                "properties": {
                    "vibe": {"type": "string"},
                    "search_query": {"type": "string", "description": "Spotify search text for this vibe"},
                    "tracks": {
                        "type": "array",
                        "items": {
                            "type": "object",
                            "properties": {
                                "title": {"type": "string"},
                                "artist": {"type": "string"},
                            },
                            "required": ["title", "artist"],
                        },
                    },
                },
                "required": ["vibe", "search_query", "tracks"],
            },
            "seasonal_note": {
                "type": "string",
                "description": (
                    "Optional short chef-y note about how the recipe uses current-season produce, "
                    "e.g. 'Stars in-season butternut squash and apples'. Omit if no in-season "
                    "ingredients are featured."
                ),
            },
        },
        "required": ["title", "summary", "ingredients", "steps", "playlist"],
    },
}


def _build_prompt(
    profile: TasteProfileOut,
    foods: list[DetectedFood],
    history: list[dict],
    request: str | None,
) -> str:
    parts: list[str] = []
    if foods:
        parts.append("Ingredients on hand: " + ", ".join(f.name for f in foods))
    if profile.dietary_restrictions:
        parts.append("Dietary restrictions (MUST respect): " + ", ".join(profile.dietary_restrictions))
    if profile.allergies:
        parts.append("Allergies (NEVER include): " + ", ".join(profile.allergies))
    if profile.dislikes:
        parts.append("Dislikes: " + ", ".join(profile.dislikes))
    if profile.favorite_cuisines:
        parts.append("Favourite cuisines: " + ", ".join(profile.favorite_cuisines))
    if history:
        convo = "\n".join(f"{m['role']}: {m['content']}" for m in history[-8:])
        parts.append("Recent conversation about what to cook:\n" + convo)
    parts.append(
        f"Create the full recipe the user wants{f' ({request})' if request else ''}. "
        "Use the tool."
    )
    return "\n\n".join(parts)


async def generate_recipe(
    *,
    profile: TasteProfileOut,
    foods: list[DetectedFood],
    history: list[dict],
    request: str | None,
) -> tuple[dict, Usage]:
    """Return (recipe_dict, usage). recipe_dict matches the Recipe schema."""
    response = await get_anthropic().messages.create(
        model=settings.model_chat,
        max_tokens=2048,
        system=_SYSTEM,
        tools=[_TOOL],
        tool_choice={"type": "tool", "name": "provide_recipe"},
        messages=[{"role": "user", "content": _build_prompt(profile, foods, history, request)}],
    )
    block = next((b for b in response.content if b.type == "tool_use"), None)
    recipe = Recipe(**(block.input if block else {}))
    return recipe.model_dump(), Usage.from_anthropic(response.usage)
