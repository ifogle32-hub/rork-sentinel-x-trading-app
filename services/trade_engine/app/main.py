from __future__ import annotations

import asyncio
import random
from datetime import datetime, timezone

import httpx

from .settings import settings
from .governance import governance_loop


async def publish_event(event_type: str, data: dict) -> None:
    # v0: no WS publish from engine; API will be extended with an ingest endpoint.
    # Here we just keep the loop alive.
    return


async def run_loop() -> None:
    # v0 skeleton: generates synthetic portfolio snapshots in SHADOW mode.
    # Includes a deterministic governance loop that can pause the engine on risk breach.
    equity0 = 10_000.0
    equity = equity0
    cash = equity0
    pnl_day = 0.0

    async with httpx.AsyncClient(timeout=5.0) as client:
        while True:
            # pretend to trade
            delta = random.uniform(-25, 35)
            pnl_day += delta
            equity = equity0 + pnl_day

            try:
                await client.post(
                    f"{settings.api_url.rstrip('/')}/ingest/portfolio",
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
