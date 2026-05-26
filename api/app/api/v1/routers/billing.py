"""POST /webhooks/revenuecat — grant credits on a verified purchase event."""

from __future__ import annotations

from fastapi import APIRouter, Header, HTTPException, Request, status

from app.core.config import settings
from app.db.session import DbSession
from app.services import billing

router = APIRouter(tags=["billing"])


@router.post("/webhooks/revenuecat")
async def revenuecat_webhook(
    request: Request,
    db: DbSession,
    authorization: str | None = Header(default=None),
):
    # RevenueCat sends the shared secret in the Authorization header you configure on its dashboard.
    if authorization != settings.revenuecat_webhook_secret:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="bad webhook secret")
    payload = await request.json()
    result = await billing.handle_event(db, payload)
    await db.commit()
    return result
