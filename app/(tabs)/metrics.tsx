import { StyleSheet, Text, View, ScrollView, ActivityIndicator, TouchableOpacity, Dimensions } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { 
  TrendingUp, 
  TrendingDown, 
  BarChart3,
  Activity,
  Target,
  Percent,
  WifiOff,
  Eye
} from 'lucide-react-native';
import { useState } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Colors from '@/constants/colors';
import { api } from '@/lib/api';
import { useConnection } from '@/providers/ConnectionProvider';
import StatusBar from '@/components/StatusBar';
import GlassMetricCard, { GlassStatsCard, GlassStatRow, GlassChartCard } from '@/components/GlassMetricCard';

const { width } = Dimensions.get('window');

type TimeFilter = '7D' | '30D' | '90D' | 'YTD' | 'ALL';

export default function MetricsScreen() {
  const insets = useSafeAreaInsets();
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('30D');

  const { connectionState } = useConnection();
  const isOnline = connectionState === 'ONLINE';
  const isOffline = connectionState === 'OFFLINE' || connectionState === 'CONNECTING';

  const { data: stats, isLoading: loadingStats } = useQuery({
    queryKey: ['performanceStats'],
    queryFn: api.getPerformanceStats,
    enabled: isOnline,
  });

  const { data: equityCurve, isLoading: loadingEquity } = useQuery({
    queryKey: ['equityCurve', timeFilter],
    queryFn: () => api.getEquityCurve(timeFilter === '7D' ? 7 : timeFilter === '30D' ? 30 : timeFilter === '90D' ? 90 : 365),
    enabled: isOnline,
  });

  const { data: pnlHistory } = useQuery({
    queryKey: ['pnlHistory', timeFilter],
    queryFn: () => api.getPnLHistory(timeFilter.toLowerCase()),
    enabled: isOnline,
  });

  const isLoading = loadingStats || loadingEquity;

  const renderEquityChart = () => {
    if (isOffline) {
      return (
        <View style={styles.chartPlaceholder}>
          <WifiOff size={48} color={Colors.textMuted} />
          <Text style={styles.chartPlaceholderText}>Connect to view chart</Text>
        </View>
      );
    }

    if (!equityCurve || equityCurve.length === 0) {
      return (
        <View style={styles.chartPlaceholder}>
          <BarChart3 size={48} color={Colors.textMuted} />
          <Text style={styles.chartPlaceholderText}>No equity data available</Text>
        </View>
      );
    }

    const values = equityCurve.map(p => p.equity);
    const minValue = Math.min(...values);
    const maxValue = Math.max(...values);
    const range = maxValue - minValue || 1;
    const chartHeight = 140;
    const chartWidth = width - 64;

    return (
      <View style={styles.chartContainer}>
        <View style={styles.chartYAxis}>
          <Text style={styles.chartAxisLabel}>${(maxValue / 1000).toFixed(0)}k</Text>
          <Text style={styles.chartAxisLabel}>${(minValue / 1000).toFixed(0)}k</Text>
        </View>
        <View style={styles.chart}>
          <View style={styles.chartLine}>
            {equityCurve.map((point, index) => {
              const x = (index / (equityCurve.length - 1)) * chartWidth;
              const y = chartHeight - ((point.equity - minValue) / range) * chartHeight;
              const prevPoint = equityCurve[index - 1];
              
              if (index === 0) return null;
              
              const prevX = ((index - 1) / (equityCurve.length - 1)) * chartWidth;
              const prevY = chartHeight - ((prevPoint.equity - minValue) / range) * chartHeight;
              
              const isPositive = point.equity >= equityCurve[0].equity;
              
              return (
                <View
                  key={index}
                  style={[
                    styles.chartSegment,
                    {
                      left: prevX,
                      top: Math.min(y, prevY),
                      width: Math.max(2, (x - prevX)),
                      height: Math.abs(y - prevY) + 2,
                      backgroundColor: isPositive ? Colors.success : Colors.error,
                    }
                  ]}
                />
              );
            })}
          </View>
          {equityCurve.map((point, index) => {
            const x = (index / (equityCurve.length - 1)) * chartWidth;
            const y = chartHeight - ((point.equity - minValue) / range) * chartHeight;
            
            if (index % Math.ceil(equityCurve.length / 5) !== 0) return null;
            
            return (
              <View
                key={`dot-${index}`}
                style={[
                  styles.chartDot,
                  {
                    left: x - 3,
                    top: y - 3,
                    backgroundColor: point.equity >= equityCurve[0].equity ? Colors.success : Colors.error,
                  }
                ]}
              />
            );
          })}
        </View>
      </View>
    );
  };

  const renderPnLBars = () => {
    if (isOffline) {
      return (
        <View style={styles.chartPlaceholder}>
          <Text style={styles.chartPlaceholderText}>—</Text>
        </View>
      );
    }

    if (!pnlHistory || pnlHistory.length === 0) return null;

    const maxPnL = Math.max(...pnlHistory.map(p => Math.abs(p.pnl)));
    const barWidth = Math.max(4, (width - 80) / pnlHistory.length - 2);

    return (
      <View style={styles.pnlBarsContainer}>
        <View style={styles.pnlBars}>
          {pnlHistory.slice(-30).map((day, index) => {
            const height = (Math.abs(day.pnl) / maxPnL) * 60;
            const isPositive = day.pnl >= 0;
            
            return (
              <View
                key={index}
                style={[
                  styles.pnlBar,
                  {
                    width: barWidth,
                    height: Math.max(2, height),
                    backgroundColor: isPositive ? Colors.success : Colors.error,
                    marginBottom: isPositive ? 0 : undefined,
                    marginTop: isPositive ? undefined : 0,
                    alignSelf: isPositive ? 'flex-end' : 'flex-start',
                  }
                ]}
              />
            );
          })}
        </View>
        <View style={styles.pnlZeroLine} />
      </View>
    );
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>PERFORMANCE</Text>
        <View style={styles.headerRight}>
          <View style={styles.readOnlyBadge}>
            <Eye size={10} color={Colors.textMuted} />
            <Text style={styles.readOnlyBadgeText}>READ-ONLY</Text>
          </View>
          {isLoading && <ActivityIndicator size="small" color={Colors.primary} />}
        </View>
      </View>

      <StatusBar />

      <View style={styles.filterRow}>
        {(['7D', '30D', '90D', 'YTD', 'ALL'] as TimeFilter[]).map((filter) => (
          <TouchableOpacity
            key={filter}
            style={[styles.filterButton, timeFilter === filter && styles.filterButtonActive]}
            onPress={() => setTimeFilter(filter)}
            disabled={isOffline}
          >
            <Text style={[styles.filterText, timeFilter === filter && styles.filterTextActive]}>
              {filter}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {isOffline && (
          <View style={styles.offlineBanner}>
            <WifiOff size={18} color={Colors.warning} />
            <Text style={styles.offlineBannerText}>Performance data unavailable while offline</Text>
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>EQUITY CURVE</Text>
          <GlassChartCard title="EQUITY CURVE">
            {renderEquityChart()}
          </GlassChartCard>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>DAILY P&L</Text>
          <GlassChartCard title="DAILY P&L">
            {renderPnLBars()}
          </GlassChartCard>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>KEY METRICS</Text>
          
          <View style={styles.metricsGrid}>
            <GlassMetricCard
              label="TOTAL RETURN"
              icon={<TrendingUp size={14} color={isOnline ? Colors.success : Colors.textMuted} />}
              iconColor={Colors.success}
              value={isOnline && stats?.totalReturnPercent !== undefined 
                ? `${stats.totalReturnPercent >= 0 ? '+' : ''}${stats.totalReturnPercent.toFixed(2)}%`
                : null}
              subValue={isOnline && stats?.totalReturn !== undefined ? `${stats.totalReturn.toLocaleString()}` : undefined}
              valueColor={(stats?.totalReturnPercent ?? 0) >= 0 ? Colors.success : Colors.error}
              isLoading={isLoading}
            />

            <GlassMetricCard
              label="SHARPE RATIO"
              icon={<Activity size={14} color={isOnline ? Colors.primary : Colors.textMuted} />}
              iconColor={Colors.primary}
              value={isOnline ? stats?.sharpeRatio?.toFixed(2) : null}
              isLoading={isLoading}
            />

            <GlassMetricCard
              label="MAX DRAWDOWN"
              icon={<TrendingDown size={14} color={isOnline ? Colors.error : Colors.textMuted} />}
              iconColor={Colors.error}
              value={isOnline && stats?.maxDrawdown !== undefined ? `-${stats.maxDrawdown.toFixed(2)}%` : null}
              valueColor={Colors.error}
              isLoading={isLoading}
            />

            <GlassMetricCard
              label="WIN RATE"
              icon={<Target size={14} color={isOnline ? Colors.success : Colors.textMuted} />}
              iconColor={Colors.success}
              value={isOnline && stats?.winRate !== undefined ? `${(stats.winRate * 100).toFixed(1)}%` : null}
              isLoading={isLoading}
            />

            <GlassMetricCard
              label="PROFIT FACTOR"
              icon={<Percent size={14} color={isOnline ? Colors.warning : Colors.textMuted} />}
              iconColor={Colors.warning}
              value={isOnline ? stats?.profitFactor?.toFixed(2) : null}
              isLoading={isLoading}
            />

            <GlassMetricCard
              label="VOLATILITY"
              icon={<BarChart3 size={14} color={Colors.textSecondary} />}
              iconColor={Colors.textSecondary}
              value={isOnline && stats?.volatility !== undefined ? `${stats.volatility.toFixed(1)}%` : null}
              isLoading={isLoading}
            />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>TRADE STATISTICS</Text>
          
          <GlassStatsCard isLoading={isLoading}>
            <GlassStatRow
              label="Average Win"
              value={isOnline && stats?.avgWin !== undefined ? `+${stats.avgWin.toFixed(2)}` : null}
              valueColor={Colors.success}
              isLoading={isLoading}
            />
            <GlassStatRow
              label="Average Loss"
              value={isOnline && stats?.avgLoss !== undefined ? `-${Math.abs(stats.avgLoss).toFixed(2)}` : null}
              valueColor={Colors.error}
              isLoading={isLoading}
            />
            <GlassStatRow
              label="Best Day"
              value={isOnline && stats?.bestDay !== undefined ? `+${stats.bestDay.toFixed(2)}` : null}
              valueColor={Colors.success}
              isLoading={isLoading}
            />
            <GlassStatRow
              label="Worst Day"
              value={isOnline && stats?.worstDay !== undefined ? `-${Math.abs(stats.worstDay).toFixed(2)}` : null}
              valueColor={Colors.error}
              isLoading={isLoading}
            />
            <GlassStatRow
              label="Sortino Ratio"
              value={isOnline ? stats?.sortinoRatio?.toFixed(2) : null}
              isLoading={isLoading}
            />
            <GlassStatRow
              label="Calmar Ratio"
              value={isOnline ? stats?.calmarRatio?.toFixed(2) : null}
              isLast
              isLoading={isLoading}
            />
          </GlassStatsCard>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  readOnlyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.surfaceElevated,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  readOnlyBadgeText: {
    fontSize: 8,
    fontWeight: '700' as const,
    color: Colors.textMuted,
    letterSpacing: 0.5,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '800' as const,
    color: Colors.text,
    letterSpacing: 2,
  },
  filterRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  filterButton: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  filterButtonActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  filterText: {
    fontSize: 12,
    fontWeight: '700' as const,
    color: Colors.textMuted,
  },
  filterTextActive: {
    color: Colors.background,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  offlineBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.warning + '15',
    paddingVertical: 12,
    borderRadius: 10,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.warning + '30',
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
  chartCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  cardDisabled: {
    opacity: 0.5,
  },
  textDisabled: {
    color: Colors.textMuted,
  },
  chartContainer: {
    flexDirection: 'row',
    height: 160,
  },
  chartYAxis: {
    width: 40,
    justifyContent: 'space-between',
    paddingVertical: 10,
  },
  chartAxisLabel: {
    fontSize: 10,
    color: Colors.textMuted,
  },
  chart: {
    flex: 1,
    height: 140,
    position: 'relative',
  },
  chartLine: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  chartSegment: {
    position: 'absolute',
    borderRadius: 1,
  },
  chartDot: {
    position: 'absolute',
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  chartPlaceholder: {
    height: 140,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  chartPlaceholderText: {
    fontSize: 14,
    color: Colors.textMuted,
  },
  pnlBarsContainer: {
    height: 140,
    justifyContent: 'center',
    position: 'relative',
  },
  pnlBars: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 120,
    gap: 2,
  },
  pnlBar: {
    borderRadius: 2,
  },
  pnlZeroLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: '50%',
    height: 1,
    backgroundColor: Colors.border,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    justifyContent: 'space-between',
  },
});
