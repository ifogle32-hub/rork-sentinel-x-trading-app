from __future__ import annotations

import asyncio
import random
from datetime import datetime, timezone

import httpx

from .settings import settings
from .governance import governance_loop
from .shadow_simulator import ShadowSim


async def publish_event(event_type: str, data: dict) -> None:
    # v0: no WS publish from engine; API will be extended with an ingest endpoint.
    # Here we just keep the loop alive.
    return


async def run_loop() -> None:
    # Shadow engine: emits live signals, simulated orders, and position updates.
    # Includes deterministic governance loop (separate task) that can pause/resume based on risk.

    equity0 = 10_000.0
    cash = equity0
    pnl_day = 0.0

    # Symbols to simulate; later this is driven from StrategyConfig.
    sim = ShadowSim(symbols=["AAPL", "MSFT", "NVDA", "BTC/USD", "ETH/USD"])

    base = settings.api_url.rstrip("/")

    async with httpx.AsyncClient(timeout=5.0) as client:
        while True:
            # Create live shadow events
            signals, orders, positions = sim.step()

            # Update pnl_day from positions (unrealized, rough)
            pnl_day = sum(p.pnl for p in positions)
            equity = equity0 + pnl_day

            # Portfolio snapshot (drives Overview/Dashboard)
            try:
                await client.post(
                    f"{base}/ingest/portfolio",
                    json={
                        "ts": datetime.now(timezone.utc).isoformat(),
                        "mode": settings.run_mode,
                        "equity": equity,
                        "cash": cash,
                        "pnl_day": pnl_day,
                    },
                )
            except Exception:
                pass

            # Stream signals/orders/positions to API for WS broadcast
            for s in signals:
                try:
                    await client.post(f"{base}/shadow/ingest/signal", json=s.__dict__)
                except Exception:
                    pass

            for o in orders:
                try:
                    await client.post(f"{base}/shadow/ingest/order", json=o.__dict__)
                except Exception:
                    pass

            for p in positions:
                try:
                    await client.post(f"{base}/shadow/ingest/position", json=p.__dict__)
                except Exception:
                    pass

            await asyncio.sleep(2)


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
