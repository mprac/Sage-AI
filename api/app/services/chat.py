"""Streaming chat orchestration: Sonnet + prompt caching + personal-chef memory.

The system prompt is built as two blocks:
  1. the frozen persona/guardrails (stable across all users)
  2. the per-user context (taste profile + memory summary + pgvector recalls + detected foods)
A `cache_control` breakpoint on block 2 caches the whole prefix, so multi-turn chats within a
session reuse it cheaply (verify via usage.cache_read_input_tokens).
"""

from __future__ import annotations

from collections.abc import AsyncIterator
from datetime import date, datetime, timezone

from app.core.config import settings
from app.prompts import CHAT_SYSTEM
from app.schemas.profile import TasteProfileOut
from app.schemas.recognition import DetectedFood
from app.services import seasons
from app.services.anthropic_client import Usage, get_anthropic


def _build_mood_directive(sage: dict | None) -> str:
    """Make Sage's chat voice reflect his current vitality/mood — without breaking guardrails."""
    if not sage:
        return ""
    state = sage.get("state", "content")
    name = sage.get("name", "Sage")
    level = sage.get("level", 1)
    streak = sage.get("streak_days", 0)
    tone = {
        "thriving": "You are thriving and bursting with energy — be upbeat and toss in a bonus tip or fun fact.",
        "content": "You feel good and ready to help — friendly and warm.",
        "peckish": "You're a little peckish — cheerful, and you might mention you'd love it if they cooked.",
        "hungry": "You're hungry and a bit lower-energy — gently, playfully nudge them to actually cook so you can eat.",
        "weak": "You're weak from hunger — be endearing and a little dramatic about needing food, but still helpful.",
        "fainted": "You just fainted from hunger and they revived you — be grateful and a touch sheepish, then help eagerly.",
    }.get(state, "Be friendly and warm.")
    return (
        f"\n## Your current state (you are {name}, Level {level}, {streak}-day streak)\n"
        f"{tone}\n"
        "Keep this subtle — at most a short sentence about how you feel; never let it override "
        "the user's actual cooking question, and never break the food-only rule."
    )


def _build_context_block(
    profile: TasteProfileOut,
    recalls: list[str],
    foods: list[DetectedFood],
    today: date | None = None,
) -> str:
    lines: list[str] = ["## What I know about this user"]
    if profile.dietary_restrictions:
        lines.append(f"- Dietary restrictions (MUST respect): {', '.join(profile.dietary_restrictions)}")
    if profile.allergies:
        lines.append(f"- Allergies (NEVER suggest): {', '.join(profile.allergies)}")
    if profile.likes:
        lines.append(f"- Likes: {', '.join(profile.likes)}")
    if profile.dislikes:
        lines.append(f"- Dislikes: {', '.join(profile.dislikes)}")
    if profile.favorite_cuisines:
        lines.append(f"- Favourite cuisines: {', '.join(profile.favorite_cuisines)}")
    if profile.spice_tolerance:
        lines.append(f"- Spice tolerance: {profile.spice_tolerance}")
    if profile.cooking_skill:
        lines.append(f"- Cooking skill: {profile.cooking_skill}")
    if profile.household_size:
        lines.append(f"- Cooking for {profile.household_size} people")
    if profile.memory_summary:
        lines.append(f"\n## Memory\n{profile.memory_summary}")
    if recalls:
        lines.append("\n## Relevant past notes\n" + "\n".join(f"- {r}" for r in recalls))
    if foods:
        names = ", ".join(f.name for f in foods)
        lines.append(f"\n## Ingredients the user has on hand right now\n{names}")
    # Seasonal awareness — stays inside the cached prefix; rolls over once per season.
    today = today or datetime.now(timezone.utc).date()
    hemisphere: seasons.Hemisphere = (profile.hemisphere or "N")  # type: ignore[assignment]
    season_name = seasons.current_season(today, hemisphere)
    produce = seasons.produce_for(hemisphere, season_name)
    produce_names = ", ".join(p.display_name.lower() for p in produce[:8])
    lines.append(
        f"\n## What's in season ({today.strftime('%B')}, {season_name})\n"
        f"Hero produce right now: {produce_names}.\n"
        f"When suggesting a dish, lean toward in-season ingredients when you can."
    )
    return "\n".join(lines)


def _build_recipes_block(recipes: list[dict] | None) -> str:
    """Tell Sage which recipes it produced in this conversation, so it can reference and *tweak* them
    ("make the pasta one vegetarian"). A recipe flagged ``full`` is the one the user explicitly came
    back to adjust — we include its ingredients/steps so Sage can regenerate a faithful variation."""
    if not recipes:
        return ""
    lines = ["## Recipes you've created in this conversation"]
    for r in recipes:
        title = r.get("title", "Untitled")
        summary = r.get("summary") or ""
        lines.append(f'- "{title}"' + (f" — {summary}" if summary else ""))
        if r.get("full"):
            ings = ", ".join(
                i.get("item", "") if isinstance(i, dict) else str(i) for i in r.get("ingredients", [])
            )
            steps = " ".join(
                f"{n}. {s.get('instruction', '') if isinstance(s, dict) else s}"
                for n, s in enumerate(r.get("steps", []), 1)
            )
            if ings:
                lines.append(f"  Ingredients: {ings}")
            if steps:
                lines.append(f"  Steps: {steps}")
    lines.append(
        "When the user asks to change one of these, regenerate the whole recipe with the tweak applied — "
        "never ask them to hand-edit it."
    )
    return "\n".join(lines)


async def stream_chat(
    *,
    profile: TasteProfileOut,
    recalls: list[str],
    foods: list[DetectedFood],
    history: list[dict],
    user_message: str,
    usage_sink: list[Usage],
    sage: dict | None = None,
    recipes: list[dict] | None = None,
) -> AsyncIterator[str]:
    """Yield text deltas as they stream. Appends the final Usage to ``usage_sink`` on completion."""
    # The mood directive is volatile (changes as vitality decays), so it goes AFTER the cached
    # context block — keeping the cacheable prefix (persona + taste profile) stable.
    system = [
        {"type": "text", "text": CHAT_SYSTEM},
        {
            "type": "text",
            "text": _build_context_block(profile, recalls, foods),
            "cache_control": {"type": "ephemeral"},
        },
    ]
    recipes_block = _build_recipes_block(recipes)
    if recipes_block:
        system.append({"type": "text", "text": recipes_block})
    mood = _build_mood_directive(sage)
    if mood:
        system.append({"type": "text", "text": mood})
    messages = [*history, {"role": "user", "content": user_message}]

    async with get_anthropic().messages.stream(
        model=settings.model_chat,
        max_tokens=2048,
        system=system,
        messages=messages,
    ) as stream:
        async for text in stream.text_stream:
            yield text
        final = await stream.get_final_message()

    usage_sink.append(Usage.from_anthropic(final.usage))
