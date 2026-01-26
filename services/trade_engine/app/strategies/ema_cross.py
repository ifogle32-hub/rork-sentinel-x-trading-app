from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime
from typing import Dict

from .base import Strategy, StrategySignal


def _ema(prev: float | None, price: float, period: int) -> float:
    a = 2.0 / (period + 1.0)
    return price if prev is None else prev + a * (price - prev)


@dataclass
class EMACrossStrategy(Strategy):
    strategy_id: str
    fast: int = 12
    slow: int = 26
    base_size: float = 1.0

    _ema_fast: Dict[str, float | None] = None
    _ema_slow: Dict[str, float | None] = None

    def __post_init__(self) -> None:
        self._ema_fast = {}
        self._ema_slow = {}

    def on_price(self, ts: datetime, symbol: str, price: float) -> StrategySignal | None:
        ef = self._ema_fast.get(symbol)
        es = self._ema_slow.get(symbol)

        ef = _ema(ef, price, self.fast)
        es = _ema(es, price, self.slow)

        self._ema_fast[symbol] = ef
        self._ema_slow[symbol] = es

        if ef > es:
            return StrategySignal(ts=ts, symbol=symbol, side="BUY", confidence=0.75, size=self.base_size, strategy_id=self.strategy_id, reason="ema_cross_bull")
        if ef < es:
            return StrategySignal(ts=ts, symbol=symbol, side="SELL", confidence=0.75, size=self.base_size, strategy_id=self.strategy_id, reason="ema_cross_bear")
        return None
