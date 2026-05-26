"""Authentication: validate Supabase access tokens and inject the current user.

We validate the user's access token by calling Supabase's auth server (`GET /auth/v1/user`).
This works regardless of the token signing scheme — including the new asymmetric JWT signing
keys that ship with Supabase's publishable/secret API keys — so there's no shared JWT secret to
manage. Results are cached briefly to avoid a round-trip on every request.

The backend never handles passwords; Supabase owns the credential lifecycle.
"""

from __future__ import annotations

import time
from dataclasses import dataclass
from typing import Annotated

import httpx
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.core.config import settings

_bearer = HTTPBearer(auto_error=True)

# Tiny in-memory cache: token -> (AuthedUser, expires_at). Keeps auth latency low without a
# verify call on every request. TTL is short so revoked/expired tokens stop working quickly.
_CACHE: dict[str, tuple["AuthedUser", float]] = {}
_TTL_SECONDS = 60


@dataclass(frozen=True)
class AuthedUser:
    id: str
    email: str | None


async def _validate_with_supabase(token: str) -> AuthedUser:
    url = f"{settings.supabase_url}/auth/v1/user"
    headers = {
        "Authorization": f"Bearer {token}",
        "apikey": settings.supabase_service_key,  # any valid project key works as apikey
    }
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.get(url, headers=headers)
    except httpx.HTTPError as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Auth service unreachable"
        ) from exc

    if resp.status_code != 200:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"},
        )
    data = resp.json()
    return AuthedUser(id=data["id"], email=data.get("email"))


async def get_current_user(
    creds: Annotated[HTTPAuthorizationCredentials, Depends(_bearer)],
) -> AuthedUser:
    token = creds.credentials
    now = time.monotonic()
    cached = _CACHE.get(token)
    if cached and cached[1] > now:
        return cached[0]

    user = await _validate_with_supabase(token)
    _CACHE[token] = (user, now + _TTL_SECONDS)
    return user


CurrentUser = Annotated[AuthedUser, Depends(get_current_user)]
