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
  Eye,
  Cpu,
  Radio,
  BarChart3,
  Target,
  Gauge,
  BookOpen,
  Trophy,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
} from 'lucide-react-native';
import { useState, useCallback, useRef, useEffect } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Colors from '@/constants/colors';
import { useEngineMonitor } from '@/providers/EngineMonitorProvider';
import GlassCard, { GlassBadge, GlassDivider } from '@/components/GlassCard';

const formatCurrency = (value?: number | null) => {
  if (value === undefined || value === null) return '—';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
};

const formatPercent = (value?: number | null) => {
  if (value === undefined || value === null) return '—';
  return `${(value * 100).toFixed(1)}%`;
};

const formatNumber = (value?: number | null, decimals = 4) => {
  if (value === undefined || value === null) return '—';
  return value.toFixed(decimals);
};

const getSignalIcon = (signal?: string) => {
  switch (signal) {
    case 'LONG': return ArrowUpRight;
    case 'SHORT': return ArrowDownRight;
    default: return Minus;
  }
};

const getSignalColor = (signal?: string) => {
  switch (signal) {
    case 'LONG': return Colors.profit;
    case 'SHORT': return Colors.loss;
    default: return Colors.textMuted;
  }
};

const getPnlColor = (value?: number | null) => {
  if (value === undefined || value === null) return Colors.textMuted;
  if (value > 0) return Colors.profit;
  if (value < 0) return Colors.loss;
  return Colors.textSecondary;
};

const getOutcomeColor = (outcome?: string) => {
  switch (outcome) {
    case 'WIN': return Colors.profit;
    case 'LOSS': return Colors.loss;
    default: return Colors.textMuted;
  }
};

export default function OverviewScreen() {
  const insets = useSafeAreaInsets();
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  const {
    connectionState,
    status,
    heartbeat,
    portfolio,
    metrics,
    strategy,
    heartbeatAge,
    lastError,
    refresh,
  } = useEngineMonitor();

  const isOnline = connectionState === 'ONLINE';

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();
  }, [fadeAnim]);

  useEffect(() => {
    if (isOnline) {
      const loop = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 0.4,
            duration: 1200,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1200,
            useNativeDriver: true,
          }),
        ])
      );
      loop.start();
      return () => loop.stop();
    } else {
      pulseAnim.setValue(1);
    }
  }, [isOnline, pulseAnim]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  }, [refresh]);

  const SignalIcon = getSignalIcon(strategy?.last_signal);

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#050508', '#0A0A10', '#060608']}
        style={StyleSheet.absoluteFill}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />

      <Animated.View style={[styles.content, { paddingTop: insets.top, opacity: fadeAnim }]}>
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <View style={styles.logoContainer}>
              <Text style={styles.logoX}>X</Text>
              {isOnline && (
                <Animated.View style={[styles.logoPulse, { opacity: pulseAnim }]} />
              )}
            </View>
            <View>
              <Text style={styles.title}>SENTINEL X</Text>
              <Text style={styles.subtitle}>v0.1 — Monitor Only</Text>
            </View>
          </View>
          <GlassBadge color={isOnline ? Colors.profit : Colors.offline}>
            <View style={styles.badgeContent}>
              <Eye size={11} color={isOnline ? Colors.profit : Colors.offline} />
              <Text style={[styles.monitorBadgeText, { color: isOnline ? Colors.profit : Colors.offline }]}>
                READ-ONLY
              </Text>
            </View>
          </GlassBadge>
        </View>

        <ScrollView
          style={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollInner}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={Colors.primary}
            />
          }
        >
          <GlassCard style={styles.statusBar} variant="elevated">
            <View style={styles.statusRow}>
              <View style={styles.statusItem}>
                <Text style={styles.statusLabel}>ENGINE</Text>
                <View style={styles.statusValueRow}>
                  <View style={[styles.statusDot, { backgroundColor: isOnline ? Colors.profit : Colors.offline }]} />
                  <Text style={[styles.statusValue, { color: isOnline ? Colors.profit : Colors.offline }]}>
                    {isOnline ? 'ONLINE' : 'OFFLINE'}
                  </Text>
                </View>
              </View>

              <View style={styles.statusDivider} />

              <View style={styles.statusItem}>
                <Text style={styles.statusLabel}>MODE</Text>
                <Text style={[styles.statusValue, { color: Colors.shadow }]}>
                  {isOnline ? (status?.mode ?? 'SHADOW') : '—'}
                </Text>
              </View>

              <View style={styles.statusDivider} />

              <View style={styles.statusItem}>
                <Text style={styles.statusLabel}>GOVERNANCE</Text>
                <Text style={styles.statusValueSmall}>
                  {isOnline ? (status?.governance ?? 'Standalone v0.1') : '—'}
                </Text>
              </View>

              <View style={styles.statusDivider} />

              <View style={styles.statusItem}>
                <Text style={styles.statusLabel}>HEARTBEAT</Text>
                <View style={styles.statusValueRow}>
                  <Radio size={10} color={isOnline ? Colors.profit : Colors.offline} />
                  <Text style={[styles.statusValue, { color: isOnline ? Colors.text : Colors.offline }]}>
                    {heartbeatAge !== null ? `${heartbeatAge}s` : '—'}
                  </Text>
                </View>
              </View>
            </View>
          </GlassCard>

          {!isOnline && (
            <GlassCard style={styles.offlineCard} variant="subtle">
              <WifiOff size={28} color={Colors.offline} />
              <Text style={styles.offlineTitle}>Engine Offline — Awaiting Heartbeat</Text>
              <Text style={styles.offlineSubtitle}>
                {lastError ?? 'Connecting to local engine at http://10.0.0.23:8000'}
              </Text>
              <View style={styles.offlinePulseRow}>
                <Animated.View style={[styles.offlinePulseDot, { opacity: pulseAnim }]} />
                <Text style={styles.offlinePulseText}>Polling every 3s</Text>
              </View>
            </GlassCard>
          )}

          {isOnline && (
            <>
              <View style={styles.sectionHeader}>
                <Cpu size={13} color={Colors.textMuted} />
                <Text style={styles.sectionTitle}>ENGINE</Text>
              </View>

              <GlassCard style={styles.engineCard} variant="primary">
                <View style={styles.engineGrid}>
                  <View style={styles.engineCell}>
                    <Text style={styles.engineLabel}>Timeframe</Text>
                    <Text style={styles.engineValue}>{strategy?.timeframe ?? '—'}</Text>
                  </View>
                  <View style={styles.engineCell}>
                    <Text style={styles.engineLabel}>Last Signal</Text>
                    <View style={styles.signalRow}>
                      <SignalIcon size={16} color={getSignalColor(strategy?.last_signal)} />
                      <Text style={[styles.engineValue, { color: getSignalColor(strategy?.last_signal) }]}>
                        {strategy?.last_signal ?? '—'}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.engineCell}>
                    <Text style={styles.engineLabel}>Confidence</Text>
                    <View style={styles.confidenceContainer}>
                      <Text style={styles.engineValueLarge}>
                        {strategy?.confidence !== undefined ? `${(strategy.confidence * 100).toFixed(0)}%` : '—'}
                      </Text>
                      {strategy?.confidence !== undefined && (
                        <View style={styles.confidenceBar}>
                          <View
                            style={[
                              styles.confidenceFill,
                              {
                                width: `${Math.min(strategy.confidence * 100, 100)}%` as `${number}%`,
                                backgroundColor: strategy.confidence >= 0.7 ? Colors.profit : strategy.confidence >= 0.4 ? Colors.shadow : Colors.loss,
                              },
                            ]}
                          />
                        </View>
                      )}
                    </View>
                  </View>
                  <View style={styles.engineCell}>
                    <Text style={styles.engineLabel}>Adaptive Threshold</Text>
                    <Text style={styles.engineValue}>
                      {formatNumber(strategy?.adaptive_threshold)}
                    </Text>
                  </View>
                  <View style={[styles.engineCell, styles.engineCellFull]}>
                    <Text style={styles.engineLabel}>Current Multiplier</Text>
                    <Text style={styles.engineValue}>
                      {formatNumber(strategy?.current_multiplier, 2)}
                    </Text>
                  </View>
                </View>
              </GlassCard>

              <View style={styles.sectionHeader}>
                <DollarSign size={13} color={Colors.textMuted} />
                <Text style={styles.sectionTitle}>PORTFOLIO (SIMULATED)</Text>
              </View>

              <GlassCard style={styles.portfolioCard} variant="primary">
                <View style={styles.portfolioMain}>
                  <Text style={styles.portfolioCapitalLabel}>CAPITAL</Text>
                  <Text style={styles.portfolioCapitalValue}>
                    {formatCurrency(portfolio?.capital)}
                  </Text>
                </View>

                <GlassDivider />

                <View style={styles.portfolioGrid}>
                  <View style={styles.portfolioCell}>
                    <Text style={styles.portfolioLabel}>Open Position</Text>
                    <Text style={styles.portfolioValue}>
                      {formatCurrency(portfolio?.open_position_size)}
                    </Text>
                  </View>
                  <View style={styles.portfolioCell}>
                    <Text style={styles.portfolioLabel}>Entry Price</Text>
                    <Text style={styles.portfolioValue}>
                      {formatCurrency(portfolio?.entry_price)}
                    </Text>
                  </View>
                </View>

                <View style={styles.portfolioGrid}>
                  <View style={styles.portfolioCell}>
                    <Text style={styles.portfolioLabel}>Unrealized P&L</Text>
                    <View style={styles.pnlRow}>
                      {(portfolio?.unrealized_pnl ?? 0) >= 0 ? (
                        <TrendingUp size={14} color={getPnlColor(portfolio?.unrealized_pnl)} />
                      ) : (
                        <TrendingDown size={14} color={getPnlColor(portfolio?.unrealized_pnl)} />
                      )}
                      <Text style={[styles.portfolioValue, { color: getPnlColor(portfolio?.unrealized_pnl) }]}>
                        {formatCurrency(portfolio?.unrealized_pnl)}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.portfolioCell}>
                    <Text style={styles.portfolioLabel}>Realized P&L</Text>
                    <View style={styles.pnlRow}>
                      {(portfolio?.realized_pnl ?? 0) >= 0 ? (
                        <TrendingUp size={14} color={getPnlColor(portfolio?.realized_pnl)} />
                      ) : (
                        <TrendingDown size={14} color={getPnlColor(portfolio?.realized_pnl)} />
                      )}
                      <Text style={[styles.portfolioValue, { color: getPnlColor(portfolio?.realized_pnl) }]}>
                        {formatCurrency(portfolio?.realized_pnl)}
                      </Text>
                    </View>
                  </View>
                </View>
              </GlassCard>

              <View style={styles.sectionHeader}>
                <BookOpen size={13} color={Colors.textMuted} />
                <Text style={styles.sectionTitle}>LEARNING</Text>
              </View>

              <GlassCard style={styles.learningCard} variant="primary">
                <View style={styles.learningGrid}>
                  <View style={styles.learningCell}>
                    <Gauge size={16} color={Colors.textSecondary} />
                    <Text style={styles.learningLabel}>Threshold</Text>
                    <Text style={styles.learningValue}>
                      {formatNumber(metrics?.current_threshold)}
                    </Text>
                  </View>
                  <View style={styles.learningCell}>
                    <BarChart3 size={16} color={Colors.textSecondary} />
                    <Text style={styles.learningLabel}>Multiplier</Text>
                    <Text style={styles.learningValue}>
                      {formatNumber(metrics?.current_multiplier, 2)}
                    </Text>
                  </View>
                </View>

                <GlassDivider />

                <View style={styles.learningGrid}>
                  <View style={styles.learningCell}>
                    <Target size={16} color={getOutcomeColor(metrics?.last_trade_outcome)} />
                    <Text style={styles.learningLabel}>Last Trade</Text>
                    <Text style={[styles.learningValue, { color: getOutcomeColor(metrics?.last_trade_outcome) }]}>
                      {metrics?.last_trade_outcome ?? '—'}
                    </Text>
                  </View>
                  <View style={styles.learningCell}>
                    <Trophy size={16} color={metrics?.rolling_win_rate !== null ? Colors.shadow : Colors.textMuted} />
                    <Text style={styles.learningLabel}>Win Rate</Text>
                    <Text style={[styles.learningValue, { color: metrics?.rolling_win_rate !== null ? Colors.shadow : Colors.textMuted }]}>
                      {metrics?.rolling_win_rate !== null ? formatPercent(metrics?.rolling_win_rate) : 'N/A'}
                    </Text>
                  </View>
                </View>
              </GlassCard>
            </>
          )}

          <GlassCard style={styles.readOnlyNotice} variant="subtle">
            <Eye size={14} color={Colors.textMuted} />
            <Text style={styles.readOnlyText}>
              Zero trading controls. Zero parameter editing. Zero execution authority. This app monitors only.
            </Text>
          </GlassCard>

          <View style={{ height: 120 }} />
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
  content: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  logoContainer: {
    width: 42,
    height: 42,
    borderRadius: 13,
    backgroundColor: Colors.primary + '18',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.primary + '35',
  },
  logoX: {
    fontSize: 22,
    fontWeight: '900' as const,
    color: Colors.primary,
    letterSpacing: -1,
  },
  logoPulse: {
    position: 'absolute',
    width: 42,
    height: 42,
    borderRadius: 13,
    borderWidth: 1.5,
    borderColor: Colors.primary + '50',
  },
  title: {
    fontSize: 20,
    fontWeight: '800' as const,
    color: Colors.text,
    letterSpacing: 2,
  },
  subtitle: {
    fontSize: 10,
    color: Colors.textMuted,
    letterSpacing: 0.5,
    marginTop: 1,
  },
  badgeContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  monitorBadgeText: {
    fontSize: 8,
    fontWeight: '800' as const,
    letterSpacing: 1,
  },
  scrollContent: {
    flex: 1,
  },
  scrollInner: {
    padding: 16,
    paddingTop: 8,
  },
  statusBar: {
    marginBottom: 16,
    paddingVertical: 14,
    paddingHorizontal: 12,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  statusItem: {
    flex: 1,
    alignItems: 'center',
    gap: 6,
  },
  statusLabel: {
    fontSize: 8,
    fontWeight: '700' as const,
    color: Colors.textMuted,
    letterSpacing: 1.2,
  },
  statusValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusValue: {
    fontSize: 11,
    fontWeight: '800' as const,
    color: Colors.text,
    letterSpacing: 0.5,
  },
  statusValueSmall: {
    fontSize: 9,
    fontWeight: '700' as const,
    color: Colors.textSecondary,
    letterSpacing: 0.3,
    textAlign: 'center' as const,
  },
  statusDivider: {
    width: 1,
    height: 28,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  offlineCard: {
    alignItems: 'center',
    paddingVertical: 40,
    marginBottom: 16,
    gap: 12,
  },
  offlineTitle: {
    fontSize: 15,
    fontWeight: '700' as const,
    color: Colors.offline,
    letterSpacing: 0.5,
    textAlign: 'center' as const,
  },
  offlineSubtitle: {
    fontSize: 12,
    color: Colors.textMuted,
    textAlign: 'center' as const,
    lineHeight: 18,
    paddingHorizontal: 20,
  },
  offlinePulseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
  },
  offlinePulseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.offline,
  },
  offlinePulseText: {
    fontSize: 10,
    color: Colors.textMuted,
    letterSpacing: 0.5,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 10,
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: 10,
    fontWeight: '700' as const,
    color: Colors.textMuted,
    letterSpacing: 1.5,
  },
  engineCard: {
    marginBottom: 16,
  },
  engineGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  engineCell: {
    width: '50%',
    paddingVertical: 10,
    paddingHorizontal: 4,
  },
  engineCellFull: {
    width: '100%',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.04)',
    marginTop: 4,
    paddingTop: 14,
  },
  engineLabel: {
    fontSize: 10,
    fontWeight: '600' as const,
    color: Colors.textMuted,
    letterSpacing: 0.8,
    marginBottom: 6,
  },
  engineValue: {
    fontSize: 15,
    fontWeight: '700' as const,
    color: Colors.text,
  },
  engineValueLarge: {
    fontSize: 20,
    fontWeight: '800' as const,
    color: Colors.text,
  },
  signalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  confidenceContainer: {
    gap: 8,
  },
  confidenceBar: {
    height: 3,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  confidenceFill: {
    height: '100%',
    borderRadius: 2,
  },
  portfolioCard: {
    marginBottom: 16,
  },
  portfolioMain: {
    alignItems: 'center',
    paddingBottom: 4,
  },
  portfolioCapitalLabel: {
    fontSize: 9,
    fontWeight: '700' as const,
    color: Colors.textMuted,
    letterSpacing: 1.5,
    marginBottom: 4,
  },
  portfolioCapitalValue: {
    fontSize: 28,
    fontWeight: '800' as const,
    color: Colors.text,
    letterSpacing: -0.5,
  },
  portfolioGrid: {
    flexDirection: 'row',
  },
  portfolioCell: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 4,
  },
  portfolioLabel: {
    fontSize: 10,
    fontWeight: '600' as const,
    color: Colors.textMuted,
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  portfolioValue: {
    fontSize: 15,
    fontWeight: '700' as const,
    color: Colors.text,
  },
  pnlRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  learningCard: {
    marginBottom: 16,
  },
  learningGrid: {
    flexDirection: 'row',
  },
  learningCell: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    gap: 6,
  },
  learningLabel: {
    fontSize: 10,
    fontWeight: '600' as const,
    color: Colors.textMuted,
    letterSpacing: 0.5,
  },
  learningValue: {
    fontSize: 18,
    fontWeight: '800' as const,
    color: Colors.text,
  },
  readOnlyNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 8,
  },
  readOnlyText: {
    flex: 1,
    fontSize: 11,
    color: Colors.textMuted,
    lineHeight: 16,
  },
});
