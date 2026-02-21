import { useState, useEffect, useCallback, useRef } from 'react';
import createContextHook from '@nkzw/create-context-hook';
import { engineApi } from '@/lib/engineApi';
import {
  EngineStatus,
  EngineHeartbeat,
  EnginePortfolio,
  EngineMetrics,
  EngineStrategy,
  EngineConnectionState,
} from '@/types/engine';

const POLL_INTERVAL = 3000;
const HEARTBEAT_POLL_INTERVAL = 2000;

export const [EngineMonitorProvider, useEngineMonitor] = createContextHook(() => {
  const [connectionState, setConnectionState] = useState<EngineConnectionState>('CONNECTING');
  const [status, setStatus] = useState<EngineStatus | null>(null);
  const [heartbeat, setHeartbeat] = useState<EngineHeartbeat | null>(null);
  const [portfolio, setPortfolio] = useState<EnginePortfolio | null>(null);
  const [metrics, setMetrics] = useState<EngineMetrics | null>(null);
  const [strategy, setStrategy] = useState<EngineStrategy | null>(null);
  const [lastError, setLastError] = useState<string | null>(null);
  const [heartbeatAge, setHeartbeatAge] = useState<number | null>(null);

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const heartbeatPollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const heartbeatTickRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastHeartbeatTime = useRef<number | null>(null);

  const clearTimers = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
    if (heartbeatPollRef.current) {
      clearInterval(heartbeatPollRef.current);
      heartbeatPollRef.current = null;
    }
    if (heartbeatTickRef.current) {
      clearInterval(heartbeatTickRef.current);
      heartbeatTickRef.current = null;
    }
  }, []);

  const fetchAll = useCallback(async () => {
    try {
      console.log('[EngineMonitor] Polling engine...');
      const [statusRes, heartbeatRes, portfolioRes, metricsRes, strategyRes] = await Promise.allSettled([
        engineApi.getStatus(),
        engineApi.getHeartbeat(),
        engineApi.getPortfolio(),
        engineApi.getMetrics(),
        engineApi.getStrategy(),
      ]);

      if (statusRes.status === 'fulfilled') {
        setStatus(statusRes.value);
        setConnectionState('ONLINE');
        setLastError(null);
        console.log('[EngineMonitor] Engine ONLINE');
      } else {
        throw statusRes.reason;
      }

      if (heartbeatRes.status === 'fulfilled') {
        setHeartbeat(heartbeatRes.value);
        lastHeartbeatTime.current = Date.now();
        setHeartbeatAge(heartbeatRes.value.age_seconds);
      }
      if (portfolioRes.status === 'fulfilled') {
        setPortfolio(portfolioRes.value);
      }
      if (metricsRes.status === 'fulfilled') {
        setMetrics(metricsRes.value);
      }
      if (strategyRes.status === 'fulfilled') {
        setStrategy(strategyRes.value);
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Engine unreachable';
      console.log('[EngineMonitor] Engine OFFLINE:', msg);
      setConnectionState('OFFLINE');
      setLastError(msg);
      setStatus(null);
      setHeartbeat(null);
      setPortfolio(null);
      setMetrics(null);
      setStrategy(null);
      setHeartbeatAge(null);
      lastHeartbeatTime.current = null;
    }
  }, []);

  const refresh = useCallback(async () => {
    await fetchAll();
  }, [fetchAll]);

  useEffect(() => {
    fetchAll();

    pollRef.current = setInterval(fetchAll, POLL_INTERVAL);

    heartbeatTickRef.current = setInterval(() => {
      if (lastHeartbeatTime.current !== null) {
        const elapsed = Math.floor((Date.now() - lastHeartbeatTime.current) / 1000);
        setHeartbeatAge((prev) => {
          const base = prev ?? 0;
          return base + (elapsed > 0 ? 1 : 0);
        });
      }
    }, 1000);

    return () => {
      clearTimers();
    };
  }, [fetchAll, clearTimers]);

  return {
    connectionState,
    status,
    heartbeat,
    portfolio,
    metrics,
    strategy,
    heartbeatAge,
    lastError,
    refresh,
  };
});
