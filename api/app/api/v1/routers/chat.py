"""POST /chat — SSE streaming chat with the personal chef (metered + memory)."""

from __future__ import annotations

import json
from collections.abc import AsyncIterator

from fastapi import APIRouter
from fastapi.responses import StreamingResponse
from sqlalchemy import select

from app.core.config import settings
from app.core.security import CurrentUser
from app.db.models import ChatMessage, ChatSession, Recognition
from app.db.session import DbSession, SessionLocal
from app.schemas.chat import ChatDelta, ChatDone, ChatError, ChatOffer, ChatRequest, ChatSummary, ChatTurn
from app.schemas.recognition import DetectedFood
from app.services import credits, memory, sage_pet
from app.services.anthropic_client import Usage
from app.services.chat import stream_chat

router = APIRouter(tags=["chat"])

# The chef appends this sentinel on its own final line ONLY when it is explicitly inviting the user
# to generate the full structured recipe (see CHAT_SYSTEM). We strip it from the visible stream and
# turn it into a single `ChatOffer` event, so the client can arm its 'yes → recipe' shortcut
# deterministically — never guessing from the reply text.
OFFER_SENTINEL = "[[OFFER_RECIPE]]"


def _safe_emit_end(acc: str) -> int:
    """How many leading chars of ``acc`` are safe to stream now without ever leaking a partial
    sentinel. We hold back the longest trailing run that is a *prefix* of the sentinel (it might
    still be completing); a fully-formed sentinel anywhere in the emitted slice is stripped
    separately. This is robust even when the model adds a trailing newline after the marker."""
    hold = 0
    for k in range(min(len(OFFER_SENTINEL) - 1, len(acc)), 0, -1):
        if acc.endswith(OFFER_SENTINEL[:k]):
            hold = k
            break
    return len(acc) - hold


def _sse(model) -> str:
    return f"data: {model.model_dump_json()}\n\n"


async def _load_foods(db: DbSession, recognition_id: str | None, fallback: list[DetectedFood] | None):
    if recognition_id:
        rec = await db.get(Recognition, recognition_id)
        if rec and rec.foods:
            return [DetectedFood(**f) for f in rec.foods]
    return fallback or []


@router.post("/chat")
async def chat(req: ChatRequest, user: CurrentUser, db: DbSession):
    await credits.ensure_can_start(db, user.id)

    # Resolve / create the chat session. New sessions are titled from the first user message.
    title = req.message.strip()[:60]
    if req.session_id:
        session = await db.get(ChatSession, req.session_id)
        if session is None or str(session.user_id) != user.id:
            session = ChatSession(user_id=user.id, recognition_id=req.recognition_id, title=title)
            db.add(session)
    else:
        session = ChatSession(user_id=user.id, recognition_id=req.recognition_id, title=title)
        db.add(session)
    await db.flush()
    session_id = str(session.id)

    profile = await memory.get_profile(db, user.id)
    recalls = await memory.recall(db, user.id, req.message)
    foods = await _load_foods(db, req.recognition_id, req.foods)

    # Sage's live mood flavors the chat voice (hungry Sage nudges you to cook, etc.).
    pet = await sage_pet.get_or_create(db, user.id)
    pet_out = sage_pet.to_out(pet)
    sage_state = {
        "state": pet_out.state,
        "name": pet.name,
        "level": pet.level,
        "streak_days": pet.streak_days,
    }

    rows = await db.execute(
        select(ChatMessage)
        .where(ChatMessage.session_id == session.id)
        .order_by(ChatMessage.created_at.desc())
        .limit(settings.chat_history_limit)
    )
    history = [{"role": m.role, "content": m.content} for m in reversed(rows.scalars().all())]

    db.add(ChatMessage(session_id=session.id, role="user", content=req.message))
    await db.commit()

    async def gen() -> AsyncIterator[str]:
        usage_sink: list[Usage] = []
        acc = ""  # raw text received so far
        sent = 0  # chars already emitted to the client
        offer = False
        try:
            async for delta in stream_chat(
                profile=profile,
                recalls=recalls,
                foods=foods,
                history=history,
                user_message=req.message,
                usage_sink=usage_sink,
                sage=sage_state,
            ):
                acc += delta
                # Stream everything that can't be (part of) the trailing sentinel; strip any fully
                # formed sentinel from what we emit.
                safe_end = _safe_emit_end(acc)
                if safe_end > sent:
                    chunk = acc[sent:safe_end]
                    sent = safe_end
                    if OFFER_SENTINEL in chunk:
                        offer = True
                        chunk = chunk.replace(OFFER_SENTINEL, "")
                    if chunk:
                        yield _sse(ChatDelta(text=chunk))
        except Exception as exc:  # surface a clean error event to the client
            yield _sse(ChatError(message="The chef hit a snag. Please try again.", code=type(exc).__name__))
            return

        # Flush the guarded tail, stripping the sentinel if it landed there.
        tail = acc[sent:]
        if OFFER_SENTINEL in tail:
            offer = True
            tail = tail.replace(OFFER_SENTINEL, "")
        if tail:
            yield _sse(ChatDelta(text=tail))

        reply = acc.replace(OFFER_SENTINEL, "").rstrip()
        usage = usage_sink[0] if usage_sink else Usage(0, 0)

        # Persist the assistant turn + meter the spend in a fresh session (the request-scoped
        # one may be mid-teardown by the time the stream drains).
        async with SessionLocal() as s:
            s.add(ChatMessage(session_id=session.id, role="assistant", content=reply))
            spent, balance = await credits.charge(
                s,
                user.id,
                model=settings.model_chat,
                input_tokens=usage.input_tokens,
                output_tokens=usage.output_tokens,
                reason="chat",
                meta={"session_id": session_id},
            )
            await s.commit()

        if offer:
            yield _sse(ChatOffer())
        yield _sse(ChatDone(session_id=session_id, credits_spent=spent, balance=balance))

        # Learn durable preferences from this exchange (best-effort, not billed to the user).
        try:
            async with SessionLocal() as s:
                await memory.learn_from_conversation(
                    s, user.id, f"User: {req.message}\nChef: {reply}"
                )
                await s.commit()
        except Exception:
            pass

    return StreamingResponse(gen(), media_type="text/event-stream")


@router.get("/chats", response_model=list[ChatSummary])
async def list_chats(user: CurrentUser, db: DbSession) -> list[ChatSummary]:
    """The user's past conversations, newest first (for the Chats tab)."""
    rows = await db.execute(
        select(ChatSession)
        .where(ChatSession.user_id == user.id)
        .order_by(ChatSession.created_at.desc())
        .limit(100)
    )
    return [
        ChatSummary(id=str(s.id), title=s.title or "Untitled chat", created_at=s.created_at)
        for s in rows.scalars().all()
    ]


@router.get("/chats/{session_id}/messages", response_model=list[ChatTurn])
async def list_chat_messages(session_id: str, user: CurrentUser, db: DbSession) -> list[ChatTurn]:
    """Ordered messages for one of the user's chat sessions (owner-checked)."""
    session = await db.get(ChatSession, session_id)
    if session is None or str(session.user_id) != user.id:
        from fastapi import HTTPException, status

        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Chat not found")
    rows = await db.execute(
        select(ChatMessage)
        .where(ChatMessage.session_id == session_id)
        .order_by(ChatMessage.created_at)
    )
    return [ChatTurn(role=m.role, content=m.content) for m in rows.scalars().all()]
