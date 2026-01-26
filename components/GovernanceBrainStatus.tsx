import React, { useRef, useEffect, useMemo } from 'react';
import { StyleSheet, Text, View, Animated, Platform } from 'react-native';
import { BlurView } from 'expo-blur';
import { Brain, Activity, Clock, Lock } from 'lucide-react-native';
import Colors from '@/constants/colors';
import { useConnection } from '@/providers/ConnectionProvider';
import { useAdaptiveGlass } from '@/providers/AdaptiveGlassProvider';
import { GlobalSystemState, GovernanceBrainStatus as BrainStatusType } from '@/types/bot';

type BrainStatus = BrainStatusType;

const getBrainStatus = (
  governanceOnline: boolean,
  globalState?: GlobalSystemState,
  pendingApprovals?: number
): BrainStatus => {
  if (!governanceOnline) return 'ONLINE';
  if (globalState === 'FROZEN') return 'FROZEN';
  if (pendingApprovals && pendingApprovals > 0) return 'WAITING';
  return 'ONLINE';
};

const getStatusColor = (status: BrainStatus, isFrozen: boolean) => {
  if (isFrozen) return Colors.textMuted;
  switch (status) {
    case 'ONLINE':
      return 'rgba(255,255,255,0.55)';
    case 'WAITING':
      return Colors.primary;
    case 'FROZEN':
      return Colors.textMuted;
    default:
      return Colors.textMuted;
  }
};

const getModeLabel = (state?: GlobalSystemState): string => {
  switch (state) {
    case 'LIVE': return 'LIVE';
    case 'SHADOW_ONLY': return 'SHADOW';
    case 'FROZEN': return 'FROZEN';
    case 'OFF': return 'OFF';
    default: return '—';
  }
};

const formatTimestamp = (timestamp?: string): string => {
  if (!timestamp) return '—';
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

const getReasoningSummary = (
  globalState?: GlobalSystemState,
  pendingApprovals?: number,
  brainStatus?: BrainStatus
): string => {
  if (globalState === 'FROZEN') {
    return 'Execution blocked: system frozen';
  }
  
  if (globalState === 'SHADOW_ONLY') {
    if (pendingApprovals && pendingApprovals > 0) {
      return 'Shadow mode active – awaiting human decision';
    }
    return 'Shadow strategies only – execution disabled';
  }
  
  if (globalState === 'OFF') {
    return 'System offline – no active operations';
  }
  
  if (globalState === 'LIVE') {
    if (pendingApprovals && pendingApprovals > 0) {
      return pendingApprovals === 1 
        ? 'Awaiting quorum approval' 
        : `Awaiting approval on ${pendingApprovals} decisions`;
    }
    return 'Live operation – all systems nominal';
  }
  
  if (brainStatus === 'WAITING') {
    return 'Awaiting human decision';
  }
  
  return 'Monitoring system activity';
};

export default function GovernanceBrainStatus() {
  const { governanceState, governanceStatus, heartbeat } = useConnection();
  const { isDarker } = useAdaptiveGlass();
  
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;
  
  const isGovernanceOnline = governanceState === 'ONLINE';
  
  const globalState = heartbeat?.system_mode ?? governanceStatus?.global_state;
  const pendingApprovals = heartbeat?.active_decisions ?? governanceStatus?.pending_approvals ?? 0;
  const lastDecisionAt = heartbeat?.last_decision_at ?? governanceStatus?.last_broadcast?.timestamp;
  
  const brainStatus: BrainStatus = heartbeat?.status ?? getBrainStatus(isGovernanceOnline, globalState, pendingApprovals);
  const isFrozen = brainStatus === 'FROZEN' || globalState === 'FROZEN';
  const isWaiting = brainStatus === 'WAITING';
  const statusColor = getStatusColor(brainStatus, isFrozen);
  
  const reasoningSummary = useMemo(() => {
    if (heartbeat?.reason) {
      return heartbeat.reason;
    }
    return getReasoningSummary(globalState, pendingApprovals, brainStatus);
  }, [heartbeat?.reason, globalState, pendingApprovals, brainStatus]);

  useEffect(() => {
    if (isWaiting && !isFrozen) {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 0.6,
            duration: 1800,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1800,
            useNativeDriver: true,
          }),
        ])
      );
      
      const glow = Animated.loop(
        Animated.sequence([
          Animated.timing(glowAnim, {
            toValue: 1,
            duration: 2000,
            useNativeDriver: true,
          }),
          Animated.timing(glowAnim, {
            toValue: 0,
            duration: 2000,
            useNativeDriver: true,
          }),
        ])
      );
      
      pulse.start();
      glow.start();
      
      return () => {
        pulse.stop();
        glow.stop();
      };
    } else {
      pulseAnim.setValue(1);
      glowAnim.setValue(0);
    }
  }, [isWaiting, isFrozen, pulseAnim, glowAnim]);

  const containerStyle = [
    styles.container,
    isFrozen && styles.containerFrozen,
    isDarker && styles.containerDarker,
  ];

  const renderContent = () => (
    <View style={styles.innerContent}>
      <View style={styles.headerRow}>
        <View style={styles.brainIconContainer}>
          <Animated.View style={[
            styles.brainGlow,
            { 
              backgroundColor: statusColor,
              opacity: glowAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [0, 0.3],
              }),
            }
          ]} />
          <Brain 
            size={16} 
            color={statusColor} 
            strokeWidth={1.8}
          />
        </View>
        <Text style={[styles.label, isFrozen && styles.textFrozen]}>
          Governance Brain
        </Text>
        <View style={[styles.statusBadge, { backgroundColor: statusColor + '20', borderColor: statusColor + '40' }]}>
          <Animated.View style={[styles.statusDot, { backgroundColor: statusColor, opacity: pulseAnim }]} />
          <Text style={[styles.statusText, { color: statusColor }]}>
            {brainStatus}
          </Text>
        </View>
      </View>

      <View style={styles.detailsRow}>
        <View style={styles.detailItem}>
          <Text style={[styles.detailLabel, isFrozen && styles.textFrozen]}>MODE</Text>
          <Text style={[styles.detailValue, isFrozen && styles.textFrozen]}>
            {getModeLabel(globalState)}
          </Text>
        </View>
        
        <View style={styles.detailDivider} />
        
        <View style={styles.detailItem}>
          <Text style={[styles.detailLabel, isFrozen && styles.textFrozen]}>DECISIONS</Text>
          <View style={styles.decisionRow}>
            <Activity size={10} color={pendingApprovals > 0 ? statusColor : Colors.textMuted} />
            <Text style={[
              styles.detailValue, 
              pendingApprovals > 0 && !isFrozen && { color: statusColor },
              isFrozen && styles.textFrozen
            ]}>
              {pendingApprovals}
            </Text>
          </View>
        </View>
        
        <View style={styles.detailDivider} />
        
        <View style={styles.detailItem}>
          <Text style={[styles.detailLabel, isFrozen && styles.textFrozen]}>LAST</Text>
          <View style={styles.timestampRow}>
            <Clock size={10} color={Colors.textMuted} />
            <Text style={[styles.detailValue, styles.timestampText, isFrozen && styles.textFrozen]}>
              {formatTimestamp(lastDecisionAt)}
            </Text>
          </View>
        </View>
      </View>
      
      <View style={[styles.reasoningContainer, isFrozen && styles.reasoningFrozen]}>
        {isFrozen && (
          <View style={styles.lockIndicator}>
            <Lock size={10} color={Colors.warning} />
          </View>
        )}
        <Text style={[styles.reasoningText, isFrozen && styles.textFrozen]}>
          {reasoningSummary}
        </Text>
      </View>
    </View>
  );

  if (Platform.OS === 'web') {
    return (
      <View style={[containerStyle, styles.webContainer]}>
        {renderContent()}
      </View>
    );
  }

  return (
    <View style={containerStyle}>
      <BlurView
        intensity={isDarker ? 50 : 35}
        tint="dark"
        style={styles.blurView}
      >
        {renderContent()}
      </BlurView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  containerFrozen: {
    borderColor: Colors.warning + '30',
    opacity: 0.85,
  },
  containerDarker: {
    borderColor: 'rgba(255, 255, 255, 0.04)',
  },
  webContainer: {
    backgroundColor: 'rgba(13, 13, 18, 0.75)',
    backdropFilter: 'blur(20px)',
  },
  blurView: {
    flex: 1,
  },
  innerContent: {
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  brainIconContainer: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  brainGlow: {
    position: 'absolute',
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  label: {
    flex: 1,
    fontSize: 12,
    fontWeight: '600' as const,
    color: Colors.textSecondary,
    letterSpacing: 0.3,
  },
  textFrozen: {
    color: Colors.textMuted,
    opacity: 0.7,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    fontSize: 9,
    fontWeight: '700' as const,
    letterSpacing: 0.5,
  },
  detailsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  detailItem: {
    flex: 1,
    alignItems: 'center',
  },
  detailLabel: {
    fontSize: 8,
    fontWeight: '600' as const,
    color: Colors.textMuted,
    letterSpacing: 0.8,
    marginBottom: 3,
  },
  detailValue: {
    fontSize: 11,
    fontWeight: '700' as const,
    color: Colors.textSecondary,
  },
  detailDivider: {
    width: 1,
    height: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
  },
  decisionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  timestampRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  timestampText: {
    fontSize: 10,
  },
  reasoningContainer: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.05)',
  },
  reasoningFrozen: {
    borderTopColor: 'rgba(255, 255, 255, 0.03)',
  },
  reasoningText: {
    fontSize: 11,
    fontWeight: '500' as const,
    color: Colors.textSecondary,
    textAlign: 'center' as const,
    letterSpacing: 0.2,
    opacity: 0.9,
  },
  lockIndicator: {
    position: 'absolute' as const,
    left: 0,
    top: 0,
    bottom: 0,
    justifyContent: 'center' as const,
    opacity: 0.7,
  },
});
