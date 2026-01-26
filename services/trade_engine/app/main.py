from __future__ import annotations

import asyncio
import random
from datetime import datetime, timezone

import httpx

from .settings import settings
from .governance import governance_loop
from .market_data_alpaca import AlpacaPriceFeed
from .portfolio_router import PortfolioRouter
from .strategies.ema_cross import EMACrossStrategy
from .strategies.bollinger_revert import BollingerRevertStrategy
from .strategies.donchian_breakout import DonchianBreakoutStrategy


async def publish_event(event_type: str, data: dict) -> None:
    # v0: no WS publish from engine; API will be extended with an ingest endpoint.
    # Here we just keep the loop alive.
    return


async def run_loop() -> None:
    """Shadow scalping/day-trading loop.

    Uses real market prices (polled from Alpaca bars) and runs multiple strategies concurrently.
    Executes simulated fills via a portfolio router (supports shorting) and streams:
    - signals
    - simulated orders
    - positions
    - portfolio snapshots
    """

    base = settings.api_url.rstrip("/")

    symbols = [s.strip() for s in settings.default_symbols_csv.split(",") if s.strip()]
    timeframe = settings.primary_timeframe

    feed = AlpacaPriceFeed(api_key=settings.alpaca_api_key_id, secret_key=settings.alpaca_api_secret_key)

    router = PortfolioRouter(
        starting_cash=10_000.0,
        single_symbol_max_pct=0.50,
        crypto_max_pct=0.50,
        max_gross_exposure_pct=settings.max_gross_exposure_pct,
        max_net_exposure_pct=settings.max_net_exposure_pct,
    )

    strategies = [
        EMACrossStrategy(strategy_id="ema_cross", fast=8, slow=21, base_size=1.0),
        BollingerRevertStrategy(strategy_id="bb_revert", period=20, k=2.0, base_size=1.0),
        DonchianBreakoutStrategy(strategy_id="donchian_breakout", period=20, base_size=1.0),
    ]

    async with httpx.AsyncClient(timeout=10.0) as client:
        while True:
            # Poll latest closes
            try:
                ticks = feed.fetch_latest_closes(symbols=symbols, timeframe=timeframe)
            except Exception:
                ticks = {}

            ts_now = datetime.now(timezone.utc)

            # Feed strategies and route signals
            for sym, tick in ticks.items():
                router.last_price[sym] = tick.price

                for strat in strategies:
                    sig = strat.on_price(ts=tick.ts, symbol=sym, price=tick.price)
                    if not sig:
                        continue

                    # push signal
                    try:
                        await client.post(
                            f"{base}/shadow/ingest/signal",
                            json={
                                "id": f"{sig.strategy_id}:{sym}:{sig.ts.isoformat()}",
                                "timestamp": sig.ts.isoformat(),
                                "symbol": sig.symbol,
                                "direction": sig.side,
                                "theoreticalSize": sig.size,
                                "confidenceScore": sig.confidence,
                                "strategyId": sig.strategy_id,
                                "executed": True,
                                "reason": sig.reason,
                            },
                        )
                    except Exception:
                        pass

                    fills = router.handle_signal(sig)
                    for f in fills:
                        # order event
                        try:
                            await client.post(
                                f"{base}/shadow/ingest/order",
                                json={
                                    "id": f"{f['strategyId']}:{f['symbol']}:{ts_now.isoformat()}",
                                    "timestamp": ts_now.isoformat(),
                                    "symbol": f["symbol"],
                                    "side": f["side"],
                                    "qty": float(f["qty"]),
                                    "price": float(f["price"]),
                                    "status": "FILLED",
                                    "reason": "portfolio_router_fill",
                                },
                            )
                        except Exception:
                            pass

            # Build positions view
            positions_payload = []
            pnl_total = 0.0
            for sym, pos in router.positions.items():
                px = router.last_price.get(sym, pos.entry_price)
                pnl = (px - pos.entry_price) * pos.qty
                pnl_pct = ((px / pos.entry_price) - 1.0) * 100.0
                pnl_total += pnl
                positions_payload.append(
                    {
                        "id": f"pos:{sym}",
                        "symbol": sym,
                        "side": "LONG" if pos.qty > 0 else "SHORT",
                        "size": abs(float(pos.qty)),
                        "entryPrice": float(pos.entry_price),
                        "currentPrice": float(px),
                        "pnl": float(pnl),
                        "pnlPercent": float(pnl_pct),
                        "broker": "SIM",
                        "strategy": pos.strategy_id,
                        "openedAt": ts_now.isoformat(),
                    }
                )

            # push positions (one by one)
            for p in positions_payload:
                try:
                    await client.post(f"{base}/shadow/ingest/position", json=p)
                except Exception:
                    pass

            equity = router.equity()

            # Portfolio snapshot
            try:
                await client.post(
                    f"{base}/ingest/portfolio",
                    json={
                        "ts": ts_now.isoformat(),
                        "mode": settings.run_mode,
                        "equity": float(equity),
                        "cash": float(router.cash),
                        "pnl_day": float(pnl_total),
                    },
                )
            except Exception:
                pass

            await asyncio.sleep(5)


async def _main_async() -> None:
    print(f"Agent INS trade_engine starting (mode={settings.run_mode}, alpaca_env={settings.alpaca_env})")
    # Run trading loop and governance loop concurrently.
    await asyncio.gather(
        run_loop(),
        governance_loop(),
    )


def main() -> None:
    asyncio.run(_main_async())


if __name__ == "__main__":
    main()
