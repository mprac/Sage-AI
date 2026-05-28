"""Recipes — generate a full structured recipe, save/list/get/delete the user's cookbook."""

from __future__ import annotations

from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException, status
from sqlalchemy import select

from app.core.config import settings
from app.core.security import CurrentUser
from app.db.models import ChatMessage, Recognition, SavedRecipe
from app.db.session import DbSession
from app.schemas.recipe import (
    GeneratedRecipe,
    GenerateRecipeRequest,
    Recipe,
    RecipeSummary,
    SavedRecipeId,
)
from app.schemas.recognition import DetectedFood
from app.services import credits, memory, seasons
from app.services.recipe import generate_recipe

router = APIRouter(tags=["recipes"])


@router.post("/recipes/generate", response_model=GeneratedRecipe)
async def generate(req: GenerateRecipeRequest, user: CurrentUser, db: DbSession) -> GeneratedRecipe:
    await credits.ensure_can_start(db, user.id)

    profile = await memory.get_profile(db, user.id)

    foods: list[DetectedFood] = []
    if req.recognition_id:
        rec = await db.get(Recognition, req.recognition_id)
        if rec and rec.foods:
            foods = [DetectedFood(**f) for f in rec.foods]

    history: list[dict] = []
    if req.session_id:
        rows = await db.execute(
            select(ChatMessage)
            .where(ChatMessage.session_id == req.session_id)
            .order_by(ChatMessage.created_at.desc())
            .limit(settings.chat_history_limit)
        )
        history = [{"role": m.role, "content": m.content} for m in reversed(rows.scalars().all())]

    recipe_dict, usage = await generate_recipe(
        profile=profile, foods=foods, history=history, request=req.request
    )
    spent, balance = await credits.charge(
        db,
        user.id,
        model=settings.model_chat,
        input_tokens=usage.input_tokens,
        output_tokens=usage.output_tokens,
        reason="recipe",
    )
    await db.commit()
    return GeneratedRecipe(recipe=Recipe(**recipe_dict), credits_spent=spent, balance=balance)


@router.post("/recipes", response_model=SavedRecipeId)
async def save_recipe(recipe: Recipe, user: CurrentUser, db: DbSession) -> SavedRecipeId:
    profile = await memory.get_profile(db, user.id)
    today = datetime.now(timezone.utc).date()
    hemisphere: seasons.Hemisphere = (profile.hemisphere or "N")  # type: ignore[assignment]
    seasonal_count = len(
        seasons.match_ingredients([i.item for i in recipe.ingredients], hemisphere, today)
    )
    row = SavedRecipe(
        user_id=user.id,
        title=recipe.title,
        summary=recipe.summary,
        servings=recipe.servings,
        total_time_minutes=recipe.total_time_minutes,
        ingredients=[i.model_dump() for i in recipe.ingredients],
        steps=[s.model_dump() for s in recipe.steps],
        playlist=recipe.playlist.model_dump() if recipe.playlist else None,
        seasonal_ingredient_count=seasonal_count,
        session_id=recipe.session_id,
    )
    db.add(row)
    await db.flush()
    await db.commit()
    return SavedRecipeId(id=str(row.id))


@router.get("/recipes", response_model=list[RecipeSummary])
async def list_recipes(user: CurrentUser, db: DbSession) -> list[RecipeSummary]:
    rows = await db.execute(
        select(SavedRecipe)
        .where(SavedRecipe.user_id == user.id)
        .order_by(SavedRecipe.created_at.desc())
        .limit(100)
    )
    return [
        RecipeSummary(
            id=str(r.id),
            title=r.title,
            total_time_minutes=r.total_time_minutes,
            session_id=str(r.session_id) if r.session_id else None,
            created_at=r.created_at,
        )
        for r in rows.scalars().all()
    ]


@router.get("/recipes/{recipe_id}", response_model=Recipe)
async def get_recipe(recipe_id: str, user: CurrentUser, db: DbSession) -> Recipe:
    row = await db.get(SavedRecipe, recipe_id)
    if row is None or str(row.user_id) != user.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Recipe not found")
    return Recipe(
        title=row.title,
        summary=row.summary,
        servings=row.servings,
        total_time_minutes=row.total_time_minutes,
        ingredients=row.ingredients,
        steps=row.steps,
        playlist=row.playlist,
        session_id=str(row.session_id) if row.session_id else None,
    )


@router.delete("/recipes/{recipe_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_recipe(recipe_id: str, user: CurrentUser, db: DbSession) -> None:
    row = await db.get(SavedRecipe, recipe_id)
    if row is None or str(row.user_id) != user.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Recipe not found")
    await db.delete(row)
    await db.commit()
