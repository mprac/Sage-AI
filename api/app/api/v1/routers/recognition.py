"""POST /recognize — image → structured foods (metered)."""

from __future__ import annotations

from fastapi import APIRouter, File, UploadFile

from app.core.config import settings
from app.core.security import CurrentUser
from app.db.models import Recognition
from app.db.session import DbSession
from app.core.logging import get_logger
from app.schemas.recognition import RecognitionResult
from app.services import credits, sage_pet
from app.services.recognition import recognize_foods
from app.services.storage import upload_food_image

log = get_logger(__name__)

router = APIRouter(tags=["recognition"])


@router.post("/recognize", response_model=RecognitionResult)
async def recognize(
    user: CurrentUser,
    db: DbSession,
    file: UploadFile = File(...),
) -> RecognitionResult:
    await credits.ensure_can_start(db, user.id)

    image = await file.read()
    media_type = file.content_type or "image/jpeg"
    foods, usage = await recognize_foods(image, media_type)

    image_path = await upload_food_image(user.id, image, media_type)
    rec = Recognition(user_id=user.id, foods=[f.model_dump() for f in foods], image_path=image_path)
    db.add(rec)
    await db.flush()  # populate rec.id

    spent, balance = await credits.charge(
        db,
        user.id,
        model=settings.model_vision,
        input_tokens=usage.input_tokens,
        output_tokens=usage.output_tokens,
        reason="recognize",
        meta={"recognition_id": str(rec.id)},
    )

    # Snapping a photo gives Sage a small snack (best-effort — never block recognition).
    try:
        await sage_pet.feed(db, user.id, "snack")
    except Exception as exc:
        log.warning("Sage snack feed failed: %s", exc)

    await db.commit()

    return RecognitionResult(
        id=str(rec.id),
        foods=foods,
        image_path=rec.image_path,
        credits_spent=spent,
        balance=balance,
    )
