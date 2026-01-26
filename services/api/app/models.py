from __future__ import annotations

import enum
from datetime import datetime

from sqlalchemy import String, Integer, DateTime, Enum, Float, Boolean, Text
from sqlalchemy.orm import Mapped, mapped_column

from .db import Base


class RunMode(str, enum.Enum):
    shadow = "shadow"
    live = "live"


class StrategyStatus(str, enum.Enum):
    enabled = "enabled"
    disabled = "disabled"


class StrategyConfig(Base):
    __tablename__ = "strategy_configs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(120), unique=True, index=True)
    status: Mapped[StrategyStatus] = mapped_column(Enum(StrategyStatus), default=StrategyStatus.disabled)
    symbols_csv: Mapped[str] = mapped_column(String(500), default="AAPL,MSFT")
    allocation_pct: Mapped[float] = mapped_column(Float, default=0.2)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    ts: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, index=True)
    level: Mapped[str] = mapped_column(String(20), default="INFO")
    event_type: Mapped[str] = mapped_column(String(60), index=True)
    message: Mapped[str] = mapped_column(Text)


class RiskEvent(Base):
    __tablename__ = "risk_events"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    ts: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, index=True)
    code: Mapped[str] = mapped_column(String(60), index=True)
    detail: Mapped[str] = mapped_column(Text)
    active: Mapped[bool] = mapped_column(Boolean, default=True)


class PortfolioSnapshot(Base):
    __tablename__ = "portfolio_snapshots"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    ts: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, index=True)
    mode: Mapped[RunMode] = mapped_column(Enum(RunMode), default=RunMode.shadow)
    equity: Mapped[float] = mapped_column(Float, default=0.0)
    cash: Mapped[float] = mapped_column(Float, default=0.0)
    pnl_day: Mapped[float] = mapped_column(Float, default=0.0)


class BacktestStatus(str, enum.Enum):
    running = "running"
    complete = "complete"
    failed = "failed"


class BacktestRun(Base):
    __tablename__ = "backtest_runs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(120), index=True)
    status: Mapped[BacktestStatus] = mapped_column(Enum(BacktestStatus), default=BacktestStatus.running)

    start_ts: Mapped[datetime] = mapped_column(DateTime, index=True)
    end_ts: Mapped[datetime] = mapped_column(DateTime, index=True)
    timeframe: Mapped[str] = mapped_column(String(40), default="1Min")
    symbols_csv: Mapped[str] = mapped_column(String(1000), default="AAPL,MSFT,BTC/USD")

    starting_cash: Mapped[float] = mapped_column(Float, default=10_000.0)
    ending_equity: Mapped[float] = mapped_column(Float, default=0.0)
    total_return_pct: Mapped[float] = mapped_column(Float, default=0.0)

    error: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class BacktestEquityPoint(Base):
    __tablename__ = "backtest_equity_points"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    run_id: Mapped[int] = mapped_column(Integer, index=True)
    ts: Mapped[datetime] = mapped_column(DateTime, index=True)
    equity: Mapped[float] = mapped_column(Float)
    cash: Mapped[float] = mapped_column(Float)


class BacktestTrade(Base):
    __tablename__ = "backtest_trades"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    run_id: Mapped[int] = mapped_column(Integer, index=True)
    ts: Mapped[datetime] = mapped_column(DateTime, index=True)
    symbol: Mapped[str] = mapped_column(String(30), index=True)
    side: Mapped[str] = mapped_column(String(10))  # BUY|SELL
    qty: Mapped[float] = mapped_column(Float)
    price: Mapped[float] = mapped_column(Float)
    reason: Mapped[str] = mapped_column(String(120), default="signal")
