from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Dict, Literal


EventType = Literal[
    "engine.status",
    "portfolio.snapshot",
    "audit",
    "risk.event",
    "strategy.heartbeat",
]


@dataclass
class Event:
    type: EventType
    data: Dict[str, Any]
