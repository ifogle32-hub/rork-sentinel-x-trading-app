from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from typing import Dict, List

from alpaca.data.historical import CryptoHistoricalDataClient, StockHistoricalDataClient
from alpaca.data.requests import CryptoBarsRequest, StockBarsRequest
from alpaca.data.timeframe import TimeFrame, TimeFrameUnit


def _tf(tf: str) -> TimeFrame:
    m = {
        "1Min": TimeFrame.Minute,
        "5Min": TimeFrame(5, TimeFrameUnit.Minute),
        "15Min": TimeFrame(15, TimeFrameUnit.Minute),
        "1Hour": TimeFrame.Hour,
        "1Day": TimeFrame.Day,
    }
    return m.get(tf, TimeFrame.Minute)


def _split_symbols(symbols: List[str]) -> tuple[list[str], list[str]]:
    stocks: list[str] = []
    crypto: list[str] = []
    for s in symbols:
        s2 = s.strip().upper()
        if "/" in s2:
            crypto.append(s2)
        else:
            stocks.append(s2)
    return stocks, crypto


@dataclass
class PriceTick:
    ts: datetime
    symbol: str
    price: float


class AlpacaPriceFeed:
    def __init__(self, api_key: str, secret_key: str):
        self.stocks = StockHistoricalDataClient(api_key=api_key, secret_key=secret_key)
        self.crypto = CryptoHistoricalDataClient(api_key=api_key, secret_key=secret_key)

    def fetch_latest_closes(self, symbols: List[str], timeframe: str) -> Dict[str, PriceTick]:
        """Fetch latest close per symbol using bars.

        This is polling-based (good for v1). We'll move to streaming later.
        """
        now = datetime.now(timezone.utc)
        start = now - timedelta(days=3)
        tf = _tf(timeframe)

        stocks, crypto = _split_symbols(symbols)
        out: Dict[str, PriceTick] = {}

        if stocks:
            req = StockBarsRequest(symbol_or_symbols=stocks, timeframe=tf, start=start, end=now, limit=1)
            resp = self.stocks.get_stock_bars(req)
            df = resp.df
            for sym in stocks:
                try:
                    rows = df.xs(sym, level=0, drop_level=False)
                    if rows.empty:
                        continue
                    idx, r = list(rows.iterrows())[-1]
                    ts = idx[1].to_pydatetime()
                    out[sym] = PriceTick(ts=ts, symbol=sym, price=float(r["close"]))
                except Exception:
                    continue

        if crypto:
            req = CryptoBarsRequest(symbol_or_symbols=crypto, timeframe=tf, start=start, end=now, limit=1)
            resp = self.crypto.get_crypto_bars(req)
            df = resp.df
            for sym in crypto:
                try:
                    rows = df.xs(sym, level=0, drop_level=False)
                    if rows.empty:
                        continue
                    idx, r = list(rows.iterrows())[-1]
                    ts = idx[1].to_pydatetime()
                    out[sym] = PriceTick(ts=ts, symbol=sym, price=float(r["close"]))
                except Exception:
                    continue

        return out
