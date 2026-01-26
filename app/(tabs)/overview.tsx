import { StyleSheet, Text, View, ScrollView, RefreshControl, Animated } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { 
  Activity, 
  Wifi, 
  WifiOff,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Clock,
  Shield,
  Server,
  Eye,
  AlertTriangle,
  Cpu,
  Radio
} from 'lucide-react-native';
import { useState, useCallback, useRef, useEffect } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Colors from '@/constants/colors';
import { SystemState, TradingMode } from '@/types/bot';
import { useConnection } from '@/providers/ConnectionProvider';
import StatusBar from '@/components/StatusBar';
import GlassCard, { GlassBadge, GlassDivider } from '@/components/GlassCard';
import GovernanceBrainStatus from '@/components/GovernanceBrainStatus';

const getStateColor = (state?: SystemState) => {
  switch (state) {
    case 'TRADING': return Colors.success;
    case 'PAUSED': return Colors.warning;
    case 'STARTING': return Colors.warning;
    case 'KILLED': return Colors.error;
    case 'ERROR': return Colors.error;
    default: return Colors.textMuted;
  }
};

const getModeColor = (mode?: TradingMode) => {
  switch (mode) {
    case 'LIVE': return Colors.error;
    case 'PAPER': return Colors.warning;
    case 'SHADOW': return Colors.textSecondary;
    default: return Colors.textMuted;
  }
};

const formatUptime = (seconds?: number) => {
  if (seconds === undefined || seconds === null) return '—';
  const hours = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  if (hours > 0) return `${hours}h ${mins}m`;
  return `${mins}m`;
};

const formatCurrency = (value?: number) => {
  if (value === undefined || value === null) return '—';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
};

export default function OverviewScreen() {
  const insets = useSafeAreaInsets();
  const [refreshing, setRefreshing] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  
  const { connectionState, status, refetchStatus } = useConnection();
  const isOnline = connectionState === 'ONLINE';

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 400,
      useNativeDriver: true,
    }).start();
  }, [fadeAnim]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetchStatus();
    setRefreshing(false);
  }, [refetchStatus]);

  const dailyPnL = isOnline ? (status?.dailyPnL ?? 0) : 0;
  const dailyPnLPercent = isOnline ? (status?.dailyPnLPercent ?? 0) : 0;

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#0A0A12', '#050508', '#080810']}
        style={StyleSheet.absoluteFill}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />
      
      <View style={[styles.glowOrb, styles.glowOrb1]} />
      <View style={[styles.glowOrb, styles.glowOrb2]} />

      <Animated.View style={[styles.content, { paddingTop: insets.top, opacity: fadeAnim }]}>
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <View style={styles.logoContainer}>
              <Activity size={24} color={Colors.primary} strokeWidth={2.5} />
            </View>
            <View>
              <Text style={styles.title}>SENTINEL X</Text>
              <Text style={styles.subtitle}>Mobile Monitor</Text>
            </View>
          </View>
          <GlassBadge color={Colors.primary}>
            <View style={styles.badgeContent}>
              <Eye size={12} color={Colors.primary} />
              <Text style={styles.monitorBadgeText}>MONITOR</Text>
            </View>
          </GlassBadge>
        </View>

        <View style={styles.safetyBanner}>
          <LinearGradient
            colors={[Colors.warning + '15', Colors.warning + '08']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={StyleSheet.absoluteFill}
          />
          <AlertTriangle size={14} color={Colors.warning} />
          <Text style={styles.safetyBannerText}>MONITORING & FUNDING ONLY — NO TRADING CONTROL</Text>
        </View>

        <StatusBar />

        <GovernanceBrainStatus />

        <ScrollView 
          style={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl 
              refreshing={refreshing} 
              onRefresh={onRefresh}
              tintColor={Colors.primary}
            />
          }
        >
          <GlassCard style={styles.stateCard} variant="elevated">
            <View style={styles.stateHeader}>
              <View style={styles.stateIndicator}>
                <View style={[styles.stateDot, { backgroundColor: isOnline ? getStateColor(status?.state) : Colors.textMuted }]}>
                  <View style={[styles.stateDotInner, { backgroundColor: isOnline ? getStateColor(status?.state) : Colors.textMuted }]} />
                </View>
                <Text style={[styles.stateText, { color: isOnline ? getStateColor(status?.state) : Colors.textMuted }]}>
                  {isOnline ? (status?.state || 'UNKNOWN') : 'OFFLINE'}
                </Text>
              </View>
              <View style={[styles.modeBadge, { borderColor: isOnline ? getModeColor(status?.mode) : Colors.textMuted }]}>
                <Text style={[styles.modeText, { color: isOnline ? getModeColor(status?.mode) : Colors.textMuted }]}>
                  {isOnline ? (status?.mode || 'N/A') : '—'}
                </Text>
              </View>
            </View>

            <GlassDivider />

            <View style={styles.brokerRow}>
              {isOnline && status?.brokers?.length ? (
                status.brokers.map((broker) => (
                  <View key={broker.id} style={styles.brokerChip}>
                    {broker.connected ? (
                      <Wifi size={12} color={Colors.success} />
                    ) : (
                      <WifiOff size={12} color={Colors.error} />
                    )}
                    <Text style={styles.brokerName}>{broker.name}</Text>
                  </View>
                ))
              ) : (
                <View style={styles.brokerChip}>
                  <Server size={12} color={Colors.textMuted} />
                  <Text style={styles.brokerName}>{isOnline ? 'No brokers' : '—'}</Text>
                </View>
              )}
            </View>
          </GlassCard>

          <View style={styles.sectionHeader}>
            <Cpu size={14} color={Colors.textMuted} />
            <Text style={styles.sectionTitle}>ENGINE STATUS</Text>
          </View>

          <GlassCard style={styles.engineCard} variant="primary">
            <View style={styles.engineRow}>
              <Text style={styles.engineLabel}>Loop Tick</Text>
              <View style={styles.engineValue}>
                <Radio size={12} color={isOnline ? Colors.success : Colors.textMuted} />
                <Text style={[styles.engineValueText, { color: isOnline ? Colors.success : Colors.textMuted }]}>
                  {isOnline ? 'LIVE' : '—'}
                </Text>
              </View>
            </View>
            <View style={styles.engineRow}>
              <Text style={styles.engineLabel}>Heartbeat Age</Text>
              <Text style={styles.engineValueText}>
                {isOnline && status?.lastHeartbeat ? `${Math.floor((Date.now() - new Date(status.lastHeartbeat).getTime()) / 1000)}s` : '—'}
              </Text>
            </View>
            <View style={styles.engineRow}>
              <Text style={styles.engineLabel}>Trading Window</Text>
              <Text style={[styles.engineValueText, { color: isOnline && status?.tradingWindowActive ? Colors.success : Colors.textMuted }]}>
                {isOnline ? (status?.tradingWindowActive ? 'ACTIVE' : 'CLOSED') : '—'}
              </Text>
            </View>
            <View style={[styles.engineRow, styles.lastRow]}>
              <Text style={styles.engineLabel}>Shadow Mode</Text>
              <Text style={[styles.engineValueText, { color: isOnline && status?.shadowTradingEnabled ? Colors.primary : Colors.textMuted }]}>
                {isOnline ? (status?.shadowTradingEnabled ? 'ENABLED' : 'DISABLED') : '—'}
              </Text>
            </View>
          </GlassCard>

          <View style={styles.sectionHeader}>
            <DollarSign size={14} color={Colors.textMuted} />
            <Text style={styles.sectionTitle}>PORTFOLIO (SIMULATED)</Text>
          </View>

          <View style={styles.metricsGrid}>
            <GlassCard style={styles.metricCard} variant="subtle">
              <Text style={styles.metricLabel}>EQUITY</Text>
              <Text style={styles.metricValue}>
                {isOnline ? formatCurrency(status?.equity) : '—'}
              </Text>
            </GlassCard>
            <GlassCard style={styles.metricCard} variant="subtle">
              <Text style={styles.metricLabel}>DAILY P&L</Text>
              {isOnline ? (
                <>
                  <View style={styles.pnlRow}>
                    {dailyPnL >= 0 ? (
                      <TrendingUp size={16} color={Colors.success} />
                    ) : (
                      <TrendingDown size={16} color={Colors.error} />
                    )}
                    <Text style={[
                      styles.metricValue,
                      { color: dailyPnL >= 0 ? Colors.success : Colors.error }
                    ]}>
                      {dailyPnL >= 0 ? '+' : ''}{formatCurrency(dailyPnL)}
                    </Text>
                  </View>
                  <Text style={[
                    styles.metricPercent,
                    { color: dailyPnLPercent >= 0 ? Colors.success : Colors.error }
                  ]}>
                    {dailyPnLPercent >= 0 ? '+' : ''}{dailyPnLPercent.toFixed(2)}%
                  </Text>
                </>
              ) : (
                <Text style={styles.metricValue}>—</Text>
              )}
            </GlassCard>
          </View>

          <View style={styles.metricsGrid}>
            <GlassCard style={styles.metricCard} variant="subtle">
              <Text style={styles.metricLabel}>OPEN POSITIONS</Text>
              <View style={styles.positionRow}>
                <DollarSign size={18} color={isOnline ? Colors.primary : Colors.textMuted} />
                <Text style={styles.metricValue}>
                  {isOnline ? (status?.openPositions ?? 0) : '—'}
                </Text>
              </View>
            </GlassCard>
            <GlassCard style={styles.metricCard} variant="subtle">
              <Text style={styles.metricLabel}>UPTIME</Text>
              <View style={styles.positionRow}>
                <Clock size={18} color={Colors.textSecondary} />
                <Text style={styles.metricValue}>
                  {isOnline ? formatUptime(status?.uptime) : '—'}
                </Text>
              </View>
            </GlassCard>
          </View>

          <GlassCard style={styles.killSwitchCard} variant="primary">
            <View style={styles.killSwitchHeader}>
              <Shield size={18} color={isOnline && status?.killSwitchArmed ? Colors.error : Colors.textMuted} />
              <Text style={styles.killSwitchLabel}>KILL-SWITCH STATUS</Text>
            </View>
            <Text style={[
              styles.killSwitchStatus,
              { color: isOnline ? (status?.killSwitchArmed ? Colors.error : Colors.success) : Colors.textMuted }
            ]}>
              {isOnline ? (status?.killSwitchArmed ? 'ARMED' : 'READY') : '—'}
            </Text>
          </GlassCard>

          <GlassCard style={styles.readOnlyNotice} variant="subtle">
            <Eye size={16} color={Colors.textMuted} />
            <Text style={styles.readOnlyText}>
              This is a read-only view. Trading controls are not available on mobile.
            </Text>
          </GlassCard>

          <View style={{ height: 100 }} />
        </ScrollView>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  glowOrb: {
    position: 'absolute',
    borderRadius: 999,
    opacity: 0.15,
  },
  glowOrb1: {
    width: 300,
    height: 300,
    top: -100,
    right: -100,
    backgroundColor: Colors.primary,
  },
  glowOrb2: {
    width: 200,
    height: 200,
    bottom: 100,
    left: -80,
    backgroundColor: Colors.primary,
  },
  content: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  logoContainer: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: Colors.primary + '15',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.primary + '30',
  },
  title: {
    fontSize: 22,
    fontWeight: '800' as const,
    color: Colors.text,
    letterSpacing: 2,
  },
  subtitle: {
    fontSize: 11,
    color: Colors.textMuted,
    letterSpacing: 0.5,
    marginTop: 2,
  },
  badgeContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  monitorBadgeText: {
    fontSize: 9,
    fontWeight: '800' as const,
    color: Colors.primary,
    letterSpacing: 1,
  },
  safetyBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 10,
    marginHorizontal: 16,
    borderRadius: 10,
    overflow: 'hidden',
  },
  safetyBannerText: {
    fontSize: 10,
    fontWeight: '700' as const,
    color: Colors.warning,
    letterSpacing: 0.5,
  },
  scrollContent: {
    flex: 1,
    padding: 16,
  },
  stateCard: {
    marginBottom: 20,
  },
  stateHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  stateIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  stateDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    opacity: 0.3,
  },
  stateDotInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  stateText: {
    fontSize: 20,
    fontWeight: '800' as const,
    letterSpacing: 2,
  },
  modeBadge: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  modeText: {
    fontSize: 12,
    fontWeight: '800' as const,
    letterSpacing: 1,
  },
  brokerRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  brokerChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.05)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  brokerName: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontWeight: '600' as const,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '700' as const,
    color: Colors.textMuted,
    letterSpacing: 1.5,
  },
  engineCard: {
    marginBottom: 20,
  },
  engineRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  lastRow: {
    borderBottomWidth: 0,
  },
  engineLabel: {
    fontSize: 13,
    color: Colors.textSecondary,
    fontWeight: '500' as const,
  },
  engineValue: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  engineValueText: {
    fontSize: 13,
    fontWeight: '700' as const,
    color: Colors.text,
  },
  metricsGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  metricCard: {
    flex: 1,
  },
  metricLabel: {
    fontSize: 10,
    fontWeight: '700' as const,
    color: Colors.textMuted,
    letterSpacing: 1.5,
    marginBottom: 8,
  },
  metricValue: {
    fontSize: 22,
    fontWeight: '700' as const,
    color: Colors.text,
  },
  pnlRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metricPercent: {
    fontSize: 13,
    fontWeight: '600' as const,
    marginTop: 4,
  },
  positionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  killSwitchCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  killSwitchHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  killSwitchLabel: {
    fontSize: 12,
    fontWeight: '700' as const,
    color: Colors.textMuted,
    letterSpacing: 1,
  },
  killSwitchStatus: {
    fontSize: 14,
    fontWeight: '800' as const,
    letterSpacing: 1,
  },
  readOnlyNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  readOnlyText: {
    flex: 1,
    fontSize: 12,
    color: Colors.textMuted,
    lineHeight: 18,
  },
});
