from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime
from typing import Dict, List

from .market_hours import can_trade_symbol
from .strategies.base import Strategy, StrategySignal


@dataclass
class Position:
    symbol: str
    qty: float  # +long, -short
    entry_price: float
    strategy_id: str


class PortfolioRouter:
    def __init__(self, starting_cash: float = 10_000.0, single_symbol_max_pct: float = 0.50, crypto_max_pct: float = 0.50):
        self.cash = starting_cash
        self.starting_cash = starting_cash
        self.single_symbol_max_pct = single_symbol_max_pct
        self.crypto_max_pct = crypto_max_pct

        self.positions: Dict[str, Position] = {}
        self.last_price: Dict[str, float] = {}

    def equity(self) -> float:
        eq = self.cash
        for sym, pos in self.positions.items():
            px = self.last_price.get(sym)
            if px is None:
                continue
            eq += pos.qty * px
        return eq

    def _gross_crypto_exposure(self) -> float:
        eq = self.equity()
        if eq <= 0:
            return 0.0
        gross = 0.0
        for sym, pos in self.positions.items():
            if "/" not in sym:
                continue
            px = self.last_price.get(sym)
            if px is None:
                continue
            gross += abs(pos.qty * px)
        return gross / eq

    def _symbol_exposure(self, sym: str) -> float:
        eq = self.equity()
        if eq <= 0:
            return 0.0
        pos = self.positions.get(sym)
        if not pos:
            return 0.0
        px = self.last_price.get(sym)
        if px is None:
            return 0.0
        return abs(pos.qty * px) / eq

    def handle_signal(self, sig: StrategySignal) -> list[dict]:
        events: list[dict] = []

        decision = can_trade_symbol(sig.symbol, sig.ts)
        if not decision.allow_trade:
            return events

        # Update last price must be done by engine before calling handle_signal.
        px = self.last_price.get(sig.symbol)
        if px is None:
            return events

        # Risk caps
        if self._symbol_exposure(sig.symbol) > self.single_symbol_max_pct:
            return events
        if "/" in sig.symbol and self._gross_crypto_exposure() > self.crypto_max_pct:
            return events

        # Simple execution: BUY => long, SELL => short. Flip allowed.
        target_notional = self.equity() * 0.10  # placeholder per-signal sizing
        qty = max(0.0, target_notional / px) * float(sig.size)
        if qty <= 0:
            return events

        if sig.side == "BUY":
            # set long
            self.positions[sig.symbol] = Position(symbol=sig.symbol, qty=qty, entry_price=px, strategy_id=sig.strategy_id)
            self.cash -= qty * px
            events.append({"type": "fill", "symbol": sig.symbol, "side": "BUY", "qty": qty, "price": px, "strategyId": sig.strategy_id})
        elif sig.side == "SELL":
            # set short
            self.positions[sig.symbol] = Position(symbol=sig.symbol, qty=-qty, entry_price=px, strategy_id=sig.strategy_id)
            self.cash += qty * px
            events.append({"type": "fill", "symbol": sig.symbol, "side": "SELL", "qty": qty, "price": px, "strategyId": sig.strategy_id})

        return events
