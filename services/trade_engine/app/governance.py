from __future__ import annotations

import asyncio
import time
from dataclasses import dataclass

import httpx

from .settings import settings


@dataclass
class GovernanceDecision:
    action: str  # PAUSE|RESUME|NOOP
    reason: str


class Governance:
    """Trading-only internal governance (no LLM).

    Deterministic safety controller:
    - if daily PnL breaches max_daily_loss_pct => pause engine
    - if recovered and engine is paused => auto-resume (requested)

    No market/news/web access. No general reasoning. Only risk rules.
    """

    def __init__(self, starting_equity: float = 10_000.0, resume_cooldown_s: float = 60.0):
        self.starting_equity = starting_equity
        self.resume_cooldown_s = resume_cooldown_s
        self._last_resume_ts: float = 0.0

    def decide(self, pnl_day: float, engine_state: str, now_ts: float) -> GovernanceDecision:
        max_loss = -abs(settings.max_daily_loss_pct) * self.starting_equity
        if pnl_day <= max_loss and engine_state != "PAUSED":
            return GovernanceDecision(action="PAUSE", reason=f"daily_loss_breach pnl_day={pnl_day:.2f} <= {max_loss:.2f}")

        if pnl_day > max_loss and engine_state == "PAUSED":
            if now_ts - self._last_resume_ts >= self.resume_cooldown_s:
                self._last_resume_ts = now_ts
                return GovernanceDecision(action="RESUME", reason="recovered_within_limits")
            return GovernanceDecision(action="NOOP", reason="resume_cooldown")

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

                now_ts = time.time()
                decision = gov.decide(pnl_day=pnl_day, engine_state=state, now_ts=now_ts)
                if decision.action == "PAUSE":
                    await client.post(f"{base}/control/pause")
                elif decision.action == "RESUME":
                    await client.post(f"{base}/control/start")
            except Exception:
                pass

            await asyncio.sleep(poll_seconds)
