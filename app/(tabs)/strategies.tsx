import { StyleSheet, Text, View, ScrollView, ActivityIndicator, TouchableOpacity, Animated } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useQuery } from '@tanstack/react-query';
import { 
  TrendingUp, 
  TrendingDown, 
  Zap, 
  ChevronRight,
  Activity,
  Target,
  WifiOff,
  Eye,
  AlertTriangle,
  Clock
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useState, useRef, useEffect } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Colors from '@/constants/colors';
import { api } from '@/lib/api';
import { StrategyStatus } from '@/types/bot';
import { useConnection } from '@/providers/ConnectionProvider';
import StatusBar from '@/components/StatusBar';
import GlassCard, { GlassBadge, GlassDivider } from '@/components/GlassCard';

const getStatusColor = (status: StrategyStatus) => {
  switch (status) {
    case 'ACTIVE': return Colors.success;
    case 'DISABLED': return Colors.textMuted;
    case 'AUTO_DISABLED': return Colors.error;
    case 'COOLDOWN': return Colors.warning;
    default: return Colors.textMuted;
  }
};

const getHealthColor = (score: number) => {
  if (score >= 80) return Colors.success;
  if (score >= 50) return Colors.warning;
  return Colors.error;
};

export default function StrategiesScreen() {
  const insets = useSafeAreaInsets();
  const [expandedStrategy, setExpandedStrategy] = useState<string | null>(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const { connectionState } = useConnection();
  const isOnline = connectionState === 'ONLINE';
  const isOffline = connectionState === 'OFFLINE' || connectionState === 'CONNECTING';

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 400,
      useNativeDriver: true,
    }).start();
  }, [fadeAnim]);

  const { data: strategies, isLoading } = useQuery({
    queryKey: ['strategies'],
    queryFn: api.getStrategies,
    refetchInterval: isOnline ? 10000 : false,
    enabled: isOnline,
  });

  const toggleExpand = (id: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setExpandedStrategy(expandedStrategy === id ? null : id);
  };

  const activeCount = strategies?.filter(s => s.status === 'ACTIVE').length ?? 0;
  const totalPnL = strategies?.reduce((sum, s) => sum + s.pnl, 0) ?? 0;

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
              <Zap size={22} color={Colors.primary} strokeWidth={2.5} />
            </View>
            <Text style={styles.headerTitle}>STRATEGIES</Text>
          </View>
          <View style={styles.headerRight}>
            <GlassBadge>
              <View style={styles.badgeContent}>
                <Eye size={10} color={Colors.textMuted} />
                <Text style={styles.readOnlyBadgeText}>READ-ONLY</Text>
              </View>
            </GlassBadge>
            {isLoading && <ActivityIndicator size="small" color={Colors.primary} />}
          </View>
        </View>

        <View style={styles.safetyBanner}>
          <LinearGradient
            colors={[Colors.warning + '15', Colors.warning + '08']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={StyleSheet.absoluteFill}
          />
          <AlertTriangle size={14} color={Colors.warning} />
          <Text style={styles.safetyBannerText}>Strategy controls disabled on mobile</Text>
        </View>

        <StatusBar />

        <View style={styles.summaryRow}>
          <GlassCard style={styles.summaryCard} variant="elevated">
            <Text style={styles.summaryLabel}>ACTIVE</Text>
            <Text style={styles.summaryValue}>
              {isOnline ? `${activeCount}/${strategies?.length ?? 0}` : '—'}
            </Text>
          </GlassCard>
          <GlassCard style={styles.summaryCard} variant="elevated">
            <Text style={styles.summaryLabel}>TOTAL P&L</Text>
            <Text style={[
              styles.summaryValue,
              { color: isOnline ? (totalPnL >= 0 ? Colors.success : Colors.error) : Colors.textMuted }
            ]}>
              {isOnline ? `${totalPnL >= 0 ? '+' : ''}$${totalPnL.toFixed(0)}` : '—'}
            </Text>
          </GlassCard>
        </View>

        <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {isOffline ? (
            <View style={styles.offlineState}>
              <WifiOff size={48} color={Colors.textMuted} />
              <Text style={styles.offlineText}>Strategies unavailable</Text>
              <Text style={styles.offlineSubtext}>Connect to Sentinel X to view strategies</Text>
            </View>
          ) : isLoading && !strategies ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={Colors.primary} />
              <Text style={styles.loadingText}>Loading strategies...</Text>
            </View>
          ) : strategies && strategies.length > 0 ? (
            <>
              {strategies.map((strategy) => (
                <GlassCard key={strategy.id} style={styles.strategyCard} variant="primary" noPadding>
                  <TouchableOpacity 
                    style={styles.strategyHeader}
                    onPress={() => toggleExpand(strategy.id)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.strategyTitleRow}>
                      <View style={[styles.strategyIcon, { backgroundColor: strategy.status === 'ACTIVE' ? Colors.primary + '20' : 'rgba(255,255,255,0.05)' }]}>
                        <Zap 
                          size={18} 
                          color={strategy.status === 'ACTIVE' ? Colors.primary : Colors.textMuted} 
                          fill={strategy.status === 'ACTIVE' ? Colors.primary : 'transparent'}
                        />
                      </View>
                      <View style={styles.strategyInfo}>
                        <Text style={styles.strategyName}>{strategy.name}</Text>
                        <View style={styles.healthRow}>
                          <Activity size={12} color={getHealthColor(strategy.healthScore)} />
                          <Text style={[styles.healthText, { color: getHealthColor(strategy.healthScore) }]}>
                            {strategy.healthScore}% health
                          </Text>
                        </View>
                      </View>
                    </View>
                    <View style={styles.strategyRight}>
                      <View style={[styles.statusBadge, { backgroundColor: getStatusColor(strategy.status) + '15', borderColor: getStatusColor(strategy.status) + '40' }]}>
                        <Text style={[styles.statusBadgeText, { color: getStatusColor(strategy.status) }]}>
                          {strategy.status}
                        </Text>
                      </View>
                      <ChevronRight 
                        size={18} 
                        color={Colors.textMuted} 
                        style={{ transform: [{ rotate: expandedStrategy === strategy.id ? '90deg' : '0deg' }] }}
                      />
                    </View>
                  </TouchableOpacity>

                  <View style={styles.metricsRow}>
                    <View style={styles.metricItem}>
                      <Text style={styles.metricLabel}>WIN RATE</Text>
                      <Text style={styles.metricValue}>{((strategy.winRate ?? 0) * 100).toFixed(1)}%</Text>
                    </View>
                    <View style={styles.metricItem}>
                      <Text style={styles.metricLabel}>SHARPE</Text>
                      <Text style={styles.metricValue}>{(strategy.sharpe ?? 0).toFixed(2)}</Text>
                    </View>
                    <View style={styles.metricItem}>
                      <Text style={styles.metricLabel}>DRAWDOWN</Text>
                      <Text style={[styles.metricValue, { color: Colors.error }]}>
                        -{(strategy.drawdown ?? 0).toFixed(1)}%
                      </Text>
                    </View>
                    <View style={styles.metricItem}>
                      <Text style={styles.metricLabel}>P&L</Text>
                      <View style={styles.pnlContainer}>
                        {strategy.pnl >= 0 ? (
                          <TrendingUp size={14} color={Colors.success} />
                        ) : (
                          <TrendingDown size={14} color={Colors.error} />
                        )}
                        <Text style={[
                          styles.metricValue,
                          { color: strategy.pnl >= 0 ? Colors.success : Colors.error }
                        ]}>
                          {(strategy.pnlPercent ?? 0) >= 0 ? '+' : ''}{(strategy.pnlPercent ?? 0).toFixed(1)}%
                        </Text>
                      </View>
                    </View>
                  </View>

                  {strategy.autoDisableReason && (
                    <View style={styles.warningBanner}>
                      <AlertTriangle size={14} color={Colors.error} />
                      <Text style={styles.warningText}>{strategy.autoDisableReason}</Text>
                    </View>
                  )}

                  {expandedStrategy === strategy.id && (
                    <View style={styles.expandedSection}>
                      <GlassDivider />
                      <View style={styles.detailsGrid}>
                        <View style={styles.detailItem}>
                          <Text style={styles.detailLabel}>TRADES</Text>
                          <Text style={styles.detailValue}>{strategy.tradesCount}</Text>
                        </View>
                        <View style={styles.detailItem}>
                          <Text style={styles.detailLabel}>CAPITAL</Text>
                          <Text style={styles.detailValue}>{((strategy.capitalAllocation ?? 0) * 100).toFixed(0)}%</Text>
                        </View>
                        <View style={styles.detailItem}>
                          <Text style={styles.detailLabel}>EXPECTANCY</Text>
                          <Text style={styles.detailValue}>${(strategy.expectancy ?? 0).toFixed(2)}</Text>
                        </View>
                        <View style={styles.detailItem}>
                          <Text style={styles.detailLabel}>MAX DD</Text>
                          <Text style={[styles.detailValue, { color: Colors.error }]}>
                            -{(strategy.maxDrawdown ?? 0).toFixed(1)}%
                          </Text>
                        </View>
                      </View>

                      {strategy.lastTrade && (
                        <View style={styles.lastTradeRow}>
                          <Target size={14} color={Colors.textMuted} />
                          <Text style={styles.lastTradeText}>
                            Last trade: {new Date(strategy.lastTrade).toLocaleString()}
                          </Text>
                        </View>
                      )}

                      <View style={styles.controlsDisabledNotice}>
                        <Clock size={14} color={Colors.textMuted} />
                        <Text style={styles.controlsDisabledText}>
                          Strategy controls (enable/disable/reset) are only available on desktop
                        </Text>
                      </View>
                    </View>
                  )}
                </GlassCard>
              ))}
            </>
          ) : (
            <View style={styles.emptyState}>
              <Zap size={48} color={Colors.textMuted} />
              <Text style={styles.emptyText}>No strategies configured</Text>
              <Text style={styles.emptySubtext}>Strategies will appear here once added</Text>
            </View>
          )}

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
    opacity: 0.12,
  },
  glowOrb1: {
    width: 250,
    height: 250,
    top: 50,
    right: -80,
    backgroundColor: Colors.primary,
  },
  glowOrb2: {
    width: 180,
    height: 180,
    bottom: 150,
    left: -60,
    backgroundColor: Colors.success,
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
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: Colors.primary + '15',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.primary + '30',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800' as const,
    color: Colors.text,
    letterSpacing: 2,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  badgeContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  readOnlyBadgeText: {
    fontSize: 8,
    fontWeight: '700' as const,
    color: Colors.textMuted,
    letterSpacing: 0.5,
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
    fontSize: 11,
    fontWeight: '600' as const,
    color: Colors.warning,
  },
  summaryRow: {
    flexDirection: 'row',
    gap: 12,
    padding: 16,
    paddingBottom: 8,
  },
  summaryCard: {
    flex: 1,
  },
  summaryLabel: {
    fontSize: 10,
    fontWeight: '700' as const,
    color: Colors.textMuted,
    letterSpacing: 1,
    marginBottom: 4,
  },
  summaryValue: {
    fontSize: 22,
    fontWeight: '800' as const,
    color: Colors.text,
  },
  scrollContent: {
    flex: 1,
    padding: 16,
    paddingTop: 8,
  },
  offlineState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 80,
    paddingHorizontal: 40,
    gap: 12,
  },
  offlineText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.textSecondary,
  },
  offlineSubtext: {
    fontSize: 13,
    color: Colors.textMuted,
    textAlign: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
    gap: 16,
  },
  loadingText: {
    fontSize: 14,
    color: Colors.textMuted,
  },
  strategyCard: {
    marginBottom: 12,
  },
  strategyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },
  strategyTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  strategyIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  strategyInfo: {
    flex: 1,
  },
  strategyName: {
    fontSize: 15,
    fontWeight: '700' as const,
    color: Colors.text,
  },
  healthRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  healthText: {
    fontSize: 11,
    fontWeight: '600' as const,
  },
  strategyRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
  },
  statusBadgeText: {
    fontSize: 9,
    fontWeight: '800' as const,
    letterSpacing: 0.5,
  },
  metricsRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingBottom: 16,
    gap: 8,
  },
  metricItem: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 10,
    padding: 10,
    alignItems: 'center',
  },
  metricLabel: {
    fontSize: 8,
    fontWeight: '700' as const,
    color: Colors.textMuted,
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  metricValue: {
    fontSize: 13,
    fontWeight: '700' as const,
    color: Colors.text,
  },
  pnlContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  warningBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Colors.error + '15',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  warningText: {
    fontSize: 12,
    color: Colors.error,
    flex: 1,
  },
  expandedSection: {
    padding: 16,
    paddingTop: 0,
  },
  detailsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
  },
  detailItem: {
    width: '48%',
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 10,
    padding: 12,
  },
  detailLabel: {
    fontSize: 9,
    fontWeight: '700' as const,
    color: Colors.textMuted,
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  detailValue: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: Colors.text,
  },
  lastTradeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.05)',
  },
  lastTradeText: {
    fontSize: 12,
    color: Colors.textMuted,
  },
  controlsDisabledNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 16,
    padding: 12,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 10,
  },
  controlsDisabledText: {
    flex: 1,
    fontSize: 11,
    color: Colors.textMuted,
    lineHeight: 16,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 80,
    paddingHorizontal: 40,
    gap: 12,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.textSecondary,
  },
  emptySubtext: {
    fontSize: 13,
    color: Colors.textMuted,
    textAlign: 'center',
  },
});
