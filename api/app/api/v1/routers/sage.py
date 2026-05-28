"""Sage companion endpoints — the Tamagotchi-style chef pet."""

from __future__ import annotations

from fastapi import APIRouter

from app.core.security import CurrentUser
from app.db.session import DbSession
from app.schemas.sage import Cosmetic, FeedRequest, FeedResult, RenameRequest, SagePetOut
from app.services import sage_pet

router = APIRouter(tags=["sage"])


@router.get("/sage", response_model=SagePetOut)
async def get_sage(user: CurrentUser, db: DbSession) -> SagePetOut:
    pet = await sage_pet.maybe_daily_checkin(db, user.id)
    await db.commit()
    return sage_pet.to_out(pet)


@router.get("/sage/cosmetics", response_model=list[Cosmetic])
async def list_cosmetics() -> list[Cosmetic]:
    return sage_pet.COSMETICS


@router.post("/sage/feed", response_model=FeedResult)
async def feed_sage(req: FeedRequest, user: CurrentUser, db: DbSession) -> FeedResult:
    pet, leveled_up, revived, harvest_delta = await sage_pet.feed(
        db, user.id, req.source, recipe_id=req.recipe_id
    )
    await db.commit()
    return FeedResult(
        pet=sage_pet.to_out(pet),
        leveled_up=leveled_up,
        revived=revived,
        harvest_delta=harvest_delta,
    )


@router.post("/sage/treat", response_model=FeedResult)
async def treat_sage(user: CurrentUser, db: DbSession) -> FeedResult:
    pet, balance = await sage_pet.treat(db, user.id)
    await db.commit()
    return FeedResult(pet=sage_pet.to_out(pet), credits_balance=balance)


@router.post("/sage/cosmetics/{cosmetic_id}/buy", response_model=FeedResult)
async def buy_cosmetic(cosmetic_id: str, user: CurrentUser, db: DbSession) -> FeedResult:
    pet, balance = await sage_pet.buy_cosmetic(db, user.id, cosmetic_id)
    await db.commit()
    return FeedResult(pet=sage_pet.to_out(pet), credits_balance=balance)


@router.patch("/sage", response_model=SagePetOut)
async def rename_sage(req: RenameRequest, user: CurrentUser, db: DbSession) -> SagePetOut:
    pet = await sage_pet.rename(db, user.id, req.name)
    await db.commit()
    return sage_pet.to_out(pet)
