import React, { useEffect, useRef } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Animated, ActivityIndicator } from 'react-native';
import { WifiOff, RefreshCw, Shield, Server, CheckCircle, AlertCircle, Moon, Zap, UserCircle } from 'lucide-react-native';
import Colors from '@/constants/colors';
import { useConnection } from '@/providers/ConnectionProvider';
import { useOperationalMode } from '@/providers/OperationalModeProvider';
import { useGlobalState } from '@/providers/GlobalStateProvider';
import { GlobalSystemState } from '@/types/bot';
import * as Haptics from 'expo-haptics';

const getGlobalStateColor = (state?: GlobalSystemState) => {
  switch (state) {
    case 'LIVE': return Colors.error;
    case 'SHADOW_ONLY': return Colors.warning;
    case 'FROZEN': return Colors.error;
    case 'OFF': return Colors.textMuted;
    default: return Colors.textMuted;
  }
};

const getGlobalStateLabel = (state?: GlobalSystemState) => {
  switch (state) {
    case 'LIVE': return 'LIVE';
    case 'SHADOW_ONLY': return 'SHADOW';
    case 'FROZEN': return 'FROZEN';
    case 'OFF': return 'OFF';
    default: return '—';
  }
};

export default function StatusBar() {
  const { 
    governanceState, 
    engineState, 
    governanceStatus, 
    isRetrying, 
    manualRetry 
  } = useConnection();
  
  const { mode, isCalm, toggleMode, isManualOverride } = useOperationalMode();
  const { isAwaitingHumanDecision, pendingApprovalCount } = useGlobalState();
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const modeScaleAnim = useRef(new Animated.Value(1)).current;
  const waitPulseAnim = useRef(new Animated.Value(0.7)).current;

  const isGovernanceOffline = governanceState === 'OFFLINE' || governanceState === 'CONNECTING';
  const isGovernanceOnline = governanceState === 'ONLINE';
  const isEngineOnline = engineState === 'ONLINE';

  useEffect(() => {
    if (isGovernanceOnline && governanceStatus?.global_state === 'LIVE') {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 0.4,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
        ])
      );
      pulse.start();
      return () => pulse.stop();
    } else {
      pulseAnim.setValue(1);
    }
  }, [isGovernanceOnline, governanceStatus?.global_state, pulseAnim]);

  useEffect(() => {
    if (isAwaitingHumanDecision) {
      const gentlePulse = Animated.loop(
        Animated.sequence([
          Animated.timing(waitPulseAnim, {
            toValue: 1,
            duration: 2500,
            useNativeDriver: true,
          }),
          Animated.timing(waitPulseAnim, {
            toValue: 0.7,
            duration: 2500,
            useNativeDriver: true,
          }),
        ])
      );
      gentlePulse.start();
      return () => gentlePulse.stop();
    } else {
      waitPulseAnim.setValue(0.7);
    }
  }, [isAwaitingHumanDecision, waitPulseAnim]);

  const handleModeToggle = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    Animated.sequence([
      Animated.timing(modeScaleAnim, {
        toValue: 0.9,
        duration: 80,
        useNativeDriver: true,
      }),
      Animated.timing(modeScaleAnim, {
        toValue: 1,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start();
    
    toggleMode();
  };

  return (
    <View style={[styles.container, isGovernanceOffline && styles.containerOffline]}>
      {isGovernanceOffline ? (
        <View style={styles.offlineContent}>
          <View style={styles.offlineHeader}>
            <WifiOff size={18} color={Colors.error} />
            <Text style={styles.offlineTitle}>GOVERNANCE UNAVAILABLE</Text>
          </View>
          <Text style={styles.offlineMessage}>
            Awaiting governance connection
          </Text>
          <View style={styles.retryRow}>
            {isRetrying && (
              <Text style={styles.retryText}>
                Reconnecting...
              </Text>
            )}
            <TouchableOpacity 
              style={styles.retryButton} 
              onPress={manualRetry}
              disabled={isRetrying}
            >
              {isRetrying ? (
                <ActivityIndicator size="small" color={Colors.primary} />
              ) : (
                <>
                  <RefreshCw size={14} color={Colors.primary} />
                  <Text style={styles.retryButtonText}>Retry Now</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <View style={styles.onlineContent}>
          <View style={styles.statusRow}>
            <View style={styles.statusItem}>
              <Text style={styles.statusLabel}>GOVERNANCE</Text>
              <View style={styles.statusValueRow}>
                <CheckCircle size={12} color={Colors.success} />
                <Text style={[styles.statusValue, { color: Colors.success }]}>
                  ONLINE
                </Text>
              </View>
            </View>

            <View style={styles.divider} />

            <View style={styles.statusItem}>
              <Text style={styles.statusLabel}>ENGINE</Text>
              <View style={styles.statusValueRow}>
                {isEngineOnline ? (
                  <>
                    <Server size={12} color={Colors.success} />
                    <Text style={[styles.statusValue, { color: Colors.success }]}>
                      ONLINE
                    </Text>
                  </>
                ) : (
                  <>
                    <AlertCircle size={12} color={Colors.textMuted} />
                    <Text style={[styles.statusValue, { color: Colors.textMuted }]}>
                      OFFLINE
                    </Text>
                  </>
                )}
              </View>
            </View>

            <View style={styles.divider} />

            <View style={styles.statusItem}>
              <Text style={styles.statusLabel}>STATE</Text>
              <View style={styles.statusValueRow}>
                <Animated.View 
                  style={[
                    styles.statusDot, 
                    { 
                      backgroundColor: getGlobalStateColor(governanceStatus?.global_state), 
                      opacity: pulseAnim 
                    }
                  ]} 
                />
                <Text style={[styles.statusValue, { color: getGlobalStateColor(governanceStatus?.global_state) }]}>
                  {getGlobalStateLabel(governanceStatus?.global_state)}
                </Text>
              </View>
            </View>

            <View style={styles.divider} />

            <View style={styles.statusItem}>
              <Text style={styles.statusLabel}>APPROVALS</Text>
              <View style={styles.statusValueRow}>
                <Shield size={12} color={governanceStatus?.pending_approvals ? Colors.warning : Colors.textMuted} />
                <Text style={[
                  styles.statusValue, 
                  { color: governanceStatus?.pending_approvals ? Colors.warning : Colors.textMuted }
                ]}>
                  {governanceStatus?.pending_approvals ?? 0}
                </Text>
              </View>
            </View>
          </View>
          
          {!isEngineOnline && (
            <View style={styles.engineOfflineBanner}>
              <Text style={styles.engineOfflineText}>
                ENGINE OFFLINE (EXPECTED)
              </Text>
            </View>
          )}

          {isAwaitingHumanDecision && (
            <Animated.View style={[styles.waitIndicator, { opacity: waitPulseAnim }]}>
              <UserCircle size={14} color="rgba(160, 180, 220, 0.9)" />
              <Text style={styles.waitIndicatorText}>
                Awaiting human decision
              </Text>
              {pendingApprovalCount > 1 && (
                <View style={styles.waitCountBadge}>
                  <Text style={styles.waitCountText}>{pendingApprovalCount}</Text>
                </View>
              )}
            </Animated.View>
          )}

          <View style={styles.modeToggleRow}>
            <TouchableOpacity 
              style={[
                styles.modeToggle,
                isCalm ? styles.modeToggleCalm : styles.modeToggleAlert
              ]}
              onPress={handleModeToggle}
              activeOpacity={0.7}
            >
              <Animated.View style={[
                styles.modeToggleInner,
                { transform: [{ scale: modeScaleAnim }] }
              ]}>
                {isCalm ? (
                  <Moon size={14} color={Colors.textSecondary} />
                ) : (
                  <Zap size={14} color={Colors.warning} />
                )}
                <Text style={[
                  styles.modeToggleText,
                  isCalm ? styles.modeToggleTextCalm : styles.modeToggleTextAlert
                ]}>
                  {mode}
                </Text>
              </Animated.View>
            </TouchableOpacity>
            {isManualOverride && (
              <View style={styles.manualBadge}>
                <Text style={styles.manualBadgeText}>MANUAL</Text>
              </View>
            )}
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  containerOffline: {
    backgroundColor: Colors.error + '15',
    borderBottomColor: Colors.error + '40',
  },
  offlineContent: {
    padding: 12,
    gap: 8,
  },
  offlineHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  offlineTitle: {
    fontSize: 13,
    fontWeight: '800' as const,
    color: Colors.error,
    letterSpacing: 1,
  },
  offlineMessage: {
    fontSize: 12,
    color: Colors.error,
    opacity: 0.8,
  },
  retryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  retryText: {
    fontSize: 11,
    color: Colors.textMuted,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: Colors.primary + '20',
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  retryButtonText: {
    fontSize: 11,
    fontWeight: '700' as const,
    color: Colors.primary,
  },
  onlineContent: {
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusItem: {
    flex: 1,
    alignItems: 'center',
  },
  statusLabel: {
    fontSize: 8,
    fontWeight: '700' as const,
    color: Colors.textMuted,
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  statusValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusValue: {
    fontSize: 11,
    fontWeight: '700' as const,
    letterSpacing: 0.5,
  },
  divider: {
    width: 1,
    height: 28,
    backgroundColor: Colors.border,
  },
  engineOfflineBanner: {
    marginTop: 8,
    paddingVertical: 4,
    paddingHorizontal: 8,
    backgroundColor: Colors.textMuted + '15',
    borderRadius: 4,
    alignItems: 'center',
  },
  engineOfflineText: {
    fontSize: 9,
    fontWeight: '600' as const,
    color: Colors.textMuted,
    letterSpacing: 0.5,
  },
  waitIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 8,
    paddingVertical: 8,
    paddingHorizontal: 14,
    backgroundColor: 'rgba(140, 160, 200, 0.08)',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(140, 160, 200, 0.15)',
    alignSelf: 'center',
  },
  waitIndicatorText: {
    fontSize: 12,
    fontWeight: '500' as const,
    color: 'rgba(180, 195, 220, 0.9)',
    letterSpacing: 0.3,
  },
  waitCountBadge: {
    backgroundColor: 'rgba(140, 160, 200, 0.2)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    marginLeft: 2,
  },
  waitCountText: {
    fontSize: 10,
    fontWeight: '700' as const,
    color: 'rgba(180, 195, 220, 0.9)',
  },
  modeToggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
    gap: 8,
  },
  modeToggle: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
  },
  modeToggleCalm: {
    backgroundColor: 'rgba(152, 152, 168, 0.08)',
    borderColor: 'rgba(152, 152, 168, 0.2)',
  },
  modeToggleAlert: {
    backgroundColor: Colors.warning + '15',
    borderColor: Colors.warning + '40',
  },
  modeToggleInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  modeToggleText: {
    fontSize: 10,
    fontWeight: '700' as const,
    letterSpacing: 1,
  },
  modeToggleTextCalm: {
    color: Colors.textSecondary,
  },
  modeToggleTextAlert: {
    color: Colors.warning,
  },
  manualBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  manualBadgeText: {
    fontSize: 8,
    fontWeight: '600' as const,
    color: Colors.textMuted,
    letterSpacing: 0.5,
  },
});
