"""SQLAlchemy ORM models mirroring the Supabase schema (see api/supabase/schema.sql).

These map to tables created in Supabase. The mobile client reads its own rows directly via
supabase-js (RLS-protected); the backend uses the service connection for metered writes.
"""

from __future__ import annotations

import uuid
from datetime import date, datetime

from sqlalchemy import (
    BigInteger,
    Boolean,
    Date,
    DateTime,
    ForeignKey,
    Integer,
    String,
    Text,
    func,
)
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column


class Base(DeclarativeBase):
    pass


def _uuid() -> uuid.UUID:
    return uuid.uuid4()


class TasteProfile(Base):
    __tablename__ = "taste_profiles"

    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True)
    likes: Mapped[list] = mapped_column(JSONB, default=list)
    dislikes: Mapped[list] = mapped_column(JSONB, default=list)
    allergies: Mapped[list] = mapped_column(JSONB, default=list)
    dietary_restrictions: Mapped[list] = mapped_column(JSONB, default=list)
    favorite_cuisines: Mapped[list] = mapped_column(JSONB, default=list)
    spice_tolerance: Mapped[str | None] = mapped_column(String(16), nullable=True)
    cooking_skill: Mapped[str | None] = mapped_column(String(16), nullable=True)
    household_size: Mapped[int | None] = mapped_column(Integer, nullable=True)
    hemisphere: Mapped[str] = mapped_column(String(1), default="N")  # 'N' | 'S' — drives seasonal produce
    memory_summary: Mapped[str] = mapped_column(Text, default="")
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class CreditWallet(Base):
    __tablename__ = "credit_wallets"

    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True)
    balance: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class CreditLedger(Base):
    __tablename__ = "credit_ledger"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), index=True)
    # Positive for grants/purchases, negative for spend.
    delta: Mapped[int] = mapped_column(Integer, nullable=False)
    reason: Mapped[str] = mapped_column(String(64), nullable=False)  # signup_bonus | purchase | recognize | chat
    model: Mapped[str | None] = mapped_column(String(64), nullable=True)
    input_tokens: Mapped[int | None] = mapped_column(Integer, nullable=True)
    output_tokens: Mapped[int | None] = mapped_column(Integer, nullable=True)
    meta: Mapped[dict] = mapped_column(JSONB, default=dict)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class Purchase(Base):
    __tablename__ = "purchases"

    # RevenueCat transaction id — primary key gives idempotency for free.
    transaction_id: Mapped[str] = mapped_column(String(255), primary_key=True)
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), index=True)
    product_id: Mapped[str] = mapped_column(String(255))
    credits_granted: Mapped[int] = mapped_column(Integer, nullable=False)
    raw_event: Mapped[dict] = mapped_column(JSONB, default=dict)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class Recognition(Base):
    __tablename__ = "recognitions"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=_uuid)
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), index=True)
    image_path: Mapped[str | None] = mapped_column(Text, nullable=True)
    foods: Mapped[list] = mapped_column(JSONB, default=list)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class ChatSession(Base):
    __tablename__ = "chat_sessions"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=_uuid)
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), index=True)
    recognition_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("recognitions.id", ondelete="SET NULL"), nullable=True
    )
    title: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class ChatMessage(Base):
    __tablename__ = "chat_messages"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=_uuid)
    session_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("chat_sessions.id", ondelete="CASCADE"), index=True
    )
    role: Mapped[str] = mapped_column(String(16), nullable=False)  # user | assistant
    content: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class SagePet(Base):
    """The user's Tamagotchi-style chef companion (one per user)."""

    __tablename__ = "sage_pets"

    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True)
    name: Mapped[str] = mapped_column(String(40), default="Sage")
    vitality: Mapped[int] = mapped_column(Integer, default=100)  # value at last_update_at
    last_update_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    xp: Mapped[int] = mapped_column(Integer, default=0)
    level: Mapped[int] = mapped_column(Integer, default=1)
    streak_days: Mapped[int] = mapped_column(Integer, default=0)
    longest_streak: Mapped[int] = mapped_column(Integer, default=0)
    last_feed_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    bond_xp: Mapped[int] = mapped_column(Integer, default=0)  # monotonic, never resets
    is_dormant: Mapped[bool] = mapped_column(Boolean, default=False)
    unlocked_cosmetics: Mapped[list] = mapped_column(JSONB, default=list)
    equipped: Mapped[dict] = mapped_column(JSONB, default=dict)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class SavedRecipe(Base):
    __tablename__ = "saved_recipes"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=_uuid)
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), index=True)
    title: Mapped[str] = mapped_column(Text, nullable=False)
    summary: Mapped[str] = mapped_column(Text, default="")
    servings: Mapped[int | None] = mapped_column(Integer, nullable=True)
    total_time_minutes: Mapped[int | None] = mapped_column(Integer, nullable=True)
    ingredients: Mapped[list] = mapped_column(JSONB, default=list)
    steps: Mapped[list] = mapped_column(JSONB, default=list)
    playlist: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    seasonal_ingredient_count: Mapped[int] = mapped_column(Integer, default=0)
    recognition_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), nullable=True)
    # The chat that generated this recipe (so "tweak in chat" can reopen it). SET NULL — deleting a
    # chat must never delete the user's saved recipes.
    session_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("chat_sessions.id", ondelete="SET NULL"), nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class CareEvent(Base):
    __tablename__ = "care_events"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), index=True)
    type: Mapped[str] = mapped_column(String(16), nullable=False)  # cook|snack|checkin|treat|revive|levelup
    vitality_delta: Mapped[int] = mapped_column(Integer, default=0)
    xp_delta: Mapped[int] = mapped_column(Integer, default=0)
    meta: Mapped[dict] = mapped_column(JSONB, default=dict)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class SeasonalHarvest(Base):
    """Per-user, per-season harvest progress. Bounded at 4 rows/user/year."""

    __tablename__ = "seasonal_harvests"

    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True)
    season: Mapped[str] = mapped_column(String(16), primary_key=True)  # spring|summer|fall|winter
    year: Mapped[int] = mapped_column(Integer, primary_key=True)
    hemisphere: Mapped[str] = mapped_column(String(1), nullable=False)  # N | S
    ingredients_cooked: Mapped[list] = mapped_column(JSONB, default=list)  # list of produce slugs
    cooks_count: Mapped[int] = mapped_column(Integer, default=0)
    awards_earned: Mapped[list] = mapped_column(JSONB, default=list)  # list of award slugs
    started_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)


class UserAward(Base):
    """Lifetime, one-shot awards (e.g. 'first-spring', 'first-100-cooks')."""

    __tablename__ = "user_awards"

    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True)
    award_slug: Mapped[str] = mapped_column(String(64), primary_key=True)
    earned_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class DailySummary(Base):
    """Compacted rollup of care_events older than 90 days (one row per user per day)."""

    __tablename__ = "daily_summary"

    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True)
    day: Mapped[date] = mapped_column(Date, primary_key=True)
    cooks: Mapped[int] = mapped_column(Integer, default=0)
    treats: Mapped[int] = mapped_column(Integer, default=0)
    snacks: Mapped[int] = mapped_column(Integer, default=0)
    checkins: Mapped[int] = mapped_column(Integer, default=0)
    xp_gained: Mapped[int] = mapped_column(Integer, default=0)
    vitality_delta: Mapped[int] = mapped_column(Integer, default=0)
