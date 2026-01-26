from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from .db import get_db
from .models import PortfolioSnapshot, RunMode
from .schemas import PortfolioSnapshotIn, PortfolioSnapshotOut
from .ws import hub, WSMessage

router = APIRouter(prefix="/ingest", tags=["ingest"])


@router.post("/portfolio", response_model=PortfolioSnapshotOut)
def ingest_portfolio(payload: PortfolioSnapshotIn, db: Session = Depends(get_db)):
    if payload.mode not in ("shadow", "live"):
        raise HTTPException(status_code=400, detail="mode must be shadow|live")

    row = PortfolioSnapshot(
        ts=payload.ts,
        mode=RunMode(payload.mode),
        equity=float(payload.equity),
        cash=float(payload.cash),
        pnl_day=float(payload.pnl_day),
    )
    db.add(row)
    db.commit()
    db.refresh(row)

    # fire-and-forget broadcast
    try:
        import asyncio

        asyncio.create_task(
            hub.publish(
                WSMessage(
                    type="portfolio.snapshot",
                    data={
                        "ts": row.ts,
                        "mode": row.mode.value,
                        "equity": row.equity,
                        "cash": row.cash,
                        "pnl_day": row.pnl_day,
                    },
                )
            )
        )
    except Exception:
        pass

    return PortfolioSnapshotOut(
        id=row.id,
        ts=row.ts,
        mode=row.mode.value,
        equity=row.equity,
        cash=row.cash,
        pnl_day=row.pnl_day,
    )
