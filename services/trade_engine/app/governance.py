from __future__ import annotations

import asyncio
from dataclasses import dataclass

import httpx

from .settings import settings


@dataclass
class GovernanceDecision:
    action: str  # PAUSE|RESUME|NOOP
    reason: str


class Governance:
    """Trading-only internal governance (no LLM).

    Rule-based safety controller:
    - if daily PnL breaches max_daily_loss_pct, pause engine
    - otherwise keep engine trading

    This is intentionally conservative and deterministic.
    """

    def __init__(self, starting_equity: float = 10_000.0):
        self.starting_equity = starting_equity

    def decide(self, pnl_day: float, engine_state: str) -> GovernanceDecision:
        max_loss = -abs(settings.max_daily_loss_pct) * self.starting_equity
        if pnl_day <= max_loss and engine_state != "PAUSED":
            return GovernanceDecision(action="PAUSE", reason=f"daily_loss_breach pnl_day={pnl_day:.2f} <= {max_loss:.2f}")
        if pnl_day > max_loss and engine_state == "PAUSED":
            # do not auto-resume by default; safer to require manual start
            return GovernanceDecision(action="NOOP", reason="within_limits_but_manual_resume_required")
        return GovernanceDecision(action="NOOP", reason="within_limits")


async def governance_loop(poll_seconds: float = 5.0) -> None:
    gov = Governance()
    base = settings.api_url.rstrip("/")

    async with httpx.AsyncClient(timeout=5.0) as client:
        while True:
            try:
                status = (await client.get(f"{base}/status")).json()
                state = status.get("state", "UNKNOWN")
                pnl_day = float(status.get("dailyPnL", 0.0))

                decision = gov.decide(pnl_day=pnl_day, engine_state=state)
                if decision.action == "PAUSE":
                    await client.post(f"{base}/control/pause")
            except Exception:
                pass

            await asyncio.sleep(poll_seconds)
