import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Animated, AppState, AppStateStatus } from 'react-native';
import createContextHook from '@nkzw/create-context-hook';
import { useGlobalState } from './GlobalStateProvider';
import { useOperationalMode } from './OperationalModeProvider';

export type GlassMode = 'DARK' | 'DARKER';

interface GlassTheme {
  background: string;
  surface: string;
  border: string;
  borderLight: string;
  highlight: string;
  shadow: string;
  blur: number;
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
}

const DARK_THEME: GlassTheme = {
  background: 'rgba(13, 13, 18, 0.75)',
  surface: 'rgba(22, 22, 29, 0.65)',
  border: 'rgba(255, 255, 255, 0.08)',
  borderLight: 'rgba(255, 255, 255, 0.12)',
  highlight: 'rgba(255, 255, 255, 0.05)',
  shadow: 'rgba(0, 0, 0, 0.4)',
  blur: 40,
  textPrimary: 'rgba(240, 240, 245, 1)',
  textSecondary: 'rgba(152, 152, 168, 1)',
  textMuted: 'rgba(90, 90, 110, 1)',
};

const DARKER_THEME: GlassTheme = {
  background: 'rgba(5, 5, 8, 0.92)',
  surface: 'rgba(10, 10, 14, 0.88)',
  border: 'rgba(255, 255, 255, 0.04)',
  borderLight: 'rgba(255, 255, 255, 0.06)',
  highlight: 'rgba(255, 255, 255, 0.02)',
  shadow: 'rgba(0, 0, 0, 0.6)',
  blur: 60,
  textPrimary: 'rgba(220, 220, 228, 1)',
  textSecondary: 'rgba(130, 130, 148, 1)',
  textMuted: 'rgba(75, 75, 95, 1)',
};

const EXTENDED_VIEWING_THRESHOLD = 5 * 60 * 1000;
const NIGHT_START_HOUR = 21;
const NIGHT_END_HOUR = 6;

function isNighttime(): boolean {
  const hour = new Date().getHours();
  return hour >= NIGHT_START_HOUR || hour < NIGHT_END_HOUR;
}

function interpolateColor(color1: string, color2: string, progress: number): string {
  const parseRgba = (color: string) => {
    const match = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+),?\s*([\d.]+)?\)/);
    if (match) {
      return {
        r: parseInt(match[1]),
        g: parseInt(match[2]),
        b: parseInt(match[3]),
        a: match[4] ? parseFloat(match[4]) : 1,
      };
    }
    return { r: 0, g: 0, b: 0, a: 1 };
  };

  const c1 = parseRgba(color1);
  const c2 = parseRgba(color2);

  const r = Math.round(c1.r + (c2.r - c1.r) * progress);
  const g = Math.round(c1.g + (c2.g - c1.g) * progress);
  const b = Math.round(c1.b + (c2.b - c1.b) * progress);
  const a = c1.a + (c2.a - c1.a) * progress;

  return `rgba(${r}, ${g}, ${b}, ${a.toFixed(2)})`;
}

export const [AdaptiveGlassProvider, useAdaptiveGlass] = createContextHook(() => {
  const { globalState } = useGlobalState();
  const { mode: operationalMode, isAlert } = useOperationalMode();
  const [mode, setMode] = useState<GlassMode>('DARK');
  const [sessionStart] = useState<number>(Date.now());
  const [extendedViewing, setExtendedViewing] = useState(false);
  const transitionProgress = useRef(new Animated.Value(0)).current;
  const [interpolatedProgress, setInterpolatedProgress] = useState(0);

  useEffect(() => {
    const checkNighttime = () => {
      const nightMode = isNighttime();
      console.log('[AdaptiveGlass] Nighttime check:', nightMode);
    };
    
    checkNighttime();
    const interval = setInterval(checkNighttime, 60000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const checkExtendedViewing = () => {
      const elapsed = Date.now() - sessionStart;
      if (elapsed >= EXTENDED_VIEWING_THRESHOLD && !extendedViewing) {
        console.log('[AdaptiveGlass] Extended viewing detected');
        setExtendedViewing(true);
      }
    };

    const interval = setInterval(checkExtendedViewing, 30000);
    return () => clearInterval(interval);
  }, [sessionStart, extendedViewing]);

  useEffect(() => {
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active') {
        console.log('[AdaptiveGlass] App became active');
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription.remove();
  }, []);

  useEffect(() => {
    const shouldBeDarker = (isNighttime() || extendedViewing || !isAlert) && !isAlert;

    const targetMode: GlassMode = shouldBeDarker ? 'DARKER' : 'DARK';
    
    if (targetMode !== mode) {
      console.log('[AdaptiveGlass] Transitioning to:', targetMode, '(operational mode:', operationalMode, ')');
      setMode(targetMode);
      
      const targetValue = targetMode === 'DARKER' ? 1 : 0;
      Animated.timing(transitionProgress, {
        toValue: targetValue,
        duration: 600,
        useNativeDriver: false,
      }).start();
    }
  }, [globalState, extendedViewing, mode, transitionProgress, isAlert, operationalMode]);

  useEffect(() => {
    const listenerId = transitionProgress.addListener(({ value }) => {
      setInterpolatedProgress(value);
    });
    return () => transitionProgress.removeListener(listenerId);
  }, [transitionProgress]);

  const glassTheme = useMemo((): GlassTheme => {
    const progress = interpolatedProgress;
    
    return {
      background: interpolateColor(DARK_THEME.background, DARKER_THEME.background, progress),
      surface: interpolateColor(DARK_THEME.surface, DARKER_THEME.surface, progress),
      border: interpolateColor(DARK_THEME.border, DARKER_THEME.border, progress),
      borderLight: interpolateColor(DARK_THEME.borderLight, DARKER_THEME.borderLight, progress),
      highlight: interpolateColor(DARK_THEME.highlight, DARKER_THEME.highlight, progress),
      shadow: interpolateColor(DARK_THEME.shadow, DARKER_THEME.shadow, progress),
      blur: (DARK_THEME.blur + (DARKER_THEME.blur - DARK_THEME.blur) * progress) * (isAlert ? 0.6 : 1),
      textPrimary: interpolateColor(DARK_THEME.textPrimary, DARKER_THEME.textPrimary, progress),
      textSecondary: interpolateColor(DARK_THEME.textSecondary, DARKER_THEME.textSecondary, progress),
      textMuted: interpolateColor(DARK_THEME.textMuted, DARKER_THEME.textMuted, progress),
    };
  }, [interpolatedProgress, isAlert]);

  const getGradientColors = useCallback((variant: 'primary' | 'elevated' | 'subtle' = 'primary'): readonly [string, string, string] => {
    const progress = interpolatedProgress;
    
    const darkColors = {
      primary: ['rgba(255,255,255,0.06)', 'rgba(255,255,255,0.02)', 'rgba(0,0,0,0.01)'] as const,
      elevated: ['rgba(255,255,255,0.08)', 'rgba(255,255,255,0.04)', 'rgba(255,255,255,0.02)'] as const,
      subtle: ['rgba(255,255,255,0.03)', 'rgba(255,255,255,0.01)', 'rgba(0,0,0,0.02)'] as const,
    };
    
    const darkerColors = {
      primary: ['rgba(255,255,255,0.02)', 'rgba(255,255,255,0.01)', 'rgba(0,0,0,0.03)'] as const,
      elevated: ['rgba(255,255,255,0.03)', 'rgba(255,255,255,0.015)', 'rgba(0,0,0,0.02)'] as const,
      subtle: ['rgba(255,255,255,0.01)', 'rgba(255,255,255,0.005)', 'rgba(0,0,0,0.04)'] as const,
    };

    return [
      interpolateColor(darkColors[variant][0], darkerColors[variant][0], progress),
      interpolateColor(darkColors[variant][1], darkerColors[variant][1], progress),
      interpolateColor(darkColors[variant][2], darkerColors[variant][2], progress),
    ] as const;
  }, [interpolatedProgress]);

  const forceMode = useCallback((newMode: GlassMode) => {
    console.log('[AdaptiveGlass] Force mode:', newMode);
    setMode(newMode);
    const targetValue = newMode === 'DARKER' ? 1 : 0;
    Animated.timing(transitionProgress, {
      toValue: targetValue,
      duration: 600,
      useNativeDriver: false,
    }).start();
  }, [transitionProgress]);

  return {
    mode,
    glassTheme,
    transitionProgress,
    getGradientColors,
    forceMode,
    isDarker: mode === 'DARKER',
    operationalMode,
    isAlertMode: isAlert,
  };
});
