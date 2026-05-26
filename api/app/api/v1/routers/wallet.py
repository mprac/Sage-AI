"""GET /wallet — credit balance + recent ledger."""

from __future__ import annotations

from fastapi import APIRouter
from sqlalchemy import select

from app.core.security import CurrentUser
from app.db.models import CreditLedger
from app.db.session import DbSession
from app.schemas.wallet import LedgerEntry, WalletSummary
from app.services import credits

router = APIRouter(tags=["wallet"])


@router.get("/wallet", response_model=WalletSummary)
async def get_wallet(user: CurrentUser, db: DbSession) -> WalletSummary:
    balance = await credits.get_balance(db, user.id)
    rows = await db.execute(
        select(CreditLedger)
        .where(CreditLedger.user_id == user.id)
        .order_by(CreditLedger.created_at.desc())
        .limit(50)
    )
    ledger = [
        LedgerEntry(id=r.id, delta=r.delta, reason=r.reason, model=r.model, created_at=r.created_at)
        for r in rows.scalars().all()
    ]
    return WalletSummary(balance=balance, ledger=ledger)
