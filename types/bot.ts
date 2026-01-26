export type SystemState = 'STARTING' | 'TRADING' | 'PAUSED' | 'KILLED' | 'ERROR' | 'OFFLINE';
export type TradingMode = 'PAPER' | 'LIVE' | 'SHADOW';
export type StrategyStatus = 'ACTIVE' | 'DISABLED' | 'AUTO_DISABLED' | 'COOLDOWN';

export interface BotStatus {
  state: SystemState;
  mode: TradingMode;
  brokers: BrokerStatus[];
  equity: number;
  dailyPnL: number;
  dailyPnLPercent: number;
  openPositions: number;
  killSwitchArmed: boolean;
  lastHeartbeat: string;
  uptime: number;
  tradingWindowActive: boolean;
  shadowTradingEnabled: boolean;
}

export interface BrokerStatus {
  id: string;
  name: string;
  connected: boolean;
  lastPing: string;
  equity: number;
}

export interface Strategy {
  id: string;
  name: string;
  status: StrategyStatus;
  winRate: number;
  sharpe: number;
  drawdown: number;
  maxDrawdown: number;
  lastTrade: string | null;
  healthScore: number;
  pnl: number;
  pnlPercent: number;
  tradesCount: number;
  autoDisableReason?: string;
  capitalAllocation: number;
  expectancy: number;
}

export interface Position {
  id: string;
  symbol: string;
  side: 'LONG' | 'SHORT';
  size: number;
  entryPrice: number;
  currentPrice: number;
  pnl: number;
  pnlPercent: number;
  broker: string;
  strategy: string;
  openedAt: string;
  stopLoss?: number;
  takeProfit?: number;
}

export interface Metric {
  label: string;
  value: string | number;
  change?: number;
  trend?: 'up' | 'down' | 'neutral';
  category: 'performance' | 'risk' | 'volume' | 'system';
}

export interface RiskConfig {
  maxDailyLoss: number;
  maxDrawdown: number;
  maxPositionSize: number;
  maxExposure: number;
  capitalAllocator: 'KELLY' | 'RISK_PARITY' | 'EQUAL_WEIGHT';
}

export interface CapitalAllocation {
  strategyId: string;
  strategyName: string;
  allocation: number;
  currentValue: number;
}

export interface Transfer {
  id: string;
  type: 'DEPOSIT' | 'WITHDRAWAL';
  amount: number;
  status: 'PENDING' | 'AWAITING_APPROVAL' | 'APPROVED' | 'EXECUTED' | 'REJECTED';
  createdAt: string;
  scheduledFor?: string;
  approvedAt?: string;
  executedAt?: string;
}

export interface EquityPoint {
  timestamp: string;
  equity: number;
  benchmark?: number;
}

export interface PnLData {
  date: string;
  pnl: number;
  cumulative: number;
}

export interface PerformanceStats {
  totalReturn: number;
  totalReturnPercent: number;
  sharpeRatio: number;
  sortinoRatio: number;
  maxDrawdown: number;
  winRate: number;
  profitFactor: number;
  avgWin: number;
  avgLoss: number;
  bestDay: number;
  worstDay: number;
  volatility: number;
  calmarRatio: number;
}

export interface AlertEvent {
  id: string;
  type: 'TRADE' | 'RISK_BREACH' | 'KILL_SWITCH' | 'STRATEGY_DISABLED' | 'CAPITAL_MOVEMENT' | 'ERROR' | 'INFO';
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  message: string;
  timestamp: string;
  metadata?: Record<string, unknown>;
}

export interface ResearchJob {
  id: string;
  name: string;
  status: 'RUNNING' | 'COMPLETED' | 'FAILED';
  progress: number;
  startedAt: string;
  completedAt?: string;
  results?: StrategyCandidate[];
}

export interface StrategyCandidate {
  id: string;
  name: string;
  expectedSharpe: number;
  expectedReturn: number;
  backtestedDrawdown: number;
  confidenceScore: number;
}

export interface SecurityInfo {
  hardwareKeyConnected: boolean;
  lastApprovalEvent: string | null;
  lastWithdrawal: string | null;
  activeSessions: number;
  twoFactorEnabled: boolean;
}

export interface APIResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: string;
}

export interface ControlAction {
  action: string;
  success: boolean;
  message: string;
  timestamp: string;
  responseTime: number;
}

export type ShadowEngineState = 'ARMED' | 'MONITOR' | 'DISABLED';

export interface ShadowStrategy {
  id: string;
  name: string;
  mode: 'SHADOW';
  eligibleForPromotion: boolean;
  autoPromotionEnabled: boolean;
  riskStatus: 'PASS' | 'BLOCKED' | 'WARNING';
  lastPromotionDecision: string | null;
  lastPromotionReason: string | null;
  engineState: ShadowEngineState;
  lastHeartbeat: string;
  signalCount: number;
  theoreticalPnL: number;
  winRate: number;
  sharpe: number;
  drawdown: number;
  maxDrawdown: number;
  tradesCount: number;
  confidenceScore: number;
}

export interface ShadowSignal {
  id: string;
  timestamp: string;
  symbol: string;
  direction: 'BUY' | 'SELL';
  theoreticalSize: number;
  confidenceScore: number;
  strategyId: string;
  executed: boolean;
  reason?: string;
}

export interface ShadowPerformance {
  cumulativePnL: number;
  rollingSharpe: number;
  drawdownCurve: number[];
  winRate: number;
  tradeCount: number;
  avgWin: number;
  avgLoss: number;
  profitFactor: number;
  expectancy: number;
  pnlHistory: { timestamp: string; pnl: number }[];
}

export interface ShadowRisk {
  currentDrawdown: number;
  maxDrawdown: number;
  volatilityRegime: 'LOW' | 'NORMAL' | 'HIGH' | 'EXTREME';
  correlationWarning: boolean;
  blockingFlags: string[];
  warningFlags: string[];
  exposureBySymbol: { symbol: string; exposure: number }[];
}

export interface PromotionReadiness {
  eligible: boolean;
  engineArmed: boolean;
  killSwitchClear: boolean;
  riskPassed: boolean;
  minTradesReached: boolean;
  sharpeThresholdMet: boolean;
  drawdownWithinLimit: boolean;
  blockers: string[];
  thresholds: {
    minTrades: number;
    currentTrades: number;
    minSharpe: number;
    currentSharpe: number;
    maxDrawdown: number;
    currentDrawdown: number;
  };
}

export interface PaperPerformance {
  cumulativePnL: number;
  rollingSharpe: number;
  drawdownCurve: number[];
  winRate: number;
  tradeCount: number;
  avgWin: number;
  avgLoss: number;
  profitFactor: number;
  expectancy: number;
  pnlHistory: { timestamp: string; pnl: number }[];
  avgSlippage: number;
  avgFillLatency: number;
  broker: string;
}

export interface ShadowPaperComparison {
  strategyId: string;
  strategyName: string;
  shadow: {
    pnl: number;
    sharpe: number;
    drawdown: number;
    tradeCount: number;
    winRate: number;
  };
  paper: {
    pnl: number;
    sharpe: number;
    drawdown: number;
    tradeCount: number;
    winRate: number;
    avgSlippage: number;
    avgFillLatency: number;
  } | null;
  divergenceScore: number;
  executionDragDetected: boolean;
}

export interface ComplianceReport {
  id: string;
  type: 'SHADOW_SUMMARY' | 'PROMOTION_READINESS' | 'RISK_BLOCKER' | 'DIVERGENCE';
  strategyId: string;
  strategyName: string;
  generatedAt: string;
  timeWindow: {
    start: string;
    end: string;
  };
  data: Record<string, unknown>;
  disclaimer: string;
}

export type ShadowRuntimeStatus = 'DISABLED' | 'STOPPED' | 'IDLE' | 'TRAINING';

export interface RorkShadowStatus {
  shadow_mode: boolean;
  status: ShadowRuntimeStatus;
  heartbeat_age_ms: number | null;
  tick_count: number;
  active_strategies: number;
  cpu_safe: boolean;
}

export interface ShadowMetrics {
  started: boolean;
  idle: boolean;
  threads: string[];
  heartbeat: {
    last_tick_ms: number | null;
    age_ms: number | null;
  };
  trainer: {
    last_step_ms: number | null;
    lag_ms: number | null;
  };
  cpu_safe: boolean;
}

export type ApprovalActionType = 'trade' | 'promote' | 'config_change';
export type ApprovalMode = 'shadow' | 'live';
export type ApprovalDecisionType = 'APPROVE' | 'REJECT';
export type ApprovalStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'REJECTED_TIMEOUT';

export interface ApprovalVote {
  user_id: string;
  decision: ApprovalDecisionType;
  timestamp: string;
}

export interface ApprovalRequest {
  request_id: string;
  action_type: ApprovalActionType;
  entity_id: string;
  mode: ApprovalMode;
  risk_score: number;
  confidence: number;
  summary: string;
  created_at: string;
  quorum_required: number;
  approvals: ApprovalVote[];
  status: ApprovalStatus;
  deadline?: string;
}

export interface ApprovalDecision {
  request_id: string;
  decision: ApprovalDecisionType;
  decided_by: string;
  timestamp: string;
}

export type GlobalSystemState = 'OFF' | 'FROZEN' | 'SHADOW_ONLY' | 'LIVE';

export interface N8NBroadcastMessage {
  type: 'FREEZE' | 'RESUME' | 'INFO' | 'WARNING' | 'ERROR';
  state: GlobalSystemState;
  message: string;
  timestamp: string;
}

export interface FreezeRequest {
  triggered_by: string;
  reason: string;
}

export interface ResumeRequest {
  initiated_by: string;
  intent: string;
}

export type GovernanceConnectionState = 'CONNECTING' | 'ONLINE' | 'OFFLINE' | 'ERROR';
export type EngineConnectionState = 'ONLINE' | 'OFFLINE' | 'EXPECTED_OFFLINE';

export interface GovernanceStatus {
  governance_online: boolean;
  engine_online: boolean;
  global_state: GlobalSystemState;
  last_broadcast: N8NBroadcastMessage | null;
  pending_approvals: number;
}

export interface N8NShadowStrategy {
  strategy_id: string;
  summary: string;
  hypothesis: string;
  entry_logic: string;
  exit_logic: string;
  risk_assumptions: string;
  failure_modes: string;
  created_at: string;
  status: 'SHADOW_ONLY';
}

export type GovernanceEventType = 
  | 'APPROVAL_REQUESTED'
  | 'APPROVAL_GRANTED'
  | 'APPROVAL_DENIED'
  | 'APPROVAL_TIMED_OUT'
  | 'QUORUM_REACHED'
  | 'SYSTEM_FROZEN'
  | 'SYSTEM_RESUMED'
  | 'SHADOW_STRATEGY_CREATED';

export type GovernanceBrainStatus = 'ONLINE' | 'WAITING' | 'FROZEN';

export interface GovernanceHeartbeat {
  brain: 'n8n';
  status: GovernanceBrainStatus;
  system_mode: GlobalSystemState;
  active_decisions: number;
  last_decision_at: string | null;
  reason: string;
}

export interface GovernanceEvent {
  id: string;
  type: GovernanceEventType;
  timestamp: string;
  actor?: string;
  entity_id?: string;
  summary: string;
  metadata?: Record<string, unknown>;
}

export interface DecisionExplanation {
  event_id: string;
  decision_summary: string;
  key_factors: string[];
  what_was_required: string;
  what_was_missing?: string;
}

export type HypotheticalScenario = 
  | 'PROMOTE_SHADOW'
  | 'APPROVE_TRADE'
  | 'CHANGE_CONFIG'
  | 'GO_LIVE'
  | 'FREEZE_SYSTEM';

export interface HypotheticalApproval {
  type: string;
  required_from: string;
  quorum_needed: number;
  estimated_wait: string;
}

export interface HypotheticalBlock {
  reason: string;
  blocking_factor: string;
  resolution_hint: string;
}

export interface HypotheticalConstraint {
  name: string;
  current_value: string;
  threshold: string;
  status: 'PASS' | 'WARN' | 'BLOCK';
}

export interface HypotheticalAnalysis {
  scenario: HypotheticalScenario;
  scenario_label: string;
  outcome_summary: string;
  would_proceed: boolean;
  next_approvals: HypotheticalApproval[];
  potential_blocks: HypotheticalBlock[];
  safety_constraints: HypotheticalConstraint[];
  disclaimer: string;
}

export interface GuardrailRule {
  id: string;
  title: string;
  description: string;
  status: 'ACTIVE' | 'INACTIVE';
}

export interface GovernanceGuardrails {
  approval_requirements: GuardrailRule[];
  quorum_rules: GuardrailRule[];
  freeze_conditions: GuardrailRule[];
  shadow_constraints: GuardrailRule[];
}

export interface DecisionNote {
  id: string;
  event_id: string;
  content: string;
  created_at: string;
  updated_at: string;
}
