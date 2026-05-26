"""RevenueCat billing: verify the webhook and grant credits idempotently.

RevenueCat POSTs an event when a user purchases a consumable credit pack. We map the product id
to a credit amount, record the transaction (idempotent by id), and grant credits to the wallet.
"""

from __future__ import annotations

from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.logging import get_logger
from app.db.models import Purchase
from app.services import credits

log = get_logger(__name__)

# Map RevenueCat product identifiers → credits granted. Mirror these in App Store / Play consoles
# and in the RevenueCat dashboard.
CREDIT_PACKS: dict[str, int] = {
    "credits_small": 500,
    "credits_medium": 1500,
    "credits_large": 4000,
}

# Event types that represent a one-off (consumable) credit-pack purchase.
_PURCHASE_EVENTS = {"INITIAL_PURCHASE", "NON_RENEWING_PURCHASE", "RENEWAL"}


async def handle_event(db: AsyncSession, payload: dict) -> dict:
    """Process a RevenueCat webhook payload. Returns a small status dict. Caller commits."""
    event = payload.get("event", {})
    event_type = event.get("type")
    if event_type not in _PURCHASE_EVENTS:
        return {"status": "ignored", "reason": f"event type {event_type}"}

    product_id = event.get("product_id")
    user_id = event.get("app_user_id")
    transaction_id = event.get("transaction_id") or event.get("id")
    amount = CREDIT_PACKS.get(product_id or "")

    if not (product_id and user_id and transaction_id and amount):
        return {"status": "ignored", "reason": "unmapped product or missing fields"}

    # Idempotency: insert the purchase; if it already exists, do nothing (replayed webhook).
    result = await db.execute(
        pg_insert(Purchase)
        .values(
            transaction_id=transaction_id,
            user_id=user_id,
            product_id=product_id,
            credits_granted=amount,
            raw_event=event,
        )
        .on_conflict_do_nothing(index_elements=[Purchase.transaction_id])
    )
    if result.rowcount == 0:
        return {"status": "duplicate", "transaction_id": transaction_id}

    balance = await credits.grant_credits(
        db, user_id, amount, reason="purchase", meta={"product_id": product_id}
    )
    log.info("Granted %s credits to %s (product %s)", amount, user_id, product_id)
    return {"status": "granted", "credits": amount, "balance": balance}
