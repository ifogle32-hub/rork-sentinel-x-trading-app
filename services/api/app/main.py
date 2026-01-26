from __future__ import annotations

from fastapi import Depends, FastAPI, WebSocket, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

from .db import Base, engine, get_db
from .models import StrategyConfig, AuditLog, PortfolioSnapshot, StrategyStatus, RunMode
from .schemas import (
    HealthResponse,
    StrategyConfigOut,
    StrategyConfigCreate,
    StrategyConfigUpdate,
    AuditLogOut,
    PortfolioSnapshotOut,
    PortfolioSnapshotIn,
    BotStatusOut,
    BrokerStatusOut,
    StrategyOut,
    PositionOut,
    MetricOut,
)
from .ws import hub, WSMessage

app = FastAPI(title="Agent INS API", version="0.1.0")

# --- Minimal runtime state (v0). Later this moves to DB + signed operator actions.
ENGINE_STATE = "TRADING"  # STARTING|TRADING|PAUSED|KILLED|ERROR

from .ingest import router as ingest_router
from .control import router as control_router
from .backtest import router as backtest_router
from .backtest_suite import router as backtest_suite_router
from .shadow import router as shadow_router

app.include_router(ingest_router)
app.include_router(control_router)
app.include_router(backtest_router)
app.include_router(backtest_suite_router)
app.include_router(shadow_router)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"] ,
    allow_headers=["*"],
)


@app.on_event("startup")
def _startup() -> None:
    # dev-friendly: ensure tables exist without forcing migrations
    Base.metadata.create_all(bind=engine)


@app.get("/health", response_model=HealthResponse)
def health() -> HealthResponse:
    return HealthResponse(status="ok")


def _to_strategy_out(row: StrategyConfig) -> StrategyConfigOut:
    return StrategyConfigOut(
        id=row.id,
        name=row.name,
        status=row.status.value,
        symbols=[s.strip() for s in row.symbols_csv.split(",") if s.strip()],
        allocation_pct=row.allocation_pct,
        created_at=row.created_at,
    )


@app.get("/strategy-configs", response_model=list[StrategyConfigOut])
def list_strategy_configs(db: Session = Depends(get_db)):
    rows = db.query(StrategyConfig).order_by(StrategyConfig.id.asc()).all()
    return [_to_strategy_out(r) for r in rows]


@app.post("/strategy-configs", response_model=StrategyConfigOut)
def create_strategy(payload: StrategyConfigCreate, db: Session = Depends(get_db)):
    row = StrategyConfig(
        name=payload.name,
        symbols_csv=",".join(payload.symbols),
        allocation_pct=payload.allocation_pct,
    )
    db.add(row)
    db.add(AuditLog(event_type="strategy.create", message=f"Created strategy {payload.name}"))
    db.commit()
    db.refresh(row)
    return _to_strategy_out(row)


@app.patch("/strategy-configs/{strategy_id}", response_model=StrategyConfigOut)
def update_strategy(strategy_id: int, payload: StrategyConfigUpdate, db: Session = Depends(get_db)):
    row = db.query(StrategyConfig).where(StrategyConfig.id == strategy_id).one()

    if payload.status is not None:
        if payload.status not in ("enabled", "disabled"):
            raise HTTPException(status_code=400, detail="status must be enabled|disabled")
        row.status = StrategyStatus(payload.status)

    if payload.symbols is not None:
        row.symbols_csv = ",".join(payload.symbols)

    if payload.allocation_pct is not None:
        row.allocation_pct = payload.allocation_pct

    db.add(AuditLog(event_type="strategy.update", message=f"Updated strategy {row.name}"))
    db.commit()
    db.refresh(row)
    return _to_strategy_out(row)


@app.get("/audit", response_model=list[AuditLogOut])
def get_audit(limit: int = 200, db: Session = Depends(get_db)):
    rows = db.query(AuditLog).order_by(AuditLog.ts.desc()).limit(limit).all()
    return [AuditLogOut(id=r.id, ts=r.ts, level=r.level, event_type=r.event_type, message=r.message) for r in rows]


@app.get("/portfolio/latest", response_model=PortfolioSnapshotOut | None)
def latest_portfolio(db: Session = Depends(get_db)):
    row = db.query(PortfolioSnapshot).order_by(PortfolioSnapshot.ts.desc()).first()
    if not row:
        return None
    return PortfolioSnapshotOut(id=row.id, ts=row.ts, mode=row.mode.value, equity=row.equity, cash=row.cash, pnl_day=row.pnl_day)


# --- Rork app compatibility endpoints (v0 demo) ---
@app.get("/status", response_model=BotStatusOut)
def rork_status(db: Session = Depends(get_db)):
    snap = db.query(PortfolioSnapshot).order_by(PortfolioSnapshot.ts.desc()).first()
    equity = snap.equity if snap else 10_000.0
    pnl = snap.pnl_day if snap else 0.0
    mode = "SHADOW" if (snap and snap.mode == RunMode.shadow) or not snap else "LIVE"

    return BotStatusOut(
        state=ENGINE_STATE,
        mode=mode,
        brokers=[
            BrokerStatusOut(
                id="alpaca",
                name="Alpaca",
                connected=True,
                lastPing=(snap.ts.isoformat() if snap else ""),
                equity=equity,
            )
        ],
        equity=equity,
        dailyPnL=pnl,
        dailyPnLPercent=(pnl / 10_000.0) * 100.0,
        openPositions=0,
        killSwitchArmed=True,
        lastHeartbeat=(snap.ts.isoformat() if snap else ""),
        uptime=0,
        tradingWindowActive=True,
        shadowTradingEnabled=True,
    )


@app.get("/strategies", response_model=list[StrategyOut])
def rork_strategies(db: Session = Depends(get_db)):
    rows = db.query(StrategyConfig).order_by(StrategyConfig.id.asc()).all()
    out: list[StrategyOut] = []
    for r in rows:
        out.append(
            StrategyOut(
                id=str(r.id),
                name=r.name,
                status="ACTIVE" if r.status == StrategyStatus.enabled else "DISABLED",
                winRate=0.0,
                sharpe=0.0,
                drawdown=0.0,
                maxDrawdown=0.0,
                lastTrade=None,
                healthScore=100.0,
                pnl=0.0,
                pnlPercent=0.0,
                tradesCount=0,
                capitalAllocation=r.allocation_pct,
                expectancy=0.0,
            )
        )
    return out


@app.get("/positions", response_model=list[PositionOut])
def rork_positions():
    return []


@app.get("/metrics", response_model=list[MetricOut])
def rork_metrics(db: Session = Depends(get_db)):
    snap = db.query(PortfolioSnapshot).order_by(PortfolioSnapshot.ts.desc()).first()
    equity = snap.equity if snap else 10_000.0
    pnl = snap.pnl_day if snap else 0.0
    return [
        MetricOut(label="Equity", value=equity, category="performance", trend="up" if pnl >= 0 else "down"),
        MetricOut(label="Daily PnL", value=pnl, category="performance", trend="up" if pnl >= 0 else "down"),
        MetricOut(label="Mode", value=(snap.mode.value if snap else "shadow"), category="system"),
    ]


@app.websocket("/ws/stream")
async def ws_stream(ws: WebSocket):
    await hub.connect(ws)
    try:
        while True:
            # Keep-alive; client can ignore
            _ = await ws.receive_text()
    except Exception:
        pass
    finally:
        await hub.disconnect(ws)
