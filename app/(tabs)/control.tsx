import { StyleSheet, Text, View, TouchableOpacity, ScrollView, ActivityIndicator, Alert, TextInput, Modal } from 'react-native';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Play, 
  Pause, 
  XOctagon,
  Clock,
  Eye,
  EyeOff,
  Zap,
  CheckCircle,
  XCircle,
  AlertTriangle,
  WifiOff,
  Snowflake,
  PlayCircle,
  Radio,
  X,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import React, { useState, useCallback } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Colors from '@/constants/colors';
import { api } from '@/lib/api';
import { ControlAction, GlobalSystemState } from '@/types/bot';
import { useConnection } from '@/providers/ConnectionProvider';
import { useGlobalState } from '@/providers/GlobalStateProvider';
import StatusBar from '@/components/StatusBar';

interface ActionResult {
  action: string;
  result: ControlAction | null;
  error: string | null;
  timestamp: Date;
}

const CURRENT_USER_ID = 'operator';

const STATE_CONFIG: Record<GlobalSystemState, { color: string; label: string; icon: React.ReactNode }> = {
  OFF: { color: Colors.textMuted, label: 'OFFLINE', icon: <Radio size={16} color={Colors.textMuted} /> },
  FROZEN: { color: Colors.error, label: 'FROZEN', icon: <Snowflake size={16} color={Colors.error} /> },
  SHADOW_ONLY: { color: Colors.warning, label: 'SHADOW ONLY', icon: <Eye size={16} color={Colors.warning} /> },
  LIVE: { color: Colors.success, label: 'LIVE', icon: <PlayCircle size={16} color={Colors.success} /> },
};

export default function ControlScreen() {
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const [actionHistory, setActionHistory] = useState<ActionResult[]>([]);
  const [showFreezeModal, setShowFreezeModal] = useState(false);
  const [showResumeModal, setShowResumeModal] = useState(false);
  const [freezeReason, setFreezeReason] = useState('');
  const [resumeIntent, setResumeIntent] = useState('');

  const { connectionState, status, refetchStatus } = useConnection();
  const { globalState, isFrozen, lastBroadcast, n8nConnected, refreshState } = useGlobalState();
  const isOnline = connectionState === 'ONLINE';
  const isOffline = connectionState === 'OFFLINE' || connectionState === 'CONNECTING';

  const addToHistory = useCallback((action: string, result: ControlAction | null, error: string | null) => {
    setActionHistory(prev => [{
      action,
      result,
      error,
      timestamp: new Date(),
    }, ...prev.slice(0, 9)]);
  }, []);

  const startMutation = useMutation({
    mutationFn: api.start,
    onSuccess: (result) => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      queryClient.invalidateQueries({ queryKey: ['status'] });
      refetchStatus();
      addToHistory('START', result, null);
    },
    onError: (err: Error) => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      addToHistory('START', null, err.message);
    },
  });

  const stopMutation = useMutation({
    mutationFn: api.stop,
    onSuccess: (result) => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      queryClient.invalidateQueries({ queryKey: ['status'] });
      refetchStatus();
      addToHistory('PAUSE', result, null);
    },
    onError: (err: Error) => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      addToHistory('PAUSE', null, err.message);
    },
  });

  const killMutation = useMutation({
    mutationFn: api.kill,
    onSuccess: (result) => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      queryClient.invalidateQueries({ queryKey: ['status'] });
      refetchStatus();
      addToHistory('KILL', result, null);
    },
    onError: (err: Error) => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      addToHistory('KILL', null, err.message);
    },
  });

  const enableWindowMutation = useMutation({
    mutationFn: api.enableTradingWindow,
    onSuccess: (result) => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      queryClient.invalidateQueries({ queryKey: ['status'] });
      refetchStatus();
      addToHistory('ENABLE_WINDOW', result, null);
    },
    onError: (err: Error) => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      addToHistory('ENABLE_WINDOW', null, err.message);
    },
  });

  const disableWindowMutation = useMutation({
    mutationFn: api.disableTradingWindow,
    onSuccess: (result) => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      queryClient.invalidateQueries({ queryKey: ['status'] });
      refetchStatus();
      addToHistory('DISABLE_WINDOW', result, null);
    },
    onError: (err: Error) => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      addToHistory('DISABLE_WINDOW', null, err.message);
    },
  });

  const enableShadowMutation = useMutation({
    mutationFn: api.enableShadowTrading,
    onSuccess: (result) => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      queryClient.invalidateQueries({ queryKey: ['status'] });
      refetchStatus();
      addToHistory('ENABLE_SHADOW', result, null);
    },
    onError: (err: Error) => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      addToHistory('ENABLE_SHADOW', null, err.message);
    },
  });

  const disableShadowMutation = useMutation({
    mutationFn: api.disableShadowTrading,
    onSuccess: (result) => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      queryClient.invalidateQueries({ queryKey: ['status'] });
      refetchStatus();
      addToHistory('DISABLE_SHADOW', result, null);
    },
    onError: (err: Error) => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      addToHistory('DISABLE_SHADOW', null, err.message);
    },
  });

  const testOrderMutation = useMutation({
    mutationFn: api.fireTestOrder,
    onSuccess: (result) => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      queryClient.invalidateQueries({ queryKey: ['status'] });
      refetchStatus();
      addToHistory('TEST_ORDER', result, null);
    },
    onError: (err: Error) => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      addToHistory('TEST_ORDER', null, err.message);
    },
  });

  const freezeMutation = useMutation({
    mutationFn: ({ reason }: { reason: string }) => api.triggerFreeze(CURRENT_USER_ID, reason),
    onSuccess: (result) => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      refreshState();
      addToHistory('FREEZE', result, null);
      setShowFreezeModal(false);
      setFreezeReason('');
      Alert.alert('System Frozen', 'Emergency freeze has been triggered via n8n.');
    },
    onError: (err: Error) => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      addToHistory('FREEZE', null, err.message);
      Alert.alert('Freeze Failed', err.message);
    },
  });

  const resumeMutation = useMutation({
    mutationFn: ({ intent }: { intent: string }) => api.triggerResume(CURRENT_USER_ID, intent),
    onSuccess: (result) => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      refreshState();
      addToHistory('RESUME', result, null);
      setShowResumeModal(false);
      setResumeIntent('');
      Alert.alert('Resume Requested', 'Resume request has been sent to n8n.');
    },
    onError: (err: Error) => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      addToHistory('RESUME', null, err.message);
      Alert.alert('Resume Failed', err.message);
    },
  });

  const handleAction = (
    mutate: () => void,
    confirmTitle?: string,
    confirmMessage?: string
  ) => {
    if (!isOnline) {
      Alert.alert('Offline', 'Cannot perform action while disconnected from Sentinel X');
      return;
    }
    
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    if (confirmTitle && confirmMessage) {
      Alert.alert(confirmTitle, confirmMessage, [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Confirm', onPress: mutate },
      ]);
    } else {
      mutate();
    }
  };

  const isTrading = status?.state === 'TRADING';
  const isPaused = status?.state === 'PAUSED' || status?.state === 'KILLED';
  const stateConfig = STATE_CONFIG[globalState];

  const { mutate: freezeMutate } = freezeMutation;
  const { mutate: resumeMutate } = resumeMutation;

  const handleFreeze = useCallback(() => {
    if (!freezeReason.trim()) {
      Alert.alert('Reason Required', 'Please provide a reason for the emergency freeze.');
      return;
    }
    freezeMutate({ reason: freezeReason.trim() });
  }, [freezeReason, freezeMutate]);

  const handleResume = useCallback(() => {
    if (!resumeIntent.trim()) {
      Alert.alert('Intent Required', 'Please provide your intent for resuming operations.');
      return;
    }
    resumeMutate({ intent: resumeIntent.trim() });
  }, [resumeIntent, resumeMutate]);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>TRADING CONTROL</Text>
        <View style={[styles.statusDot, { backgroundColor: isOnline && isTrading ? Colors.success : Colors.textMuted }]} />
      </View>

      <StatusBar />

      <View style={styles.globalStateBar}>
        <View style={styles.globalStateLeft}>
          <View style={[styles.globalStateDot, { backgroundColor: stateConfig.color }]} />
          <Text style={styles.globalStateLabel}>n8n STATE</Text>
        </View>
        <View style={[styles.globalStateBadge, { backgroundColor: stateConfig.color + '20', borderColor: stateConfig.color }]}>
          {stateConfig.icon}
          <Text style={[styles.globalStateText, { color: stateConfig.color }]}>{stateConfig.label}</Text>
        </View>
        {!n8nConnected && (
          <View style={styles.n8nOfflineBadge}>
            <WifiOff size={12} color={Colors.warning} />
          </View>
        )}
      </View>

      {lastBroadcast && (
        <View style={[styles.broadcastBanner, { borderColor: stateConfig.color }]}>
          <Text style={styles.broadcastText}>{lastBroadcast.message}</Text>
          <Text style={styles.broadcastTime}>
            {new Date(lastBroadcast.timestamp).toLocaleTimeString()}
          </Text>
        </View>
      )}

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {isOffline && (
          <View style={styles.offlineBanner}>
            <WifiOff size={18} color={Colors.warning} />
            <Text style={styles.offlineBannerText}>Controls disabled while offline</Text>
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>SYSTEM CONTROL</Text>
          
          <View style={styles.buttonGrid}>
            <TouchableOpacity
              style={[styles.actionButton, styles.startButton, (!isOnline || isTrading) && styles.buttonDisabled]}
              onPress={() => handleAction(() => startMutation.mutate())}
              disabled={!isOnline || isTrading || startMutation.isPending}
            >
              {startMutation.isPending ? (
                <ActivityIndicator size="small" color={Colors.background} />
              ) : (
                <Play size={24} color={Colors.background} fill={Colors.background} />
              )}
              <Text style={styles.actionButtonText}>START</Text>
              <Text style={styles.actionButtonSubtext}>Begin trading</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionButton, styles.pauseButton, (!isOnline || isPaused) && styles.buttonDisabled]}
              onPress={() => handleAction(() => stopMutation.mutate())}
              disabled={!isOnline || isPaused || stopMutation.isPending}
            >
              {stopMutation.isPending ? (
                <ActivityIndicator size="small" color={Colors.warning} />
              ) : (
                <Pause size={24} color={Colors.warning} />
              )}
              <Text style={[styles.actionButtonText, styles.pauseText]}>PAUSE</Text>
              <Text style={[styles.actionButtonSubtext, styles.pauseSubtext]}>Halt trading</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={[styles.killButton, !isOnline && styles.buttonDisabled]}
            onPress={() => handleAction(
              () => killMutation.mutate(),
              '⚠️ EMERGENCY KILL',
              'This will immediately stop ALL trading and close positions. Are you sure?'
            )}
            disabled={!isOnline || killMutation.isPending}
          >
            {killMutation.isPending ? (
              <ActivityIndicator size="small" color={Colors.error} />
            ) : (
              <XOctagon size={24} color={Colors.error} />
            )}
            <View style={styles.killTextContainer}>
              <Text style={styles.killButtonText}>EMERGENCY KILL</Text>
              <Text style={styles.killButtonSubtext}>Stop all activity immediately</Text>
            </View>
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>TRADING WINDOW</Text>
          
          <View style={[styles.toggleRow, !isOnline && styles.toggleRowDisabled]}>
            <View style={styles.toggleInfo}>
              <Clock size={20} color={isOnline ? Colors.textSecondary : Colors.textMuted} />
              <View>
                <Text style={[styles.toggleLabel, !isOnline && styles.textDisabled]}>Trading Window</Text>
                <Text style={styles.toggleStatus}>
                  {isOnline ? (status?.tradingWindowActive ? 'Active' : 'Disabled') : '—'}
                </Text>
              </View>
            </View>
            <View style={styles.toggleButtons}>
              <TouchableOpacity
                style={[styles.toggleButton, isOnline && status?.tradingWindowActive && styles.toggleButtonActive]}
                onPress={() => handleAction(() => enableWindowMutation.mutate())}
                disabled={!isOnline || enableWindowMutation.isPending}
              >
                <Text style={[styles.toggleButtonText, isOnline && status?.tradingWindowActive && styles.toggleButtonTextActive]}>
                  ON
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.toggleButton, isOnline && !status?.tradingWindowActive && styles.toggleButtonActive]}
                onPress={() => handleAction(() => disableWindowMutation.mutate())}
                disabled={!isOnline || disableWindowMutation.isPending}
              >
                <Text style={[styles.toggleButtonText, isOnline && !status?.tradingWindowActive && styles.toggleButtonTextActive]}>
                  OFF
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>SHADOW TRADING</Text>
          
          <View style={[styles.toggleRow, !isOnline && styles.toggleRowDisabled]}>
            <View style={styles.toggleInfo}>
              {isOnline && status?.shadowTradingEnabled ? (
                <Eye size={20} color={Colors.primary} />
              ) : (
                <EyeOff size={20} color={Colors.textMuted} />
              )}
              <View>
                <Text style={[styles.toggleLabel, !isOnline && styles.textDisabled]}>Shadow Mode</Text>
                <Text style={styles.toggleStatus}>
                  {isOnline ? (status?.shadowTradingEnabled ? 'Enabled - Simulating trades' : 'Disabled') : '—'}
                </Text>
              </View>
            </View>
            <View style={styles.toggleButtons}>
              <TouchableOpacity
                style={[styles.toggleButton, isOnline && status?.shadowTradingEnabled && styles.toggleButtonActive]}
                onPress={() => handleAction(() => enableShadowMutation.mutate())}
                disabled={!isOnline || enableShadowMutation.isPending}
              >
                <Text style={[styles.toggleButtonText, isOnline && status?.shadowTradingEnabled && styles.toggleButtonTextActive]}>
                  ON
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.toggleButton, isOnline && !status?.shadowTradingEnabled && styles.toggleButtonActive]}
                onPress={() => handleAction(() => disableShadowMutation.mutate())}
                disabled={!isOnline || disableShadowMutation.isPending}
              >
                <Text style={[styles.toggleButtonText, isOnline && !status?.shadowTradingEnabled && styles.toggleButtonTextActive]}>
                  OFF
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>TEST ORDER</Text>
          
          <TouchableOpacity
            style={[styles.testOrderButton, !isOnline && styles.buttonDisabled]}
            onPress={() => handleAction(
              () => testOrderMutation.mutate(),
              'Fire Test Order',
              'This will send a test order to verify broker connectivity. Continue?'
            )}
            disabled={!isOnline || testOrderMutation.isPending}
          >
            {testOrderMutation.isPending ? (
              <ActivityIndicator size="small" color={Colors.primary} />
            ) : (
              <Zap size={20} color={Colors.primary} />
            )}
            <Text style={styles.testOrderText}>Fire Test Order</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>n8n GOVERNANCE</Text>
          
          <TouchableOpacity
            style={[styles.freezeButton, isFrozen && styles.buttonDisabled]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
              setShowFreezeModal(true);
            }}
            disabled={isFrozen || freezeMutation.isPending}
          >
            {freezeMutation.isPending ? (
              <ActivityIndicator size="small" color={Colors.error} />
            ) : (
              <Snowflake size={24} color={Colors.error} />
            )}
            <View style={styles.freezeTextContainer}>
              <Text style={styles.freezeButtonText}>EMERGENCY FREEZE</Text>
              <Text style={styles.freezeButtonSubtext}>Halt all operations via n8n</Text>
            </View>
          </TouchableOpacity>

          {isFrozen && (
            <TouchableOpacity
              style={styles.resumeButton}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                setShowResumeModal(true);
              }}
              disabled={resumeMutation.isPending}
            >
              {resumeMutation.isPending ? (
                <ActivityIndicator size="small" color={Colors.success} />
              ) : (
                <PlayCircle size={24} color={Colors.success} />
              )}
              <View style={styles.resumeTextContainer}>
                <Text style={styles.resumeButtonText}>REQUEST RESUME</Text>
                <Text style={styles.resumeButtonSubtext}>Request operations to resume</Text>
              </View>
            </TouchableOpacity>
          )}
        </View>

        {actionHistory.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>ACTION HISTORY</Text>
            
            {actionHistory.map((item, index) => (
              <View key={index} style={styles.historyItem}>
                <View style={styles.historyIcon}>
                  {item.error ? (
                    <XCircle size={16} color={Colors.error} />
                  ) : item.result?.success ? (
                    <CheckCircle size={16} color={Colors.success} />
                  ) : (
                    <AlertTriangle size={16} color={Colors.warning} />
                  )}
                </View>
                <View style={styles.historyContent}>
                  <Text style={styles.historyAction}>{item.action}</Text>
                  <Text style={styles.historyMessage}>
                    {item.error || item.result?.message || 'Unknown'}
                  </Text>
                  <Text style={styles.historyTime}>
                    {item.timestamp.toLocaleTimeString()}
                    {item.result?.responseTime && ` • ${item.result.responseTime}ms`}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>

      <Modal
        visible={showFreezeModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowFreezeModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View style={styles.modalTitleRow}>
                <Snowflake size={24} color={Colors.error} />
                <Text style={styles.modalTitle}>Emergency Freeze</Text>
              </View>
              <TouchableOpacity onPress={() => setShowFreezeModal(false)}>
                <X size={24} color={Colors.textMuted} />
              </TouchableOpacity>
            </View>
            <Text style={styles.modalSubtitle}>
              This will send a freeze command to n8n and halt all Sentinel X operations.
            </Text>
            <Text style={styles.inputLabel}>Reason for freeze *</Text>
            <TextInput
              style={styles.textInput}
              placeholder="e.g., Unusual market conditions, Risk breach detected..."
              placeholderTextColor={Colors.textMuted}
              value={freezeReason}
              onChangeText={setFreezeReason}
              multiline
              numberOfLines={3}
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setShowFreezeModal(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.confirmFreezeButton, !freezeReason.trim() && styles.buttonDisabled]}
                onPress={handleFreeze}
                disabled={freezeMutation.isPending || !freezeReason.trim()}
              >
                {freezeMutation.isPending ? (
                  <ActivityIndicator size="small" color={Colors.background} />
                ) : (
                  <Text style={styles.confirmFreezeText}>FREEZE NOW</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={showResumeModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowResumeModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View style={styles.modalTitleRow}>
                <PlayCircle size={24} color={Colors.success} />
                <Text style={styles.modalTitle}>Request Resume</Text>
              </View>
              <TouchableOpacity onPress={() => setShowResumeModal(false)}>
                <X size={24} color={Colors.textMuted} />
              </TouchableOpacity>
            </View>
            <Text style={styles.modalSubtitle}>
              This will send a resume request to n8n. Operations will resume if governance approves.
            </Text>
            <Text style={styles.inputLabel}>Intent for resuming *</Text>
            <TextInput
              style={styles.textInput}
              placeholder="e.g., Market conditions normalized, Risk resolved..."
              placeholderTextColor={Colors.textMuted}
              value={resumeIntent}
              onChangeText={setResumeIntent}
              multiline
              numberOfLines={3}
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setShowResumeModal(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.confirmResumeButton, !resumeIntent.trim() && styles.buttonDisabled]}
                onPress={handleResume}
                disabled={resumeMutation.isPending || !resumeIntent.trim()}
              >
                {resumeMutation.isPending ? (
                  <ActivityIndicator size="small" color={Colors.background} />
                ) : (
                  <Text style={styles.confirmResumeText}>REQUEST RESUME</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
  headerTitle: {
    fontSize: 16,
    fontWeight: '800' as const,
    color: Colors.text,
    letterSpacing: 2,
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
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
  buttonGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  actionButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 24,
    borderRadius: 16,
    borderWidth: 2,
    gap: 8,
  },
  startButton: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  pauseButton: {
    backgroundColor: 'transparent',
    borderColor: Colors.warning,
  },
  buttonDisabled: {
    opacity: 0.4,
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '800' as const,
    color: Colors.background,
    letterSpacing: 1.5,
  },
  actionButtonSubtext: {
    fontSize: 11,
    color: Colors.background,
    opacity: 0.8,
  },
  pauseText: {
    color: Colors.warning,
  },
  pauseSubtext: {
    color: Colors.warning,
  },
  killButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    paddingVertical: 20,
    paddingHorizontal: 24,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: Colors.error,
    backgroundColor: Colors.error + '10',
  },
  killTextContainer: {
    flex: 1,
  },
  killButtonText: {
    fontSize: 16,
    fontWeight: '800' as const,
    color: Colors.error,
    letterSpacing: 1,
  },
  killButtonSubtext: {
    fontSize: 12,
    color: Colors.error,
    opacity: 0.8,
    marginTop: 2,
  },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  toggleRowDisabled: {
    opacity: 0.5,
  },
  toggleInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  toggleLabel: {
    fontSize: 14,
    fontWeight: '700' as const,
    color: Colors.text,
  },
  textDisabled: {
    color: Colors.textMuted,
  },
  toggleStatus: {
    fontSize: 12,
    color: Colors.textMuted,
    marginTop: 2,
  },
  toggleButtons: {
    flexDirection: 'row',
    backgroundColor: Colors.surfaceElevated,
    borderRadius: 8,
    padding: 2,
  },
  toggleButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  toggleButtonActive: {
    backgroundColor: Colors.primary,
  },
  toggleButtonText: {
    fontSize: 12,
    fontWeight: '700' as const,
    color: Colors.textMuted,
  },
  toggleButtonTextActive: {
    color: Colors.background,
  },
  testOrderButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: Colors.primary,
    backgroundColor: Colors.primary + '10',
  },
  testOrderText: {
    fontSize: 14,
    fontWeight: '700' as const,
    color: Colors.primary,
    letterSpacing: 1,
  },
  historyItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  historyIcon: {
    marginTop: 2,
  },
  historyContent: {
    flex: 1,
  },
  historyAction: {
    fontSize: 13,
    fontWeight: '700' as const,
    color: Colors.text,
    letterSpacing: 0.5,
  },
  historyMessage: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  historyTime: {
    fontSize: 10,
    color: Colors.textMuted,
    marginTop: 4,
  },
  globalStateBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  globalStateLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  globalStateDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  globalStateLabel: {
    fontSize: 11,
    fontWeight: '700' as const,
    color: Colors.textMuted,
    letterSpacing: 1,
  },
  globalStateBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
  },
  globalStateText: {
    fontSize: 12,
    fontWeight: '800' as const,
    letterSpacing: 0.5,
  },
  n8nOfflineBadge: {
    padding: 4,
  },
  broadcastBanner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: Colors.surfaceElevated,
    borderLeftWidth: 3,
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 6,
  },
  broadcastText: {
    fontSize: 13,
    color: Colors.text,
    flex: 1,
  },
  broadcastTime: {
    fontSize: 11,
    color: Colors.textMuted,
    marginLeft: 8,
  },
  freezeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    paddingVertical: 20,
    paddingHorizontal: 24,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: Colors.error,
    backgroundColor: Colors.error + '10',
    marginBottom: 12,
  },
  freezeTextContainer: {
    flex: 1,
  },
  freezeButtonText: {
    fontSize: 16,
    fontWeight: '800' as const,
    color: Colors.error,
    letterSpacing: 1,
  },
  freezeButtonSubtext: {
    fontSize: 12,
    color: Colors.error,
    opacity: 0.8,
    marginTop: 2,
  },
  resumeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    paddingVertical: 20,
    paddingHorizontal: 24,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: Colors.success,
    backgroundColor: Colors.success + '10',
  },
  resumeTextContainer: {
    flex: 1,
  },
  resumeButtonText: {
    fontSize: 16,
    fontWeight: '800' as const,
    color: Colors.success,
    letterSpacing: 1,
  },
  resumeButtonSubtext: {
    fontSize: 12,
    color: Colors.success,
    opacity: 0.8,
    marginTop: 2,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: Colors.surface,
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 400,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  modalTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '800' as const,
    color: Colors.text,
  },
  modalSubtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 20,
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '700' as const,
    color: Colors.textSecondary,
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  textInput: {
    backgroundColor: Colors.surfaceElevated,
    borderRadius: 12,
    padding: 14,
    fontSize: 14,
    color: Colors.text,
    minHeight: 80,
    textAlignVertical: 'top',
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 20,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: Colors.surfaceElevated,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: '700' as const,
    color: Colors.textSecondary,
  },
  confirmFreezeButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: Colors.error,
    alignItems: 'center',
  },
  confirmFreezeText: {
    fontSize: 14,
    fontWeight: '800' as const,
    color: Colors.background,
    letterSpacing: 0.5,
  },
  confirmResumeButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: Colors.success,
    alignItems: 'center',
  },
  confirmResumeText: {
    fontSize: 14,
    fontWeight: '800' as const,
    color: Colors.background,
    letterSpacing: 0.5,
  },
});
