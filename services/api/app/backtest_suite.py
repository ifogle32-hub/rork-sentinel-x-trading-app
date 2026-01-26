from __future__ import annotations

from typing import List

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from .db import get_db
from .schemas import BacktestRunOut, BacktestSuiteCreate
from .backtest import run_backtest

router = APIRouter(prefix="/backtest", tags=["backtest"])


@router.post("/suite", response_model=List[BacktestRunOut])
def run_suite(payload: BacktestSuiteCreate, db: Session = Depends(get_db)):
    results: List[BacktestRunOut] = []
    for tf in payload.timeframes:
        res = run_backtest(
            payload=payload.model_copy(update={"timeframe": tf}),
            db=db,
        )
        results.append(res)
    return results
