from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime
from typing import Deque, Dict
from collections import deque

from .base import Strategy, StrategySignal


def _mean(xs):
    return sum(xs) / len(xs)


def _std(xs):
    m = _mean(xs)
    v = sum((x - m) ** 2 for x in xs) / max(1, (len(xs) - 1))
    return v ** 0.5


@dataclass
class BollingerRevertStrategy(Strategy):
    strategy_id: str
    period: int = 20
    k: float = 2.0
    base_size: float = 1.0

    _window: Dict[str, Deque[float]] = None

    def __post_init__(self) -> None:
        self._window = {}

    def on_price(self, ts: datetime, symbol: str, price: float) -> StrategySignal | None:
        w = self._window.get(symbol)
        if w is None:
            w = deque(maxlen=self.period)
            self._window[symbol] = w
        w.append(price)
        if len(w) < self.period:
            return None

        m = _mean(w)
        sd = _std(w)
        if sd <= 0:
            return None

        upper = m + self.k * sd
        lower = m - self.k * sd

        # Mean reversion: fade extremes
        if price < lower:
            return StrategySignal(ts=ts, symbol=symbol, side="BUY", confidence=0.70, size=self.base_size, strategy_id=self.strategy_id, reason="bb_revert_buy")
        if price > upper:
            return StrategySignal(ts=ts, symbol=symbol, side="SELL", confidence=0.70, size=self.base_size, strategy_id=self.strategy_id, reason="bb_revert_sell")
        return None
