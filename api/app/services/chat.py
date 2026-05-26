"""Streaming chat orchestration: Sonnet + prompt caching + personal-chef memory.

The system prompt is built as two blocks:
  1. the frozen persona/guardrails (stable across all users)
  2. the per-user context (taste profile + memory summary + pgvector recalls + detected foods)
A `cache_control` breakpoint on block 2 caches the whole prefix, so multi-turn chats within a
session reuse it cheaply (verify via usage.cache_read_input_tokens).
"""

from __future__ import annotations

from collections.abc import AsyncIterator

from app.core.config import settings
from app.prompts import CHAT_SYSTEM
from app.schemas.profile import TasteProfileOut
from app.schemas.recognition import DetectedFood
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
    profile: TasteProfileOut, recalls: list[str], foods: list[DetectedFood]
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
