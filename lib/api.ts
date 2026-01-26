import { 
  BotStatus, 
  Strategy, 
  Position, 
  Metric,
  RiskConfig,
  CapitalAllocation,
  Transfer,
  EquityPoint,
  PnLData,
  PerformanceStats,
  AlertEvent,
  ResearchJob,
  SecurityInfo,
  ControlAction,
  ShadowStrategy,
  ShadowSignal,
  ShadowPerformance,
  ShadowRisk,
  PromotionReadiness,
  PaperPerformance,
  RorkShadowStatus,
  ShadowMetrics,
  ApprovalRequest,
  ApprovalDecision,
  ApprovalDecisionType,
  FreezeRequest,
  ResumeRequest,
  GlobalSystemState,
  N8NBroadcastMessage,
  GovernanceStatus,
  N8NShadowStrategy,
  GovernanceEvent,
  GovernanceHeartbeat,
  DecisionExplanation,
  GovernanceEventType,
  HypotheticalScenario,
  HypotheticalAnalysis,
  GovernanceGuardrails,
} from '@/types/bot';

const SENTINEL_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8000';
const N8N_BASE_URL = process.env.EXPO_PUBLIC_N8N_URL || 'http://localhost:5678/webhook';
const REQUEST_TIMEOUT = 10000;

export const getConfig = () => ({
  sentinelBaseUrl: SENTINEL_BASE_URL,
  n8nBaseUrl: N8N_BASE_URL,
});

const fetchWithTimeout = async (url: string, options?: RequestInit): Promise<Response> => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);
  
  try {
    console.log(`[API] Fetching: ${url}`);
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    console.log(`[API] Response status: ${response.status}`);
    return response;
  } catch (error) {
    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        console.log('[API] Request timed out');
        throw new Error('Request timed out - check if Sentinel X is running');
      }
      if (error.message.includes('Network request failed') || error.message.includes('Failed to fetch')) {
        console.log('[API] Network error - possible CORS or connectivity issue');
        throw new Error('Network error - check CORS settings on Sentinel X or verify network connectivity');
      }
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
};

const handleResponse = async <T>(response: Response): Promise<T> => {
  if (!response.ok) {
    const error = await response.text().catch(() => 'Unknown error');
    throw new Error(error || `Request failed with status ${response.status}`);
  }
  return response.json();
};

const handleControlAction = async (response: Response, action: string): Promise<ControlAction> => {
  const startTime = Date.now();
  const success = response.ok;
  let message = success ? `${action} executed successfully` : `${action} failed`;
  
  try {
    const data = await response.json();
    if (data.message) message = data.message;
  } catch {}
  
  return {
    action,
    success,
    message,
    timestamp: new Date().toISOString(),
    responseTime: Date.now() - startTime,
  };
};

export const api = {
  getStatus: async (): Promise<BotStatus> => {
    const response = await fetchWithTimeout(`${SENTINEL_BASE_URL}/status`);
    return handleResponse<BotStatus>(response);
  },

  getStrategies: async (): Promise<Strategy[]> => {
    const response = await fetchWithTimeout(`${SENTINEL_BASE_URL}/strategies`);
    return handleResponse<Strategy[]>(response);
  },

  getMetrics: async (): Promise<Metric[]> => {
    const response = await fetchWithTimeout(`${SENTINEL_BASE_URL}/metrics`);
    return handleResponse<Metric[]>(response);
  },

  getPositions: async (): Promise<Position[]> => {
    const response = await fetchWithTimeout(`${SENTINEL_BASE_URL}/positions`);
    return handleResponse<Position[]>(response);
  },

  getRiskConfig: async (): Promise<RiskConfig> => {
    const response = await fetch(`${SENTINEL_BASE_URL}/risk/config`);
    return handleResponse<RiskConfig>(response);
  },

  getCapitalAllocations: async (): Promise<CapitalAllocation[]> => {
    const response = await fetch(`${SENTINEL_BASE_URL}/capital/allocations`);
    return handleResponse<CapitalAllocation[]>(response);
  },

  getTransfers: async (): Promise<Transfer[]> => {
    const response = await fetch(`${SENTINEL_BASE_URL}/capital/transfers`);
    return handleResponse<Transfer[]>(response);
  },

  getEquityCurve: async (days?: number): Promise<EquityPoint[]> => {
    const url = days ? `${SENTINEL_BASE_URL}/performance/equity?days=${days}` : `${SENTINEL_BASE_URL}/performance/equity`;
    const response = await fetch(url);
    return handleResponse<EquityPoint[]>(response);
  },

  getPnLHistory: async (period?: string): Promise<PnLData[]> => {
    const url = period ? `${SENTINEL_BASE_URL}/performance/pnl?period=${period}` : `${SENTINEL_BASE_URL}/performance/pnl`;
    const response = await fetch(url);
    return handleResponse<PnLData[]>(response);
  },

  getPerformanceStats: async (): Promise<PerformanceStats> => {
    const response = await fetch(`${SENTINEL_BASE_URL}/performance/stats`);
    return handleResponse<PerformanceStats>(response);
  },

  getAlerts: async (limit?: number): Promise<AlertEvent[]> => {
    const url = limit ? `${SENTINEL_BASE_URL}/alerts?limit=${limit}` : `${SENTINEL_BASE_URL}/alerts`;
    const response = await fetch(url);
    return handleResponse<AlertEvent[]>(response);
  },

  getResearchJobs: async (): Promise<ResearchJob[]> => {
    const response = await fetch(`${SENTINEL_BASE_URL}/research/jobs`);
    return handleResponse<ResearchJob[]>(response);
  },

  getSecurityInfo: async (): Promise<SecurityInfo> => {
    const response = await fetch(`${SENTINEL_BASE_URL}/security/info`);
    return handleResponse<SecurityInfo>(response);
  },

  start: async (): Promise<ControlAction> => {
    const response = await fetch(`${SENTINEL_BASE_URL}/control/start`, { method: 'POST' });
    return handleControlAction(response, 'START');
  },

  stop: async (): Promise<ControlAction> => {
    const response = await fetch(`${SENTINEL_BASE_URL}/control/pause`, { method: 'POST' });
    return handleControlAction(response, 'PAUSE');
  },

  kill: async (): Promise<ControlAction> => {
    const response = await fetch(`${SENTINEL_BASE_URL}/control/kill`, { method: 'POST' });
    return handleControlAction(response, 'KILL');
  },

  enableTradingWindow: async (): Promise<ControlAction> => {
    const response = await fetch(`${SENTINEL_BASE_URL}/control/trading-window/enable`, { method: 'POST' });
    return handleControlAction(response, 'ENABLE_TRADING_WINDOW');
  },

  disableTradingWindow: async (): Promise<ControlAction> => {
    const response = await fetch(`${SENTINEL_BASE_URL}/control/trading-window/disable`, { method: 'POST' });
    return handleControlAction(response, 'DISABLE_TRADING_WINDOW');
  },

  enableShadowTrading: async (): Promise<ControlAction> => {
    const response = await fetch(`${SENTINEL_BASE_URL}/control/shadow/enable`, { method: 'POST' });
    return handleControlAction(response, 'ENABLE_SHADOW');
  },

  disableShadowTrading: async (): Promise<ControlAction> => {
    const response = await fetch(`${SENTINEL_BASE_URL}/control/shadow/disable`, { method: 'POST' });
    return handleControlAction(response, 'DISABLE_SHADOW');
  },

  fireTestOrder: async (): Promise<ControlAction> => {
    const response = await fetch(`${SENTINEL_BASE_URL}/control/test-order`, { method: 'POST' });
    return handleControlAction(response, 'TEST_ORDER');
  },

  enableStrategy: async (strategyId: string): Promise<ControlAction> => {
    const response = await fetch(`${SENTINEL_BASE_URL}/strategies/${strategyId}/enable`, { method: 'POST' });
    return handleControlAction(response, 'ENABLE_STRATEGY');
  },

  disableStrategy: async (strategyId: string): Promise<ControlAction> => {
    const response = await fetch(`${SENTINEL_BASE_URL}/strategies/${strategyId}/disable`, { method: 'POST' });
    return handleControlAction(response, 'DISABLE_STRATEGY');
  },

  resetStrategyMetrics: async (strategyId: string): Promise<ControlAction> => {
    const response = await fetch(`${SENTINEL_BASE_URL}/strategies/${strategyId}/reset`, { method: 'POST' });
    return handleControlAction(response, 'RESET_METRICS');
  },

  forceCooldown: async (strategyId: string): Promise<ControlAction> => {
    const response = await fetch(`${SENTINEL_BASE_URL}/strategies/${strategyId}/cooldown`, { method: 'POST' });
    return handleControlAction(response, 'FORCE_COOLDOWN');
  },

  scheduleTransfer: async (type: 'DEPOSIT' | 'WITHDRAWAL', amount: number, scheduledFor?: string): Promise<ControlAction> => {
    const response = await fetch(`${SENTINEL_BASE_URL}/capital/transfer`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type, amount, scheduledFor }),
    });
    return handleControlAction(response, `SCHEDULE_${type}`);
  },

  spawnResearchJob: async (name: string): Promise<ControlAction> => {
    const response = await fetch(`${SENTINEL_BASE_URL}/research/spawn`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    });
    return handleControlAction(response, 'SPAWN_RESEARCH');
  },

  promoteStrategy: async (candidateId: string): Promise<ControlAction> => {
    const response = await fetch(`${SENTINEL_BASE_URL}/research/promote/${candidateId}`, { method: 'POST' });
    return handleControlAction(response, 'PROMOTE_STRATEGY');
  },

  retireStrategy: async (strategyId: string): Promise<ControlAction> => {
    const response = await fetch(`${SENTINEL_BASE_URL}/strategies/${strategyId}/retire`, { method: 'POST' });
    return handleControlAction(response, 'RETIRE_STRATEGY');
  },

  getShadowStrategies: async (): Promise<ShadowStrategy[]> => {
    const response = await fetchWithTimeout(`${SENTINEL_BASE_URL}/shadow/strategies`);
    return handleResponse<ShadowStrategy[]>(response);
  },

  getShadowStrategySignals: async (strategyId: string): Promise<ShadowSignal[]> => {
    const response = await fetchWithTimeout(`${SENTINEL_BASE_URL}/shadow/strategies/${strategyId}/signals`);
    return handleResponse<ShadowSignal[]>(response);
  },

  getShadowStrategyPerformance: async (strategyId: string): Promise<ShadowPerformance> => {
    const response = await fetchWithTimeout(`${SENTINEL_BASE_URL}/shadow/strategies/${strategyId}/performance`);
    return handleResponse<ShadowPerformance>(response);
  },

  getShadowStrategyRisk: async (strategyId: string): Promise<ShadowRisk> => {
    const response = await fetchWithTimeout(`${SENTINEL_BASE_URL}/shadow/strategies/${strategyId}/risk`);
    return handleResponse<ShadowRisk>(response);
  },

  getShadowPromotionReadiness: async (strategyId: string): Promise<PromotionReadiness> => {
    const response = await fetchWithTimeout(`${SENTINEL_BASE_URL}/shadow/strategies/${strategyId}/promotion-readiness`);
    return handleResponse<PromotionReadiness>(response);
  },

  promoteShadowStrategy: async (strategyId: string, target: 'PAPER' | 'LIVE'): Promise<ControlAction> => {
    const response = await fetch(`${SENTINEL_BASE_URL}/strategies/${strategyId}/promote`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ target }),
    });
    return handleControlAction(response, 'PROMOTE_TO_' + target);
  },

  demoteShadowStrategy: async (strategyId: string): Promise<ControlAction> => {
    const response = await fetch(`${SENTINEL_BASE_URL}/strategies/${strategyId}/demote`, { method: 'POST' });
    return handleControlAction(response, 'DEMOTE_TO_SHADOW');
  },

  enableAutoPromotion: async (strategyId: string): Promise<ControlAction> => {
    const response = await fetch(`${SENTINEL_BASE_URL}/strategies/${strategyId}/auto-promotion/enable`, { method: 'POST' });
    return handleControlAction(response, 'ENABLE_AUTO_PROMOTION');
  },

  disableAutoPromotion: async (strategyId: string): Promise<ControlAction> => {
    const response = await fetch(`${SENTINEL_BASE_URL}/strategies/${strategyId}/auto-promotion/disable`, { method: 'POST' });
    return handleControlAction(response, 'DISABLE_AUTO_PROMOTION');
  },

  getPaperStrategyPerformance: async (strategyId: string): Promise<PaperPerformance | null> => {
    try {
      const response = await fetchWithTimeout(`${SENTINEL_BASE_URL}/paper/strategies/${strategyId}/performance`);
      return handleResponse<PaperPerformance>(response);
    } catch (err) {
      console.log('[API] Paper performance not available:', err);
      return null;
    }
  },

  checkPaperExists: async (strategyId: string): Promise<boolean> => {
    try {
      const response = await fetchWithTimeout(`${SENTINEL_BASE_URL}/paper/strategies/${strategyId}/exists`);
      const data = await response.json();
      return data.exists ?? false;
    } catch {
      return false;
    }
  },

  getRorkShadowStatus: async (): Promise<RorkShadowStatus> => {
    const response = await fetchWithTimeout(`${SENTINEL_BASE_URL}/rork/shadow/status`);
    return handleResponse<RorkShadowStatus>(response);
  },

  getShadowMetrics: async (): Promise<ShadowMetrics> => {
    const response = await fetchWithTimeout(`${SENTINEL_BASE_URL}/shadow/metrics`);
    return handleResponse<ShadowMetrics>(response);
  },

  startShadow: async (): Promise<ControlAction> => {
    const response = await fetch(`${SENTINEL_BASE_URL}/shadow/start`, { method: 'POST' });
    return handleControlAction(response, 'START_SHADOW');
  },

  stopShadow: async (): Promise<ControlAction> => {
    const response = await fetch(`${SENTINEL_BASE_URL}/shadow/stop`, { method: 'POST' });
    return handleControlAction(response, 'STOP_SHADOW');
  },

  getApprovalInbox: async (): Promise<ApprovalRequest[]> => {
    const response = await fetchWithTimeout(`${N8N_BASE_URL}/sentinel/approval/inbox`);
    return handleResponse<ApprovalRequest[]>(response);
  },

  submitApprovalDecision: async (
    requestId: string,
    decision: ApprovalDecisionType,
    decidedBy: string
  ): Promise<ControlAction> => {
    const payload: ApprovalDecision = {
      request_id: requestId,
      decision,
      decided_by: decidedBy,
      timestamp: new Date().toISOString(),
    };
    console.log('[API] Submitting approval decision to n8n:', payload);
    const response = await fetch(`${N8N_BASE_URL}/sentinel/approval/decision`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return handleControlAction(response, decision);
  },

  triggerFreeze: async (triggeredBy: string, reason: string): Promise<ControlAction> => {
    const payload: FreezeRequest = {
      triggered_by: triggeredBy,
      reason,
    };
    console.log('[API] Triggering freeze via n8n:', payload);
    const response = await fetch(`${N8N_BASE_URL}/sentinel/freeze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return handleControlAction(response, 'FREEZE');
  },

  triggerResume: async (initiatedBy: string, intent: string): Promise<ControlAction> => {
    const payload: ResumeRequest = {
      initiated_by: initiatedBy,
      intent,
    };
    console.log('[API] Triggering resume via n8n:', payload);
    const response = await fetch(`${N8N_BASE_URL}/sentinel/resume`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return handleControlAction(response, 'RESUME');
  },

  getGlobalState: async (): Promise<{ state: GlobalSystemState; message: N8NBroadcastMessage | null }> => {
    try {
      const response = await fetchWithTimeout(`${N8N_BASE_URL}/sentinel/state`);
      return handleResponse<{ state: GlobalSystemState; message: N8NBroadcastMessage | null }>(response);
    } catch (err) {
      console.log('[API] Global state not available, defaulting to OFF:', err);
      return { state: 'OFF', message: null };
    }
  },

  checkGovernanceHealth: async (): Promise<GovernanceStatus> => {
    try {
      console.log('[API] Checking n8n governance health...');
      const response = await fetchWithTimeout(`${N8N_BASE_URL}/rork/sentinel/broadcast`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'HEALTH_CHECK' }),
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log('[API] Governance health response:', data);
        return {
          governance_online: true,
          engine_online: data.engine_online ?? false,
          global_state: data.state ?? 'OFF',
          last_broadcast: data.message ?? null,
          pending_approvals: data.pending_approvals ?? 0,
        };
      }
      
      return {
        governance_online: true,
        engine_online: false,
        global_state: 'OFF',
        last_broadcast: null,
        pending_approvals: 0,
      };
    } catch (err) {
      console.log('[API] Governance health check failed:', err);
      throw err;
    }
  },

  checkEngineHealth: async (): Promise<boolean> => {
    try {
      console.log('[API] Checking engine health (optional)...');
      const response = await fetchWithTimeout(`${SENTINEL_BASE_URL}/status`);
      return response.ok;
    } catch (err) {
      console.log('[API] Engine offline (expected):', err);
      return false;
    }
  },

  getShadowStrategiesFromGovernance: async (): Promise<N8NShadowStrategy[]> => {
    try {
      console.log('[API] Fetching shadow strategies from n8n governance...');
      const response = await fetchWithTimeout(`${N8N_BASE_URL}/rork/sentinel/shadow/inbox`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'FETCH_SHADOW_STRATEGIES' }),
      });
      const data = await handleResponse<N8NShadowStrategy[] | { strategies: N8NShadowStrategy[] }>(response);
      if (Array.isArray(data)) {
        return data;
      }
      return data.strategies ?? [];
    } catch (err) {
      console.log('[API] Shadow strategies from governance failed:', err);
      return [];
    }
  },

  getGovernanceTimeline: async (): Promise<GovernanceEvent[]> => {
    try {
      console.log('[API] Fetching governance timeline from n8n...');
      const response = await fetchWithTimeout(`${N8N_BASE_URL}/rork/sentinel/timeline`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'FETCH_TIMELINE' }),
      });
      const data = await handleResponse<GovernanceEvent[] | { events: GovernanceEvent[] }>(response);
      if (Array.isArray(data)) {
        return data;
      }
      return data.events ?? [];
    } catch (err) {
      console.log('[API] Governance timeline fetch failed:', err);
      return [];
    }
  },

  getGovernanceHeartbeat: async (): Promise<GovernanceHeartbeat | null> => {
    try {
      console.log('[API] Fetching governance heartbeat from n8n...');
      const response = await fetchWithTimeout(`${N8N_BASE_URL}/rork/sentinel/heartbeat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'HEARTBEAT_REQUEST' }),
      });
      const data = await handleResponse<GovernanceHeartbeat>(response);
      console.log('[API] Governance heartbeat received:', data);
      return data;
    } catch (err) {
      console.log('[API] Governance heartbeat fetch failed:', err);
      return null;
    }
  },

  getDecisionExplanation: async (eventId: string, eventType: GovernanceEventType): Promise<DecisionExplanation> => {
    try {
      console.log('[API] Fetching decision explanation for event:', eventId);
      const response = await fetchWithTimeout(`${N8N_BASE_URL}/rork/sentinel/explain`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ event_id: eventId, event_type: eventType }),
      });
      return handleResponse<DecisionExplanation>(response);
    } catch (err) {
      console.log('[API] Decision explanation fetch failed, using fallback:', err);
      return generateFallbackExplanation(eventId, eventType);
    }
  },

  getHypotheticalAnalysis: async (scenario: HypotheticalScenario): Promise<HypotheticalAnalysis> => {
    try {
      console.log('[API] Fetching hypothetical analysis for scenario:', scenario);
      const response = await fetchWithTimeout(`${N8N_BASE_URL}/rork/sentinel/hypothetical`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scenario }),
      });
      return handleResponse<HypotheticalAnalysis>(response);
    } catch (err) {
      console.log('[API] Hypothetical analysis fetch failed, using fallback:', err);
      return generateFallbackHypothetical(scenario);
    }
  },

  getGovernanceGuardrails: async (): Promise<GovernanceGuardrails> => {
    try {
      console.log('[API] Fetching governance guardrails from n8n...');
      const response = await fetchWithTimeout(`${N8N_BASE_URL}/rork/sentinel/guardrails`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'FETCH_GUARDRAILS' }),
      });
      return handleResponse<GovernanceGuardrails>(response);
    } catch (err) {
      console.log('[API] Governance guardrails fetch failed, using fallback:', err);
      return generateFallbackGuardrails();
    }
  },
};

const generateFallbackHypothetical = (scenario: HypotheticalScenario): HypotheticalAnalysis => {
  const scenarios: Record<HypotheticalScenario, Omit<HypotheticalAnalysis, 'scenario' | 'disclaimer'>> = {
    PROMOTE_SHADOW: {
      scenario_label: 'Promote Shadow Strategy',
      outcome_summary: 'Promoting a shadow strategy to paper or live trading would require governance approval and risk validation.',
      would_proceed: false,
      next_approvals: [
        { type: 'Governance Approval', required_from: 'Authorized Operator', quorum_needed: 1, estimated_wait: '~5 minutes' },
        { type: 'Risk Validation', required_from: 'Risk Engine', quorum_needed: 1, estimated_wait: 'Immediate' },
      ],
      potential_blocks: [
        { reason: 'Insufficient track record', blocking_factor: 'Minimum trades not reached', resolution_hint: 'Wait for more shadow signals' },
      ],
      safety_constraints: [
        { name: 'Sharpe Ratio', current_value: '—', threshold: '≥ 1.0', status: 'WARN' },
        { name: 'Max Drawdown', current_value: '—', threshold: '< 15%', status: 'PASS' },
        { name: 'Trade Count', current_value: '—', threshold: '≥ 30', status: 'WARN' },
      ],
    },
    APPROVE_TRADE: {
      scenario_label: 'Approve Trade Execution',
      outcome_summary: 'Approving a trade would allow execution if all risk checks pass and quorum is satisfied.',
      would_proceed: true,
      next_approvals: [
        { type: 'Human Approval', required_from: 'Authorized Operator', quorum_needed: 1, estimated_wait: '~2 minutes' },
      ],
      potential_blocks: [],
      safety_constraints: [
        { name: 'Position Limit', current_value: 'Within limit', threshold: '< Max exposure', status: 'PASS' },
        { name: 'Daily Loss', current_value: 'Within limit', threshold: '< Max daily loss', status: 'PASS' },
      ],
    },
    CHANGE_CONFIG: {
      scenario_label: 'Change System Configuration',
      outcome_summary: 'Configuration changes require elevated approval and may trigger a system pause.',
      would_proceed: false,
      next_approvals: [
        { type: 'Config Change Approval', required_from: 'System Administrator', quorum_needed: 2, estimated_wait: '~10 minutes' },
      ],
      potential_blocks: [
        { reason: 'Active positions', blocking_factor: 'Open positions exist', resolution_hint: 'Close positions before config change' },
      ],
      safety_constraints: [
        { name: 'System State', current_value: 'Active', threshold: 'Paused required', status: 'BLOCK' },
      ],
    },
    GO_LIVE: {
      scenario_label: 'Enable Live Trading',
      outcome_summary: 'Transitioning to live trading requires full governance approval chain and all safety checks.',
      would_proceed: false,
      next_approvals: [
        { type: 'Governance Approval', required_from: 'Primary Operator', quorum_needed: 1, estimated_wait: '~5 minutes' },
        { type: 'Risk Sign-off', required_from: 'Risk Engine', quorum_needed: 1, estimated_wait: 'Immediate' },
        { type: 'Final Confirmation', required_from: 'System Owner', quorum_needed: 1, estimated_wait: '~15 minutes' },
      ],
      potential_blocks: [
        { reason: 'Shadow validation incomplete', blocking_factor: 'Shadow period not satisfied', resolution_hint: 'Complete shadow validation period' },
      ],
      safety_constraints: [
        { name: 'Shadow Period', current_value: '—', threshold: '≥ 7 days', status: 'WARN' },
        { name: 'Kill Switch', current_value: 'Armed', threshold: 'Armed', status: 'PASS' },
        { name: 'Broker Connection', current_value: '—', threshold: 'Connected', status: 'PASS' },
      ],
    },
    FREEZE_SYSTEM: {
      scenario_label: 'Freeze System',
      outcome_summary: 'Freezing the system would immediately halt all execution and enter safe state.',
      would_proceed: true,
      next_approvals: [
        { type: 'Freeze Authorization', required_from: 'Any Operator', quorum_needed: 1, estimated_wait: 'Immediate' },
      ],
      potential_blocks: [],
      safety_constraints: [
        { name: 'Freeze Authority', current_value: 'Authorized', threshold: 'Authorized', status: 'PASS' },
      ],
    },
  };

  return {
    scenario,
    ...scenarios[scenario],
    disclaimer: 'This is a hypothetical analysis. No actions have been taken. Results may vary based on real-time conditions.',
  };
};

const generateFallbackGuardrails = (): GovernanceGuardrails => {
  return {
    approval_requirements: [
      { id: 'ar1', title: 'Human Approval Required', description: 'All live trades require explicit human approval before execution', status: 'ACTIVE' },
      { id: 'ar2', title: 'Risk Assessment Gate', description: 'Every action must pass automated risk assessment before approval request', status: 'ACTIVE' },
      { id: 'ar3', title: 'Timeout Protection', description: 'Pending approvals expire after the configured window to prevent stale decisions', status: 'ACTIVE' },
    ],
    quorum_rules: [
      { id: 'qr1', title: 'Single Operator Quorum', description: 'Standard actions require approval from one authorized operator', status: 'ACTIVE' },
      { id: 'qr2', title: 'Elevated Quorum', description: 'High-risk or configuration changes require two operator approvals', status: 'ACTIVE' },
      { id: 'qr3', title: 'No Self-Approval', description: 'Operators cannot approve their own initiated actions', status: 'ACTIVE' },
    ],
    freeze_conditions: [
      { id: 'fc1', title: 'Manual Freeze', description: 'Any authorized operator can freeze the system immediately', status: 'ACTIVE' },
      { id: 'fc2', title: 'Risk Breach Freeze', description: 'System automatically freezes when risk thresholds are exceeded', status: 'ACTIVE' },
      { id: 'fc3', title: 'Connectivity Loss Freeze', description: 'System freezes if governance connectivity is lost for extended period', status: 'ACTIVE' },
      { id: 'fc4', title: 'Kill Switch', description: 'Emergency kill switch halts all activity and enters safe state', status: 'ACTIVE' },
    ],
    shadow_constraints: [
      { id: 'sc1', title: 'No Live Execution', description: 'Shadow strategies cannot execute real trades under any circumstance', status: 'ACTIVE' },
      { id: 'sc2', title: 'Promotion Gate', description: 'Shadow strategies must meet minimum criteria before promotion consideration', status: 'ACTIVE' },
      { id: 'sc3', title: 'Paper Validation', description: 'Shadow strategies must pass paper trading validation before live promotion', status: 'ACTIVE' },
      { id: 'sc4', title: 'Governance Approval', description: 'All shadow promotions require explicit governance approval', status: 'ACTIVE' },
    ],
  };
};

const generateFallbackExplanation = (
  eventId: string,
  eventType: GovernanceEventType
): DecisionExplanation => {
  const explanations: Record<GovernanceEventType, Omit<DecisionExplanation, 'event_id'>> = {
    APPROVAL_REQUESTED: {
      decision_summary: 'A new action requires human approval before proceeding.',
      key_factors: [
        'Action initiated by governance system',
        'Risk assessment completed',
        'Awaiting human verification',
      ],
      what_was_required: 'Human approval from authorized operator',
    },
    APPROVAL_GRANTED: {
      decision_summary: 'Action was approved and allowed to proceed.',
      key_factors: [
        'Human approval was granted',
        'Risk was within acceptable limits',
        'Quorum requirements were satisfied',
      ],
      what_was_required: 'Human approval and risk compliance',
    },
    APPROVAL_DENIED: {
      decision_summary: 'Action was rejected and will not proceed.',
      key_factors: [
        'Human operator rejected the request',
        'Action did not meet approval criteria',
      ],
      what_was_required: 'Human approval from authorized operator',
      what_was_missing: 'Approval was explicitly denied by operator',
    },
    APPROVAL_TIMED_OUT: {
      decision_summary: 'Action expired without receiving a decision.',
      key_factors: [
        'Approval window elapsed',
        'No decision was recorded in time',
        'System defaulted to safe state',
      ],
      what_was_required: 'Timely human decision within approval window',
      what_was_missing: 'Response was not received before deadline',
    },
    QUORUM_REACHED: {
      decision_summary: 'Required number of approvals was reached.',
      key_factors: [
        'Multiple approvers confirmed',
        'Consensus threshold met',
        'Action may now proceed',
      ],
      what_was_required: 'Minimum number of approvals from authorized operators',
    },
    SYSTEM_FROZEN: {
      decision_summary: 'System was frozen to prevent further actions.',
      key_factors: [
        'Freeze triggered by operator or governance',
        'All execution halted',
        'System in safe state',
      ],
      what_was_required: 'Freeze command from authorized source',
    },
    SYSTEM_RESUMED: {
      decision_summary: 'System resumed normal operation.',
      key_factors: [
        'Freeze condition resolved',
        'Operator authorized resumption',
        'System ready for operation',
      ],
      what_was_required: 'Resume authorization from operator',
    },
    SHADOW_STRATEGY_CREATED: {
      decision_summary: 'A new shadow strategy was created for observation.',
      key_factors: [
        'Strategy generated by governance',
        'Running in shadow mode only',
        'No live execution permitted',
      ],
      what_was_required: 'Governance authorization for shadow creation',
    },
  };

  return {
    event_id: eventId,
    ...explanations[eventType],
  };
};
