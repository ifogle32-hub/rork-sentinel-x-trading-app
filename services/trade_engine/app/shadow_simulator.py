from __future__ import annotations

import random
from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Dict, List
from uuid import uuid4


@dataclass
class Signal:
    id: str
    timestamp: str
    symbol: str
    direction: str  # BUY|SELL
    theoreticalSize: float
    confidenceScore: float
    strategyId: str
    executed: bool
    reason: str


@dataclass
class Order:
    id: str
    timestamp: str
    symbol: str
    side: str
    qty: float
    price: float
    status: str
    reason: str


@dataclass
class Position:
    id: str
    symbol: str
    side: str
    size: float
    entryPrice: float
    currentPrice: float
    pnl: float
    pnlPercent: float
    broker: str
    strategy: str
    openedAt: str


class ShadowSim:
    def __init__(self, symbols: List[str]) -> None:
        self.symbols = [s.upper() for s in symbols]
        self.prices: Dict[str, float] = {s: (100.0 if "/" not in s else 30000.0) for s in self.symbols}
        self.positions: Dict[str, Position] = {}
        self.strategy_id = "shadow-ema-cross"

    def step(self) -> tuple[list[Signal], list[Order], list[Position]]:
        signals: list[Signal] = []
        orders: list[Order] = []

        now = datetime.now(timezone.utc)
        now_s = now.isoformat()

        for sym in self.symbols:
            # random walk price
            base_vol = 0.005 if "/" in sym else 0.002
            drift = random.uniform(-base_vol, base_vol)
            self.prices[sym] *= (1.0 + drift)
            px = float(self.prices[sym])

            # update position mark-to-market
            if sym in self.positions:
                p = self.positions[sym]
                p.currentPrice = px
                if p.side == "LONG":
                    p.pnl = (px - p.entryPrice) * p.size
                    p.pnlPercent = ((px / p.entryPrice) - 1.0) * 100.0
                else:
                    p.pnl = (p.entryPrice - px) * p.size
                    p.pnlPercent = ((p.entryPrice / px) - 1.0) * 100.0

            # generate signal occasionally
            if random.random() < 0.35:
                direction = "BUY" if random.random() < 0.55 else "SELL"
                confidence = round(random.uniform(0.55, 0.95), 3)
                size = round(random.uniform(0.01, 0.5) if "/" in sym else random.uniform(0.1, 10.0), 4)

                # decide execute (simulated fill) if confidence high
                execute = confidence >= 0.70

                sig = Signal(
                    id=str(uuid4()),
                    timestamp=now_s,
                    symbol=sym,
                    direction=direction,
                    theoreticalSize=size,
                    confidenceScore=confidence,
                    strategyId=self.strategy_id,
                    executed=execute,
                    reason="shadow_signal",
                )
                signals.append(sig)

                if execute:
                    side = direction
                    order = Order(
                        id=str(uuid4()),
                        timestamp=now_s,
                        symbol=sym,
                        side=side,
                        qty=size,
                        price=px,
                        status="FILLED",
                        reason="shadow_fill",
                    )
                    orders.append(order)

                    # update positions: long-only for now
                    if side == "BUY":
                        if sym not in self.positions:
                            self.positions[sym] = Position(
                                id=str(uuid4()),
                                symbol=sym,
                                side="LONG",
                                size=size,
                                entryPrice=px,
                                currentPrice=px,
                                pnl=0.0,
                                pnlPercent=0.0,
                                broker="SIM",
                                strategy=self.strategy_id,
                                openedAt=now_s,
                            )
                        else:
                            # add (simple avg)
                            p = self.positions[sym]
                            new_size = p.size + size
                            p.entryPrice = (p.entryPrice * p.size + px * size) / new_size
                            p.size = new_size
                    else:
                        # SELL: close if exists
                        if sym in self.positions:
                            del self.positions[sym]

        return signals, orders, list(self.positions.values())
