"""Personal-chef memory: taste profile (structured) + summary + pgvector semantic recall.

- ``get_profile`` / ``apply_update`` manage the structured ``taste_profiles`` row.
- ``recall`` does a pgvector cosine search over the user's ``memories`` for relevant past notes.
- ``learn_from_conversation`` runs a cheap Haiku pass to extract durable preferences, merges them
  into the profile, and embeds a note into ``memories`` for future recall.
"""

from __future__ import annotations

from sqlalchemy import select, text
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.db.models import TasteProfile
from app.prompts import EXTRACT_SYSTEM
from app.schemas.profile import TasteProfileOut, TasteProfileUpdate
from app.services.anthropic_client import Usage, embed, get_anthropic

_LIST_FIELDS = ("likes", "dislikes", "allergies", "dietary_restrictions", "favorite_cuisines")

_EXTRACT_TOOL = {
    "name": "report_preferences",
    "description": "Record durable food preferences expressed by the user.",
    "input_schema": {
        "type": "object",
        "properties": {
            "likes": {"type": "array", "items": {"type": "string"}},
            "dislikes": {"type": "array", "items": {"type": "string"}},
            "allergies": {"type": "array", "items": {"type": "string"}},
            "dietary_restrictions": {"type": "array", "items": {"type": "string"}},
            "favorite_cuisines": {"type": "array", "items": {"type": "string"}},
            "spice_tolerance": {"type": "string"},
            "cooking_skill": {"type": "string"},
            "household_size": {"type": "integer"},
            "note": {"type": "string", "description": "One-sentence durable note to remember, if any"},
        },
    },
}


async def get_profile(db: AsyncSession, user_id: str) -> TasteProfileOut:
    row = await db.get(TasteProfile, user_id)
    if row is None:
        return TasteProfileOut()
    return TasteProfileOut(
        likes=row.likes or [],
        dislikes=row.dislikes or [],
        allergies=row.allergies or [],
        dietary_restrictions=row.dietary_restrictions or [],
        favorite_cuisines=row.favorite_cuisines or [],
        spice_tolerance=row.spice_tolerance,
        cooking_skill=row.cooking_skill,
        household_size=row.household_size,
        memory_summary=row.memory_summary or "",
    )


async def apply_update(db: AsyncSession, user_id: str, update: TasteProfileUpdate) -> None:
    """Upsert the profile, merging list fields (union) and overwriting scalars. Caller commits."""
    current = await get_profile(db, user_id)
    values: dict = {"user_id": user_id}
    for field in _LIST_FIELDS:
        new = getattr(update, field)
        if new is not None:
            merged = sorted({*getattr(current, field), *new})
            values[field] = merged
    for scalar in ("spice_tolerance", "cooking_skill", "household_size"):
        v = getattr(update, scalar)
        if v is not None:
            values[scalar] = v

    await db.execute(
        pg_insert(TasteProfile)
        .values(**values)
        .on_conflict_do_update(
            index_elements=[TasteProfile.user_id],
            set_={k: v for k, v in values.items() if k != "user_id"},
        )
    )


async def recall(db: AsyncSession, user_id: str, query: str, k: int = 4) -> list[str]:
    """Return up to k past memory notes most relevant to the query (pgvector cosine)."""
    try:
        query_vec = await embed(query)
    except Exception:
        return []
    vec_literal = "[" + ",".join(str(x) for x in query_vec) + "]"
    rows = await db.execute(
        text(
            "SELECT content FROM memories WHERE user_id = :uid "
            "ORDER BY embedding <=> CAST(:vec AS vector) LIMIT :k"
        ),
        {"uid": user_id, "vec": vec_literal, "k": k},
    )
    return [r[0] for r in rows.all()]


async def learn_from_conversation(
    db: AsyncSession, user_id: str, conversation_text: str
) -> Usage:
    """Extract durable preferences (Haiku) → update profile + embed a memory note. Caller commits."""
    response = await get_anthropic().messages.create(
        model=settings.model_extract,
        max_tokens=512,
        system=EXTRACT_SYSTEM,
        tools=[_EXTRACT_TOOL],
        tool_choice={"type": "tool", "name": "report_preferences"},
        messages=[{"role": "user", "content": conversation_text}],
    )
    block = next((b for b in response.content if b.type == "tool_use"), None)
    data = block.input if block else {}

    update = TasteProfileUpdate(
        likes=data.get("likes"),
        dislikes=data.get("dislikes"),
        allergies=data.get("allergies"),
        dietary_restrictions=data.get("dietary_restrictions"),
        favorite_cuisines=data.get("favorite_cuisines"),
        spice_tolerance=data.get("spice_tolerance"),
        cooking_skill=data.get("cooking_skill"),
        household_size=data.get("household_size"),
    )
    await apply_update(db, user_id, update)

    note = (data.get("note") or "").strip()
    if note:
        try:
            vec = await embed(note)
            vec_literal = "[" + ",".join(str(x) for x in vec) + "]"
            await db.execute(
                text(
                    "INSERT INTO memories (user_id, content, kind, embedding) "
                    "VALUES (:uid, :content, 'preference', CAST(:vec AS vector))"
                ),
                {"uid": user_id, "content": note, "vec": vec_literal},
            )
        except Exception:
            pass  # embedding is best-effort; never fail the request over memory

    return Usage.from_anthropic(response.usage)
