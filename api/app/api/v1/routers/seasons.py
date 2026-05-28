"""Seasonal Journey endpoints — current season, almanac timeline, hemisphere setting."""

from __future__ import annotations

from datetime import datetime, timezone

from fastapi import APIRouter
from sqlalchemy import select

from app.core.security import CurrentUser
from app.db.models import SeasonalHarvest
from app.db.session import DbSession
from app.schemas.profile import TasteProfileOut, TasteProfileUpdate
from app.schemas.seasons import (
    AlmanacEntry,
    HarvestProgressOut,
    HemisphereUpdate,
    ProduceOut,
    SeasonOut,
)
from app.services import memory
from app.services import seasons as seasons_service
from app.services.sage_pet import HARVEST_TARGET

router = APIRouter(tags=["seasons"])


def _to_progress(
    harvest: SeasonalHarvest | None, total: int
) -> HarvestProgressOut:
    if harvest is None:
        return HarvestProgressOut(target=HARVEST_TARGET, total=total)
    return HarvestProgressOut(
        cooked=harvest.ingredients_cooked or [],
        cooks_count=harvest.cooks_count or 0,
        target=HARVEST_TARGET,
        total=total,
        awards_earned=harvest.awards_earned or [],
        started_at=harvest.started_at,
        completed_at=harvest.completed_at,
    )


@router.get("/seasons/current", response_model=SeasonOut)
async def get_current_season(user: CurrentUser, db: DbSession) -> SeasonOut:
    profile = await memory.get_profile(db, user.id)
    hemisphere: seasons_service.Hemisphere = (profile.hemisphere or "N")  # type: ignore[assignment]
    today = datetime.now(timezone.utc).date()
    season_name = seasons_service.current_season(today, hemisphere)
    year = today.year

    produce = seasons_service.produce_for(hemisphere, season_name)
    harvest = await db.get(SeasonalHarvest, (user.id, season_name, year))

    return SeasonOut(
        season=season_name,
        year=year,
        hemisphere=hemisphere,
        produce=[
            ProduceOut(slug=p.slug, display_name=p.display_name, icon=p.icon)
            for p in produce
        ],
        harvest=_to_progress(harvest, total=len(produce)),
    )


@router.get("/seasons/almanac", response_model=list[AlmanacEntry])
async def get_almanac(
    user: CurrentUser, db: DbSession, year: int | None = None
) -> list[AlmanacEntry]:
    query = select(SeasonalHarvest).where(SeasonalHarvest.user_id == user.id)
    if year is not None:
        query = query.where(SeasonalHarvest.year == year)
    query = query.order_by(SeasonalHarvest.year.desc(), SeasonalHarvest.season)
    rows = await db.execute(query)
    return [
        AlmanacEntry(
            season=r.season,            # type: ignore[arg-type]
            year=r.year,
            hemisphere=r.hemisphere,    # type: ignore[arg-type]
            ingredients_cooked=r.ingredients_cooked or [],
            cooks_count=r.cooks_count or 0,
            awards_earned=r.awards_earned or [],
            started_at=r.started_at,
            completed_at=r.completed_at,
        )
        for r in rows.scalars().all()
    ]


@router.patch("/seasons/hemisphere", response_model=TasteProfileOut)
async def set_hemisphere(
    update: HemisphereUpdate, user: CurrentUser, db: DbSession
) -> TasteProfileOut:
    """One-shot onboarding setter for the user's hemisphere — drives the seasonal calendar."""
    await memory.apply_update(
        db, user.id, TasteProfileUpdate(hemisphere=update.hemisphere)
    )
    await db.commit()
    return await memory.get_profile(db, user.id)
