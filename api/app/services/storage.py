"""Supabase Storage uploads (food photos) via the Storage REST API + service key.

Kept dependency-free (httpx only) — no supabase-py needed. Uploads are best-effort: a failure
here must never block recognition, so callers swallow exceptions and fall back to no image.
"""

from __future__ import annotations

import uuid

import httpx

from app.core.config import settings
from app.core.logging import get_logger

log = get_logger(__name__)


async def upload_food_image(user_id: str, image_bytes: bytes, content_type: str) -> str | None:
    """Upload to the private `food-images` bucket; return the storage object path, or None."""
    if not (settings.supabase_url and settings.supabase_service_key):
        return None

    ext = "png" if "png" in content_type else "jpg"
    path = f"{user_id}/{uuid.uuid4().hex}.{ext}"
    url = f"{settings.supabase_url}/storage/v1/object/{settings.storage_bucket}/{path}"
    headers = {
        "Authorization": f"Bearer {settings.supabase_service_key}",
        "apikey": settings.supabase_service_key,
        "Content-Type": content_type,
        "x-upsert": "true",
    }
    try:
        async with httpx.AsyncClient(timeout=15) as client:
            resp = await client.post(url, content=image_bytes, headers=headers)
            resp.raise_for_status()
        return path
    except Exception as exc:  # best-effort — never fail the request over storage
        log.warning("Image upload failed: %s", exc)
        return None
