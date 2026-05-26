"""Food recognition: Claude vision + tool-use structured output (Haiku tier).

We force a single tool (`report_foods`) so the model must return a structured list that validates
against the Pydantic schema — no free-text parsing.
"""

from __future__ import annotations

import base64

from app.core.config import settings
from app.prompts import RECOGNITION_SYSTEM
from app.schemas.recognition import DetectedFood
from app.services.anthropic_client import Usage, get_anthropic

_TOOL = {
    "name": "report_foods",
    "description": "Report every food/ingredient identified in the image.",
    "input_schema": {
        "type": "object",
        "properties": {
            "foods": {
                "type": "array",
                "items": {
                    "type": "object",
                    "properties": {
                        "name": {"type": "string", "description": "Common name, e.g. 'red bell pepper'"},
                        "category": {
                            "type": "string",
                            "description": "vegetable | fruit | protein | grain | dairy | sauce | other",
                        },
                        "confidence": {"type": "number", "description": "0-1 confidence"},
                        "estimated_quantity": {
                            "type": "string",
                            "description": "Rough amount if estimable, else omit",
                        },
                    },
                    "required": ["name", "category", "confidence"],
                },
            }
        },
        "required": ["foods"],
    },
}


async def recognize_foods(image_bytes: bytes, media_type: str) -> tuple[list[DetectedFood], Usage]:
    """Run vision recognition and return (validated foods, token usage for metering)."""
    b64 = base64.standard_b64encode(image_bytes).decode("utf-8")

    response = await get_anthropic().messages.create(
        model=settings.model_vision,
        max_tokens=1024,
        system=RECOGNITION_SYSTEM,
        tools=[_TOOL],
        tool_choice={"type": "tool", "name": "report_foods"},
        messages=[
            {
                "role": "user",
                "content": [
                    {
                        "type": "image",
                        "source": {"type": "base64", "media_type": media_type, "data": b64},
                    },
                    {"type": "text", "text": "Identify all foods/ingredients in this photo."},
                ],
            }
        ],
    )

    tool_block = next((b for b in response.content if b.type == "tool_use"), None)
    foods_raw = (tool_block.input.get("foods", []) if tool_block else [])
    foods = [DetectedFood(**f) for f in foods_raw]
    return foods, Usage.from_anthropic(response.usage)
