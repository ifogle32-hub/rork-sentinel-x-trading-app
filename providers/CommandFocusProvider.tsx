import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { Animated } from 'react-native';
import createContextHook from '@nkzw/create-context-hook';
import { triggerHaptic } from '@/hooks/useHaptics';
import { useOperationalMode } from './OperationalModeProvider';
import { useConnection } from './ConnectionProvider';
import { ApprovalRequest } from '@/types/bot';

export type FocusTarget = {
  type: 'approval';
  data: ApprovalRequest;
} | {
  type: 'freeze';
  data: { reason?: string };
} | {
  type: 'resume';
  data: { intent?: string };
} | {
  type: 'warning';
  data: { message: string; severity: string };
} | null;

interface FocusTheme {
  blur: number;
  backgroundOpacity: number;
  panelElevation: number;
  animationSpeed: number;
}

const CALM_FOCUS_THEME: FocusTheme = {
  blur: 60,
  backgroundOpacity: 0.95,
  panelElevation: 24,
  animationSpeed: 500,
};

const ALERT_FOCUS_THEME: FocusTheme = {
  blur: 40,
  backgroundOpacity: 0.92,
  panelElevation: 16,
  animationSpeed: 350,
};

const ENTRY_DURATION = 500;
const EXIT_DURATION = 400;

export const [CommandFocusProvider, useCommandFocus] = createContextHook(() => {
  const { isCalm, modeTheme } = useOperationalMode();
  const { governanceState } = useConnection();
  const isGovernanceOnline = governanceState === 'ONLINE';
  
  const [isActive, setIsActive] = useState(false);
  const [target, setTarget] = useState<FocusTarget>(null);
  const [isLocked, setIsLocked] = useState(false);
  
  const entryProgress = useRef(new Animated.Value(0)).current;
  const panelScale = useRef(new Animated.Value(0.95)).current;
  const backgroundBlur = useRef(new Animated.Value(0)).current;
  const [animatedProgress, setAnimatedProgress] = useState(0);

  useEffect(() => {
    const listenerId = entryProgress.addListener(({ value }) => {
      setAnimatedProgress(value);
    });
    return () => entryProgress.removeListener(listenerId);
  }, [entryProgress]);

  useEffect(() => {
    if (!isGovernanceOnline && isActive) {
      console.log('[CommandFocus] Governance offline - locking focus');
      setIsLocked(true);
    } else if (isGovernanceOnline && isLocked) {
      console.log('[CommandFocus] Governance restored - unlocking focus');
      setIsLocked(false);
    }
  }, [isGovernanceOnline, isActive, isLocked]);

  const focusTheme = useMemo((): FocusTheme => {
    const base = isCalm ? CALM_FOCUS_THEME : ALERT_FOCUS_THEME;
    return {
      ...base,
      blur: base.blur * (1 - modeTheme.highlightIntensity * 2),
    };
  }, [isCalm, modeTheme]);

  const enterFocus = useCallback((newTarget: FocusTarget) => {
    if (isActive) return;
    
    console.log('[CommandFocus] Entering focus mode:', newTarget?.type);
    triggerHaptic('medium');
    
    setTarget(newTarget);
    setIsActive(true);
    setIsLocked(!isGovernanceOnline);
    
    Animated.parallel([
      Animated.timing(entryProgress, {
        toValue: 1,
        duration: ENTRY_DURATION,
        useNativeDriver: false,
      }),
      Animated.spring(panelScale, {
        toValue: 1,
        tension: 50,
        friction: 10,
        useNativeDriver: true,
      }),
      Animated.timing(backgroundBlur, {
        toValue: focusTheme.blur,
        duration: ENTRY_DURATION,
        useNativeDriver: false,
      }),
    ]).start();
  }, [isActive, isGovernanceOnline, focusTheme, entryProgress, panelScale, backgroundBlur]);

  const exitFocus = useCallback(() => {
    if (!isActive) return;
    
    console.log('[CommandFocus] Exiting focus mode');
    triggerHaptic('light');
    
    Animated.parallel([
      Animated.timing(entryProgress, {
        toValue: 0,
        duration: EXIT_DURATION,
        useNativeDriver: false,
      }),
      Animated.timing(panelScale, {
        toValue: 0.95,
        duration: EXIT_DURATION,
        useNativeDriver: true,
      }),
      Animated.timing(backgroundBlur, {
        toValue: 0,
        duration: EXIT_DURATION,
        useNativeDriver: false,
      }),
    ]).start(() => {
      setIsActive(false);
      setTarget(null);
      setIsLocked(false);
    });
  }, [isActive, entryProgress, panelScale, backgroundBlur]);

  const completeAction = useCallback((success: boolean) => {
    console.log('[CommandFocus] Action completed:', success ? 'success' : 'cancelled');
    triggerHaptic(success ? 'success' : 'warning');
    
    setTimeout(() => {
      exitFocus();
    }, 300);
  }, [exitFocus]);

  const enterApprovalFocus = useCallback((approval: ApprovalRequest) => {
    enterFocus({ type: 'approval', data: approval });
  }, [enterFocus]);

  const enterFreezeFocus = useCallback((reason?: string) => {
    enterFocus({ type: 'freeze', data: { reason } });
  }, [enterFocus]);

  const enterResumeFocus = useCallback((intent?: string) => {
    enterFocus({ type: 'resume', data: { intent } });
  }, [enterFocus]);

  const enterWarningFocus = useCallback((message: string, severity: string) => {
    enterFocus({ type: 'warning', data: { message, severity } });
  }, [enterFocus]);

  return {
    isActive,
    target,
    isLocked,
    focusTheme,
    animatedProgress,
    entryProgress,
    panelScale,
    backgroundBlur,
    enterFocus,
    exitFocus,
    completeAction,
    enterApprovalFocus,
    enterFreezeFocus,
    enterResumeFocus,
    enterWarningFocus,
  };
});
