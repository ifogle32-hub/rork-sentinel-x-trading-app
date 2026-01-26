from __future__ import annotations

from datetime import datetime
from typing import List

from pydantic import BaseModel, Field


class HealthResponse(BaseModel):
    status: str = "ok"


class StrategyConfigOut(BaseModel):
    id: int
    name: str
    status: str
    symbols: List[str]
    allocation_pct: float
    created_at: datetime


# Mobile app (Rork) shapes
class BrokerStatusOut(BaseModel):
    id: str
    name: str
    connected: bool
    lastPing: str
    equity: float


class BotStatusOut(BaseModel):
    state: str
    mode: str
    brokers: List[BrokerStatusOut]
    equity: float
    dailyPnL: float
    dailyPnLPercent: float
    openPositions: int
    killSwitchArmed: bool
    lastHeartbeat: str
    uptime: int
    tradingWindowActive: bool
    shadowTradingEnabled: bool


class StrategyOut(BaseModel):
    id: str
    name: str
    status: str
    winRate: float
    sharpe: float
    drawdown: float
    maxDrawdown: float
    lastTrade: str | None
    healthScore: float
    pnl: float
    pnlPercent: float
    tradesCount: int
    capitalAllocation: float
    expectancy: float


class PositionOut(BaseModel):
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


class MetricOut(BaseModel):
    label: str
    value: float | str
    change: float | None = None
    trend: str | None = None
    category: str


class StrategyConfigCreate(BaseModel):
    name: str = Field(min_length=2, max_length=120)
    symbols: List[str] = Field(default_factory=lambda: ["AAPL", "MSFT"])
    allocation_pct: float = Field(default=0.2, ge=0.0, le=1.0)


class StrategyConfigUpdate(BaseModel):
    status: str | None = None  # enabled|disabled
    symbols: List[str] | None = None
    allocation_pct: float | None = Field(default=None, ge=0.0, le=1.0)


class AuditLogOut(BaseModel):
    id: int
    ts: datetime
    level: str
    event_type: str
    message: str


class PortfolioSnapshotOut(BaseModel):
    id: int
    ts: datetime
    mode: str
    equity: float
    cash: float
    pnl_day: float


class PortfolioSnapshotIn(BaseModel):
    ts: datetime
    mode: str
    equity: float
    cash: float
    pnl_day: float


# Backtests
class BacktestRunCreate(BaseModel):
    name: str = "Portfolio Backtest"
    symbols: List[str] = Field(default_factory=lambda: ["AAPL", "MSFT", "BTC/USD"])
    start: datetime
    end: datetime
    timeframe: str = "1Min"  # 1Min|5Min|15Min|1Hour|1Day
    starting_cash: float = Field(default=10_000.0, gt=0)


class BacktestRunOut(BaseModel):
    id: int
    name: str
    status: str
    start_ts: datetime
    end_ts: datetime
    timeframe: str
    symbols: List[str]
    starting_cash: float
    ending_equity: float
    total_return_pct: float
    error: str | None
    created_at: datetime


class BacktestEquityPointOut(BaseModel):
    ts: datetime
    equity: float
    cash: float


class BacktestTradeOut(BaseModel):
    ts: datetime
    symbol: str
    side: str
    qty: float
    price: float
    reason: str
