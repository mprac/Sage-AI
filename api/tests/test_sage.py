"""Unit tests for Sage's pure game logic (no DB / network)."""

from datetime import date, datetime, timedelta, timezone

from app.services.sage_pet import (
    DECAY_PER_DAY,
    apply_xp,
    bond_level,
    compute_current_vitality,
    hours_until_hungry,
    mood_for,
    next_streak,
    xp_to_next,
)


def test_decay_over_time():
    now = datetime(2026, 5, 25, 12, 0, tzinfo=timezone.utc)
    # No time elapsed → unchanged.
    assert compute_current_vitality(100, now, now) == 100
    # One full day → drops by DECAY_PER_DAY.
    a_day_later = now + timedelta(days=1)
    assert compute_current_vitality(100, now, a_day_later) == 100 - int(DECAY_PER_DAY)
    # Clamps at 0, never negative.
    assert compute_current_vitality(20, now, now + timedelta(days=5)) == 0


def test_xp_curve_and_level_up():
    assert xp_to_next(1) == 100
    # 250 xp from level 1: level1(100) + level2(200=needs 200, has 150) → level 2 with 150 leftover.
    level, leftover, gained = apply_xp(1, 0, 250)
    assert level == 2 and leftover == 150 and gained == 1
    # Enough to jump two levels.
    level, leftover, gained = apply_xp(1, 0, 100 + 200 + 50)
    assert level == 3 and leftover == 50 and gained == 2


def test_streak_logic():
    today = date(2026, 5, 25)
    assert next_streak(None, today, 0) == 1                       # first ever
    assert next_streak(today - timedelta(days=1), today, 4) == 5  # consecutive day
    assert next_streak(today, today, 5) == 5                      # already fed today
    assert next_streak(today - timedelta(days=3), today, 9) == 1  # gap resets


def test_mood_bands():
    assert mood_for(95, False)[0] == "thriving"
    assert mood_for(60, False)[0] == "content"
    assert mood_for(40, False)[0] == "peckish"
    assert mood_for(20, False)[0] == "hungry"
    assert mood_for(5, False)[0] == "weak"
    assert mood_for(0, False)[0] == "fainted"
    assert mood_for(80, True)[0] == "fainted"  # dormant overrides


def test_bond_level_is_monotonic():
    assert bond_level(0) == 1
    assert bond_level(200) == 2
    assert bond_level(450) == 3
    assert bond_level(1000) >= bond_level(450)


def test_hours_until_hungry():
    assert hours_until_hungry(30) == 0.0
    assert hours_until_hungry(20) == 0.0
    # From 70 down to the hungry threshold (30) at DECAY_PER_DAY/day.
    assert hours_until_hungry(70) > 0
