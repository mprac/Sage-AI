"""GET/PATCH /profile — the user's taste profile, and signup-bonus bootstrap."""

from __future__ import annotations

from fastapi import APIRouter
from sqlalchemy import select

from app.core.config import settings
from app.core.security import CurrentUser
from app.db.models import CreditLedger
from app.db.session import DbSession
from app.schemas.profile import TasteProfileOut, TasteProfileUpdate
from app.services import credits, memory

router = APIRouter(tags=["profile"])


@router.get("/profile", response_model=TasteProfileOut)
async def get_profile(user: CurrentUser, db: DbSession) -> TasteProfileOut:
    return await memory.get_profile(db, user.id)


@router.patch("/profile", response_model=TasteProfileOut)
async def update_profile(
    update: TasteProfileUpdate, user: CurrentUser, db: DbSession
) -> TasteProfileOut:
    await memory.apply_update(db, user.id, update)
    await db.commit()
    return await memory.get_profile(db, user.id)


@router.post("/profile/bootstrap", response_model=TasteProfileOut)
async def bootstrap(user: CurrentUser, db: DbSession) -> TasteProfileOut:
    """Idempotently grant the signup bonus the first time a user signs in."""
    already = await db.scalar(
        select(CreditLedger.id)
        .where(CreditLedger.user_id == user.id, CreditLedger.reason == "signup_bonus")
        .limit(1)
    )
    if already is None:
        await credits.grant_credits(
            db, user.id, settings.signup_bonus_credits, reason="signup_bonus"
        )
        await db.commit()
    return await memory.get_profile(db, user.id)
