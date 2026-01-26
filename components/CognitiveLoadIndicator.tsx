import React, { useMemo, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, Animated, Platform } from 'react-native';
import { BlurView } from 'expo-blur';
import { Gauge, Brain, Waves } from 'lucide-react-native';
import Colors from '@/constants/colors';
import { GlobalSystemState } from '@/types/bot';

export type CognitiveLoadLevel = 'LOW' | 'MODERATE' | 'ELEVATED';

interface CognitiveLoadIndicatorProps {
  pendingDecisions: number;
  globalState?: GlobalSystemState;
  recentStateChanges?: number;
  lastDecisionTime?: string;
  isDarker?: boolean;
}

const calculateCognitiveLoad = (
  pendingDecisions: number,
  globalState?: GlobalSystemState,
  recentStateChanges?: number,
  lastDecisionTime?: string
): CognitiveLoadLevel => {
  let loadScore = 0;

  if (pendingDecisions >= 3) {
    loadScore += 3;
  } else if (pendingDecisions >= 2) {
    loadScore += 2;
  } else if (pendingDecisions >= 1) {
    loadScore += 1;
  }

  if (globalState === 'FROZEN') {
    loadScore += 1;
  } else if (globalState === 'SHADOW_ONLY' && pendingDecisions > 0) {
    loadScore += 1;
  }

  if (recentStateChanges && recentStateChanges >= 3) {
    loadScore += 2;
  } else if (recentStateChanges && recentStateChanges >= 2) {
    loadScore += 1;
  }

  if (lastDecisionTime) {
    const timeSinceDecision = Date.now() - new Date(lastDecisionTime).getTime();
    const hoursAgo = timeSinceDecision / (1000 * 60 * 60);
    if (hoursAgo < 1 && pendingDecisions > 0) {
      loadScore += 1;
    }
  }

  if (loadScore >= 4) return 'ELEVATED';
  if (loadScore >= 2) return 'MODERATE';
  return 'LOW';
};

const getLoadConfig = (level: CognitiveLoadLevel): {
  color: string;
  message: string;
  icon: React.ReactNode;
} => {
  switch (level) {
    case 'ELEVATED':
      return {
        color: '#F59E0B',
        message: 'Multiple decisions pending – consider Alert Mode.',
        icon: <Gauge size={14} color="#F59E0B" />,
      };
    case 'MODERATE':
      return {
        color: '#A78BFA',
        message: 'Decisions awaiting attention.',
        icon: <Brain size={14} color="#A78BFA" />,
      };
    case 'LOW':
    default:
      return {
        color: '#6EE7B7',
        message: 'System stable – no action required.',
        icon: <Waves size={14} color="#6EE7B7" />,
      };
  }
};

export default function CognitiveLoadIndicator({
  pendingDecisions,
  globalState,
  recentStateChanges = 0,
  lastDecisionTime,
  isDarker = false,
}: CognitiveLoadIndicatorProps) {
  const pulseAnim = useRef(new Animated.Value(0.6)).current;

  const loadLevel = useMemo(
    () => calculateCognitiveLoad(pendingDecisions, globalState, recentStateChanges, lastDecisionTime),
    [pendingDecisions, globalState, recentStateChanges, lastDecisionTime]
  );

  const config = useMemo(() => getLoadConfig(loadLevel), [loadLevel]);

  useEffect(() => {
    if (loadLevel === 'ELEVATED' || loadLevel === 'MODERATE') {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 2500,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 0.6,
            duration: 2500,
            useNativeDriver: true,
          }),
        ])
      );
      pulse.start();
      return () => pulse.stop();
    } else {
      pulseAnim.setValue(0.6);
    }
  }, [loadLevel, pulseAnim]);

  const renderContent = () => (
    <View style={styles.innerContent}>
      <View style={styles.leftSection}>
        <Animated.View
          style={[
            styles.iconContainer,
            { backgroundColor: config.color + '15', opacity: pulseAnim },
          ]}
        >
          {config.icon}
        </Animated.View>
        <View style={styles.textContainer}>
          <Text style={styles.label}>COGNITIVE LOAD</Text>
          <Text style={[styles.message, { color: config.color }]}>{config.message}</Text>
        </View>
      </View>
      <View style={[styles.levelBadge, { backgroundColor: config.color + '12', borderColor: config.color + '25' }]}>
        <View style={[styles.levelDot, { backgroundColor: config.color }]} />
        <Text style={[styles.levelText, { color: config.color }]}>{loadLevel}</Text>
      </View>
    </View>
  );

  if (Platform.OS === 'web') {
    return (
      <View style={[styles.container, isDarker && styles.containerDarker, styles.webContainer]}>
        {renderContent()}
      </View>
    );
  }

  return (
    <View style={[styles.container, isDarker && styles.containerDarker]}>
      <BlurView intensity={isDarker ? 40 : 25} tint="dark" style={styles.blurView}>
        {renderContent()}
      </BlurView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginTop: 10,
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  containerDarker: {
    borderColor: 'rgba(255, 255, 255, 0.03)',
  },
  webContainer: {
    backgroundColor: 'rgba(13, 13, 18, 0.6)',
  },
  blurView: {
    flex: 1,
  },
  innerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  leftSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  textContainer: {
    flex: 1,
  },
  label: {
    fontSize: 9,
    fontWeight: '700' as const,
    color: Colors.textMuted,
    letterSpacing: 0.8,
    marginBottom: 3,
  },
  message: {
    fontSize: 11,
    fontWeight: '500' as const,
    letterSpacing: 0.2,
    lineHeight: 15,
  },
  levelBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
  },
  levelDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },
  levelText: {
    fontSize: 9,
    fontWeight: '700' as const,
    letterSpacing: 0.5,
  },
});
