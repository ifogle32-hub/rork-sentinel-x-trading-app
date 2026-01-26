from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime
from collections import deque
from typing import Deque, Dict

from .base import Strategy, StrategySignal


@dataclass
class DonchianBreakoutStrategy(Strategy):
    strategy_id: str
    period: int = 20
    base_size: float = 1.0

    _window: Dict[str, Deque[float]] = None

    def __post_init__(self) -> None:
        self._window = {}

    def on_price(self, ts: datetime, symbol: str, price: float) -> StrategySignal | None:
        w = self._window.get(symbol)
        if w is None:
            w = deque(maxlen=self.period)
            self._window[symbol] = w

        # We use closes as a proxy (v1). Later use highs/lows.
        prev = list(w)
        w.append(price)
        if len(prev) < self.period:
            return None

        hi = max(prev)
        lo = min(prev)

        if price > hi:
            return StrategySignal(ts=ts, symbol=symbol, side="BUY", confidence=0.72, size=self.base_size, strategy_id=self.strategy_id, reason="donchian_breakout_buy")
        if price < lo:
            return StrategySignal(ts=ts, symbol=symbol, side="SELL", confidence=0.72, size=self.base_size, strategy_id=self.strategy_id, reason="donchian_breakout_sell")
        return None
