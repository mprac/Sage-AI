"""Application configuration via pydantic-settings.

Every secret/tunable is read from the environment (.env in dev). Import the singleton
``settings`` anywhere; it is cached so the env is parsed once.
"""

from __future__ import annotations

from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    # ── AI providers ──
    anthropic_api_key: str = ""
    voyage_api_key: str = ""

    # Model tiering — Haiku for cheap/frequent vision + extraction, Sonnet for chat.
    model_vision: str = "claude-haiku-4-5"
    model_chat: str = "claude-sonnet-4-6"
    model_extract: str = "claude-haiku-4-5"
    embedding_model: str = "voyage-3"
    embedding_dimensions: int = 1024

    # ── Supabase ──
    supabase_url: str = ""
    supabase_service_key: str = ""
    supabase_jwt_secret: str = ""
    database_url: str = ""
    storage_bucket: str = "food-images"

    # ── Billing ──
    revenuecat_webhook_secret: str = "change-me"

    # ── App ──
    cors_origins: str = "*"
    signup_bonus_credits: int = 100
    # Minimum balance required to start an AI action (cheapest guardrail).
    min_credits_to_start: int = 1
    # Capped chat history window (messages) sent to the model for context.
    chat_history_limit: int = 20

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
