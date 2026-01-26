import { StyleSheet, Text, View, ScrollView, ActivityIndicator, Animated } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useQuery } from '@tanstack/react-query';
import { 
  Shield, 
  TrendingDown, 
  Wallet,
  AlertTriangle,
  PieChart,
  WifiOff,
  Eye
} from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRef, useEffect } from 'react';
import Colors from '@/constants/colors';
import { api } from '@/lib/api';
import { useConnection } from '@/providers/ConnectionProvider';
import StatusBar from '@/components/StatusBar';
import GlassCard, { GlassBadge, GlassDivider } from '@/components/GlassCard';

export default function RiskScreen() {
  const insets = useSafeAreaInsets();
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const { connectionState, status } = useConnection();
  const isOnline = connectionState === 'ONLINE';
  const isOffline = connectionState === 'OFFLINE' || connectionState === 'CONNECTING';

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 400,
      useNativeDriver: true,
    }).start();
  }, [fadeAnim]);

  const { data: riskConfig, isLoading: loadingRisk } = useQuery({
    queryKey: ['riskConfig'],
    queryFn: api.getRiskConfig,
    enabled: isOnline,
  });

  const { data: allocations, isLoading: loadingAllocations } = useQuery({
    queryKey: ['capitalAllocations'],
    queryFn: api.getCapitalAllocations,
    enabled: isOnline,
  });

  const isLoading = loadingRisk || loadingAllocations;

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
              <Shield size={22} color={Colors.primary} strokeWidth={2.5} />
            </View>
            <Text style={styles.headerTitle}>RISK & CAPITAL</Text>
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
          <Text style={styles.safetyBannerText}>Risk controls are managed server-side</Text>
        </View>

        <StatusBar />

        <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {isOffline && (
            <GlassCard style={styles.offlineBanner} variant="subtle">
              <WifiOff size={18} color={Colors.warning} />
              <Text style={styles.offlineBannerText}>Data unavailable while offline</Text>
            </GlassCard>
          )}

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>RISK PARAMETERS</Text>
            
            <GlassCard style={[isOffline && styles.cardDisabled]} variant="elevated">
              <View style={styles.riskRow}>
                <View style={styles.riskItem}>
                  <View style={[styles.riskIcon, { backgroundColor: Colors.primary + '15' }]}>
                    <Shield size={18} color={isOnline ? Colors.primary : Colors.textMuted} />
                  </View>
                  <Text style={[styles.riskLabel, isOffline && styles.textDisabled]}>Max Daily Loss</Text>
                </View>
                <Text style={[styles.riskValue, isOffline && styles.textDisabled]}>
                  {isOnline && riskConfig?.maxDailyLoss ? `$${riskConfig.maxDailyLoss.toLocaleString()}` : '—'}
                </Text>
              </View>

              <GlassDivider style={styles.divider} />

              <View style={styles.riskRow}>
                <View style={styles.riskItem}>
                  <View style={[styles.riskIcon, { backgroundColor: Colors.error + '15' }]}>
                    <TrendingDown size={18} color={isOnline ? Colors.error : Colors.textMuted} />
                  </View>
                  <Text style={[styles.riskLabel, isOffline && styles.textDisabled]}>Max Drawdown</Text>
                </View>
                <Text style={[styles.riskValue, isOffline && styles.textDisabled]}>
                  {isOnline && riskConfig?.maxDrawdown ? `${riskConfig.maxDrawdown}%` : '—'}
                </Text>
              </View>

              <GlassDivider style={styles.divider} />

              <View style={styles.riskRow}>
                <View style={styles.riskItem}>
                  <View style={[styles.riskIcon, { backgroundColor: Colors.warning + '15' }]}>
                    <PieChart size={18} color={isOnline ? Colors.warning : Colors.textMuted} />
                  </View>
                  <Text style={[styles.riskLabel, isOffline && styles.textDisabled]}>Max Position Size</Text>
                </View>
                <Text style={[styles.riskValue, isOffline && styles.textDisabled]}>
                  {isOnline && riskConfig?.maxPositionSize ? `${riskConfig.maxPositionSize}%` : '—'}
                </Text>
              </View>

              <GlassDivider style={styles.divider} />

              <View style={styles.riskRow}>
                <View style={styles.riskItem}>
                  <View style={[styles.riskIcon, { backgroundColor: Colors.textSecondary + '15' }]}>
                    <AlertTriangle size={18} color={isOnline ? Colors.textSecondary : Colors.textMuted} />
                  </View>
                  <Text style={[styles.riskLabel, isOffline && styles.textDisabled]}>Max Exposure</Text>
                </View>
                <Text style={[styles.riskValue, isOffline && styles.textDisabled]}>
                  {isOnline && riskConfig?.maxExposure ? `${riskConfig.maxExposure}%` : '—'}
                </Text>
              </View>
            </GlassCard>

            <GlassCard style={[styles.allocatorBadge, isOffline && styles.allocatorBadgeDisabled]} variant="subtle">
              <Text style={[styles.allocatorLabel, isOffline && styles.textDisabled]}>CAPITAL ALLOCATOR</Text>
              <Text style={[styles.allocatorValue, isOffline && styles.textDisabled]}>
                {isOnline ? (riskConfig?.capitalAllocator || 'N/A') : '—'}
              </Text>
            </GlassCard>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>STRATEGY ALLOCATION</Text>
            
            {isOffline ? (
              <GlassCard style={styles.emptyCard} variant="subtle">
                <Text style={styles.emptyText}>—</Text>
              </GlassCard>
            ) : allocations && allocations.length > 0 ? (
              <GlassCard variant="elevated">
                {allocations.map((alloc, index) => (
                  <View 
                    key={alloc.strategyId} 
                    style={[
                      styles.allocationRow,
                      index === allocations.length - 1 && styles.lastRow
                    ]}
                  >
                    <View style={styles.allocationInfo}>
                      <Text style={styles.allocationName}>{alloc.strategyName}</Text>
                      <Text style={styles.allocationValue}>
                        ${alloc.currentValue.toLocaleString()}
                      </Text>
                    </View>
                    <View style={styles.allocationBarContainer}>
                      <View style={styles.allocationBar}>
                        <LinearGradient
                          colors={[Colors.primary, Colors.primaryLight]}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 0 }}
                          style={[styles.allocationFill, { width: `${alloc.allocation * 100}%` }]}
                        />
                      </View>
                      <Text style={styles.allocationPercent}>
                        {((alloc.allocation ?? 0) * 100).toFixed(0)}%
                      </Text>
                    </View>
                  </View>
                ))}
              </GlassCard>
            ) : (
              <GlassCard style={styles.emptyCard} variant="subtle">
                <Text style={styles.emptyText}>No allocations configured</Text>
              </GlassCard>
            )}
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>CURRENT EQUITY</Text>
            <GlassCard style={[styles.equityCard, isOffline && styles.cardDisabled]} variant="elevated">
              <View style={styles.equityIcon}>
                <Wallet size={28} color={isOnline ? Colors.primary : Colors.textMuted} />
              </View>
              <Text style={[styles.equityValue, isOffline && styles.textDisabled]}>
                {isOnline && status?.equity ? `$${status.equity.toLocaleString()}` : '—'}
              </Text>
            </GlassCard>
          </View>

          <GlassCard style={styles.readOnlyNotice} variant="subtle">
            <Eye size={16} color={Colors.textMuted} />
            <Text style={styles.readOnlyText}>
              Risk parameters are configured server-side. Use the Funding tab to manage capital.
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
    opacity: 0.12,
  },
  glowOrb1: {
    width: 220,
    height: 220,
    top: 100,
    right: -60,
    backgroundColor: Colors.warning,
  },
  glowOrb2: {
    width: 160,
    height: 160,
    bottom: 200,
    left: -50,
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
  scrollContent: {
    flex: 1,
    padding: 16,
  },
  offlineBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 16,
  },
  offlineBannerText: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: Colors.warning,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '700' as const,
    color: Colors.textMuted,
    letterSpacing: 1.5,
    marginBottom: 12,
  },
  cardDisabled: {
    opacity: 0.5,
  },
  textDisabled: {
    color: Colors.textMuted,
  },
  riskRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  divider: {
    marginVertical: 12,
  },
  riskItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  riskIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  riskLabel: {
    fontSize: 14,
    color: Colors.text,
    fontWeight: '600' as const,
  },
  riskValue: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: Colors.primary,
  },
  allocatorBadge: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
  },
  allocatorBadgeDisabled: {
    opacity: 0.5,
  },
  allocatorLabel: {
    fontSize: 11,
    fontWeight: '700' as const,
    color: Colors.primary,
    letterSpacing: 1,
  },
  allocatorValue: {
    fontSize: 14,
    fontWeight: '800' as const,
    color: Colors.primary,
  },
  allocationRow: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  lastRow: {
    borderBottomWidth: 0,
  },
  allocationInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  allocationName: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.text,
  },
  allocationValue: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  allocationBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  allocationBar: {
    flex: 1,
    height: 8,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 4,
    overflow: 'hidden',
  },
  allocationFill: {
    height: '100%',
    borderRadius: 4,
  },
  allocationPercent: {
    fontSize: 13,
    fontWeight: '700' as const,
    color: Colors.primary,
    minWidth: 40,
    textAlign: 'right',
  },
  emptyCard: {
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: Colors.textMuted,
  },
  equityCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  equityIcon: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: Colors.primary + '15',
    justifyContent: 'center',
    alignItems: 'center',
  },
  equityValue: {
    fontSize: 36,
    fontWeight: '800' as const,
    color: Colors.text,
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
