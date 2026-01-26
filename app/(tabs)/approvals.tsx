import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  Animated,
  Alert,
} from 'react-native';

import { PressableButton } from '@/components/PressableScale';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useCommandFocus } from '@/providers/CommandFocusProvider';
import { 
  AlertTriangle, 
  Check, 
  X, 
  Clock, 
  Target, 
  Shield, 
  Zap, 
  RefreshCw, 
  Inbox,
  Users,
  UserCheck,
  Timer,
  CheckCircle2,
  XCircle,
  AlertOctagon,
  Focus,
} from 'lucide-react-native';
import Colors from '@/constants/colors';
import { api } from '@/lib/api';
import { ApprovalRequest, ApprovalActionType, ApprovalMode, ApprovalStatus } from '@/types/bot';
import GlassCard, { GlassBadge } from '@/components/GlassCard';
import { useGlobalState } from '@/providers/GlobalStateProvider';

const CURRENT_USER_ID = 'operator';

const ACTION_ICONS: Record<ApprovalActionType, React.ReactNode> = {
  trade: <Zap size={20} color={Colors.warning} />,
  promote: <Target size={20} color={Colors.success} />,
  config_change: <Shield size={20} color={Colors.primary} />,
};

const ACTION_LABELS: Record<ApprovalActionType, string> = {
  trade: 'Trade Execution',
  promote: 'Strategy Promotion',
  config_change: 'Config Change',
};

const MODE_COLORS: Record<ApprovalMode, string> = {
  shadow: Colors.textMuted,
  live: Colors.primary,
};

const STATUS_CONFIG: Record<ApprovalStatus, { color: string; label: string; icon: React.ReactNode }> = {
  PENDING: { color: Colors.warning, label: 'Awaiting Quorum', icon: <Clock size={16} color={Colors.warning} /> },
  APPROVED: { color: Colors.success, label: 'Approved', icon: <CheckCircle2 size={16} color={Colors.success} /> },
  REJECTED: { color: Colors.error, label: 'Rejected', icon: <XCircle size={16} color={Colors.error} /> },
  REJECTED_TIMEOUT: { color: Colors.error, label: 'Timed Out', icon: <Timer size={16} color={Colors.error} /> },
};

function getRiskColor(score: number): string {
  if (score >= 80) return Colors.error;
  if (score >= 50) return Colors.warning;
  return Colors.success;
}

function getConfidenceColor(score: number): string {
  if (score >= 80) return Colors.success;
  if (score >= 50) return Colors.warning;
  return Colors.error;
}

function formatTimeAgo(timestamp: string): string {
  const now = new Date();
  const created = new Date(timestamp);
  const diffMs = now.getTime() - created.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);

  if (diffMin < 1) return 'Just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHour < 24) return `${diffHour}h ago`;
  return created.toLocaleDateString();
}

function formatTimeRemaining(deadline: string): string {
  const now = new Date();
  const end = new Date(deadline);
  const diffMs = end.getTime() - now.getTime();
  
  if (diffMs <= 0) return 'Expired';
  
  const diffMin = Math.floor(diffMs / 60000);
  const diffHour = Math.floor(diffMin / 60);
  
  if (diffMin < 60) return `${diffMin}m remaining`;
  if (diffHour < 24) return `${diffHour}h remaining`;
  return `${Math.floor(diffHour / 24)}d remaining`;
}

interface QuorumProgressProps {
  approvals: number;
  required: number;
}

function QuorumProgress({ approvals, required }: QuorumProgressProps) {
  const progress = Math.min(approvals / required, 1);
  const progressAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(progressAnim, {
      toValue: progress,
      duration: 500,
      useNativeDriver: false,
    }).start();
  }, [progress, progressAnim]);

  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  const isComplete = approvals >= required;

  return (
    <View style={styles.quorumContainer}>
      <View style={styles.quorumHeader}>
        <View style={styles.quorumTitleRow}>
          <Users size={16} color={Colors.textSecondary} />
          <Text style={styles.quorumTitle}>QUORUM STATUS</Text>
        </View>
        <Text style={[styles.quorumCount, isComplete && styles.quorumComplete]}>
          {approvals} / {required}
        </Text>
      </View>
      <View style={styles.quorumBar}>
        <Animated.View style={[styles.quorumBarFill, { width: progressWidth }]}>
          <LinearGradient
            colors={isComplete ? [Colors.success, Colors.success] : [Colors.warning, Colors.warning]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={StyleSheet.absoluteFill}
          />
        </Animated.View>
      </View>
      <Text style={styles.quorumHelp}>
        {isComplete 
          ? 'Quorum reached - action authorized' 
          : `${required - approvals} more approval${required - approvals > 1 ? 's' : ''} needed`}
      </Text>
    </View>
  );
}

interface ApproversListProps {
  approvals: ApprovalRequest['approvals'];
}

function ApproversList({ approvals }: ApproversListProps) {
  if (approvals.length === 0) {
    return (
      <View style={styles.approversContainer}>
        <Text style={styles.approversTitle}>Approved by</Text>
        <Text style={styles.noApprovers}>No approvals yet</Text>
      </View>
    );
  }

  return (
    <View style={styles.approversContainer}>
      <Text style={styles.approversTitle}>Approved by</Text>
      {approvals.filter(a => a.decision === 'APPROVE').map((approval, index) => (
        <View key={index} style={styles.approverRow}>
          <UserCheck size={14} color={Colors.success} />
          <Text style={styles.approverName}>{approval.user_id}</Text>
          <Text style={styles.approverTime}>{formatTimeAgo(approval.timestamp)}</Text>
        </View>
      ))}
    </View>
  );
}

interface ApprovalCardProps {
  request: ApprovalRequest;
  onApprove: () => void;
  onReject: () => void;
  isSubmitting: boolean;
  currentUserId: string;
  onLongPress?: () => void;
  isAwaitingDecision?: boolean;
}

function ApprovalCard({ request, onApprove, onReject, isSubmitting, currentUserId, onLongPress, isAwaitingDecision }: ApprovalCardProps) {
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;
  const isPending = request.status === 'PENDING';
  const isResolved = request.status !== 'PENDING';
  const hasUserApproved = request.approvals.some(a => a.user_id === currentUserId && a.decision === 'APPROVE');
  const hasUserRejected = request.approvals.some(a => a.user_id === currentUserId && a.decision === 'REJECT');
  const approvalCount = request.approvals.filter(a => a.decision === 'APPROVE').length;

  useEffect(() => {
    if (!isPending) return;
    
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.01,
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
    pulse.start();
    return () => pulse.stop();
  }, [pulseAnim, isPending]);

  useEffect(() => {
    if (isPending && isAwaitingDecision) {
      const glow = Animated.loop(
        Animated.sequence([
          Animated.timing(glowAnim, {
            toValue: 1,
            duration: 2000,
            useNativeDriver: false,
          }),
          Animated.timing(glowAnim, {
            toValue: 0,
            duration: 2000,
            useNativeDriver: false,
          }),
        ])
      );
      glow.start();
      return () => glow.stop();
    } else {
      glowAnim.setValue(0);
    }
  }, [glowAnim, isPending, isAwaitingDecision]);

  const riskColor = getRiskColor(request.risk_score);
  const confidenceColor = getConfidenceColor(request.confidence);
  const statusConfig = STATUS_CONFIG[request.status];

  const handleLongPress = useCallback(() => {
    if (onLongPress && isPending) {
      onLongPress();
    }
  }, [onLongPress, isPending]);

  const glowBorderColor = glowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['rgba(140, 160, 200, 0)', 'rgba(140, 160, 200, 0.25)'],
  });

  return (
    <Animated.View style={[
      isPending && { transform: [{ scale: pulseAnim }] },
      isPending && isAwaitingDecision && styles.awaitingCard,
    ]}>
      <Animated.View style={[
        styles.cardGlowWrapper,
        isPending && isAwaitingDecision && { borderColor: glowBorderColor },
      ]}>
      <GlassCard style={styles.card} variant="elevated" noPadding interactive={isPending} onPress={handleLongPress}>
        <View style={[styles.cardHeader, { backgroundColor: statusConfig.color + '10' }]}>
          <View style={styles.alertBadge}>
            <AlertTriangle size={16} color={statusConfig.color} />
            <Text style={[styles.alertText, { color: statusConfig.color }]}>SENTINEL X APPROVAL</Text>
          </View>
          <GlassBadge color={statusConfig.color} style={styles.statusBadge}>
            <View style={styles.statusBadgeContent}>
              {statusConfig.icon}
              <Text style={[styles.statusText, { color: statusConfig.color }]}>
                {statusConfig.label}
              </Text>
            </View>
          </GlassBadge>
        </View>

        <View style={styles.cardContent}>
          <View style={styles.actionRow}>
            <View style={styles.actionIcon}>
              {ACTION_ICONS[request.action_type]}
            </View>
            <View style={styles.actionInfo}>
              <Text style={styles.actionLabel}>Action</Text>
              <Text style={styles.actionValue}>{ACTION_LABELS[request.action_type]}</Text>
            </View>
            <Text style={styles.timeAgo}>{formatTimeAgo(request.created_at)}</Text>
          </View>

          <View style={styles.detailRow}>
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>Entity</Text>
              <Text style={styles.detailValue} numberOfLines={1}>{request.entity_id}</Text>
            </View>
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>Mode</Text>
              <GlassBadge color={MODE_COLORS[request.mode]}>
                <Text style={[styles.modeText, { color: MODE_COLORS[request.mode] }]}>
                  {request.mode.toUpperCase()}
                </Text>
              </GlassBadge>
            </View>
          </View>

          <View style={styles.metricsRow}>
            <View style={[styles.metricCard, { borderColor: riskColor + '40' }]}>
              <AlertTriangle size={18} color={riskColor} />
              <Text style={styles.metricLabel}>Risk</Text>
              <Text style={[styles.metricValue, { color: riskColor }]}>
                {request.risk_score.toFixed(0)}
              </Text>
            </View>
            <View style={[styles.metricCard, { borderColor: confidenceColor + '40' }]}>
              <Target size={18} color={confidenceColor} />
              <Text style={styles.metricLabel}>Confidence</Text>
              <Text style={[styles.metricValue, { color: confidenceColor }]}>
                {request.confidence.toFixed(0)}
              </Text>
            </View>
          </View>

          <View style={styles.summarySection}>
            <Text style={styles.summaryLabel}>Why</Text>
            <Text style={styles.summaryText}>{request.summary}</Text>
          </View>

          <QuorumProgress approvals={approvalCount} required={request.quorum_required} />
          
          <ApproversList approvals={request.approvals} />

          {request.deadline && isPending && (
            <GlassBadge color={Colors.warning} style={styles.deadlineContainer}>
              <View style={styles.deadlineContent}>
                <Timer size={14} color={Colors.warning} />
                <Text style={styles.deadlineText}>{formatTimeRemaining(request.deadline)}</Text>
              </View>
            </GlassBadge>
          )}

          {request.status === 'REJECTED_TIMEOUT' && (
            <View style={styles.timeoutBanner}>
              <AlertOctagon size={16} color={Colors.error} />
              <Text style={styles.timeoutText}>Timed out - quorum not reached</Text>
            </View>
          )}
        </View>

        {isPending && (
          <View style={styles.buttonRow}>
            <PressableButton
              style={[
                styles.rejectButton, 
                (isSubmitting || hasUserRejected) && styles.buttonDisabled
              ]}
              onPress={onReject}
              disabled={isSubmitting || hasUserRejected}
              hapticType="error"
            >
              {isSubmitting ? (
                <ActivityIndicator size="small" color={Colors.error} />
              ) : (
                <>
                  <X size={22} color={Colors.error} />
                  <Text style={styles.rejectText}>REJECT</Text>
                </>
              )}
            </PressableButton>
            <PressableButton
              style={[
                styles.approveButton, 
                (isSubmitting || hasUserApproved) && styles.buttonDisabled,
                hasUserApproved && styles.approvedButton
              ]}
              onPress={onApprove}
              disabled={isSubmitting || hasUserApproved}
              hapticType="success"
            >
              <LinearGradient
                colors={hasUserApproved ? [Colors.success + '80', Colors.success + '60'] : [Colors.success, Colors.success]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={StyleSheet.absoluteFill}
              />
              {isSubmitting ? (
                <ActivityIndicator size="small" color={Colors.background} />
              ) : hasUserApproved ? (
                <>
                  <CheckCircle2 size={22} color={Colors.background} />
                  <Text style={styles.approveText}>APPROVED</Text>
                </>
              ) : (
                <>
                  <Check size={22} color={Colors.background} />
                  <Text style={styles.approveText}>APPROVE</Text>
                </>
              )}
            </PressableButton>
          </View>
        )}

        {isResolved && (
          <View style={[styles.resolvedBanner, { backgroundColor: statusConfig.color + '10' }]}>
            {statusConfig.icon}
            <Text style={[styles.resolvedText, { color: statusConfig.color }]}>
              Request {request.status === 'APPROVED' ? 'approved' : 'rejected'} - read only
            </Text>
          </View>
        )}
      </GlassCard>
      </Animated.View>
    </Animated.View>
  );
}

function EmptyState({ onRefresh, isRefreshing }: { onRefresh: () => void; isRefreshing: boolean }) {
  return (
    <View style={styles.emptyState}>
      <Inbox size={64} color={Colors.textMuted} />
      <Text style={styles.emptyTitle}>No Pending Approvals</Text>
      <Text style={styles.emptySubtitle}>
        Quorum approval requests from Sentinel X will appear here
      </Text>
      <PressableButton
        style={styles.refreshButton}
        onPress={onRefresh}
        disabled={isRefreshing}
        hapticType="light"
      >
        <RefreshCw size={18} color={Colors.primary} />
        <Text style={styles.refreshButtonText}>Refresh</Text>
      </PressableButton>
    </View>
  );
}

export default function ApprovalsScreen() {
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const [submittingId, setSubmittingId] = useState<string | null>(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const { enterApprovalFocus } = useCommandFocus();
  const { isAwaitingHumanDecision } = useGlobalState();

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 400,
      useNativeDriver: true,
    }).start();
  }, [fadeAnim]);

  const {
    data: approvals,
    isLoading,
    isError,
    error,
    refetch,
    isRefetching,
  } = useQuery({
    queryKey: ['approvals'],
    queryFn: api.getApprovalInbox,
    refetchInterval: 5000,
    retry: 2,
  });

  const { mutate: submitDecision } = useMutation({
    mutationFn: ({ requestId, decision }: { requestId: string; decision: 'APPROVE' | 'REJECT' }) =>
      api.submitApprovalDecision(requestId, decision, CURRENT_USER_ID),
    onMutate: ({ requestId }) => {
      setSubmittingId(requestId);
    },
    onSuccess: (result, { decision }) => {
      console.log('[Approvals] Decision submitted:', result);
      queryClient.invalidateQueries({ queryKey: ['approvals'] });
      
      if (decision === 'APPROVE') {
        Alert.alert(
          'Vote Recorded',
          'Your approval has been recorded. Waiting for quorum to be reached.'
        );
      } else {
        Alert.alert(
          'Request Rejected',
          'This request has been rejected and will not proceed.'
        );
      }
    },
    onError: (err, { decision }) => {
      console.error('[Approvals] Decision error:', err);
      Alert.alert(
        'Error',
        `Failed to ${decision.toLowerCase()} request: ${err instanceof Error ? err.message : 'Unknown error'}`
      );
    },
    onSettled: () => {
      setSubmittingId(null);
    },
  });

  const handleApprove = useCallback((requestId: string) => {
    Alert.alert(
      'Confirm Approval',
      'Your vote will be recorded toward reaching quorum. This does NOT execute real trades.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Approve',
          style: 'default',
          onPress: () => submitDecision({ requestId, decision: 'APPROVE' }),
        },
      ]
    );
  }, [submitDecision]);

  const handleReject = useCallback((requestId: string) => {
    Alert.alert(
      'Confirm Rejection',
      'Rejecting will immediately cancel this request. This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reject',
          style: 'destructive',
          onPress: () => submitDecision({ requestId, decision: 'REJECT' }),
        },
      ]
    );
  }, [submitDecision]);

  const handleRefresh = useCallback(() => {
    refetch();
  }, [refetch]);

  const handleLongPressApproval = useCallback((request: ApprovalRequest) => {
    enterApprovalFocus(request);
  }, [enterApprovalFocus]);

  if (isLoading) {
    return (
      <View style={styles.container}>
        <LinearGradient
          colors={['#0A0A12', '#050508', '#080810']}
          style={StyleSheet.absoluteFill}
        />
        <Animated.View style={[styles.content, { paddingTop: insets.top }]}>
          <View style={styles.header}>
            <Text style={styles.headerTitle}>APPROVALS</Text>
          </View>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={Colors.primary} />
            <Text style={styles.loadingText}>Loading approvals...</Text>
          </View>
        </Animated.View>
      </View>
    );
  }

  if (isError) {
    return (
      <View style={styles.container}>
        <LinearGradient
          colors={['#0A0A12', '#050508', '#080810']}
          style={StyleSheet.absoluteFill}
        />
        <Animated.View style={[styles.content, { paddingTop: insets.top }]}>
          <View style={styles.header}>
            <Text style={styles.headerTitle}>APPROVALS</Text>
          </View>
          <View style={styles.errorContainer}>
            <AlertTriangle size={48} color={Colors.error} />
            <Text style={styles.errorTitle}>Connection Error</Text>
            <Text style={styles.errorText}>
              {error instanceof Error ? error.message : 'Failed to load approvals'}
            </Text>
            <PressableButton style={styles.retryButton} onPress={handleRefresh} hapticType="light">
              <RefreshCw size={18} color={Colors.text} />
              <Text style={styles.retryText}>Retry</Text>
            </PressableButton>
          </View>
        </Animated.View>
      </View>
    );
  }

  const allApprovals = approvals || [];
  const pendingCount = allApprovals.filter(a => a.status === 'PENDING').length;

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
            <Text style={styles.headerTitle}>APPROVALS</Text>
          </View>
          <PressableButton
            style={styles.focusHintBadge}
            onPress={() => {
              const pendingRequest = allApprovals.find(a => a.status === 'PENDING');
              if (pendingRequest) enterApprovalFocus(pendingRequest);
            }}
            hapticType="light"
          >
            <Focus size={16} color={Colors.primary} />
          </PressableButton>
          <GlassBadge style={styles.headerBadge}>
            <View style={styles.headerBadgeContent}>
              <Clock size={14} color={Colors.textSecondary} />
              <Text style={styles.headerCount}>
                {pendingCount} pending
              </Text>
            </View>
          </GlassBadge>
        </View>

        <View style={styles.governanceBanner}>
          <LinearGradient
            colors={[Colors.primary + '15', Colors.primary + '08']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={StyleSheet.absoluteFill}
          />
          <Shield size={14} color={Colors.primary} />
          <Text style={styles.governanceText}>
            QUORUM REQUIRED — NO SINGLE HUMAN CAN APPROVE
          </Text>
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={handleRefresh}
              tintColor={Colors.primary}
              colors={[Colors.primary]}
            />
          }
        >
          {allApprovals.length === 0 ? (
            <EmptyState onRefresh={handleRefresh} isRefreshing={isRefetching} />
          ) : (
            allApprovals.map((request) => (
              <ApprovalCard
                key={request.request_id}
                request={request}
                onApprove={() => handleApprove(request.request_id)}
                onReject={() => handleReject(request.request_id)}
                isSubmitting={submittingId === request.request_id}
                currentUserId={CURRENT_USER_ID}
                onLongPress={() => handleLongPressApproval(request)}
                isAwaitingDecision={isAwaitingHumanDecision}
              />
            ))
          )}
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
    width: 240,
    height: 240,
    top: 60,
    right: -80,
    backgroundColor: Colors.primary,
  },
  glowOrb2: {
    width: 180,
    height: 180,
    bottom: 200,
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
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: Colors.primary + '15',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.primary + '30',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800' as const,
    color: Colors.text,
    letterSpacing: 1,
  },
  headerBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  focusHintBadge: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: Colors.primary + '15',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.primary + '30',
    marginRight: 8,
  },
  headerBadgeContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  headerCount: {
    fontSize: 13,
    color: Colors.textSecondary,
    fontWeight: '600' as const,
  },
  governanceBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 10,
    marginHorizontal: 16,
    borderRadius: 10,
    overflow: 'hidden',
  },
  governanceText: {
    fontSize: 11,
    fontWeight: '700' as const,
    color: Colors.primary,
    letterSpacing: 0.5,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 100,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  loadingText: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    gap: 12,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: Colors.text,
    marginTop: 8,
  },
  errorText: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(255,255,255,0.08)',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  retryText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.text,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 80,
    gap: 12,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: Colors.text,
    marginTop: 16,
  },
  emptySubtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    maxWidth: 260,
    lineHeight: 20,
  },
  refreshButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(255,255,255,0.08)',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  refreshButtonText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.primary,
  },
  card: {
    marginBottom: 16,
  },
  cardGlowWrapper: {
    borderRadius: 22,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  awaitingCard: {
    shadowColor: 'rgba(140, 160, 200, 0.4)',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 14,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  alertBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  alertText: {
    fontSize: 11,
    fontWeight: '800' as const,
    letterSpacing: 0.5,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  statusBadgeContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700' as const,
  },
  timeAgo: {
    fontSize: 12,
    color: Colors.textMuted,
  },
  cardContent: {
    padding: 16,
    gap: 14,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  actionIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.05)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionInfo: {
    flex: 1,
  },
  actionLabel: {
    fontSize: 11,
    color: Colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  actionValue: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: Colors.text,
  },
  detailRow: {
    flexDirection: 'row',
    gap: 16,
  },
  detailItem: {
    flex: 1,
  },
  detailLabel: {
    fontSize: 11,
    color: Colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.text,
  },
  modeText: {
    fontSize: 12,
    fontWeight: '700' as const,
    letterSpacing: 0.5,
  },
  metricsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  metricCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(255,255,255,0.03)',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  metricLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
    flex: 1,
  },
  metricValue: {
    fontSize: 20,
    fontWeight: '800' as const,
  },
  summarySection: {
    backgroundColor: 'rgba(255,255,255,0.03)',
    padding: 14,
    borderRadius: 12,
  },
  summaryLabel: {
    fontSize: 11,
    color: Colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  summaryText: {
    fontSize: 14,
    color: Colors.text,
    lineHeight: 20,
  },
  quorumContainer: {
    backgroundColor: 'rgba(255,255,255,0.03)',
    padding: 14,
    borderRadius: 12,
    gap: 10,
  },
  quorumHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  quorumTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  quorumTitle: {
    fontSize: 11,
    fontWeight: '700' as const,
    color: Colors.textSecondary,
    letterSpacing: 0.5,
  },
  quorumCount: {
    fontSize: 18,
    fontWeight: '800' as const,
    color: Colors.warning,
  },
  quorumComplete: {
    color: Colors.success,
  },
  quorumBar: {
    height: 8,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 4,
    overflow: 'hidden',
  },
  quorumBarFill: {
    height: '100%',
    borderRadius: 4,
    overflow: 'hidden',
  },
  quorumHelp: {
    fontSize: 12,
    color: Colors.textMuted,
  },
  approversContainer: {
    backgroundColor: 'rgba(255,255,255,0.03)',
    padding: 14,
    borderRadius: 12,
    gap: 8,
  },
  approversTitle: {
    fontSize: 11,
    fontWeight: '700' as const,
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  noApprovers: {
    fontSize: 13,
    color: Colors.textMuted,
    fontStyle: 'italic',
  },
  approverRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  approverName: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.text,
    flex: 1,
  },
  approverTime: {
    fontSize: 12,
    color: Colors.textMuted,
  },
  deadlineContainer: {
    alignSelf: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  deadlineContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  deadlineText: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: Colors.warning,
  },
  timeoutBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.error + '15',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
  },
  timeoutText: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: Colors.error,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
    padding: 16,
    paddingTop: 4,
  },
  approveButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    borderRadius: 14,
    overflow: 'hidden',
  },
  approvedButton: {},
  approveText: {
    fontSize: 15,
    fontWeight: '800' as const,
    color: Colors.background,
    letterSpacing: 0.5,
  },
  rejectButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.error + '15',
    paddingVertical: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.error + '40',
  },
  rejectText: {
    fontSize: 15,
    fontWeight: '800' as const,
    color: Colors.error,
    letterSpacing: 0.5,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  resolvedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  resolvedText: {
    fontSize: 13,
    fontWeight: '600' as const,
  },
});
