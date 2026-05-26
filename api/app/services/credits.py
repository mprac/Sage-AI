"""Credit metering: convert token usage to credits and deduct atomically.

The wallet balance (``credit_wallets.balance``) is the live number; ``credit_ledger`` is the
immutable audit log. Every spend writes both inside a single transaction so they can never drift.
"""

from __future__ import annotations

import math
from dataclasses import dataclass

from fastapi import HTTPException, status
from sqlalchemy import select, update
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.logging import get_logger
from app.db.models import CreditLedger, CreditWallet

log = get_logger(__name__)

# Credits charged per 1K tokens, per model tier. Output is pricier than input, mirroring
# Anthropic's real cost ratio. Tune these to set your margin over raw API cost.
CREDIT_RATES: dict[str, tuple[float, float]] = {
    # model_substring: (credits_per_1k_input, credits_per_1k_output)
    "haiku": (0.5, 2.5),
    "sonnet": (2.0, 10.0),
    "opus": (10.0, 50.0),
}
_DEFAULT_RATE = (2.0, 10.0)


@dataclass
class UsageCost:
    credits: int
    input_tokens: int
    output_tokens: int


def _rate_for(model: str) -> tuple[float, float]:
    for key, rate in CREDIT_RATES.items():
        if key in model:
            return rate
    return _DEFAULT_RATE


def cost_for_usage(model: str, input_tokens: int, output_tokens: int) -> UsageCost:
    """Convert token usage into a whole number of credits (always rounds up, min 1)."""
    in_rate, out_rate = _rate_for(model)
    raw = (input_tokens / 1000) * in_rate + (output_tokens / 1000) * out_rate
    credits = max(1, math.ceil(raw))
    return UsageCost(credits=credits, input_tokens=input_tokens, output_tokens=output_tokens)


async def get_balance(db: AsyncSession, user_id: str) -> int:
    row = await db.scalar(select(CreditWallet.balance).where(CreditWallet.user_id == user_id))
    return int(row or 0)


async def ensure_can_start(db: AsyncSession, user_id: str, needed: int | None = None) -> int:
    """Pre-flight balance check; raises HTTP 402 with the current balance if too low."""
    needed = needed if needed is not None else settings.min_credits_to_start
    balance = await get_balance(db, user_id)
    if balance < needed:
        raise HTTPException(
            status_code=status.HTTP_402_PAYMENT_REQUIRED,
            detail={"detail": "Insufficient credits", "balance": balance, "needed": needed},
        )
    return balance


async def grant_credits(
    db: AsyncSession, user_id: str, amount: int, reason: str, meta: dict | None = None
) -> int:
    """Add credits (signup bonus / purchase). Returns the new balance. Caller commits."""
    await db.execute(
        pg_insert(CreditWallet)
        .values(user_id=user_id, balance=amount)
        .on_conflict_do_update(
            index_elements=[CreditWallet.user_id],
            set_={"balance": CreditWallet.balance + amount},
        )
    )
    db.add(CreditLedger(user_id=user_id, delta=amount, reason=reason, meta=meta or {}))
    return await get_balance(db, user_id)


async def charge(
    db: AsyncSession,
    user_id: str,
    *,
    model: str,
    input_tokens: int,
    output_tokens: int,
    reason: str,
    meta: dict | None = None,
) -> tuple[int, int]:
    """Deduct credits for an AI call and write the ledger row atomically.

    Returns ``(credits_spent, new_balance)``. Balance can dip to zero but not below.
    """
    cost = cost_for_usage(model, input_tokens, output_tokens)
    # Ensure a wallet row exists, then deduct (clamped at 0).
    await db.execute(
        pg_insert(CreditWallet)
        .values(user_id=user_id, balance=0)
        .on_conflict_do_nothing(index_elements=[CreditWallet.user_id])
    )
    await db.execute(
        update(CreditWallet)
        .where(CreditWallet.user_id == user_id)
        .values(balance=func_greatest_zero(CreditWallet.balance - cost.credits))
    )
    db.add(
        CreditLedger(
            user_id=user_id,
            delta=-cost.credits,
            reason=reason,
            model=model,
            input_tokens=input_tokens,
            output_tokens=output_tokens,
            meta=meta or {},
        )
    )
    new_balance = await get_balance(db, user_id)
    return cost.credits, new_balance


async def spend_fixed(
    db: AsyncSession, user_id: str, amount: int, reason: str, meta: dict | None = None
) -> int:
    """Spend a fixed number of credits (treats, cosmetics). Pre-checks balance, deducts
    atomically, writes a ledger row, and returns the new balance. Caller commits.

    Raises HTTP 402 if the balance is insufficient (no partial spend).
    """
    balance = await get_balance(db, user_id)
    if balance < amount:
        raise HTTPException(
            status_code=status.HTTP_402_PAYMENT_REQUIRED,
            detail={"detail": "Insufficient credits", "balance": balance, "needed": amount},
        )
    await db.execute(
        update(CreditWallet)
        .where(CreditWallet.user_id == user_id)
        .values(balance=CreditWallet.balance - amount)
    )
    db.add(CreditLedger(user_id=user_id, delta=-amount, reason=reason, meta=meta or {}))
    return balance - amount


def func_greatest_zero(expr):
    """SQL GREATEST(expr, 0) — keep the balance from going negative on a large final charge."""
    from sqlalchemy import func

    return func.greatest(expr, 0)
