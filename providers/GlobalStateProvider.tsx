import { useState, useEffect, useCallback, useMemo } from 'react';
import createContextHook from '@nkzw/create-context-hook';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { GlobalSystemState, N8NBroadcastMessage } from '@/types/bot';

const POLL_INTERVAL = 5000;

export const [GlobalStateProvider, useGlobalState] = createContextHook(() => {
  const [globalState, setGlobalState] = useState<GlobalSystemState>('OFF');
  const [lastBroadcast, setLastBroadcast] = useState<N8NBroadcastMessage | null>(null);
  const [n8nConnected, setN8nConnected] = useState(false);
  const [lastN8nPoll, setLastN8nPoll] = useState<Date | null>(null);
  const [pendingApprovalCount, setPendingApprovalCount] = useState(0);

  const { data, isError, refetch } = useQuery({
    queryKey: ['globalState'],
    queryFn: api.getGlobalState,
    refetchInterval: POLL_INTERVAL,
    retry: 1,
  });

  const { data: approvalsData } = useQuery({
    queryKey: ['approvals'],
    queryFn: api.getApprovalInbox,
    refetchInterval: POLL_INTERVAL,
    retry: 1,
  });

  useEffect(() => {
    if (data) {
      console.log('[GlobalState] Received state:', data.state);
      setGlobalState(data.state);
      setLastBroadcast(data.message);
      setN8nConnected(true);
      setLastN8nPoll(new Date());
    }
  }, [data]);

  useEffect(() => {
    if (approvalsData) {
      const pending = approvalsData.filter(a => a.status === 'PENDING').length;
      console.log('[GlobalState] Pending approvals:', pending);
      setPendingApprovalCount(pending);
    }
  }, [approvalsData]);

  useEffect(() => {
    if (isError) {
      console.log('[GlobalState] n8n connection error');
      setN8nConnected(false);
    }
  }, [isError]);

  const isFrozen = globalState === 'FROZEN';
  const isLive = globalState === 'LIVE';
  const isShadowOnly = globalState === 'SHADOW_ONLY';
  const isOff = globalState === 'OFF';

  const isAwaitingHumanDecision = useMemo(() => {
    return n8nConnected && pendingApprovalCount > 0;
  }, [n8nConnected, pendingApprovalCount]);

  const refreshState = useCallback(() => {
    refetch();
  }, [refetch]);

  return {
    globalState,
    lastBroadcast,
    n8nConnected,
    lastN8nPoll,
    isFrozen,
    isLive,
    isShadowOnly,
    isOff,
    isAwaitingHumanDecision,
    pendingApprovalCount,
    refreshState,
  };
});
