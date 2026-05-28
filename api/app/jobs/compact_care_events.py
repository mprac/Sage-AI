"""Compact ``care_events`` older than 90 days into daily rollups, then delete the raw rows.

Why: ``care_events`` is append-only and would grow unboundedly across years × users. The Almanac
UI and any long-term history view read from ``seasonal_harvests`` + ``daily_summary``, never raw
events. So we keep the last 90 days of raw events for short-term debugging / activity feed, and
roll older rows into one ``daily_summary`` row per user per day.

Run nightly:
    cd api ; python -m app.jobs.compact_care_events
or wire it to Supabase Cron (calls the same module via a tiny HTTP endpoint).
"""

from __future__ import annotations

import asyncio
import logging
from datetime import datetime, timedelta, timezone

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import SessionLocal

RETENTION_DAYS = 90

log = logging.getLogger(__name__)

# Aggregate events older than the cutoff into one row per (user, day), then delete them.
# Using SUM(CASE…) per event type keeps it to a single round-trip per compaction.
_AGGREGATE_SQL = text(
    """
    insert into daily_summary
        (user_id, day, cooks, treats, snacks, checkins, xp_gained, vitality_delta)
    select
        user_id,
        (created_at at time zone 'UTC')::date as day,
        sum(case when type = 'cook'    then 1 else 0 end) as cooks,
        sum(case when type = 'treat'   then 1 else 0 end) as treats,
        sum(case when type = 'snack'   then 1 else 0 end) as snacks,
        sum(case when type = 'checkin' then 1 else 0 end) as checkins,
        sum(xp_delta) as xp_gained,
        sum(vitality_delta) as vitality_delta
    from care_events
    where created_at < :cutoff
    group by user_id, day
    on conflict (user_id, day) do update set
        cooks          = daily_summary.cooks          + excluded.cooks,
        treats         = daily_summary.treats         + excluded.treats,
        snacks         = daily_summary.snacks         + excluded.snacks,
        checkins       = daily_summary.checkins       + excluded.checkins,
        xp_gained      = daily_summary.xp_gained      + excluded.xp_gained,
        vitality_delta = daily_summary.vitality_delta + excluded.vitality_delta
    """
)

_DELETE_SQL = text("delete from care_events where created_at < :cutoff")


async def compact(db: AsyncSession, *, retention_days: int = RETENTION_DAYS) -> dict:
    """Run one compaction pass. Returns counts: ``{'rolled_days': N, 'deleted_events': N}``."""
    cutoff = datetime.now(timezone.utc) - timedelta(days=retention_days)
    agg_result = await db.execute(_AGGREGATE_SQL, {"cutoff": cutoff})
    del_result = await db.execute(_DELETE_SQL, {"cutoff": cutoff})
    await db.commit()
    return {
        "cutoff": cutoff.isoformat(),
        "rolled_days": agg_result.rowcount or 0,
        "deleted_events": del_result.rowcount or 0,
    }


async def _main() -> None:
    logging.basicConfig(level=logging.INFO)
    async with SessionLocal() as db:
        result = await compact(db)
    log.info("Compaction complete: %s", result)


if __name__ == "__main__":
    asyncio.run(_main())
