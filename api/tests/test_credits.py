"""Unit tests for credit metering math (no network / DB required)."""

from types import SimpleNamespace

from app.services.anthropic_client import Usage
from app.services.credits import cost_for_usage


def test_cost_haiku_rounds_up_and_min_one():
    # Haiku rate = (0.5 in, 2.5 out) per 1k tokens.
    cost = cost_for_usage("claude-haiku-4-5", input_tokens=1000, output_tokens=1000)
    assert cost.credits == 3  # 0.5 + 2.5 = 3.0

    tiny = cost_for_usage("claude-haiku-4-5", input_tokens=10, output_tokens=10)
    assert tiny.credits == 1  # rounds up, floor of 1


def test_cost_sonnet():
    # Sonnet rate = (2.0 in, 10.0 out) per 1k tokens.
    cost = cost_for_usage("claude-sonnet-4-6", input_tokens=2000, output_tokens=500)
    assert cost.credits == 9  # 4.0 + 5.0


def test_unknown_model_uses_default_rate():
    cost = cost_for_usage("some-future-model", input_tokens=1000, output_tokens=1000)
    assert cost.credits == 12  # default (2.0 + 10.0)


def test_usage_folds_in_cache_tokens():
    raw = SimpleNamespace(
        input_tokens=100,
        output_tokens=50,
        cache_read_input_tokens=400,
        cache_creation_input_tokens=10,
    )
    usage = Usage.from_anthropic(raw)
    assert usage.input_tokens == 510  # 100 + 400 + 10
    assert usage.output_tokens == 50


def test_usage_handles_missing_cache_fields():
    raw = SimpleNamespace(input_tokens=100, output_tokens=50)
    usage = Usage.from_anthropic(raw)
    assert usage.input_tokens == 100
    assert usage.output_tokens == 50
