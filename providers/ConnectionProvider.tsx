import { useState, useEffect, useCallback, useRef } from 'react';
import createContextHook from '@nkzw/create-context-hook';
import { api, getConfig } from '@/lib/api';
import { BotStatus, GovernanceStatus, GovernanceConnectionState, EngineConnectionState, GovernanceHeartbeat } from '@/types/bot';

const RETRY_INTERVAL = 5000;
const MAX_RETRY_COUNT = 999;
const GOVERNANCE_POLL_INTERVAL = 3000;
const ENGINE_POLL_INTERVAL = 10000;

export const [ConnectionProvider, useConnection] = createContextHook(() => {
  const [governanceState, setGovernanceState] = useState<GovernanceConnectionState>('CONNECTING');
  const [engineState, setEngineState] = useState<EngineConnectionState>('EXPECTED_OFFLINE');
  const [governanceStatus, setGovernanceStatus] = useState<GovernanceStatus | null>(null);
  const [engineStatus, setEngineStatus] = useState<BotStatus | null>(null);
  const [shadowSignals, setShadowSignals] = useState<any[]>([]);
  const [shadowOrders, setShadowOrders] = useState<any[]>([]);
  const [shadowPositions, setShadowPositions] = useState<any[]>([]);
  const [heartbeat, setHeartbeat] = useState<GovernanceHeartbeat | null>(null);
  const [lastError, setLastError] = useState<string | null>(null);
  const [lastConnectedAt, setLastConnectedAt] = useState<Date | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [isRetrying, setIsRetrying] = useState(false);
  const retryTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const governancePollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const enginePollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const heartbeatPollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const wsPingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const clearTimers = useCallback(() => {
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
      retryTimeoutRef.current = null;
    }
    if (governancePollRef.current) {
      clearInterval(governancePollRef.current);
      governancePollRef.current = null;
    }
    if (enginePollRef.current) {
      clearInterval(enginePollRef.current);
      enginePollRef.current = null;
    }
    if (heartbeatPollRef.current) {
      clearInterval(heartbeatPollRef.current);
      heartbeatPollRef.current = null;
    }
    if (wsPingRef.current) {
      clearInterval(wsPingRef.current);
      wsPingRef.current = null;
    }
  }, []);

  const fetchGovernanceHealth = useCallback(async (isManualRetry = false): Promise<boolean> => {
    if (isManualRetry) {
      setIsRetrying(true);
    }

    try {
      console.log('[Connection] Checking n8n governance health...');
      const status = await api.checkGovernanceHealth();
      console.log('[Connection] Governance status:', status);
      
      setGovernanceStatus(status);
      setGovernanceState('ONLINE');
      setLastError(null);
      setLastConnectedAt(new Date());
      setRetryCount(0);
      setIsRetrying(false);
      
      return true;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Governance backend unavailable';
      console.log('[Connection] Governance error:', errorMessage);
      
      setGovernanceState('OFFLINE');
      setLastError(errorMessage);
      setIsRetrying(false);
      
      return false;
    }
  }, []);

  const fetchEngineHealth = useCallback(async (): Promise<void> => {
    try {
      console.log('[Connection] Checking engine health (optional)...');
      const isOnline = await api.checkEngineHealth();
      
      if (isOnline) {
        setEngineState('ONLINE');
        const status = await api.getStatus();
        setEngineStatus(status);
        console.log('[Connection] Engine online, status:', status.state);
      } else {
        setEngineState('EXPECTED_OFFLINE');
        setEngineStatus(null);
        console.log('[Connection] Engine offline (expected)');
      }
    } catch (error) {
      console.log('[Connection] Engine check failed (expected):', error);
      setEngineState('EXPECTED_OFFLINE');
      setEngineStatus(null);
    }
  }, []);

  const fetchHeartbeat = useCallback(async (): Promise<void> => {
    try {
      console.log('[Connection] Fetching governance heartbeat...');
      const hb = await api.getGovernanceHeartbeat();
      if (hb) {
        setHeartbeat(hb);
        console.log('[Connection] Heartbeat received:', hb.status, hb.reason);
      }
    } catch (error) {
      console.log('[Connection] Heartbeat fetch failed:', error);
    }
  }, []);

  const scheduleRetry = useCallback(() => {
    if (retryTimeoutRef.current) return;
    
    if (retryCount < MAX_RETRY_COUNT) {
      console.log(`[Connection] Scheduling governance retry ${retryCount + 1} in ${RETRY_INTERVAL}ms`);
      retryTimeoutRef.current = setTimeout(async () => {
        retryTimeoutRef.current = null;
        setRetryCount(prev => prev + 1);
        const success = await fetchGovernanceHealth();
        if (!success) {
          scheduleRetry();
        }
      }, RETRY_INTERVAL);
    }
  }, [retryCount, fetchGovernanceHealth]);

  const manualRetry = useCallback(async () => {
    console.log('[Connection] Manual retry triggered');
    clearTimers();
    setRetryCount(0);
    const success = await fetchGovernanceHealth(true);
    if (!success) {
      scheduleRetry();
    }
  }, [clearTimers, fetchGovernanceHealth, scheduleRetry]);

  const refetchStatus = useCallback(async () => {
    // Engine is the primary source of truth for "live" status in local/dev.
    await fetchEngineHealth();

    // Governance is optional; if it's up, also refresh it.
    if (governanceState === 'ONLINE') {
      await fetchGovernanceHealth();
      await fetchHeartbeat();
    }
  }, [governanceState, fetchGovernanceHealth, fetchEngineHealth, fetchHeartbeat]);

  useEffect(() => {
    const init = async () => {
      // Always check engine first so Overview/Dashboard can show live data even if governance (n8n) is offline.
      await fetchEngineHealth();

      const success = await fetchGovernanceHealth();
      if (success) {
        await fetchHeartbeat();
      } else {
        scheduleRetry();
      }

      // Start realtime stream for shadow trading updates.
      try {
        const { sentinelBaseUrl } = getConfig();
        const wsUrl = sentinelBaseUrl.replace(/^http/, 'ws') + '/ws/stream';
        console.log('[Connection] Connecting WS stream:', wsUrl);

        const ws = new WebSocket(wsUrl);
        wsRef.current = ws;

        ws.onopen = () => {
          console.log('[Connection] WS connected');
          // Keepalive so server doesn't block on receive_text.
          wsPingRef.current = setInterval(() => {
            try {
              ws.send('ping');
            } catch {}
          }, 15000);
        };

        ws.onmessage = (evt) => {
          try {
            const msg = JSON.parse(String(evt.data));
            if (msg?.type === 'portfolio.snapshot') {
              const d = msg.data || {};
              setEngineState('ONLINE');
              setEngineStatus((prev) => {
                const equity = Number(d.equity ?? prev?.equity ?? 0);
                const dailyPnL = Number(d.pnl_day ?? prev?.dailyPnL ?? 0);
                const base = 10000;
                const dailyPnLPercent = (dailyPnL / base) * 100;
                return {
                  ...(prev || {
                    state: 'TRADING',
                    mode: 'SHADOW',
                    brokers: [],
                    equity: 0,
                    dailyPnL: 0,
                    dailyPnLPercent: 0,
                    openPositions: 0,
                    killSwitchArmed: true,
                    lastHeartbeat: new Date().toISOString(),
                    uptime: 0,
                    tradingWindowActive: true,
                    shadowTradingEnabled: true,
                  }),
                  mode: 'SHADOW',
                  equity,
                  dailyPnL,
                  dailyPnLPercent,
                  lastHeartbeat: String(d.ts || prev?.lastHeartbeat || new Date().toISOString()),
                };
              });
            }

            if (msg?.type === 'shadow.signal') {
              const s = msg?.data?.signal;
              if (s) {
                setShadowSignals((prev) => [s, ...prev].slice(0, 200));
              }
            }

            if (msg?.type === 'shadow.order') {
              const o = msg?.data?.order;
              if (o) {
                setShadowOrders((prev) => [o, ...prev].slice(0, 200));
              }
            }

            if (msg?.type === 'shadow.positions') {
              const ps = msg?.data?.positions;
              if (Array.isArray(ps)) {
                setShadowPositions(ps);
                setEngineStatus((prev) => (prev ? { ...prev, openPositions: ps.length } : prev));
              }
            }
          } catch {
            // ignore
          }
        };

        ws.onerror = (err) => {
          console.log('[Connection] WS error:', err);
        };

        ws.onclose = () => {
          console.log('[Connection] WS closed');
          if (wsPingRef.current) {
            clearInterval(wsPingRef.current);
            wsPingRef.current = null;
          }
        };
      } catch (e) {
        console.log('[Connection] WS init failed:', e);
      }
    };
    init();

    return () => {
      clearTimers();
      try {
        wsRef.current?.close();
      } catch {}
      wsRef.current = null;
    };
  }, [fetchGovernanceHealth, fetchEngineHealth, fetchHeartbeat, scheduleRetry, clearTimers]);

  useEffect(() => {
    // Always poll engine, even if governance is offline.
    console.log('[Connection] Starting engine poll interval');
    enginePollRef.current = setInterval(fetchEngineHealth, ENGINE_POLL_INTERVAL);

    if (governanceState === 'ONLINE') {
      console.log('[Connection] Starting governance poll interval');
      governancePollRef.current = setInterval(async () => {
        const success = await fetchGovernanceHealth();
        if (!success) {
          clearTimers();
          scheduleRetry();
        }
      }, GOVERNANCE_POLL_INTERVAL);

      console.log('[Connection] Starting heartbeat poll interval');
      heartbeatPollRef.current = setInterval(fetchHeartbeat, GOVERNANCE_POLL_INTERVAL);
    }

    return () => {
      if (governancePollRef.current) {
        clearInterval(governancePollRef.current);
        governancePollRef.current = null;
      }
      if (enginePollRef.current) {
        clearInterval(enginePollRef.current);
        enginePollRef.current = null;
      }
      if (heartbeatPollRef.current) {
        clearInterval(heartbeatPollRef.current);
        heartbeatPollRef.current = null;
      }
    };
  }, [governanceState, fetchGovernanceHealth, fetchEngineHealth, fetchHeartbeat, clearTimers, scheduleRetry]);

  useEffect(() => {
    if (governanceState === 'OFFLINE' && !retryTimeoutRef.current) {
      scheduleRetry();
    }
  }, [governanceState, scheduleRetry]);

  const connectionState = governanceState;
  const status = engineStatus;

  return {
    connectionState,
    governanceState,
    engineState,
    governanceStatus,
    heartbeat,
    status,
    engineStatus,
    shadowSignals,
    shadowOrders,
    shadowPositions,
    lastError,
    lastConnectedAt,
    retryCount,
    isRetrying,
    manualRetry,
    refetchStatus,
  };
});
