import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, Platform } from 'react-native';
import { useGlobalState } from '@/providers/GlobalStateProvider';
import { useConnection } from '@/providers/ConnectionProvider';

type AuraState = 'GOVERNANCE_ONLINE' | 'SHADOW_ONLY' | 'FROZEN' | 'ENGINE_OFFLINE' | 'DISCONNECTED' | 'AWAITING_DECISION';

const AURA_COLORS: Record<AuraState, { primary: string; secondary: string }> = {
  GOVERNANCE_ONLINE: {
    primary: 'rgba(255, 255, 255, 0.035)',
    secondary: 'rgba(255, 255, 255, 0.018)',
  },
  SHADOW_ONLY: {
    primary: 'rgba(177, 0, 26, 0.10)',
    secondary: 'rgba(177, 0, 26, 0.045)',
  },
  FROZEN: {
    primary: 'rgba(255, 255, 255, 0.030)',
    secondary: 'rgba(255, 255, 255, 0.015)',
  },
  ENGINE_OFFLINE: {
    primary: 'rgba(255, 255, 255, 0.028)',
    secondary: 'rgba(255, 255, 255, 0.012)',
  },
  DISCONNECTED: {
    primary: 'rgba(255, 255, 255, 0.020)',
    secondary: 'rgba(255, 255, 255, 0.010)',
  },
  AWAITING_DECISION: {
    primary: 'rgba(177, 0, 26, 0.085)',
    secondary: 'rgba(255, 255, 255, 0.018)',
  },
};

export default function SystemAura() {
  const { isFrozen, isShadowOnly, n8nConnected, isAwaitingHumanDecision } = useGlobalState();
  const { engineState, governanceState } = useConnection();
  
  const pulseAnim = useRef(new Animated.Value(0.4)).current;
  const colorTransition = useRef(new Animated.Value(0)).current;
  const prevState = useRef<AuraState>('DISCONNECTED');

  const getCurrentState = (): AuraState => {
    if (governanceState !== 'ONLINE' || !n8nConnected) {
      return 'DISCONNECTED';
    }
    if (isFrozen) {
      return 'FROZEN';
    }
    if (isAwaitingHumanDecision) {
      return 'AWAITING_DECISION';
    }
    if (isShadowOnly) {
      return 'SHADOW_ONLY';
    }
    if (engineState === 'EXPECTED_OFFLINE') {
      return 'ENGINE_OFFLINE';
    }
    return 'GOVERNANCE_ONLINE';
  };

  const currentState = getCurrentState();

  useEffect(() => {
    if (currentState !== prevState.current) {
      Animated.timing(colorTransition, {
        toValue: 1,
        duration: 500,
        useNativeDriver: false,
      }).start(() => {
        colorTransition.setValue(0);
        prevState.current = currentState;
      });
    }
  }, [currentState, colorTransition]);

  useEffect(() => {
    const shouldPulse = currentState === 'ENGINE_OFFLINE' || currentState === 'DISCONNECTED';
    const isWaiting = currentState === 'AWAITING_DECISION';
    
    if (isWaiting) {
      const gentlePulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 0.85,
            duration: 3000,
            useNativeDriver: false,
          }),
          Animated.timing(pulseAnim, {
            toValue: 0.55,
            duration: 3000,
            useNativeDriver: false,
          }),
        ])
      );
      gentlePulse.start();
      return () => gentlePulse.stop();
    } else if (shouldPulse) {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 0.65,
            duration: 4000,
            useNativeDriver: false,
          }),
          Animated.timing(pulseAnim, {
            toValue: 0.4,
            duration: 4000,
            useNativeDriver: false,
          }),
        ])
      );
      pulse.start();
      return () => pulse.stop();
    } else {
      Animated.timing(pulseAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: false,
      }).start();
    }
  }, [currentState, pulseAnim]);

  const colors = AURA_COLORS[currentState];

  if (Platform.OS === 'web') {
    return (
      <View style={styles.container} pointerEvents="none">
        <Animated.View
          style={[
            styles.auraLayer,
            styles.primaryAura,
            {
              backgroundColor: colors.primary,
              opacity: pulseAnim,
            },
          ]}
        />
        <Animated.View
          style={[
            styles.auraLayer,
            styles.secondaryAura,
            {
              backgroundColor: colors.secondary,
              opacity: pulseAnim,
            },
          ]}
        />
      </View>
    );
  }

  return (
    <View style={styles.container} pointerEvents="none">
      <Animated.View
        style={[
          styles.auraLayer,
          styles.primaryAura,
          {
            backgroundColor: colors.primary,
            opacity: pulseAnim,
          },
        ]}
      />
      <Animated.View
        style={[
          styles.auraLayer,
          styles.secondaryAura,
          {
            backgroundColor: colors.secondary,
            opacity: pulseAnim,
          },
        ]}
      />
      <View style={[styles.auraLayer, styles.vignetteOverlay]} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 200,
    zIndex: 0,
    overflow: 'hidden',
  },
  auraLayer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  primaryAura: {
    top: -60,
    height: 180,
    borderBottomLeftRadius: 200,
    borderBottomRightRadius: 200,
    transform: [{ scaleX: 1.5 }],
  },
  secondaryAura: {
    top: -30,
    height: 160,
    borderBottomLeftRadius: 300,
    borderBottomRightRadius: 300,
    transform: [{ scaleX: 2 }],
  },
  vignetteOverlay: {
    height: 200,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
  },
});
