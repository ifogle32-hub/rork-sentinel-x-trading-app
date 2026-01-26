from __future__ import annotations

from fastapi import APIRouter

router = APIRouter(prefix="/control", tags=["control"])

# NOTE: This module mutates ENGINE_STATE in main.py (v0). Later move to DB + auth.


@router.post("/start")
def start():
    from . import main

    main.ENGINE_STATE = "TRADING"
    return {"message": "Engine set to TRADING"}


@router.post("/pause")
def pause():
    from . import main

    main.ENGINE_STATE = "PAUSED"
    return {"message": "Engine set to PAUSED"}


@router.post("/kill")
def kill():
    from . import main

    main.ENGINE_STATE = "KILLED"
    return {"message": "Engine set to KILLED"}


@router.post("/trading-window/enable")
def trading_window_enable():
    return {"message": "Trading window enabled (v0 placeholder)"}


@router.post("/trading-window/disable")
def trading_window_disable():
    return {"message": "Trading window disabled (v0 placeholder)"}


@router.post("/shadow/enable")
def shadow_enable():
    return {"message": "Shadow enabled (v0 placeholder)"}


@router.post("/shadow/disable")
def shadow_disable():
    return {"message": "Shadow disabled (v0 placeholder)"}


@router.post("/test-order")
def test_order():
    return {"message": "Test order queued (v0 placeholder)"}
