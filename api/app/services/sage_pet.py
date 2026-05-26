"""Sage companion — the Tamagotchi-style game logic.

Split into **pure functions** (decay, mood, levels, streak — unit-tested offline) and
**DB operations** (feed / treat / cosmetics) that persist state. Vitality decays with wall-clock
time and is computed lazily on read, so there's no background job.
"""

from __future__ import annotations

from datetime import date, datetime, timedelta, timezone

from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import CareEvent, SagePet
from app.schemas.sage import Cosmetic, FeedSource, SagePetOut
from app.services import credits

# ── Tunable balance constants ───────────────────────────────────────────────
DECAY_PER_DAY = 40.0
DECAY_PER_HOUR = DECAY_PER_DAY / 24.0
MAX_VITALITY = 100
HUNGRY_THRESHOLD = 30  # vitality below this = "hungry" band (used for reminders)

# (vitality, xp, bond_xp) gained per feed source.
FEED_GAINS: dict[str, tuple[int, int, int]] = {
    "cook": (35, 25, 10),
    "snack": (10, 5, 3),
    "checkin": (5, 3, 3),
}
STREAK_SOURCES = {"cook", "checkin"}  # only these advance the daily streak

TREAT_COST_CREDITS = 40
TREAT_VITALITY = 25
TREAT_BOND = 5

# ── Cosmetics catalog (static; unlock by level or buy with credits) ──────────
COSMETICS: list[Cosmetic] = [
    Cosmetic(id="hat_toque", name="Classic Toque", type="hat", icon="chef-hat", price_credits=0, unlock_level=2),
    Cosmetic(id="hat_party", name="Party Hat", type="hat", icon="party", price_credits=150, unlock_level=0),
    Cosmetic(id="hat_crown", name="Master Chef Crown", type="hat", icon="crown", price_credits=0, unlock_level=5),
    Cosmetic(id="acc_gem", name="Lucky Charm", type="accessory", icon="gem", price_credits=120, unlock_level=0),
    Cosmetic(id="acc_leaf", name="Fresh Sprig", type="accessory", icon="leaf", price_credits=0, unlock_level=3),
    Cosmetic(id="theme_cozy", name="Cozy Cream", type="theme", icon="sun", color="#F4E6CE", price_credits=200, unlock_level=0),
    Cosmetic(id="theme_mint", name="Fresh Mint", type="theme", icon="leaf", color="#CFEFE0", price_credits=250, unlock_level=0),
    Cosmetic(id="theme_dusk", name="Dusk", type="theme", icon="moon", color="#DfE3F0", price_credits=350, unlock_level=0),
]
COSMETICS_BY_ID = {c.id: c for c in COSMETICS}


# ── Pure helpers (unit-tested) ───────────────────────────────────────────────
def compute_current_vitality(vitality: int, last_update_at: datetime, now: datetime) -> int:
    """Apply time-based decay to a stored vitality value. Clamped to 0..100."""
    hours = max(0.0, (now - last_update_at).total_seconds() / 3600.0)
    return int(max(0, min(MAX_VITALITY, round(vitality - DECAY_PER_HOUR * hours))))


def xp_to_next(level: int) -> int:
    return 100 * level


def apply_xp(level: int, xp: int, added: int) -> tuple[int, int, int]:
    """Add XP and roll over levels. Returns (new_level, leftover_xp, levels_gained)."""
    xp += added
    gained = 0
    while xp >= xp_to_next(level):
        xp -= xp_to_next(level)
        level += 1
        gained += 1
    return level, xp, gained


def next_streak(last_feed_date: date | None, today: date, current: int) -> int:
    """Daily-streak accounting for a cook/checkin happening `today`."""
    if last_feed_date == today:
        return current  # already counted today
    if last_feed_date == today - timedelta(days=1):
        return current + 1
    return 1  # first feed, or a gap broke the streak


def bond_level(bond_xp: int) -> int:
    return 1 + bond_xp // 200


_BANDS = [
    (80, "thriving", "Thriving", "🤩"),
    (55, "content", "Content", "😋"),
    (30, "peckish", "Peckish", "🙂"),
    (10, "hungry", "Hungry", "😟"),
    (1, "weak", "Weak", "🥴"),
]
_MESSAGES = {
    "thriving": "Bursting with energy — let's cook something amazing!",
    "content": "Feeling good and ready to help you cook.",
    "peckish": "Could go for a little something… what are we making?",
    "hungry": "I'm getting pretty hungry — cook with me soon?",
    "weak": "So… faint… please cook something, chef.",
    "fainted": "I fainted! Cook a meal to bring me back.",
}


def mood_for(vitality: int, is_dormant: bool) -> tuple[str, str, str, str]:
    """Return (state, mood_label, emoji, message)."""
    if is_dormant or vitality <= 0:
        return "fainted", "Fainted", "😵", _MESSAGES["fainted"]
    for threshold, state, label, emoji in _BANDS:
        if vitality >= threshold:
            return state, label, emoji, _MESSAGES[state]
    return "weak", "Weak", "🥴", _MESSAGES["weak"]


def hours_until_hungry(vitality: int) -> float:
    if vitality <= HUNGRY_THRESHOLD:
        return 0.0
    return round((vitality - HUNGRY_THRESHOLD) / DECAY_PER_HOUR, 1)


def _now() -> datetime:
    return datetime.now(timezone.utc)


# ── DB operations ────────────────────────────────────────────────────────────
async def get_or_create(db: AsyncSession, user_id: str) -> SagePet:
    pet = await db.get(SagePet, user_id)
    if pet is None:
        await db.execute(
            pg_insert(SagePet)
            .values(user_id=user_id)
            .on_conflict_do_nothing(index_elements=[SagePet.user_id])
        )
        await db.flush()
        pet = await db.get(SagePet, user_id)
    return pet


def _settle_decay(pet: SagePet, now: datetime) -> None:
    """Fold elapsed decay into the stored value and stamp the update time."""
    pet.vitality = compute_current_vitality(pet.vitality, pet.last_update_at, now)
    pet.last_update_at = now
    if pet.vitality <= 0:
        pet.is_dormant = True


async def _log(db: AsyncSession, user_id: str, type_: str, v: int, xp: int, meta: dict | None = None):
    db.add(CareEvent(user_id=user_id, type=type_, vitality_delta=v, xp_delta=xp, meta=meta or {}))


async def feed(
    db: AsyncSession, user_id: str, source: FeedSource, now: datetime | None = None
) -> tuple[SagePet, bool, bool]:
    """Feed Sage. Returns (pet, leveled_up, revived). Caller commits."""
    now = now or _now()
    pet = await get_or_create(db, user_id)
    _settle_decay(pet, now)

    revived = False
    if pet.is_dormant:
        pet.is_dormant = False
        revived = True
        pet.streak_days = 0  # reviving costs the streak
        await _log(db, user_id, "revive", 0, 0)

    vit, xp_gain, bond_gain = FEED_GAINS[source]
    pet.vitality = min(MAX_VITALITY, pet.vitality + vit)
    pet.bond_xp += bond_gain

    if source in STREAK_SOURCES:
        today = now.date()
        pet.streak_days = next_streak(pet.last_feed_date, today, pet.streak_days)
        pet.last_feed_date = today
        pet.longest_streak = max(pet.longest_streak, pet.streak_days)

    new_level, leftover, gained = apply_xp(pet.level, pet.xp, xp_gain)
    leveled_up = gained > 0
    pet.level, pet.xp = new_level, leftover
    if leveled_up:
        pet.vitality = MAX_VITALITY  # level-up fully refreshes Sage
        for cos in COSMETICS:
            if cos.unlock_level and cos.unlock_level <= pet.level and cos.id not in pet.unlocked_cosmetics:
                pet.unlocked_cosmetics = [*pet.unlocked_cosmetics, cos.id]
        await _log(db, user_id, "levelup", 0, xp_gain, {"level": pet.level})

    await _log(db, user_id, source, vit, xp_gain)
    return pet, leveled_up, revived


async def maybe_daily_checkin(db: AsyncSession, user_id: str, now: datetime | None = None) -> SagePet:
    """Called on GET /sage: settle decay, and give a small check-in feed once per calendar day."""
    now = now or _now()
    pet = await get_or_create(db, user_id)
    if pet.last_feed_date != now.date():
        pet, _, _ = await feed(db, user_id, "checkin", now)
    else:
        _settle_decay(pet, now)
    return pet


async def treat(db: AsyncSession, user_id: str, now: datetime | None = None) -> tuple[SagePet, int]:
    """Spend credits to give Sage a treat. Returns (pet, new_credit_balance). Caller commits."""
    now = now or _now()
    balance = await credits.spend_fixed(db, user_id, TREAT_COST_CREDITS, "sage_treat")
    pet = await get_or_create(db, user_id)
    _settle_decay(pet, now)
    if pet.is_dormant:
        pet.is_dormant = False
    pet.vitality = min(MAX_VITALITY, pet.vitality + TREAT_VITALITY)
    pet.bond_xp += TREAT_BOND
    await _log(db, user_id, "treat", TREAT_VITALITY, 0, {"cost": TREAT_COST_CREDITS})
    return pet, balance


async def buy_cosmetic(
    db: AsyncSession, user_id: str, cosmetic_id: str
) -> tuple[SagePet, int | None]:
    """Unlock a cosmetic (by level, free) or purchase with credits. Returns (pet, balance|None)."""
    from fastapi import HTTPException, status

    cos = COSMETICS_BY_ID.get(cosmetic_id)
    if cos is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Unknown cosmetic")
    pet = await get_or_create(db, user_id)

    balance: int | None = None
    if cosmetic_id not in pet.unlocked_cosmetics:
        if cos.unlock_level and pet.level >= cos.unlock_level:
            pass  # earned by level
        elif cos.price_credits > 0:
            balance = await credits.spend_fixed(
                db, user_id, cos.price_credits, "sage_cosmetic", {"cosmetic_id": cosmetic_id}
            )
        else:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Reach level {cos.unlock_level} to unlock this.",
            )
        pet.unlocked_cosmetics = [*pet.unlocked_cosmetics, cosmetic_id]

    # Equip it (replaces any cosmetic of the same type).
    pet.equipped = {**pet.equipped, cos.type: cosmetic_id}
    return pet, balance


async def rename(db: AsyncSession, user_id: str, name: str) -> SagePet:
    pet = await get_or_create(db, user_id)
    pet.name = name
    return pet


def to_out(pet: SagePet, now: datetime | None = None) -> SagePetOut:
    """Serialize a pet to the API shape with freshly-computed vitality + mood."""
    now = now or _now()
    vitality = compute_current_vitality(pet.vitality, pet.last_update_at, now)
    dormant = pet.is_dormant or vitality <= 0
    state, mood, emoji, message = mood_for(vitality, dormant)
    return SagePetOut(
        name=pet.name,
        vitality=vitality,
        mood=mood,
        mood_emoji=emoji,
        state=state,
        message=message,
        level=pet.level,
        xp=pet.xp,
        xp_to_next=xp_to_next(pet.level),
        streak_days=pet.streak_days,
        longest_streak=pet.longest_streak,
        bond_xp=pet.bond_xp,
        bond_level=bond_level(pet.bond_xp),
        is_dormant=dormant,
        equipped=pet.equipped or {},
        unlocked_cosmetics=pet.unlocked_cosmetics or [],
        hours_until_hungry=hours_until_hungry(vitality),
    )
