from __future__ import annotations

from datetime import datetime

from fastapi import APIRouter

from .shadow_store import (
    ShadowOrder,
    ShadowPosition,
    ShadowSignal,
    add_order,
    add_signal,
    list_orders,
    list_positions,
    list_signals,
    remove_position,
    upsert_position,
)
from .ws import hub, WSMessage

router = APIRouter(prefix="/shadow", tags=["shadow"])


@router.get("/signals")
def get_signals(limit: int = 100):
    return list_signals(limit)


@router.get("/orders")
def get_orders(limit: int = 100):
    return list_orders(limit)


@router.get("/positions")
def get_positions():
    return list_positions()


@router.post("/ingest/signal")
async def ingest_signal(payload: dict):
    s = ShadowSignal(
        id=str(payload.get("id")),
        timestamp=datetime.fromisoformat(payload.get("timestamp")),
        symbol=str(payload.get("symbol")),
        direction=str(payload.get("direction")),
        theoreticalSize=float(payload.get("theoreticalSize")),
        confidenceScore=float(payload.get("confidenceScore")),
        strategyId=str(payload.get("strategyId")),
        executed=bool(payload.get("executed")),
        reason=payload.get("reason"),
    )
    add_signal(s)
    await hub.publish(WSMessage(type="shadow.signal", data={"signal": payload}))
    return {"ok": True}


@router.post("/ingest/order")
async def ingest_order(payload: dict):
    o = ShadowOrder(
        id=str(payload.get("id")),
        timestamp=datetime.fromisoformat(payload.get("timestamp")),
        symbol=str(payload.get("symbol")),
        side=str(payload.get("side")),
        qty=float(payload.get("qty")),
        price=float(payload.get("price")),
        status=str(payload.get("status")),
        reason=str(payload.get("reason")),
    )
    add_order(o)
    await hub.publish(WSMessage(type="shadow.order", data={"order": payload}))
    return {"ok": True}


@router.post("/ingest/position")
async def ingest_position(payload: dict):
    if payload.get("size", 0) in (0, 0.0, "0"):
        remove_position(str(payload.get("symbol")))
        await hub.publish(WSMessage(type="shadow.positions", data={"positions": list_positions()}))
        return {"ok": True}

    p = ShadowPosition(
        id=str(payload.get("id")),
        symbol=str(payload.get("symbol")),
        side=str(payload.get("side")),
        size=float(payload.get("size")),
        entryPrice=float(payload.get("entryPrice")),
        currentPrice=float(payload.get("currentPrice")),
        pnl=float(payload.get("pnl")),
        pnlPercent=float(payload.get("pnlPercent")),
        broker=str(payload.get("broker")),
        strategy=str(payload.get("strategy")),
        openedAt=datetime.fromisoformat(payload.get("openedAt")),
    )
    upsert_position(p)
    await hub.publish(WSMessage(type="shadow.positions", data={"positions": list_positions()}))
    return {"ok": True}
