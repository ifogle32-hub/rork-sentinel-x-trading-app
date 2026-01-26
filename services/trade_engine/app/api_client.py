from __future__ import annotations

import httpx

from .settings import settings


class AgentInsAPI:
    def __init__(self) -> None:
        self._base = settings.api_url.rstrip("/")
        self._client = httpx.Client(timeout=10.0)

    def health(self) -> dict:
        r = self._client.get(f"{self._base}/health")
        r.raise_for_status()
        return r.json()

    def post_audit(self, event_type: str, message: str, level: str = "INFO") -> None:
        # minimal v0: piggyback on /audit via a future endpoint
        # for now, do nothing (keeps engine running even if API schema isn't ready)
        return
