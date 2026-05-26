"""Unit tests for the RevenueCat product → credits mapping."""

from app.services.billing import CREDIT_PACKS, _PURCHASE_EVENTS


def test_credit_packs_are_positive():
    assert CREDIT_PACKS, "at least one credit pack must be defined"
    assert all(amount > 0 for amount in CREDIT_PACKS.values())


def test_purchase_event_types_cover_consumables():
    # Consumable credit packs arrive as NON_RENEWING_PURCHASE in RevenueCat.
    assert "NON_RENEWING_PURCHASE" in _PURCHASE_EVENTS
    assert "INITIAL_PURCHASE" in _PURCHASE_EVENTS
