import React, { useCallback, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Pressable,
  Platform,
  Dimensions,
  ActivityIndicator,
  PanResponder,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  X,
  Check,
  AlertTriangle,
  Shield,
  Target,
  Zap,
  Clock,
  Users,
  Lock,
  Snowflake,
  Play,
} from 'lucide-react-native';
import Colors from '@/constants/colors';
import { useCommandFocus, FocusTarget } from '@/providers/CommandFocusProvider';
import { useOperationalMode } from '@/providers/OperationalModeProvider';
import { triggerHaptic } from '@/hooks/useHaptics';
import { ApprovalRequest, ApprovalActionType } from '@/types/bot';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const SWIPE_THRESHOLD = 120;

const ACTION_ICONS: Record<ApprovalActionType, React.ReactNode> = {
  trade: <Zap size={24} color={Colors.warning} />,
  promote: <Target size={24} color={Colors.success} />,
  config_change: <Shield size={24} color={Colors.primary} />,
};

const ACTION_LABELS: Record<ApprovalActionType, string> = {
  trade: 'Trade Execution',
  promote: 'Strategy Promotion',
  config_change: 'Configuration Change',
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

interface FocusButtonProps {
  onPress: () => void;
  variant: 'approve' | 'reject' | 'confirm' | 'cancel';
  label: string;
  disabled?: boolean;
  loading?: boolean;
}

function FocusButton({ onPress, variant, label, disabled, loading }: FocusButtonProps) {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;

  const handlePressIn = useCallback(() => {
    if (disabled) return;
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 0.96,
        tension: 100,
        friction: 10,
        useNativeDriver: true,
      }),
      Animated.timing(glowAnim, {
        toValue: 1,
        duration: 150,
        useNativeDriver: false,
      }),
    ]).start();
    triggerHaptic('selection');
  }, [disabled, scaleAnim, glowAnim]);

  const handlePressOut = useCallback(() => {
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 100,
        friction: 10,
        useNativeDriver: true,
      }),
      Animated.timing(glowAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: false,
      }),
    ]).start();
  }, [scaleAnim, glowAnim]);

  const getButtonStyle = () => {
    switch (variant) {
      case 'approve':
      case 'confirm':
        return styles.approveButton;
      case 'reject':
        return styles.rejectButton;
      case 'cancel':
        return styles.cancelButton;
    }
  };

  const getGradientColors = (): readonly [string, string] => {
    switch (variant) {
      case 'approve':
      case 'confirm':
        return [Colors.success, Colors.success + 'DD'] as const;
      case 'reject':
        return [Colors.error + '30', Colors.error + '20'] as const;
      case 'cancel':
        return ['rgba(255,255,255,0.08)', 'rgba(255,255,255,0.04)'] as const;
    }
  };

  const getTextColor = () => {
    switch (variant) {
      case 'approve':
      case 'confirm':
        return Colors.background;
      case 'reject':
        return Colors.error;
      case 'cancel':
        return Colors.textSecondary;
    }
  };

  const getIcon = () => {
    switch (variant) {
      case 'approve':
      case 'confirm':
        return <Check size={22} color={Colors.background} />;
      case 'reject':
        return <X size={22} color={Colors.error} />;
      case 'cancel':
        return <X size={20} color={Colors.textSecondary} />;
    }
  };

  return (
    <Pressable
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onPress={onPress}
      disabled={disabled || loading}
    >
      <Animated.View
        style={[
          styles.focusButton,
          getButtonStyle(),
          { transform: [{ scale: scaleAnim }] },
          disabled && styles.buttonDisabled,
        ]}
      >
        <LinearGradient
          colors={getGradientColors()}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={StyleSheet.absoluteFill}
        />
        {loading ? (
          <ActivityIndicator size="small" color={getTextColor()} />
        ) : (
          <>
            {getIcon()}
            <Text style={[styles.focusButtonText, { color: getTextColor() }]}>
              {label}
            </Text>
          </>
        )}
      </Animated.View>
    </Pressable>
  );
}

interface ApprovalFocusContentProps {
  approval: ApprovalRequest;
  onApprove: () => void;
  onReject: () => void;
  isLocked: boolean;
}

function ApprovalFocusContent({ approval, onApprove, onReject, isLocked }: ApprovalFocusContentProps) {
  const riskColor = getRiskColor(approval.risk_score);
  const confidenceColor = getConfidenceColor(approval.confidence);
  const approvalCount = approval.approvals.filter(a => a.decision === 'APPROVE').length;

  return (
    <View style={styles.focusContent}>
      <View style={styles.focusHeader}>
        <View style={styles.focusIconContainer}>
          {ACTION_ICONS[approval.action_type]}
        </View>
        <View style={styles.focusHeaderText}>
          <Text style={styles.focusLabel}>APPROVAL REQUEST</Text>
          <Text style={styles.focusTitle}>{ACTION_LABELS[approval.action_type]}</Text>
        </View>
      </View>

      <View style={styles.focusDivider} />

      <View style={styles.metricsGrid}>
        <View style={[styles.metricBox, { borderColor: riskColor + '40' }]}>
          <AlertTriangle size={20} color={riskColor} />
          <Text style={styles.metricLabel}>Risk Score</Text>
          <Text style={[styles.metricValue, { color: riskColor }]}>
            {approval.risk_score.toFixed(0)}
          </Text>
        </View>
        <View style={[styles.metricBox, { borderColor: confidenceColor + '40' }]}>
          <Target size={20} color={confidenceColor} />
          <Text style={styles.metricLabel}>Confidence</Text>
          <Text style={[styles.metricValue, { color: confidenceColor }]}>
            {approval.confidence.toFixed(0)}
          </Text>
        </View>
      </View>

      <View style={styles.summaryBox}>
        <Text style={styles.summaryLabel}>PLAIN-ENGLISH SUMMARY</Text>
        <Text style={styles.summaryText}>{approval.summary}</Text>
      </View>

      <View style={styles.contextRow}>
        <View style={styles.contextItem}>
          <Users size={16} color={Colors.textSecondary} />
          <Text style={styles.contextText}>
            {approvalCount} / {approval.quorum_required} quorum
          </Text>
        </View>
        <View style={styles.contextItem}>
          <Clock size={16} color={Colors.textSecondary} />
          <Text style={styles.contextText}>
            {new Date(approval.created_at).toLocaleTimeString()}
          </Text>
        </View>
      </View>

      {isLocked ? (
        <View style={styles.lockedContainer}>
          <Lock size={24} color={Colors.warning} />
          <Text style={styles.lockedText}>Focus Locked – Awaiting Governance</Text>
          <Text style={styles.lockedSubtext}>Actions disabled until connection restored</Text>
        </View>
      ) : (
        <View style={styles.actionButtons}>
          <FocusButton
            variant="reject"
            label="REJECT"
            onPress={onReject}
          />
          <FocusButton
            variant="approve"
            label="APPROVE"
            onPress={onApprove}
          />
        </View>
      )}
    </View>
  );
}

interface FreezeFocusContentProps {
  reason?: string;
  onConfirm: () => void;
  onCancel: () => void;
  isLocked: boolean;
}

function FreezeFocusContent({ reason, onConfirm, onCancel, isLocked }: FreezeFocusContentProps) {
  return (
    <View style={styles.focusContent}>
      <View style={styles.focusHeader}>
        <View style={[styles.focusIconContainer, { backgroundColor: Colors.warning + '20' }]}>
          <Snowflake size={24} color={Colors.warning} />
        </View>
        <View style={styles.focusHeaderText}>
          <Text style={styles.focusLabel}>SYSTEM CEREMONY</Text>
          <Text style={styles.focusTitle}>Freeze System</Text>
        </View>
      </View>

      <View style={styles.focusDivider} />

      <View style={styles.summaryBox}>
        <Text style={styles.summaryLabel}>ACTION DESCRIPTION</Text>
        <Text style={styles.summaryText}>
          Freezing the system will immediately halt all trading operations. 
          Shadow strategies will continue to monitor but no signals will be executed.
        </Text>
      </View>

      {reason && (
        <View style={styles.summaryBox}>
          <Text style={styles.summaryLabel}>REASON</Text>
          <Text style={styles.summaryText}>{reason}</Text>
        </View>
      )}

      {isLocked ? (
        <View style={styles.lockedContainer}>
          <Lock size={24} color={Colors.warning} />
          <Text style={styles.lockedText}>Focus Locked – Awaiting Governance</Text>
        </View>
      ) : (
        <View style={styles.actionButtons}>
          <FocusButton variant="cancel" label="CANCEL" onPress={onCancel} />
          <FocusButton variant="confirm" label="FREEZE" onPress={onConfirm} />
        </View>
      )}
    </View>
  );
}

interface ResumeFocusContentProps {
  intent?: string;
  onConfirm: () => void;
  onCancel: () => void;
  isLocked: boolean;
}

function ResumeFocusContent({ intent, onConfirm, onCancel, isLocked }: ResumeFocusContentProps) {
  return (
    <View style={styles.focusContent}>
      <View style={styles.focusHeader}>
        <View style={[styles.focusIconContainer, { backgroundColor: Colors.success + '20' }]}>
          <Play size={24} color={Colors.success} />
        </View>
        <View style={styles.focusHeaderText}>
          <Text style={styles.focusLabel}>SYSTEM CEREMONY</Text>
          <Text style={styles.focusTitle}>Resume Operations</Text>
        </View>
      </View>

      <View style={styles.focusDivider} />

      <View style={styles.summaryBox}>
        <Text style={styles.summaryLabel}>ACTION DESCRIPTION</Text>
        <Text style={styles.summaryText}>
          Resuming operations will restore the system to its previous operational state.
          All enabled strategies will begin processing signals again.
        </Text>
      </View>

      {intent && (
        <View style={styles.summaryBox}>
          <Text style={styles.summaryLabel}>INTENT</Text>
          <Text style={styles.summaryText}>{intent}</Text>
        </View>
      )}

      {isLocked ? (
        <View style={styles.lockedContainer}>
          <Lock size={24} color={Colors.warning} />
          <Text style={styles.lockedText}>Focus Locked – Awaiting Governance</Text>
        </View>
      ) : (
        <View style={styles.actionButtons}>
          <FocusButton variant="cancel" label="CANCEL" onPress={onCancel} />
          <FocusButton variant="confirm" label="RESUME" onPress={onConfirm} />
        </View>
      )}
    </View>
  );
}

interface WarningFocusContentProps {
  message: string;
  severity: string;
  onDismiss: () => void;
}

function WarningFocusContent({ message, severity, onDismiss }: WarningFocusContentProps) {
  const severityColor = severity === 'critical' ? Colors.error : Colors.warning;

  return (
    <View style={styles.focusContent}>
      <View style={styles.focusHeader}>
        <View style={[styles.focusIconContainer, { backgroundColor: severityColor + '20' }]}>
          <AlertTriangle size={24} color={severityColor} />
        </View>
        <View style={styles.focusHeaderText}>
          <Text style={styles.focusLabel}>SYSTEM WARNING</Text>
          <Text style={[styles.focusTitle, { color: severityColor }]}>
            {severity.toUpperCase()}
          </Text>
        </View>
      </View>

      <View style={styles.focusDivider} />

      <View style={styles.summaryBox}>
        <Text style={styles.summaryLabel}>MESSAGE</Text>
        <Text style={styles.summaryText}>{message}</Text>
      </View>

      <View style={styles.actionButtons}>
        <FocusButton variant="cancel" label="ACKNOWLEDGE" onPress={onDismiss} />
      </View>
    </View>
  );
}

function FocusContentRenderer({
  target,
  isLocked,
  onApprove,
  onReject,
  onConfirm,
  onCancel,
}: {
  target: FocusTarget;
  isLocked: boolean;
  onApprove: () => void;
  onReject: () => void;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  if (!target) return null;

  switch (target.type) {
    case 'approval':
      return (
        <ApprovalFocusContent
          approval={target.data}
          onApprove={onApprove}
          onReject={onReject}
          isLocked={isLocked}
        />
      );
    case 'freeze':
      return (
        <FreezeFocusContent
          reason={target.data.reason}
          onConfirm={onConfirm}
          onCancel={onCancel}
          isLocked={isLocked}
        />
      );
    case 'resume':
      return (
        <ResumeFocusContent
          intent={target.data.intent}
          onConfirm={onConfirm}
          onCancel={onCancel}
          isLocked={isLocked}
        />
      );
    case 'warning':
      return (
        <WarningFocusContent
          message={target.data.message}
          severity={target.data.severity}
          onDismiss={onCancel}
        />
      );
  }
}

export default function CommandFocusOverlay() {
  const insets = useSafeAreaInsets();
  const { isCalm } = useOperationalMode();
  const {
    isActive,
    target,
    isLocked,
    animatedProgress,
    panelScale,
    exitFocus,
    completeAction,
  } = useCommandFocus();

  const translateY = useRef(new Animated.Value(0)).current;

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return gestureState.dy > 10 && Math.abs(gestureState.dx) < Math.abs(gestureState.dy);
      },
      onPanResponderMove: (_, gestureState) => {
        if (gestureState.dy > 0) {
          translateY.setValue(gestureState.dy * 0.5);
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dy > SWIPE_THRESHOLD) {
          triggerHaptic('light');
          exitFocus();
        }
        Animated.spring(translateY, {
          toValue: 0,
          tension: 100,
          friction: 10,
          useNativeDriver: true,
        }).start();
      },
    })
  ).current;

  useEffect(() => {
    if (!isActive) {
      translateY.setValue(0);
    }
  }, [isActive, translateY]);

  const handleApprove = useCallback(() => {
    triggerHaptic('success');
    completeAction(true);
  }, [completeAction]);

  const handleReject = useCallback(() => {
    triggerHaptic('error');
    completeAction(false);
  }, [completeAction]);

  const handleConfirm = useCallback(() => {
    triggerHaptic('success');
    completeAction(true);
  }, [completeAction]);

  const handleCancel = useCallback(() => {
    triggerHaptic('light');
    completeAction(false);
  }, [completeAction]);

  if (!isActive && animatedProgress === 0) {
    return null;
  }

  const backgroundOpacity = animatedProgress * (isCalm ? 0.95 : 0.92);

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents={isActive ? 'auto' : 'none'}>
      <Animated.View
        style={[
          StyleSheet.absoluteFill,
          { opacity: animatedProgress },
        ]}
      >
        {Platform.OS === 'web' ? (
          <View style={[styles.webBackdrop, { opacity: backgroundOpacity }]} />
        ) : (
          <BlurView
            intensity={isCalm ? 60 : 40}
            tint="dark"
            style={StyleSheet.absoluteFill}
          />
        )}
        <LinearGradient
          colors={['rgba(5,5,8,0.85)', 'rgba(5,5,8,0.95)', 'rgba(5,5,8,0.98)']}
          style={[StyleSheet.absoluteFill, { opacity: backgroundOpacity }]}
        />
        <View style={styles.vignette} />
      </Animated.View>

      <Animated.View
        style={[
          styles.panelContainer,
          {
            paddingTop: insets.top + 60,
            paddingBottom: insets.bottom + 40,
            opacity: animatedProgress,
            transform: [
              { scale: panelScale },
              { translateY },
            ],
          },
        ]}
        {...panResponder.panHandlers}
      >
        <Pressable style={styles.exitButton} onPress={exitFocus}>
          <View style={styles.exitButtonInner}>
            <X size={20} color={Colors.textSecondary} />
          </View>
        </Pressable>

        <View style={styles.swipeIndicator}>
          <View style={styles.swipeHandle} />
          <Text style={styles.swipeHint}>Swipe down to exit</Text>
        </View>

        <View style={styles.glassPanel}>
          {Platform.OS === 'web' ? (
            <View style={styles.webGlassBackground} />
          ) : (
            <BlurView intensity={50} tint="dark" style={StyleSheet.absoluteFill} />
          )}
          <LinearGradient
            colors={['rgba(255,255,255,0.06)', 'rgba(255,255,255,0.02)', 'rgba(0,0,0,0.02)']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
          <View style={styles.panelBorder} />

          <FocusContentRenderer
            target={target}
            isLocked={isLocked}
            onApprove={handleApprove}
            onReject={handleReject}
            onConfirm={handleConfirm}
            onCancel={handleCancel}
          />
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  webBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(5, 5, 8, 0.95)',
    backdropFilter: 'blur(40px)',
  },
  vignette: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'transparent',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: SCREEN_HEIGHT * 0.3,
  },
  panelContainer: {
    flex: 1,
    paddingHorizontal: 20,
    justifyContent: 'center',
  },
  exitButton: {
    position: 'absolute',
    top: 60,
    right: 20,
    zIndex: 10,
  },
  exitButtonInner: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.08)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  swipeIndicator: {
    position: 'absolute',
    top: 16,
    left: 0,
    right: 0,
    alignItems: 'center',
    gap: 8,
  },
  swipeHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  swipeHint: {
    fontSize: 12,
    color: Colors.textMuted,
    letterSpacing: 0.5,
  },
  glassPanel: {
    borderRadius: 28,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.4,
    shadowRadius: 32,
    elevation: 24,
  },
  webGlassBackground: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(13, 13, 18, 0.85)',
    backdropFilter: 'blur(50px)',
  },
  panelBorder: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    pointerEvents: 'none',
  },
  focusContent: {
    padding: 28,
    gap: 20,
  },
  focusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  focusIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.05)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  focusHeaderText: {
    flex: 1,
  },
  focusLabel: {
    fontSize: 11,
    fontWeight: '700' as const,
    color: Colors.textMuted,
    letterSpacing: 1,
    marginBottom: 4,
  },
  focusTitle: {
    fontSize: 22,
    fontWeight: '800' as const,
    color: Colors.text,
  },
  focusDivider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.06)',
    marginVertical: 4,
  },
  metricsGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  metricBox: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
  },
  metricLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  metricValue: {
    fontSize: 32,
    fontWeight: '800' as const,
  },
  summaryBox: {
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 16,
    padding: 18,
    gap: 8,
  },
  summaryLabel: {
    fontSize: 11,
    fontWeight: '700' as const,
    color: Colors.textMuted,
    letterSpacing: 0.5,
  },
  summaryText: {
    fontSize: 15,
    color: Colors.text,
    lineHeight: 22,
  },
  contextRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  contextItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  contextText: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  lockedContainer: {
    alignItems: 'center',
    padding: 24,
    gap: 12,
    backgroundColor: Colors.warning + '10',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.warning + '30',
  },
  lockedText: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: Colors.warning,
    textAlign: 'center',
  },
  lockedSubtext: {
    fontSize: 13,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  focusButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 18,
    borderRadius: 16,
    overflow: 'hidden',
  },
  approveButton: {
    borderWidth: 0,
  },
  rejectButton: {
    borderWidth: 1,
    borderColor: Colors.error + '50',
  },
  cancelButton: {
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  focusButtonText: {
    fontSize: 16,
    fontWeight: '800' as const,
    letterSpacing: 0.5,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
});
