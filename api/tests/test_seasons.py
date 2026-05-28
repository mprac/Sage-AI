"""Unit tests for the seasonal produce service (no DB / network)."""

from datetime import date

from app.services.seasons import (
    SEASONAL_PRODUCE,
    current_season,
    match_ingredients,
    produce_for,
)


# ── Season determination ──────────────────────────────────────────────────────

def test_current_season_northern():
    # Spring boundary
    assert current_season(date(2026, 3, 1), "N") == "spring"
    assert current_season(date(2026, 5, 31), "N") == "spring"
    assert current_season(date(2026, 6, 1), "N") == "summer"
    assert current_season(date(2026, 9, 1), "N") == "fall"
    assert current_season(date(2026, 12, 1), "N") == "winter"
    assert current_season(date(2026, 2, 28), "N") == "winter"
    assert current_season(date(2026, 1, 15), "N") == "winter"


def test_current_season_southern_is_inverted():
    # When N is spring, S is fall.
    assert current_season(date(2026, 4, 1), "S") == "fall"
    assert current_season(date(2026, 7, 1), "S") == "winter"
    assert current_season(date(2026, 10, 1), "S") == "spring"
    assert current_season(date(2026, 1, 1), "S") == "summer"


# ── Catalog structure ─────────────────────────────────────────────────────────

def test_each_cell_has_exactly_12_entries():
    for h in ("N", "S"):
        for s in ("spring", "summer", "fall", "winter"):
            assert len(produce_for(h, s)) == 12, (h, s)


def test_southern_mirrors_northern():
    # The S catalog must be the N catalog, hemispherically shifted.
    assert SEASONAL_PRODUCE[("S", "fall")]   == SEASONAL_PRODUCE[("N", "spring")]
    assert SEASONAL_PRODUCE[("S", "winter")] == SEASONAL_PRODUCE[("N", "summer")]
    assert SEASONAL_PRODUCE[("S", "spring")] == SEASONAL_PRODUCE[("N", "fall")]
    assert SEASONAL_PRODUCE[("S", "summer")] == SEASONAL_PRODUCE[("N", "winter")]


def test_slugs_are_unique_per_cell():
    for h in ("N", "S"):
        for s in ("spring", "summer", "fall", "winter"):
            slugs = [p.slug for p in produce_for(h, s)]
            assert len(slugs) == len(set(slugs)), f"Duplicate slugs in ({h}, {s}): {slugs}"


def test_all_entries_have_non_empty_fields():
    seen_slugs: set[str] = set()
    for (h, s), entries in SEASONAL_PRODUCE.items():
        if h == "N":  # S entries are identical objects; only check N to avoid double-counting
            for entry in entries:
                assert entry.slug, f"Empty slug in ({h}, {s})"
                assert entry.display_name, f"Empty display_name for {entry.slug}"
                assert entry.icon, f"Empty icon for {entry.slug}"
                seen_slugs.add(entry.slug)
    # Sanity: 4 seasons × 12 entries = 48 unique N slugs.
    assert len(seen_slugs) == 48, f"Expected 48 unique N slugs, got {len(seen_slugs)}"


# ── match_ingredients ─────────────────────────────────────────────────────────

def test_match_ingredients_canonical():
    today = date(2026, 10, 15)  # N fall
    result = match_ingredients(["butternut squash", "apple", "olive oil"], "N", today)
    assert "butternut-squash" in result
    assert "apple" in result
    # olive oil is not a hero produce
    assert all("olive" not in s for s in result)


def test_match_ingredients_plurals_and_descriptors():
    today = date(2026, 10, 15)  # N fall
    assert "apple" in match_ingredients(["2 large apples, chopped"], "N", today)
    assert "brussels-sprouts" in match_ingredients(["1 lb brussels sprouts (trimmed)"], "N", today)


def test_match_ingredients_synonyms():
    summer = date(2026, 7, 1)  # N summer
    # courgette is a synonym for zucchini
    matched = match_ingredients(["1 courgette, sliced"], "N", summer)
    assert "zucchini" in matched


def test_match_ingredients_out_of_season_returns_empty():
    winter = date(2026, 1, 15)  # N winter
    # Tomatoes are summer; in winter they should NOT match.
    assert match_ingredients(["2 tomatoes"], "N", winter) == set()


def test_match_ingredients_fresh_prefix_stripped():
    summer = date(2026, 7, 15)  # N summer
    assert "basil" in match_ingredients(["fresh basil leaves"], "N", summer)
    assert "tomato" in match_ingredients(["3 fresh tomatoes, diced"], "N", summer)


def test_match_ingredients_parenthetical_stripped():
    summer = date(2026, 7, 15)
    # "cherry tomatoes (halved)" — parenthetical must not break matching
    result = match_ingredients(["1 cup cherry tomatoes (halved)"], "N", summer)
    assert "tomato" in result


def test_match_ingredients_multi_word_produce():
    spring = date(2026, 4, 10)  # N spring
    # "spring onion" is multi-word; slug is "spring-onion"
    result = match_ingredients(["2 spring onions, thinly sliced"], "N", spring)
    assert "spring-onion" in result


def test_match_ingredients_south_hemisphere_season_shift():
    # In S hemisphere, July is winter → N summer produce.
    s_winter = date(2026, 7, 1)
    result = match_ingredients(["1 zucchini", "2 tomatoes"], "S", s_winter)
    assert "zucchini" in result
    assert "tomato" in result


def test_match_ingredients_empty_list():
    today = date(2026, 6, 15)
    assert match_ingredients([], "N", today) == set()


def test_match_ingredients_no_produce_in_string():
    today = date(2026, 6, 15)
    result = match_ingredients(["2 tbsp olive oil", "1 cup flour", "salt to taste"], "N", today)
    assert result == set()


def test_match_ingredients_aubergine_synonym():
    summer = date(2026, 8, 1)  # N summer
    result = match_ingredients(["1 large aubergine, cubed"], "N", summer)
    assert "eggplant" in result


def test_match_ingredients_beet_synonyms():
    winter = date(2026, 1, 10)  # N winter
    assert "beet" in match_ingredients(["2 beetroots"], "N", winter)
    assert "beet" in match_ingredients(["roasted golden beet"], "N", winter)
