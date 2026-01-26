from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime
from typing import Literal, Protocol

SignalSide = Literal["BUY", "SELL", "HOLD"]


@dataclass
class StrategySignal:
    ts: datetime
    symbol: str
    side: SignalSide
    confidence: float
    size: float
    strategy_id: str
    reason: str


class Strategy(Protocol):
    strategy_id: str

    def on_price(self, ts: datetime, symbol: str, price: float) -> StrategySignal | None:
        ...
