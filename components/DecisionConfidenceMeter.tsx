import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { Gauge, Circle } from 'lucide-react-native';
import Colors from '@/constants/colors';

export type ConfidenceLevel = 'HIGH' | 'MODERATE' | 'LOW';

interface DecisionConfidenceMeterProps {
  level: ConfidenceLevel;
  style?: ViewStyle;
  compact?: boolean;
}

const CONFIDENCE_CONFIG: Record<ConfidenceLevel, {
  label: string;
  color: string;
  glowOpacity: number;
}> = {
  HIGH: {
    label: 'High Confidence',
    color: '#6EE7B7',
    glowOpacity: 0.25,
  },
  MODERATE: {
    label: 'Moderate Confidence',
    color: '#FBBF24',
    glowOpacity: 0.2,
  },
  LOW: {
    label: 'Low Confidence',
    color: '#F87171',
    glowOpacity: 0.15,
  },
};

export function getConfidenceLevelFromScore(score: number): ConfidenceLevel {
  if (score >= 0.7) return 'HIGH';
  if (score >= 0.4) return 'MODERATE';
  return 'LOW';
}

export default function DecisionConfidenceMeter({ 
  level, 
  style,
  compact = false,
}: DecisionConfidenceMeterProps) {
  const config = CONFIDENCE_CONFIG[level];

  if (compact) {
    return (
      <View style={[styles.compactContainer, { borderColor: config.color + '30' }, style]}>
        <View style={[styles.compactDot, { backgroundColor: config.color }]} />
        <Text style={[styles.compactLabel, { color: config.color }]}>
          {config.label.split(' ')[0]}
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { borderColor: config.color + '25' }, style]}>
      <View style={[styles.glowBackground, { backgroundColor: config.color, opacity: config.glowOpacity }]} />
      
      <View style={styles.content}>
        <View style={[styles.iconContainer, { backgroundColor: config.color + '15' }]}>
          <Gauge size={14} color={config.color} strokeWidth={2} />
        </View>
        
        <View style={styles.textContainer}>
          <Text style={[styles.label, { color: config.color }]}>{config.label}</Text>
          <Text style={styles.sublabel}>Informational only</Text>
        </View>
        
        <View style={styles.visualIndicator}>
          {[0, 1, 2].map((idx) => {
            const isActive = (level === 'HIGH' && idx <= 2) ||
                           (level === 'MODERATE' && idx <= 1) ||
                           (level === 'LOW' && idx === 0);
            return (
              <View
                key={idx}
                style={[
                  styles.indicatorDot,
                  {
                    backgroundColor: isActive ? config.color : 'rgba(255,255,255,0.1)',
                    opacity: isActive ? 1 : 0.4,
                  },
                ]}
              />
            );
          })}
        </View>
      </View>
    </View>
  );
}

interface ConfidenceBadgeProps {
  level: ConfidenceLevel;
  style?: ViewStyle;
}

export function ConfidenceBadge({ level, style }: ConfidenceBadgeProps) {
  const config = CONFIDENCE_CONFIG[level];
  
  return (
    <View style={[styles.badgeContainer, { backgroundColor: config.color + '12', borderColor: config.color + '25' }, style]}>
      <Circle size={6} color={config.color} fill={config.color} />
      <Text style={[styles.badgeText, { color: config.color }]}>
        {config.label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
  },
  glowBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 14,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    gap: 10,
  },
  iconContainer: {
    width: 28,
    height: 28,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  textContainer: {
    flex: 1,
  },
  label: {
    fontSize: 12,
    fontWeight: '600' as const,
    letterSpacing: 0.2,
  },
  sublabel: {
    fontSize: 9,
    color: Colors.textMuted,
    marginTop: 1,
    fontStyle: 'italic' as const,
  },
  visualIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  indicatorDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  compactContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
  },
  compactDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },
  compactLabel: {
    fontSize: 10,
    fontWeight: '600' as const,
    letterSpacing: 0.2,
  },
  badgeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '600' as const,
    letterSpacing: 0.2,
  },
});
