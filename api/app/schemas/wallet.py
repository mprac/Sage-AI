"""Schemas for the credit wallet."""

from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel


class LedgerEntry(BaseModel):
    id: int
    delta: int
    reason: str
    model: str | None = None
    created_at: datetime


class WalletSummary(BaseModel):
    balance: int
    ledger: list[LedgerEntry]


class InsufficientCredits(BaseModel):
    """Returned (HTTP 402) when the user lacks credits to start an AI action."""

    detail: str = "Insufficient credits"
    balance: int
    needed: int
