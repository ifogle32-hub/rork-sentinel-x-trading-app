import { StyleSheet, Text, View, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Activity, Play, Square, XCircle } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import Colors from '@/constants/colors';
import { api } from '@/lib/api';

export default function DashboardScreen() {
  const queryClient = useQueryClient();

  const { data: status, isLoading } = useQuery({
    queryKey: ['status'],
    queryFn: api.getStatus,
    refetchInterval: 5000,
  });

  const startMutation = useMutation({
    mutationFn: api.start,
    onSuccess: () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      queryClient.invalidateQueries({ queryKey: ['status'] });
    },
  });

  const stopMutation = useMutation({
    mutationFn: api.stop,
    onSuccess: () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      queryClient.invalidateQueries({ queryKey: ['status'] });
    },
  });

  const killMutation = useMutation({
    mutationFn: api.kill,
    onSuccess: () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      queryClient.invalidateQueries({ queryKey: ['status'] });
    },
  });

  const handlePress = (callback: () => void) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    callback();
  };

  const isRunning = status?.state === 'TRADING';
  const isStopped = status?.state === 'PAUSED' || status?.state === 'KILLED';

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Activity size={32} color={Colors.primary} strokeWidth={2.5} />
          <Text style={styles.title}>SENTINEL X</Text>
        </View>
        <Text style={styles.subtitle}>AI Trading Terminal</Text>
      </View>

      <View style={styles.statusCard}>
        <View style={styles.statusHeader}>
          <Text style={styles.statusLabel}>SYSTEM STATUS</Text>
          {isLoading && <ActivityIndicator size="small" color={Colors.primary} />}
        </View>
        
        <View style={styles.statusIndicator}>
          <View style={[
            styles.statusDot,
            isRunning && styles.statusDotActive,
            status?.state === 'ERROR' && styles.statusDotError
          ]} />
          <Text style={styles.statusText}>
            {status?.state || 'OFFLINE'}
          </Text>
        </View>

        {status?.uptime && (
          <View style={styles.uptimeRow}>
            <Text style={styles.uptimeLabel}>UPTIME</Text>
            <Text style={styles.uptimeValue}>{Math.floor(status.uptime / 60)}m</Text>
          </View>
        )}
      </View>

      <View style={styles.controlsSection}>
        <Text style={styles.sectionTitle}>CONTROLS</Text>
        
        <TouchableOpacity
          style={[styles.controlButton, styles.startButton, isRunning && styles.buttonDisabled]}
          onPress={() => handlePress(() => startMutation.mutate())}
          disabled={isRunning || startMutation.isPending}
        >
          <Play size={24} color={Colors.background} fill={Colors.background} />
          <Text style={styles.controlButtonText}>START</Text>
          {startMutation.isPending && <ActivityIndicator size="small" color={Colors.background} />}
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.controlButton, styles.stopButton, isStopped && styles.buttonDisabled]}
          onPress={() => handlePress(() => stopMutation.mutate())}
          disabled={isStopped || stopMutation.isPending}
        >
          <Square size={24} color={Colors.textSecondary} />
          <Text style={[styles.controlButtonText, styles.secondaryButtonText]}>STOP</Text>
          {stopMutation.isPending && <ActivityIndicator size="small" color={Colors.textSecondary} />}
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.controlButton, styles.killButton]}
          onPress={() => handlePress(() => killMutation.mutate())}
          disabled={killMutation.isPending}
        >
          <XCircle size={24} color={Colors.error} />
          <Text style={[styles.controlButtonText, styles.killButtonText]}>EMERGENCY KILL</Text>
          {killMutation.isPending && <ActivityIndicator size="small" color={Colors.error} />}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    padding: 24,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  title: {
    fontSize: 28,
    fontWeight: '800' as const,
    color: Colors.text,
    letterSpacing: 2,
  },
  subtitle: {
    fontSize: 12,
    color: Colors.textMuted,
    marginTop: 4,
    letterSpacing: 1,
  },
  statusCard: {
    margin: 16,
    padding: 20,
    backgroundColor: Colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  statusHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  statusLabel: {
    fontSize: 11,
    fontWeight: '600' as const,
    color: Colors.textMuted,
    letterSpacing: 1.5,
  },
  statusIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  statusDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: Colors.textMuted,
  },
  statusDotActive: {
    backgroundColor: Colors.success,
    shadowColor: Colors.success,
    shadowOpacity: 0.5,
    shadowRadius: 8,
  },
  statusDotError: {
    backgroundColor: Colors.error,
  },
  statusText: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: Colors.text,
    letterSpacing: 1,
  },
  uptimeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  uptimeLabel: {
    fontSize: 11,
    color: Colors.textMuted,
    letterSpacing: 1,
  },
  uptimeValue: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.text,
  },
  controlsSection: {
    padding: 16,
    gap: 12,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '600' as const,
    color: Colors.textMuted,
    letterSpacing: 1.5,
    marginBottom: 8,
  },
  controlButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    padding: 18,
    borderRadius: 8,
    borderWidth: 1,
  },
  startButton: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  stopButton: {
    backgroundColor: 'transparent',
    borderColor: Colors.border,
  },
  killButton: {
    backgroundColor: 'transparent',
    borderColor: Colors.error,
    marginTop: 8,
  },
  buttonDisabled: {
    opacity: 0.4,
  },
  controlButtonText: {
    fontSize: 14,
    fontWeight: '700' as const,
    color: Colors.background,
    letterSpacing: 1.5,
  },
  secondaryButtonText: {
    color: Colors.textSecondary,
  },
  killButtonText: {
    color: Colors.error,
  },
});
