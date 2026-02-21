export interface EngineStatus {
  online: boolean;
  mode: 'SHADOW' | 'LIVE' | 'PAPER' | string;
  governance: string;
  version?: string;
  uptime?: number;
}

export interface EngineHeartbeat {
  timestamp: string;
  age_seconds: number;
  status: 'OK' | 'STALE' | 'DEAD';
}

export interface EnginePortfolio {
  capital: number;
  open_position_size: number;
  entry_price: number;
  unrealized_pnl: number;
  realized_pnl: number;
}

export interface EngineMetrics {
  current_threshold: number;
  current_multiplier: number;
  last_trade_outcome: 'WIN' | 'LOSS' | 'NONE' | string;
  rolling_win_rate: number | null;
  total_trades?: number;
}

export interface EngineStrategy {
  timeframe: string;
  last_signal: 'LONG' | 'SHORT' | 'FLAT' | string;
  confidence: number;
  adaptive_threshold: number;
  current_multiplier: number;
}

export type EngineConnectionState = 'ONLINE' | 'OFFLINE' | 'CONNECTING';
