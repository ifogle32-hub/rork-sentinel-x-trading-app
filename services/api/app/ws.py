from __future__ import annotations

import asyncio
import json
from dataclasses import dataclass
from typing import Any, Dict, Set

from fastapi import WebSocket


@dataclass
class WSMessage:
    type: str
    data: Dict[str, Any]


class BroadcastHub:
    def __init__(self) -> None:
        self._clients: Set[WebSocket] = set()
        self._lock = asyncio.Lock()

    async def connect(self, ws: WebSocket) -> None:
        await ws.accept()
        async with self._lock:
            self._clients.add(ws)

    async def disconnect(self, ws: WebSocket) -> None:
        async with self._lock:
            self._clients.discard(ws)

    async def publish(self, msg: WSMessage) -> None:
        payload = json.dumps({"type": msg.type, "data": msg.data}, default=str)
        async with self._lock:
            clients = list(self._clients)
        if not clients:
            return
        coros = []
        for ws in clients:
            coros.append(self._safe_send(ws, payload))
        await asyncio.gather(*coros)

    async def _safe_send(self, ws: WebSocket, payload: str) -> None:
        try:
            await ws.send_text(payload)
        except Exception:
            await self.disconnect(ws)


hub = BroadcastHub()
