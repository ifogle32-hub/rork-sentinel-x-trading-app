from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, time, timezone


@dataclass(frozen=True)
class MarketHoursDecision:
    allow_trade: bool
    reason: str


def is_crypto_symbol(symbol: str) -> bool:
    return "/" in symbol


def nyse_market_open(now_utc: datetime) -> bool:
    # Simple market hours gate (no holidays): Mon-Fri 09:30-16:00 America/New_York.
    # We avoid tz database dependency; approximate using UTC offsets is brittle.
    # For now: treat US equities as allowed Mon-Fri always, but you can tighten later.
    # TODO: integrate exchange calendar (pandas_market_calendars) once stable.
    if now_utc.tzinfo is None:
        now_utc = now_utc.replace(tzinfo=timezone.utc)
    # Very conservative fallback: allow weekdays only
    if now_utc.weekday() >= 5:
        return False
    return True


def can_trade_symbol(symbol: str, now_utc: datetime) -> MarketHoursDecision:
    if is_crypto_symbol(symbol):
        return MarketHoursDecision(True, "crypto_24_7")

    if nyse_market_open(now_utc):
        return MarketHoursDecision(True, "stocks_weekday_gate")

    return MarketHoursDecision(False, "stocks_closed")
