"""Seasonal produce catalog and matching utilities.

Pure Python — no DB, no async, no FastAPI imports.
Called by sage_pet.feed() (seasonal bonus) and GET /seasons/current.
"""

from __future__ import annotations

import re
from dataclasses import dataclass
from datetime import date
from typing import Literal

# ── Types ─────────────────────────────────────────────────────────────────────
Season = Literal["spring", "summer", "fall", "winter"]
Hemisphere = Literal["N", "S"]


# ── Catalog entry ─────────────────────────────────────────────────────────────
@dataclass(frozen=True)
class ProduceEntry:
    slug: str                    # canonical, lowercase, hyphenated ("butternut-squash")
    display_name: str            # "Butternut squash"
    icon: str                    # lucide icon name
    synonyms: tuple[str, ...]    # lowercased alternative names


# ── Northern-hemisphere catalog (12 entries per season) ───────────────────────

_N_SPRING: tuple[ProduceEntry, ...] = (
    ProduceEntry("asparagus",    "Asparagus",    "leaf",      ("asparaguses", "asparagus spears")),
    ProduceEntry("peas",         "Peas",         "circle",    ("pea", "green peas", "garden peas", "snap peas", "snow peas")),
    ProduceEntry("strawberry",   "Strawberry",   "heart",     ("strawberries",)),
    ProduceEntry("rhubarb",      "Rhubarb",      "leaf",      ("rhubarbs",)),
    ProduceEntry("ramps",        "Ramps",        "leaf",      ("ramp", "wild garlic", "wild leek", "wild leeks")),
    ProduceEntry("artichoke",    "Artichoke",    "flower",    ("artichokes", "globe artichoke", "globe artichokes")),
    ProduceEntry("radish",       "Radish",       "circle",    ("radishes", "french radish")),
    ProduceEntry("spring-onion", "Spring onion", "leaf",      ("spring onions", "scallion", "scallions", "green onion", "green onions")),
    ProduceEntry("fennel",       "Fennel",       "leaf",      ("fennel bulb", "fennel fronds")),
    ProduceEntry("fava-beans",   "Fava beans",   "leaf",      ("fava bean", "broad beans", "broad bean", "fava")),
    ProduceEntry("morels",       "Morels",       "layers",    ("morel", "morel mushroom", "morel mushrooms")),
    ProduceEntry("spinach",      "Spinach",      "leaf",      ("baby spinach", "spinaches")),
)

_N_SUMMER: tuple[ProduceEntry, ...] = (
    ProduceEntry("tomato",       "Tomato",       "circle",    ("tomatoes", "cherry tomato", "cherry tomatoes", "plum tomato", "plum tomatoes", "heirloom tomato")),
    ProduceEntry("corn",         "Corn",         "sun",       ("sweetcorn", "sweet corn", "corn cob", "corn on the cob", "maize")),
    ProduceEntry("zucchini",     "Zucchini",     "leaf",      ("zucchinis", "courgette", "courgettes", "summer squash")),
    ProduceEntry("peach",        "Peach",        "circle",    ("peaches", "nectarine", "nectarines")),
    ProduceEntry("basil",        "Basil",        "leaf",      ("fresh basil", "sweet basil", "thai basil")),
    ProduceEntry("blueberry",    "Blueberry",    "circle",    ("blueberries",)),
    ProduceEntry("watermelon",   "Watermelon",   "circle",    ("watermelons",)),
    ProduceEntry("eggplant",     "Eggplant",     "leaf",      ("eggplants", "aubergine", "aubergines")),
    ProduceEntry("cucumber",     "Cucumber",     "leaf",      ("cucumbers", "english cucumber", "pickling cucumber")),
    ProduceEntry("bell-pepper",  "Bell pepper",  "circle",    ("bell peppers", "sweet pepper", "sweet peppers", "capsicum", "capsicums", "red pepper", "green pepper", "yellow pepper")),
    ProduceEntry("cherry",       "Cherry",       "circle",    ("cherries", "sweet cherry", "sour cherry", "sour cherries")),
    ProduceEntry("raspberry",    "Raspberry",    "circle",    ("raspberries",)),
)

_N_FALL: tuple[ProduceEntry, ...] = (
    ProduceEntry("butternut-squash", "Butternut squash", "sun",    ("butternut squashes", "butternut", "buttercup squash")),
    ProduceEntry("apple",            "Apple",            "apple",  ("apples", "fuji apple", "granny smith", "honeycrisp")),
    ProduceEntry("pumpkin",          "Pumpkin",          "sun",    ("pumpkins", "sugar pumpkin", "pie pumpkin")),
    ProduceEntry("brussels-sprouts", "Brussels sprouts", "leaf",   ("brussels sprout", "brussel sprouts", "brussel sprout")),
    ProduceEntry("sweet-potato",     "Sweet potato",     "sun",    ("sweet potatoes", "yam", "yams")),
    ProduceEntry("pear",             "Pear",             "circle", ("pears", "bosc pear", "anjou pear")),
    ProduceEntry("fig",              "Fig",              "circle", ("figs", "dried figs", "mission fig", "mission figs")),
    ProduceEntry("pomegranate",      "Pomegranate",      "circle", ("pomegranates", "pomegranate seeds", "pomegranate arils")),
    ProduceEntry("cauliflower",      "Cauliflower",      "flower", ("cauliflowers",)),
    ProduceEntry("kale",             "Kale",             "leaf",   ("kales", "lacinato kale", "curly kale", "tuscan kale", "cavolo nero")),
    ProduceEntry("persimmon",        "Persimmon",        "circle", ("persimmons", "fuyu persimmon", "hachiya persimmon")),
    ProduceEntry("cranberry",        "Cranberry",        "circle", ("cranberries",)),
)

_N_WINTER: tuple[ProduceEntry, ...] = (
    ProduceEntry("citrus-orange",  "Citrus orange",  "sun",    ("orange", "oranges", "navel orange", "navel oranges", "valencia orange")),
    ProduceEntry("lemon",          "Lemon",          "sun",    ("lemons", "meyer lemon", "meyer lemons")),
    ProduceEntry("grapefruit",     "Grapefruit",     "sun",    ("grapefruits", "ruby grapefruit", "pink grapefruit")),
    ProduceEntry("leek",           "Leek",           "leaf",   ("leeks",)),
    ProduceEntry("parsnip",        "Parsnip",        "leaf",   ("parsnips",)),
    ProduceEntry("beet",           "Beet",           "circle", ("beets", "beetroot", "beetroots", "red beet", "red beets", "golden beet")),
    ProduceEntry("chard",          "Chard",          "leaf",   ("chards", "swiss chard", "rainbow chard", "silverbeet")),
    ProduceEntry("blood-orange",   "Blood orange",   "sun",    ("blood oranges", "moro orange")),
    ProduceEntry("kiwi",           "Kiwi",           "circle", ("kiwis", "kiwifruit", "kiwi fruit", "golden kiwi")),
    ProduceEntry("celery-root",    "Celery root",    "leaf",   ("celeriac", "celery root", "turnip-rooted celery")),
    ProduceEntry("turnip",         "Turnip",         "circle", ("turnips",)),
    ProduceEntry("rutabaga",       "Rutabaga",       "circle", ("rutabagas", "swede", "swedes", "yellow turnip")),
)

# ── Full catalog: N hemisphere + S hemisphere (hemispherically shifted) ────────
#
# Southern hemisphere seasonal mapping (meteorological):
#   S spring (Sep–Nov) = N fall  produce
#   S summer (Dec–Feb) = N winter produce
#   S fall   (Mar–May) = N spring produce
#   S winter (Jun–Aug) = N summer produce
#
# This is NOT re-curated; the same ProduceEntry objects are re-keyed.

SEASONAL_PRODUCE: dict[tuple[Hemisphere, Season], tuple[ProduceEntry, ...]] = {
    ("N", "spring"): _N_SPRING,
    ("N", "summer"): _N_SUMMER,
    ("N", "fall"):   _N_FALL,
    ("N", "winter"): _N_WINTER,
    # S hemisphere: shift N by 6 months (invert seasons)
    ("S", "spring"): _N_FALL,    # S Sep–Nov  ↔  N fall  (Sep–Nov)
    ("S", "summer"): _N_WINTER,  # S Dec–Feb  ↔  N winter (Dec–Feb)
    ("S", "fall"):   _N_SPRING,  # S Mar–May  ↔  N spring (Mar–May)
    ("S", "winter"): _N_SUMMER,  # S Jun–Aug  ↔  N summer (Jun–Aug)
}


# ── Season determination ───────────────────────────────────────────────────────

_N_SEASON_MAP: dict[int, Season] = {
    3: "spring", 4: "spring", 5: "spring",
    6: "summer", 7: "summer", 8: "summer",
    9: "fall",  10: "fall",  11: "fall",
    12: "winter", 1: "winter", 2: "winter",
}

_S_FROM_N: dict[Season, Season] = {
    "spring": "fall",
    "summer": "winter",
    "fall":   "spring",
    "winter": "summer",
}


def current_season(today: date, hemisphere: Hemisphere) -> Season:
    """Return the meteorological season for *today* and *hemisphere*."""
    n_season: Season = _N_SEASON_MAP[today.month]
    if hemisphere == "N":
        return n_season
    return _S_FROM_N[n_season]


# ── Produce lookup ────────────────────────────────────────────────────────────

def produce_for(hemisphere: Hemisphere, season: Season) -> tuple[ProduceEntry, ...]:
    """Return the 12-entry tuple for the given hemisphere + season."""
    return SEASONAL_PRODUCE[(hemisphere, season)]


# ── Ingredient matching ───────────────────────────────────────────────────────

# Tokens to strip from ingredient strings before matching.
_UNIT_TOKENS: frozenset[str] = frozenset({
    "cup", "cups", "tbsp", "tsp", "tablespoon", "tablespoons",
    "teaspoon", "teaspoons", "lb", "lbs", "oz", "g", "kg", "ml", "l",
    "litre", "litres", "liter", "liters", "handful", "handfuls",
    "bunch", "bunches", "clove", "cloves", "sprig", "sprigs",
    "slice", "slices", "piece", "pieces", "head", "heads",
    "package", "packages", "pkg", "can", "cans",
})

_DESCRIPTOR_TOKENS: frozenset[str] = frozenset({
    "fresh", "frozen", "dried", "chopped", "diced", "sliced", "minced",
    "ripe", "large", "small", "medium", "ground", "whole", "raw",
    "cooked", "roasted", "peeled", "shredded", "grated", "halved",
    "quartered", "torn", "blanched", "wilted", "softened", "crushed",
    "packed", "loosely", "firmly", "heaping", "level", "about",
    "approximately", "plus", "extra", "optional", "or",
})

_STRIP_TOKENS: frozenset[str] = _UNIT_TOKENS | _DESCRIPTOR_TOKENS

# Simple plural normalisation patterns (applied in order; most specific first).
_PLURAL_RULES: list[tuple[re.Pattern[str], str]] = [
    (re.compile(r"berries$"),  "berry"),   # blueberries → blueberry
    (re.compile(r"ches$"),     "ch"),      # peaches → peach
    (re.compile(r"shes$"),     "sh"),      # radishes → radish
    (re.compile(r"xes$"),      "x"),       # ... edge cases
    (re.compile(r"oes$"),      "o"),       # tomatoes → tomato
    (re.compile(r"ies$"),      "y"),       # strawberries → strawberry (fallback)
    (re.compile(r"s$"),        ""),        # generic trailing s
]

_PAREN_RE = re.compile(r"\(.*?\)")
_QUANTITY_RE = re.compile(r"^\d[\d/\.\-]*$")  # pure numbers / fractions


def _singularise(token: str) -> str | None:
    """Return a singular form for *token* if a rule fires, else None."""
    for pattern, repl in _PLURAL_RULES:
        if pattern.search(token):
            return pattern.sub(repl, token)
    return None


def _clean_ingredient(raw: str) -> list[str]:
    """Return a list of candidate strings derived from one raw ingredient line.

    Steps:
    1. Lowercase.
    2. Strip parentheticals.
    3. Split on comma, keep first chunk.
    4. Tokenise on whitespace; drop quantities, units, and descriptors.
    5. Collect the joined remainder plus individual tokens, each with their
       singularised variants.
    """
    text = raw.lower()
    text = _PAREN_RE.sub("", text)          # remove (...) blocks
    text = text.split(",")[0]               # take first comma-chunk
    tokens = text.split()

    # Drop quantities and stop-words.
    noun_tokens = [
        t for t in tokens
        if not _QUANTITY_RE.match(t) and t not in _STRIP_TOKENS
    ]

    candidates: list[str] = []
    if noun_tokens:
        joined = " ".join(noun_tokens)
        candidates.append(joined)
        # Also add hyphenated form (for slug-style matching).
        candidates.append(joined.replace(" ", "-"))

    for t in noun_tokens:
        candidates.append(t)
        singular = _singularise(t)
        if singular and singular != t:
            candidates.append(singular)

    return candidates


def match_ingredients(
    recipe_ingredients: list[str],
    hemisphere: Hemisphere,
    today: date,
) -> set[str]:
    """Return the set of seasonal produce *slugs* that appear in *recipe_ingredients*.

    Matching is case-insensitive, strips quantities/units/parentheticals,
    normalises simple plurals, and checks both display_name and synonyms.
    """
    season = current_season(today, hemisphere)
    produce_list = produce_for(hemisphere, season)

    # Build lookup: every string that maps to a slug.
    # Keys: display_name (lower), slug (lower, and spaces variant), every synonym.
    lookup: dict[str, str] = {}
    for entry in produce_list:
        slug = entry.slug
        lookup[slug] = slug
        lookup[slug.replace("-", " ")] = slug      # "butternut squash" → slug
        lookup[entry.display_name.lower()] = slug
        for syn in entry.synonyms:
            lookup[syn.lower()] = slug

    matched: set[str] = set()
    for raw_ingredient in recipe_ingredients:
        candidates = _clean_ingredient(raw_ingredient)
        for candidate in candidates:
            # Exact-key match.
            if candidate in lookup:
                matched.add(lookup[candidate])
                break
            # Substring check: does any lookup key appear in the candidate string?
            # Only `key in candidate` — the reverse direction makes short candidates
            # like "to" (from "salt to taste") false-match into "tomato" / "potato".
            for key, slug in lookup.items():
                if key and key in candidate:
                    matched.add(slug)
                    break

    return matched
