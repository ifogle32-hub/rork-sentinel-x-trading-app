from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime
from typing import Dict, List, Tuple

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from alpaca.data.historical import CryptoHistoricalDataClient, StockHistoricalDataClient
from alpaca.data.requests import CryptoBarsRequest, StockBarsRequest
from alpaca.data.timeframe import TimeFrame, TimeFrameUnit

from .db import get_db
from .models import BacktestEquityPoint, BacktestRun, BacktestStatus, BacktestTrade
from .schemas import (
    BacktestEquityPointOut,
    BacktestRunCreate,
    BacktestRunOut,
    BacktestTradeOut,
)

router = APIRouter(prefix="/backtest", tags=["backtest"])


def _tf(tf: str) -> TimeFrame:
    m = {
        "1Min": TimeFrame.Minute,
        "5Min": TimeFrame(5, TimeFrameUnit.Minute),
        "15Min": TimeFrame(15, TimeFrameUnit.Minute),
        "1Hour": TimeFrame.Hour,
        "1Day": TimeFrame.Day,
    }
    if tf not in m:
        raise HTTPException(status_code=400, detail="Unsupported timeframe")
    return m[tf]


def _split_symbols(symbols: List[str]) -> Tuple[List[str], List[str]]:
    stocks: List[str] = []
    crypto: List[str] = []
    for s in symbols:
        s2 = s.strip().upper()
        if "/" in s2:
            crypto.append(s2)
        else:
            stocks.append(s2)
    return stocks, crypto


@dataclass
class Bar:
    ts: datetime
    close: float


def _fetch_bars(
    stocks_client: StockHistoricalDataClient,
    crypto_client: CryptoHistoricalDataClient,
    symbols: List[str],
    start: datetime,
    end: datetime,
    timeframe: str,
) -> Dict[str, List[Bar]]:
    stocks, crypto = _split_symbols(symbols)
    tf = _tf(timeframe)

    out: Dict[str, List[Bar]] = {}

    if stocks:
        req = StockBarsRequest(symbol_or_symbols=stocks, timeframe=tf, start=start, end=end)
        resp = stocks_client.get_stock_bars(req)
        df = resp.df
        # df index is multi-index (symbol, timestamp)
        for sym in stocks:
            rows = df.xs(sym, level=0, drop_level=False)
            bars = [Bar(ts=idx[1].to_pydatetime(), close=float(r["close"])) for idx, r in rows.iterrows()]
            out[sym] = bars

    if crypto:
        req = CryptoBarsRequest(symbol_or_symbols=crypto, timeframe=tf, start=start, end=end)
        resp = crypto_client.get_crypto_bars(req)
        df = resp.df
        for sym in crypto:
            rows = df.xs(sym, level=0, drop_level=False)
            bars = [Bar(ts=idx[1].to_pydatetime(), close=float(r["close"])) for idx, r in rows.iterrows()]
            out[sym] = bars

    return out


def _ema(prev: float | None, price: float, period: int) -> float:
    alpha = 2.0 / (period + 1)
    if prev is None:
        return price
    return prev + alpha * (price - prev)


def _run_portfolio_backtest(
    bars_by_symbol: Dict[str, List[Bar]],
    starting_cash: float,
    fast: int = 12,
    slow: int = 26,
    slippage_bps: float = 2.0,
) -> Tuple[List[Tuple[datetime, float, float]], List[Tuple[datetime, str, str, float, float, str]]]:
    """Equal-weight, long-only EMA cross backtest.

    - Each symbol gets equal target weight when "in position".
    - Buy when fast EMA crosses above slow EMA.
    - Sell when fast EMA crosses below slow EMA.
    """

    # Build a unified timeline from all symbols.
    all_ts = sorted({b.ts for bars in bars_by_symbol.values() for b in bars})
    if not all_ts:
        return [], []

    # Map ts -> close per symbol
    close_map: Dict[str, Dict[datetime, float]] = {}
    for sym, bars in bars_by_symbol.items():
        close_map[sym] = {b.ts: b.close for b in bars}

    symbols = sorted(bars_by_symbol.keys())

    cash = starting_cash
    qty: Dict[str, float] = {s: 0.0 for s in symbols}

    ema_fast: Dict[str, float | None] = {s: None for s in symbols}
    ema_slow: Dict[str, float | None] = {s: None for s in symbols}
    prev_state: Dict[str, int] = {s: 0 for s in symbols}  # -1 bear, +1 bull

    equity_points: List[Tuple[datetime, float, float]] = []
    trades: List[Tuple[datetime, str, str, float, float, str]] = []

    def mkt_equity(ts: datetime) -> float:
        eq = cash
        for s in symbols:
            p = close_map[s].get(ts)
            if p is None:
                continue
            eq += qty[s] * p
        return eq

    for ts in all_ts:
        # Update signals per symbol
        desired_in: Dict[str, bool] = {}
        prices: Dict[str, float] = {}
        for s in symbols:
            p = close_map[s].get(ts)
            if p is None:
                continue
            prices[s] = p
            ema_fast[s] = _ema(ema_fast[s], p, fast)
            ema_slow[s] = _ema(ema_slow[s], p, slow)
            state = 1 if (ema_fast[s] or 0) >= (ema_slow[s] or 0) else -1
            desired_in[s] = state == 1

        if not prices:
            continue

        # Determine target weights (equal among desired_in)
        active = [s for s, on in desired_in.items() if on]
        eq = mkt_equity(ts)
        equity_points.append((ts, eq, cash))

        if not active:
            # liquidate everything
            for s in symbols:
                if qty[s] != 0.0 and s in prices:
                    sell_qty = qty[s]
                    exec_price = prices[s] * (1.0 - slippage_bps / 10_000.0)
                    cash += sell_qty * exec_price
                    qty[s] = 0.0
                    trades.append((ts, s, "SELL", sell_qty, exec_price, "risk_off"))
            continue

        target_weight = 1.0 / len(active)

        # Rebalance: for simplicity, fully invest equal weight across active symbols.
        # Compute desired dollar per active symbol
        for s in symbols:
            if s not in prices:
                continue

            target_value = (eq * target_weight) if s in active else 0.0
            current_value = qty[s] * prices[s]
            delta_value = target_value - current_value

            if abs(delta_value) < 1e-6:
                continue

            if delta_value > 0:
                # buy
                exec_price = prices[s] * (1.0 + slippage_bps / 10_000.0)
                buy_qty = delta_value / exec_price
                cost = buy_qty * exec_price
                if cost > cash:
                    # cap by cash
                    buy_qty = cash / exec_price
                    cost = buy_qty * exec_price
                if buy_qty > 0:
                    cash -= cost
                    qty[s] += buy_qty
                    trades.append((ts, s, "BUY", buy_qty, exec_price, "rebalance_in" if s in active else "rebalance"))
            else:
                # sell
                exec_price = prices[s] * (1.0 - slippage_bps / 10_000.0)
                sell_qty = min(qty[s], (-delta_value) / exec_price)
                if sell_qty > 0:
                    cash += sell_qty * exec_price
                    qty[s] -= sell_qty
                    trades.append((ts, s, "SELL", sell_qty, exec_price, "rebalance_out"))

    return equity_points, trades


@router.post("/run", response_model=BacktestRunOut)
def run_backtest(payload: BacktestRunCreate, db: Session = Depends(get_db)):
    # Create run
    run = BacktestRun(
        name=payload.name,
        status=BacktestStatus.running,
        start_ts=payload.start,
        end_ts=payload.end,
        timeframe=payload.timeframe,
        symbols_csv=",".join(payload.symbols),
        starting_cash=payload.starting_cash,
    )
    db.add(run)
    db.commit()
    db.refresh(run)

    # Alpaca keys come from Settings (loads .env)
    from .settings import settings

    key = settings.alpaca_api_key_id
    secret = settings.alpaca_api_secret_key
    if not key or not secret:
        run.status = BacktestStatus.failed
        run.error = "Missing ALPACA_API_KEY_ID / ALPACA_API_SECRET_KEY in .env"
        db.add(run)
        db.commit()
        raise HTTPException(status_code=400, detail=run.error)

    stocks_client = StockHistoricalDataClient(api_key=key, secret_key=secret)
    crypto_client = CryptoHistoricalDataClient(api_key=key, secret_key=secret)

    try:
        bars_by_symbol = _fetch_bars(stocks_client, crypto_client, payload.symbols, payload.start, payload.end, payload.timeframe)
        if not bars_by_symbol:
            raise ValueError("No bars returned for requested symbols/time range")

        equity_points, trades = _run_portfolio_backtest(bars_by_symbol, payload.starting_cash)

        # Persist results
        for ts, eq, cash in equity_points:
            db.add(BacktestEquityPoint(run_id=run.id, ts=ts, equity=eq, cash=cash))
        for ts, sym, side, qty, price, reason in trades:
            db.add(BacktestTrade(run_id=run.id, ts=ts, symbol=sym, side=side, qty=qty, price=price, reason=reason))

        ending_equity = equity_points[-1][1] if equity_points else payload.starting_cash
        run.ending_equity = ending_equity
        run.total_return_pct = ((ending_equity / payload.starting_cash) - 1.0) * 100.0
        run.status = BacktestStatus.complete
        db.add(run)
        db.commit()
        db.refresh(run)

    except Exception as e:
        run.status = BacktestStatus.failed
        run.error = str(e)
        db.add(run)
        db.commit()
        raise HTTPException(status_code=500, detail=str(e))

    return BacktestRunOut(
        id=run.id,
        name=run.name,
        status=run.status.value,
        start_ts=run.start_ts,
        end_ts=run.end_ts,
        timeframe=run.timeframe,
        symbols=[s.strip() for s in run.symbols_csv.split(",") if s.strip()],
        starting_cash=run.starting_cash,
        ending_equity=run.ending_equity,
        total_return_pct=run.total_return_pct,
        error=run.error,
        created_at=run.created_at,
    )


@router.get("/runs", response_model=List[BacktestRunOut])
def list_runs(limit: int = 50, db: Session = Depends(get_db)):
    rows = db.query(BacktestRun).order_by(BacktestRun.created_at.desc()).limit(limit).all()
    out: List[BacktestRunOut] = []
    for r in rows:
        out.append(
            BacktestRunOut(
                id=r.id,
                name=r.name,
                status=r.status.value,
                start_ts=r.start_ts,
                end_ts=r.end_ts,
                timeframe=r.timeframe,
                symbols=[s.strip() for s in r.symbols_csv.split(",") if s.strip()],
                starting_cash=r.starting_cash,
                ending_equity=r.ending_equity,
                total_return_pct=r.total_return_pct,
                error=r.error,
                created_at=r.created_at,
            )
        )
    return out


@router.get("/{run_id}/equity", response_model=List[BacktestEquityPointOut])
def get_equity(run_id: int, limit: int = 2000, db: Session = Depends(get_db)):
    rows = (
        db.query(BacktestEquityPoint)
        .where(BacktestEquityPoint.run_id == run_id)
        .order_by(BacktestEquityPoint.ts.asc())
        .limit(limit)
        .all()
    )
    return [BacktestEquityPointOut(ts=r.ts, equity=r.equity, cash=r.cash) for r in rows]


@router.get("/{run_id}/trades", response_model=List[BacktestTradeOut])
def get_trades(run_id: int, limit: int = 2000, db: Session = Depends(get_db)):
    rows = (
        db.query(BacktestTrade)
        .where(BacktestTrade.run_id == run_id)
        .order_by(BacktestTrade.ts.asc())
        .limit(limit)
        .all()
    )
    return [BacktestTradeOut(ts=r.ts, symbol=r.symbol, side=r.side, qty=r.qty, price=r.price, reason=r.reason) for r in rows]
