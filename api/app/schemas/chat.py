"""Schemas for the streaming chat endpoint."""

from __future__ import annotations

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field

from app.schemas.recognition import DetectedFood


class ChatTurn(BaseModel):
    role: Literal["user", "assistant"]
    content: str


class ChatSummary(BaseModel):
    id: str
    title: str
    created_at: datetime


class ChatRequest(BaseModel):
    session_id: str | None = Field(
        default=None, description="Existing session to continue; omit to start a new one"
    )
    recognition_id: str | None = Field(
        default=None, description="Recognition to seed a new session with detected foods"
    )
    message: str = Field(min_length=1, description="The user's new message")
    # Optional client-provided foods when no recognition row exists yet.
    foods: list[DetectedFood] | None = None


# Server-sent event payloads (documented for the generated client; sent as `data: {json}`)
class ChatDelta(BaseModel):
    type: Literal["delta"] = "delta"
    text: str


class ChatDone(BaseModel):
    type: Literal["done"] = "done"
    session_id: str
    credits_spent: int
    balance: int


class ChatError(BaseModel):
    type: Literal["error"] = "error"
    message: str
    code: str | None = None
