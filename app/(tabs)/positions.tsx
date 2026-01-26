import { StyleSheet, Text, View, ScrollView, ActivityIndicator } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { ArrowUpRight, ArrowDownLeft, DollarSign } from 'lucide-react-native';
import Colors from '@/constants/colors';
import { api } from '@/lib/api';

export default function PositionsScreen() {
  const { data: positions, isLoading } = useQuery({
    queryKey: ['positions'],
    queryFn: api.getPositions,
    refetchInterval: 5000,
  });

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>OPEN POSITIONS</Text>
        {isLoading && <ActivityIndicator size="small" color={Colors.primary} />}
      </View>

      {isLoading && !positions ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Loading positions...</Text>
        </View>
      ) : positions && positions.length > 0 ? (
        <View style={styles.positionsList}>
          {positions.map((position) => (
            <View key={position.id} style={styles.positionCard}>
              <View style={styles.positionHeader}>
                <View style={styles.symbolRow}>
                  {position.side === 'LONG' ? (
                    <ArrowUpRight size={20} color={Colors.success} />
                  ) : (
                    <ArrowDownLeft size={20} color={Colors.error} />
                  )}
                  <Text style={styles.symbol}>{position.symbol}</Text>
                  <View style={[
                    styles.sideBadge,
                    position.side === 'LONG' ? styles.longBadge : styles.shortBadge
                  ]}>
                    <Text style={[
                      styles.sideText,
                      position.side === 'LONG' ? styles.longText : styles.shortText
                    ]}>
                      {position.side.toUpperCase()}
                    </Text>
                  </View>
                </View>
              </View>

              <View style={styles.positionDetails}>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>SIZE</Text>
                  <Text style={styles.detailValue}>{(position.size ?? 0).toFixed(4)}</Text>
                </View>

                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>ENTRY</Text>
                  <Text style={styles.detailValue}>${(position.entryPrice ?? 0).toFixed(2)}</Text>
                </View>

                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>CURRENT</Text>
                  <Text style={styles.detailValue}>${(position.currentPrice ?? 0).toFixed(2)}</Text>
                </View>

                <View style={styles.pnlSection}>
                  <View style={styles.pnlRow}>
                    <Text style={styles.pnlLabel}>P&L</Text>
                    <View style={styles.pnlValues}>
                      <Text style={[
                        styles.pnlAmount,
                        position.pnl >= 0 ? styles.pnlPositive : styles.pnlNegative
                      ]}>
                        {(position.pnl ?? 0) >= 0 ? '+' : ''}${(position.pnl ?? 0).toFixed(2)}
                      </Text>
                      <Text style={[
                        styles.pnlPercent,
                        position.pnl >= 0 ? styles.pnlPositive : styles.pnlNegative
                      ]}>
                        ({(position.pnlPercent ?? 0) >= 0 ? '+' : ''}{(position.pnlPercent ?? 0).toFixed(2)}%)
                      </Text>
                    </View>
                  </View>
                </View>
              </View>
            </View>
          ))}
        </View>
      ) : (
        <View style={styles.emptyState}>
          <DollarSign size={48} color={Colors.textMuted} />
          <Text style={styles.emptyText}>No open positions</Text>
          <Text style={styles.emptySubtext}>Active positions will appear here</Text>
        </View>
      )}
    </ScrollView>
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
    padding: 24,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  headerTitle: {
    fontSize: 14,
    fontWeight: '700' as const,
    color: Colors.text,
    letterSpacing: 1.5,
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
  positionsList: {
    padding: 16,
    gap: 12,
  },
  positionCard: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 16,
  },
  positionHeader: {
    marginBottom: 16,
  },
  symbolRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  symbol: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: Colors.text,
    flex: 1,
  },
  sideBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    borderWidth: 1,
  },
  longBadge: {
    backgroundColor: Colors.success + '20',
    borderColor: Colors.success,
  },
  shortBadge: {
    backgroundColor: Colors.error + '20',
    borderColor: Colors.error,
  },
  sideText: {
    fontSize: 10,
    fontWeight: '700' as const,
    letterSpacing: 1,
  },
  longText: {
    color: Colors.success,
  },
  shortText: {
    color: Colors.error,
  },
  positionDetails: {
    gap: 12,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  detailLabel: {
    fontSize: 11,
    fontWeight: '600' as const,
    color: Colors.textMuted,
    letterSpacing: 1,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.text,
  },
  pnlSection: {
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  pnlRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  pnlLabel: {
    fontSize: 11,
    fontWeight: '600' as const,
    color: Colors.textMuted,
    letterSpacing: 1,
  },
  pnlValues: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
  },
  pnlAmount: {
    fontSize: 18,
    fontWeight: '700' as const,
  },
  pnlPercent: {
    fontSize: 14,
    fontWeight: '600' as const,
  },
  pnlPositive: {
    color: Colors.success,
  },
  pnlNegative: {
    color: Colors.error,
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
