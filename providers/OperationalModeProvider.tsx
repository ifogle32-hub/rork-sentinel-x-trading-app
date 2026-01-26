import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Animated } from 'react-native';
import createContextHook from '@nkzw/create-context-hook';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useConnection } from './ConnectionProvider';

export type OperationalMode = 'CALM' | 'ALERT';

interface ModeTheme {
  contrast: number;
  blur: number;
  animationSpeed: number;
  badgeOpacity: number;
  highlightIntensity: number;
  textBrightness: number;
}

const CALM_THEME: ModeTheme = {
  contrast: 0.85,
  blur: 50,
  animationSpeed: 350,
  badgeOpacity: 0.6,
  highlightIntensity: 0.03,
  textBrightness: 0.9,
};

const ALERT_THEME: ModeTheme = {
  contrast: 1.0,
  blur: 30,
  animationSpeed: 180,
  badgeOpacity: 1.0,
  highlightIntensity: 0.08,
  textBrightness: 1.0,
};

const STORAGE_KEY = 'sentinel_operational_mode';
const MODE_TRANSITION_DURATION = 500;

export const [OperationalModeProvider, useOperationalMode] = createContextHook(() => {
  const { governanceStatus } = useConnection();
  const [mode, setMode] = useState<OperationalMode>('CALM');
  const [isManualOverride, setIsManualOverride] = useState(false);
  const transitionProgress = useRef(new Animated.Value(0)).current;
  const [interpolatedProgress, setInterpolatedProgress] = useState(0);

  const animateToMode = useCallback((targetMode: OperationalMode) => {
    setMode(targetMode);
    const targetValue = targetMode === 'ALERT' ? 1 : 0;
    
    Animated.timing(transitionProgress, {
      toValue: targetValue,
      duration: MODE_TRANSITION_DURATION,
      useNativeDriver: false,
    }).start();
  }, [transitionProgress]);

  useEffect(() => {
    const listenerId = transitionProgress.addListener(({ value }) => {
      setInterpolatedProgress(value);
    });
    return () => transitionProgress.removeListener(listenerId);
  }, [transitionProgress]);

  useEffect(() => {
    const loadStoredMode = async () => {
      try {
        const stored = await AsyncStorage.getItem(STORAGE_KEY);
        if (stored === 'ALERT' || stored === 'CALM') {
          console.log('[OperationalMode] Loaded stored mode:', stored);
          setMode(stored);
          setIsManualOverride(true);
          transitionProgress.setValue(stored === 'ALERT' ? 1 : 0);
          setInterpolatedProgress(stored === 'ALERT' ? 1 : 0);
        }
      } catch (error) {
        console.log('[OperationalMode] Failed to load stored mode:', error);
      }
    };
    loadStoredMode();
  }, [transitionProgress]);

  useEffect(() => {
    if (isManualOverride) return;

    const pendingApprovals = governanceStatus?.pending_approvals ?? 0;
    const globalState = governanceStatus?.global_state;
    
    const shouldAlert = pendingApprovals > 0 || globalState === 'FROZEN' || globalState === 'LIVE';
    const targetMode: OperationalMode = shouldAlert ? 'ALERT' : 'CALM';

    if (targetMode !== mode) {
      console.log('[OperationalMode] Auto-transitioning to:', targetMode, 'due to system state');
      animateToMode(targetMode);
    }
  }, [governanceStatus, isManualOverride, mode, animateToMode]);

  useEffect(() => {
    if (!isManualOverride || mode !== 'ALERT') return;

    const pendingApprovals = governanceStatus?.pending_approvals ?? 0;
    const globalState = governanceStatus?.global_state;
    
    const alertsResolved = pendingApprovals === 0 && 
      globalState !== 'FROZEN' && 
      globalState !== 'LIVE';

    if (alertsResolved) {
      console.log('[OperationalMode] Alerts resolved, reverting to CALM');
      setIsManualOverride(false);
      animateToMode('CALM');
      AsyncStorage.removeItem(STORAGE_KEY);
    }
  }, [governanceStatus, isManualOverride, mode, animateToMode]);

  const toggleMode = useCallback(async () => {
    const newMode: OperationalMode = mode === 'CALM' ? 'ALERT' : 'CALM';
    console.log('[OperationalMode] Manual toggle to:', newMode);
    
    setIsManualOverride(true);
    animateToMode(newMode);
    
    try {
      await AsyncStorage.setItem(STORAGE_KEY, newMode);
    } catch (error) {
      console.log('[OperationalMode] Failed to save mode:', error);
    }
  }, [mode, animateToMode]);

  const setModeManually = useCallback(async (newMode: OperationalMode) => {
    console.log('[OperationalMode] Setting mode manually to:', newMode);
    setIsManualOverride(true);
    animateToMode(newMode);
    
    try {
      await AsyncStorage.setItem(STORAGE_KEY, newMode);
    } catch (error) {
      console.log('[OperationalMode] Failed to save mode:', error);
    }
  }, [animateToMode]);

  const resetToAuto = useCallback(async () => {
    console.log('[OperationalMode] Resetting to auto mode');
    setIsManualOverride(false);
    
    try {
      await AsyncStorage.removeItem(STORAGE_KEY);
    } catch (error) {
      console.log('[OperationalMode] Failed to clear stored mode:', error);
    }
  }, []);

  const modeTheme = useMemo((): ModeTheme => {
    const progress = interpolatedProgress;
    
    return {
      contrast: CALM_THEME.contrast + (ALERT_THEME.contrast - CALM_THEME.contrast) * progress,
      blur: CALM_THEME.blur + (ALERT_THEME.blur - CALM_THEME.blur) * progress,
      animationSpeed: CALM_THEME.animationSpeed + (ALERT_THEME.animationSpeed - CALM_THEME.animationSpeed) * progress,
      badgeOpacity: CALM_THEME.badgeOpacity + (ALERT_THEME.badgeOpacity - CALM_THEME.badgeOpacity) * progress,
      highlightIntensity: CALM_THEME.highlightIntensity + (ALERT_THEME.highlightIntensity - CALM_THEME.highlightIntensity) * progress,
      textBrightness: CALM_THEME.textBrightness + (ALERT_THEME.textBrightness - CALM_THEME.textBrightness) * progress,
    };
  }, [interpolatedProgress]);

  const getAnimationDuration = useCallback((baseMs: number): number => {
    return Math.round(baseMs * (mode === 'CALM' ? 1.5 : 0.8));
  }, [mode]);

  const getStatusColor = useCallback((severity: 'normal' | 'warning' | 'critical', baseColor: string): string => {
    if (mode === 'CALM') {
      if (severity === 'critical') return baseColor;
      return baseColor + 'AA';
    }
    return baseColor;
  }, [mode]);

  return {
    mode,
    modeTheme,
    isCalm: mode === 'CALM',
    isAlert: mode === 'ALERT',
    isManualOverride,
    transitionProgress,
    interpolatedProgress,
    toggleMode,
    setModeManually,
    resetToAuto,
    getAnimationDuration,
    getStatusColor,
  };
});
