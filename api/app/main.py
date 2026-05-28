"""FastAPI application factory for the Plate API."""

from __future__ import annotations

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import RedirectResponse
 
from app import __version__
from app.api.v1.routers import billing, chat, profile, recipes, recognition, sage, seasons, wallet
from app.core.config import settings
from app.core.logging import configure_logging

configure_logging()

app = FastAPI(title="Sage API", version=__version__)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

API_PREFIX = "/api/v1"
app.include_router(recognition.router, prefix=API_PREFIX)
app.include_router(chat.router, prefix=API_PREFIX)
app.include_router(wallet.router, prefix=API_PREFIX)
app.include_router(profile.router, prefix=API_PREFIX)
app.include_router(billing.router, prefix=API_PREFIX)
app.include_router(sage.router, prefix=API_PREFIX)
app.include_router(seasons.router, prefix=API_PREFIX)
app.include_router(recipes.router, prefix=API_PREFIX)


@app.get("/", include_in_schema=False)
async def root() -> RedirectResponse:
    return RedirectResponse(url="/docs")


@app.get("/health", tags=["meta"])
async def health() -> dict:
    return {"status": "ok", "version": __version__}
