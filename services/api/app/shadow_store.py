from __future__ import annotations

from collections import deque
from dataclasses import dataclass, asdict
from datetime import datetime
from typing import Deque, Dict, List


MAX_EVENTS = 300


@dataclass
class ShadowSignal:
    id: str
    timestamp: datetime
    symbol: str
    direction: str  # BUY|SELL
    theoreticalSize: float
    confidenceScore: float
    strategyId: str
    executed: bool
    reason: str | None = None


@dataclass
class ShadowOrder:
    id: str
    timestamp: datetime
    symbol: str
    side: str  # BUY|SELL
    qty: float
    price: float
    status: str  # FILLED|REJECTED
    reason: str


@dataclass
class ShadowPosition:
    id: str
    symbol: str
    side: str  # LONG|SHORT
    size: float
    entryPrice: float
    currentPrice: float
    pnl: float
    pnlPercent: float
    broker: str
    strategy: str
    openedAt: datetime


signals: Deque[ShadowSignal] = deque(maxlen=MAX_EVENTS)
orders: Deque[ShadowOrder] = deque(maxlen=MAX_EVENTS)
positions: Dict[str, ShadowPosition] = {}


def add_signal(s: ShadowSignal) -> None:
    signals.appendleft(s)


def add_order(o: ShadowOrder) -> None:
    orders.appendleft(o)


def upsert_position(p: ShadowPosition) -> None:
    positions[p.symbol] = p


def remove_position(symbol: str) -> None:
    positions.pop(symbol, None)


def list_signals(limit: int = 100) -> List[dict]:
    return [asdict(x) for x in list(signals)[:limit]]


def list_orders(limit: int = 100) -> List[dict]:
    return [asdict(x) for x in list(orders)[:limit]]


def list_positions() -> List[dict]:
    return [asdict(p) for p in positions.values()]
