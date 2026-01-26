from __future__ import annotations

import random
from dataclasses import dataclass
from datetime import datetime
from typing import Dict, List


@dataclass
class StrategyCandidate:
    candidate_id: str
    family: str
    params: Dict[str, float]
    timeframe: str
    symbols: List[str]


def generate_candidates(symbols: List[str], timeframe: str, n: int = 50) -> List[StrategyCandidate]:
    out: List[StrategyCandidate] = []

    # EMA cross family
    for i in range(n):
        fast = random.choice([5, 8, 10, 12, 15, 20])
        slow = random.choice([21, 26, 30, 40, 50, 60])
        if fast >= slow:
            fast = max(3, slow - 5)
        out.append(
            StrategyCandidate(
                candidate_id=f"ema_cross_{timeframe}_{i}",
                family="ema_cross",
                params={
                    "fast": float(fast),
                    "slow": float(slow),
                    "base_size": float(random.choice([0.25, 0.5, 1.0, 2.0])),
                },
                timeframe=timeframe,
                symbols=symbols,
            )
        )

    return out


@dataclass
class Score:
    total_return_pct: float
    max_drawdown_pct: float
    sharpe_proxy: float
    trades: int


def rank_key(s: Score) -> float:
    # Multi-objective score: reward returns and trade count; penalize drawdown.
    return (s.total_return_pct) - (0.5 * s.max_drawdown_pct) + (0.02 * s.trades)
