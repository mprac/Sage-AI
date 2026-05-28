"""Unit tests for Sage's pure game logic (no DB / network)."""

from datetime import date, datetime, timedelta, timezone

from app.services.sage_pet import (
    DECAY_PER_DAY,
    apply_xp,
    bond_level,
    compute_current_vitality,
    compute_harvest_update,
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


def test_harvest_update_first_cook_adds_slugs():
    new_slugs, updated, new_awards = compute_harvest_update(
        current_ingredients_cooked=[],
        current_awards_earned=[],
        matched_slugs={"apple", "butternut-squash"},
        season="fall",
        year=2026,
    )
    assert new_slugs == ["apple", "butternut-squash"]
    assert updated == ["apple", "butternut-squash"]
    assert new_awards == []  # below threshold


def test_harvest_update_dedupes_existing_slugs():
    new_slugs, updated, new_awards = compute_harvest_update(
        current_ingredients_cooked=["apple"],
        current_awards_earned=[],
        matched_slugs={"apple", "pear"},
        season="fall",
        year=2026,
    )
    assert new_slugs == ["pear"]
    assert updated == ["apple", "pear"]
    assert new_awards == []


def test_harvest_update_8th_slug_emits_harvester():
    seven = ["apple", "pear", "pumpkin", "fig", "kale", "cranberry", "persimmon"]
    new_slugs, updated, new_awards = compute_harvest_update(
        current_ingredients_cooked=seven,
        current_awards_earned=[],
        matched_slugs={"butternut-squash"},
        season="fall",
        year=2026,
    )
    assert new_slugs == ["butternut-squash"]
    assert len(updated) == 8
    assert "fall-2026-harvester" in new_awards


def test_harvest_update_12th_slug_emits_bumper_crop():
    eleven = [
        "apple", "pear", "pumpkin", "fig", "kale", "cranberry",
        "persimmon", "butternut-squash", "brussels-sprouts", "sweet-potato", "pomegranate",
    ]
    new_slugs, updated, new_awards = compute_harvest_update(
        current_ingredients_cooked=eleven,
        current_awards_earned=["fall-2026-harvester"],  # already earned
        matched_slugs={"cauliflower"},
        season="fall",
        year=2026,
    )
    assert len(updated) == 12
    assert "fall-2026-bumper-crop" in new_awards
    # Harvester is NOT re-emitted because it's already earned.
    assert "fall-2026-harvester" not in new_awards


def test_harvest_update_no_new_slugs_returns_no_awards():
    new_slugs, updated, new_awards = compute_harvest_update(
        current_ingredients_cooked=["apple", "pear"],
        current_awards_earned=[],
        matched_slugs={"apple"},  # already have it
        season="fall",
        year=2026,
    )
    assert new_slugs == []
    assert updated == ["apple", "pear"]
    assert new_awards == []
