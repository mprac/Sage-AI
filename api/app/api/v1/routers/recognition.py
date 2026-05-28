"""POST /recognize — image → structured foods (metered).

Also: GET + PATCH /recognitions/{id} so the mobile app can rehydrate and edit a
saved list before chatting (downstream chat / recipe gen always read the latest
foods from the same row, so edits propagate for free).
"""

from __future__ import annotations

from fastapi import APIRouter, File, HTTPException, UploadFile, status

from app.core.config import settings
from app.core.security import CurrentUser
from app.db.models import Recognition
from app.db.session import DbSession
from app.core.logging import get_logger
from app.schemas.recognition import (
    DetectedFood,
    RecognitionDetail,
    RecognitionResult,
    RecognitionUpdate,
)
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
        await sage_pet.feed(db, user.id, "snack")  # tuple result intentionally discarded
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


async def _own_recognition(db: DbSession, rec_id: str, user_id: str) -> Recognition:
    rec = await db.get(Recognition, rec_id)
    if rec is None or str(rec.user_id) != user_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Recognition not found")
    return rec


@router.get("/recognitions/{rec_id}", response_model=RecognitionDetail)
async def get_recognition(
    rec_id: str, user: CurrentUser, db: DbSession
) -> RecognitionDetail:
    rec = await _own_recognition(db, rec_id, user.id)
    return RecognitionDetail(
        id=str(rec.id),
        foods=[DetectedFood(**f) for f in (rec.foods or [])],
        image_path=rec.image_path,
        created_at=rec.created_at,
    )


@router.patch("/recognitions/{rec_id}", response_model=RecognitionDetail)
async def update_recognition(
    rec_id: str,
    req: RecognitionUpdate,
    user: CurrentUser,
    db: DbSession,
) -> RecognitionDetail:
    """Replace the foods list on a saved recognition. Chat + recipe gen will see the edit
    on their next call because they re-read foods from this row each time."""
    rec = await _own_recognition(db, rec_id, user.id)
    rec.foods = [f.model_dump() for f in req.foods]
    await db.commit()
    return RecognitionDetail(
        id=str(rec.id),
        foods=req.foods,
        image_path=rec.image_path,
        created_at=rec.created_at,
    )
