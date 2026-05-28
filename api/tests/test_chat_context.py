"""Unit tests for the chat context builder that makes Sage 'remember' recipes it created."""

from app.services.chat import _build_recipes_block


def test_empty_recipes_block_is_blank():
    assert _build_recipes_block(None) == ""
    assert _build_recipes_block([]) == ""


def test_terse_entries_list_title_and_summary():
    block = _build_recipes_block(
        [
            {"title": "Lemon Pasta", "summary": "Bright and quick"},
            {"title": "Bean Chili", "summary": ""},
        ]
    )
    assert "Recipes you've created in this conversation" in block
    assert '- "Lemon Pasta" — Bright and quick' in block
    assert '- "Bean Chili"' in block
    # No summary → no trailing dash for that entry.
    assert '"Bean Chili" —' not in block
    # Terse entries don't leak full ingredients/steps.
    assert "Ingredients:" not in block


def test_full_entry_includes_ingredients_and_steps():
    block = _build_recipes_block(
        [
            {
                "title": "Lemon Pasta",
                "summary": "Bright and quick",
                "ingredients": [{"item": "spaghetti", "quantity": "200g"}, {"item": "lemon"}],
                "steps": [{"instruction": "Boil pasta"}, {"instruction": "Toss with lemon"}],
                "full": True,
            }
        ]
    )
    assert "Ingredients: spaghetti, lemon" in block
    assert "1. Boil pasta" in block
    assert "2. Toss with lemon" in block
    # The directive steers Sage toward regenerating rather than asking for hand-edits.
    assert "regenerate the whole recipe" in block
