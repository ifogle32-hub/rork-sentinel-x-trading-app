import React, { useRef, useEffect, useMemo, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  Animated,
  Platform,
  Modal,
  Pressable,
  Dimensions,
  TextInput,
  KeyboardAvoidingView,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import {
  Brain,
  Activity,
  Clock,
  Eye,
  CheckCircle2,
  XCircle,
  Users,
  Snowflake,
  Play,
  Ghost,
  FileCheck,
  Timer,
  AlertTriangle,
  Radio,
  HelpCircle,
  X,
  CircleDot,
  AlertOctagon,
  Sparkles,
  ChevronRight,
  Shield,
  Zap,
  Lock,
  Settings,
  TrendingUp,
  ShieldCheck,
  Scale,
  AlertCircle,
  EyeOff,
  PenLine,
  FileText,
  Trash2,
} from 'lucide-react-native';
import Colors from '@/constants/colors';
import { api } from '@/lib/api';
import { useConnection } from '@/providers/ConnectionProvider';
import { useAdaptiveGlass } from '@/providers/AdaptiveGlassProvider';
import { GovernanceEvent, GovernanceEventType, GlobalSystemState, DecisionExplanation, HypotheticalScenario, HypotheticalAnalysis, GuardrailRule, DecisionNote } from '@/types/bot';
import { triggerHaptic } from '@/hooks/useHaptics';
import GlassCard, { GlassBadge } from '@/components/GlassCard';
import DecisionConfidenceMeter, { getConfidenceLevelFromScore, ConfidenceLevel } from '@/components/DecisionConfidenceMeter';
import CognitiveLoadIndicator from '@/components/CognitiveLoadIndicator';

type BrainStatus = 'ONLINE' | 'WAITING' | 'FROZEN';

const getBrainStatus = (
  governanceOnline: boolean,
  globalState?: GlobalSystemState,
  pendingApprovals?: number
): BrainStatus => {
  if (!governanceOnline) return 'ONLINE';
  if (globalState === 'FROZEN') return 'FROZEN';
  if (pendingApprovals && pendingApprovals > 0) return 'WAITING';
  return 'ONLINE';
};

const getStatusColor = (status: BrainStatus, isFrozen: boolean) => {
  if (isFrozen) return Colors.textMuted;
  switch (status) {
    case 'ONLINE': return '#6EE7B7';
    case 'WAITING': return '#A78BFA';
    case 'FROZEN': return Colors.warning;
    default: return Colors.textMuted;
  }
};

const getModeLabel = (state?: GlobalSystemState): string => {
  switch (state) {
    case 'LIVE': return 'LIVE';
    case 'SHADOW_ONLY': return 'SHADOW';
    case 'FROZEN': return 'FROZEN';
    case 'OFF': return 'OFF';
    default: return '—';
  }
};

const formatTimestamp = (timestamp?: string): string => {
  if (!timestamp) return '—';
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

const getReasoningSummary = (
  globalState?: GlobalSystemState,
  pendingApprovals?: number,
  brainStatus?: BrainStatus
): string => {
  if (globalState === 'FROZEN') {
    return 'Execution blocked: system frozen';
  }

  if (globalState === 'SHADOW_ONLY') {
    if (pendingApprovals && pendingApprovals > 0) {
      return 'Shadow mode active – awaiting human decision';
    }
    return 'Shadow strategies only – execution disabled';
  }

  if (globalState === 'OFF') {
    return 'System offline – no active operations';
  }

  if (globalState === 'LIVE') {
    if (pendingApprovals && pendingApprovals > 0) {
      return pendingApprovals === 1
        ? 'Awaiting quorum approval'
        : `Awaiting approval on ${pendingApprovals} decisions`;
    }
    return 'Live operation – all systems nominal';
  }

  if (brainStatus === 'WAITING') {
    return 'Awaiting human decision';
  }

  return 'Monitoring system activity';
};

const EVENT_CONFIG: Record<GovernanceEventType, {
  icon: React.ReactNode;
  color: string;
  label: string;
}> = {
  APPROVAL_REQUESTED: {
    icon: <FileCheck size={14} color={Colors.warning} />,
    color: Colors.warning,
    label: 'Approval Requested',
  },
  APPROVAL_GRANTED: {
    icon: <CheckCircle2 size={14} color={Colors.success} />,
    color: Colors.success,
    label: 'Approved',
  },
  APPROVAL_DENIED: {
    icon: <XCircle size={14} color={Colors.error} />,
    color: Colors.error,
    label: 'Rejected',
  },
  APPROVAL_TIMED_OUT: {
    icon: <Timer size={14} color={Colors.textMuted} />,
    color: Colors.textMuted,
    label: 'Timed Out',
  },
  QUORUM_REACHED: {
    icon: <Users size={14} color={Colors.primary} />,
    color: Colors.primary,
    label: 'Quorum Reached',
  },
  SYSTEM_FROZEN: {
    icon: <Snowflake size={14} color="#64B5F6" />,
    color: '#64B5F6',
    label: 'System Frozen',
  },
  SYSTEM_RESUMED: {
    icon: <Play size={14} color={Colors.success} />,
    color: Colors.success,
    label: 'System Resumed',
  },
  SHADOW_STRATEGY_CREATED: {
    icon: <Ghost size={14} color={Colors.textSecondary} />,
    color: Colors.textSecondary,
    label: 'Shadow Created',
  },
};

function formatEventTime(timestamp: string): { date: string; time: string } {
  const d = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  let date: string;
  if (diffDays === 0) {
    date = 'Today';
  } else if (diffDays === 1) {
    date = 'Yesterday';
  } else if (diffDays < 7) {
    date = `${diffDays}d ago`;
  } else {
    date = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }

  const time = d.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });

  return { date, time };
}

interface GovernanceBrainCardProps {
  isDarker: boolean;
}

function GovernanceBrainCard({ isDarker }: GovernanceBrainCardProps) {
  const { governanceState, governanceStatus } = useConnection();

  const pulseAnim = useRef(new Animated.Value(1)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;

  const isGovernanceOnline = governanceState === 'ONLINE';
  const globalState = governanceStatus?.global_state;
  const pendingApprovals = governanceStatus?.pending_approvals ?? 0;
  const lastBroadcast = governanceStatus?.last_broadcast;

  const brainStatus = getBrainStatus(isGovernanceOnline, globalState, pendingApprovals);
  const isFrozen = globalState === 'FROZEN';
  const isWaiting = brainStatus === 'WAITING';
  const statusColor = getStatusColor(brainStatus, isFrozen);

  useEffect(() => {
    if (isWaiting && !isFrozen) {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 0.6,
            duration: 1800,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1800,
            useNativeDriver: true,
          }),
        ])
      );

      const glow = Animated.loop(
        Animated.sequence([
          Animated.timing(glowAnim, {
            toValue: 1,
            duration: 2000,
            useNativeDriver: true,
          }),
          Animated.timing(glowAnim, {
            toValue: 0,
            duration: 2000,
            useNativeDriver: true,
          }),
        ])
      );

      pulse.start();
      glow.start();

      return () => {
        pulse.stop();
        glow.stop();
      };
    } else {
      pulseAnim.setValue(1);
      glowAnim.setValue(0);
    }
  }, [isWaiting, isFrozen, pulseAnim, glowAnim]);

  const renderContent = () => (
    <View style={styles.brainInnerContent}>
      <View style={styles.brainHeaderRow}>
        <View style={styles.brainIconContainer}>
          <Animated.View
            style={[
              styles.brainGlow,
              {
                backgroundColor: statusColor,
                opacity: glowAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, 0.3],
                }),
              },
            ]}
          />
          <Brain size={20} color={statusColor} strokeWidth={1.8} />
        </View>
        <View style={styles.brainTitleContainer}>
          <Text style={[styles.brainLabel, isFrozen && styles.textFrozen]}>
            Governance Brain
          </Text>
          <Text style={styles.brainSubtitle}>n8n orchestration layer</Text>
        </View>
        <View
          style={[
            styles.statusBadge,
            { backgroundColor: statusColor + '20', borderColor: statusColor + '40' },
          ]}
        >
          <Animated.View
            style={[styles.statusDot, { backgroundColor: statusColor, opacity: pulseAnim }]}
          />
          <Text style={[styles.statusText, { color: statusColor }]}>{brainStatus}</Text>
        </View>
      </View>

      <View style={styles.brainDetailsRow}>
        <View style={styles.brainDetailItem}>
          <Text style={[styles.brainDetailLabel, isFrozen && styles.textFrozen]}>MODE</Text>
          <Text style={[styles.brainDetailValue, isFrozen && styles.textFrozen]}>
            {getModeLabel(globalState)}
          </Text>
        </View>

        <View style={styles.brainDetailDivider} />

        <View style={styles.brainDetailItem}>
          <Text style={[styles.brainDetailLabel, isFrozen && styles.textFrozen]}>DECISIONS</Text>
          <View style={styles.decisionRow}>
            <Activity
              size={10}
              color={pendingApprovals > 0 ? statusColor : Colors.textMuted}
            />
            <Text
              style={[
                styles.brainDetailValue,
                pendingApprovals > 0 && !isFrozen && { color: statusColor },
                isFrozen && styles.textFrozen,
              ]}
            >
              {pendingApprovals}
            </Text>
          </View>
        </View>

        <View style={styles.brainDetailDivider} />

        <View style={styles.brainDetailItem}>
          <Text style={[styles.brainDetailLabel, isFrozen && styles.textFrozen]}>LAST</Text>
          <View style={styles.timestampRow}>
            <Clock size={10} color={Colors.textMuted} />
            <Text
              style={[styles.brainDetailValue, styles.timestampText, isFrozen && styles.textFrozen]}
            >
              {formatTimestamp(lastBroadcast?.timestamp)}
            </Text>
          </View>
        </View>
      </View>
    </View>
  );

  if (Platform.OS === 'web') {
    return (
      <View
        style={[
          styles.brainContainer,
          isFrozen && styles.brainContainerFrozen,
          isDarker && styles.brainContainerDarker,
          styles.webBrainContainer,
        ]}
      >
        {renderContent()}
      </View>
    );
  }

  return (
    <View
      style={[
        styles.brainContainer,
        isFrozen && styles.brainContainerFrozen,
        isDarker && styles.brainContainerDarker,
      ]}
    >
      <BlurView intensity={isDarker ? 50 : 35} tint="dark" style={styles.blurView}>
        {renderContent()}
      </BlurView>
    </View>
  );
}

function CurrentStateCard({ isDarker }: { isDarker: boolean }) {
  const { governanceState, governanceStatus } = useConnection();
  const pulseAnim = useRef(new Animated.Value(0.4)).current;

  const isGovernanceOnline = governanceState === 'ONLINE';
  const globalState = governanceStatus?.global_state;
  const pendingApprovals = governanceStatus?.pending_approvals ?? 0;

  const brainStatus = getBrainStatus(isGovernanceOnline, globalState, pendingApprovals);
  const isWaiting = brainStatus === 'WAITING';
  const isFrozen = globalState === 'FROZEN';

  const reasoningSummary = useMemo(
    () => getReasoningSummary(globalState, pendingApprovals, brainStatus),
    [globalState, pendingApprovals, brainStatus]
  );

  useEffect(() => {
    if (isWaiting) {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1500,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 0.4,
            duration: 1500,
            useNativeDriver: true,
          }),
        ])
      );
      pulse.start();
      return () => pulse.stop();
    } else {
      pulseAnim.setValue(0.4);
    }
  }, [isWaiting, pulseAnim]);

  const stateColor = isWaiting ? '#A78BFA' : isFrozen ? '#64B5F6' : '#6EE7B7';
  const stateIcon = isWaiting ? (
    <Radio size={18} color={stateColor} />
  ) : isFrozen ? (
    <Snowflake size={18} color={stateColor} />
  ) : (
    <Eye size={18} color={stateColor} />
  );

  const stateLabel = isWaiting
    ? 'Awaiting Decision'
    : isFrozen
    ? 'System Frozen'
    : 'Standing By';

  return (
    <GlassCard style={[styles.stateCard, isDarker && styles.stateCardDarker]} variant="elevated">
      <View style={styles.stateHeader}>
        <Animated.View style={[styles.stateIconContainer, { opacity: isWaiting ? pulseAnim : 1 }]}>
          <View style={[styles.stateIconBg, { backgroundColor: stateColor + '15' }]}>
            {stateIcon}
          </View>
        </Animated.View>
        <View style={styles.stateTitleContainer}>
          <Text style={styles.stateTitle}>{stateLabel}</Text>
          <Text style={styles.stateSubtitle}>Current governance posture</Text>
        </View>
      </View>

      <View style={[styles.reasoningContainer, { borderColor: stateColor + '20' }]}>
        <Text style={styles.reasoningText}>{reasoningSummary}</Text>
      </View>

      {isWaiting && (
        <View style={styles.waitingBanner}>
          <LinearGradient
            colors={['#A78BFA15', '#A78BFA08']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={StyleSheet.absoluteFill}
          />
          <Radio size={12} color="#A78BFA" />
          <Text style={styles.waitingText}>Governance awaiting human decision</Text>
        </View>
      )}
    </GlassCard>
  );
}

const getEventConfidenceLevel = (event: GovernanceEvent): ConfidenceLevel | null => {
  const confidence = event.metadata?.confidence as number | undefined;
  if (typeof confidence === 'number') {
    return getConfidenceLevelFromScore(confidence);
  }
  if (event.type === 'APPROVAL_GRANTED' || event.type === 'QUORUM_REACHED') {
    return 'HIGH';
  }
  if (event.type === 'APPROVAL_REQUESTED') {
    return 'MODERATE';
  }
  return null;
};

const NOTES_STORAGE_KEY = '@sentinel_decision_notes';

const loadNotesFromStorage = async (): Promise<Record<string, DecisionNote>> => {
  try {
    const stored = await AsyncStorage.getItem(NOTES_STORAGE_KEY);
    return stored ? JSON.parse(stored) : {};
  } catch (err) {
    console.log('[Governance] Failed to load notes:', err);
    return {};
  }
};

const saveNotesToStorage = async (notes: Record<string, DecisionNote>): Promise<void> => {
  try {
    await AsyncStorage.setItem(NOTES_STORAGE_KEY, JSON.stringify(notes));
  } catch (err) {
    console.log('[Governance] Failed to save notes:', err);
  }
};

interface TimelineEventProps {
  event: GovernanceEvent;
  isFirst: boolean;
  index: number;
  onExplain: (event: GovernanceEvent) => void;
  onAddNote: (event: GovernanceEvent) => void;
  hasNote: boolean;
}

function TimelineEvent({ event, isFirst, index, onExplain, onAddNote, hasNote }: TimelineEventProps) {
  const config = EVENT_CONFIG[event.type];
  const { time } = formatEventTime(event.timestamp);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(10)).current;
  const confidenceLevel = getEventConfidenceLevel(event);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        delay: index * 50,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 300,
        delay: index * 50,
        useNativeDriver: true,
      }),
    ]).start();
  }, [fadeAnim, slideAnim, index]);

  return (
    <Animated.View
      style={[
        styles.eventRow,
        {
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
        },
        isFirst && styles.eventRowFirst,
      ]}
    >
      <View style={[styles.eventIndicator, { backgroundColor: config.color + '20' }]}>
        {config.icon}
      </View>

      <View style={styles.eventContent}>
        <View style={styles.eventTop}>
          <GlassBadge color={config.color} style={styles.eventTypeBadge}>
            <Text style={[styles.eventTypeLabel, { color: config.color }]}>{config.label}</Text>
          </GlassBadge>
          <View style={styles.eventTimeContainer}>
            <Clock size={10} color={Colors.textMuted} />
            <Text style={styles.eventTime}>{time}</Text>
          </View>
        </View>

        <Text style={styles.eventSummary} numberOfLines={2}>
          {event.summary}
        </Text>

        <View style={styles.eventMeta}>
          <View style={styles.eventMetaLeft}>
            {event.actor && <Text style={styles.eventActor}>by {event.actor}</Text>}
            {confidenceLevel && (
              <DecisionConfidenceMeter level={confidenceLevel} compact />
            )}
          </View>
          <View style={styles.eventActions}>
            <Pressable
              style={[styles.noteButton, hasNote && styles.noteButtonActive]}
              onPress={() => {
                triggerHaptic('selection');
                onAddNote(event);
              }}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              {hasNote ? (
                <FileText size={12} color="#A78BFA" />
              ) : (
                <PenLine size={12} color={Colors.textMuted} />
              )}
            </Pressable>
            <Pressable
              style={styles.explainButton}
              onPress={() => {
                triggerHaptic('selection');
                onExplain(event);
              }}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <HelpCircle size={12} color={Colors.textSecondary} />
              <Text style={styles.explainButtonText}>Explain</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Animated.View>
  );
}

interface ExplainModalProps {
  visible: boolean;
  event: GovernanceEvent | null;
  explanation: DecisionExplanation | null;
  isLoading: boolean;
  onClose: () => void;
}

const SCENARIO_CONFIG: Record<HypotheticalScenario, { icon: React.ReactNode; color: string; label: string; description: string }> = {
  PROMOTE_SHADOW: {
    icon: <TrendingUp size={18} color="#A78BFA" />,
    color: '#A78BFA',
    label: 'Promote Shadow',
    description: 'What if I promoted a shadow strategy?',
  },
  APPROVE_TRADE: {
    icon: <CheckCircle2 size={18} color="#6EE7B7" />,
    color: '#6EE7B7',
    label: 'Approve Trade',
    description: 'What if I approved a pending trade?',
  },
  CHANGE_CONFIG: {
    icon: <Settings size={18} color="#FCD34D" />,
    color: '#FCD34D',
    label: 'Change Config',
    description: 'What if I changed system configuration?',
  },
  GO_LIVE: {
    icon: <Zap size={18} color="#F472B6" />,
    color: '#F472B6',
    label: 'Go Live',
    description: 'What if I enabled live trading?',
  },
  FREEZE_SYSTEM: {
    icon: <Lock size={18} color="#64B5F6" />,
    color: '#64B5F6',
    label: 'Freeze System',
    description: 'What if I froze the system?',
  },
};

interface HypotheticalModalProps {
  visible: boolean;
  onClose: () => void;
}

function HypotheticalAnalysisModal({ visible, onClose }: HypotheticalModalProps) {
  const slideAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const [selectedScenario, setSelectedScenario] = useState<HypotheticalScenario | null>(null);
  const [analysis, setAnalysis] = useState<HypotheticalAnalysis | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.spring(slideAnim, {
          toValue: 1,
          damping: 20,
          stiffness: 150,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      fadeAnim.setValue(0);
      slideAnim.setValue(0);
    }
  }, [visible, fadeAnim, slideAnim]);

  const handleSelectScenario = useCallback(async (scenario: HypotheticalScenario) => {
    console.log('[Governance] Selecting hypothetical scenario:', scenario);
    setSelectedScenario(scenario);
    setAnalysis(null);
    setIsLoading(true);
    triggerHaptic('light');

    try {
      const result = await api.getHypotheticalAnalysis(scenario);
      setAnalysis(result);
    } catch (err) {
      console.log('[Governance] Failed to fetch hypothetical analysis:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleBack = useCallback(() => {
    setSelectedScenario(null);
    setAnalysis(null);
    triggerHaptic('selection');
  }, []);

  const handleClose = useCallback(() => {
    onClose();
    setTimeout(() => {
      setSelectedScenario(null);
      setAnalysis(null);
    }, 300);
  }, [onClose]);

  const translateY = slideAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [400, 0],
  });

  const getConstraintStatusColor = (status: 'PASS' | 'WARN' | 'BLOCK') => {
    switch (status) {
      case 'PASS': return '#6EE7B7';
      case 'WARN': return '#FCD34D';
      case 'BLOCK': return Colors.error;
      default: return Colors.textMuted;
    }
  };

  const renderScenarioSelection = () => (
    <View style={hypStyles.scenarioList}>
      <Text style={hypStyles.sectionLabel}>SELECT A SCENARIO</Text>
      {(Object.keys(SCENARIO_CONFIG) as HypotheticalScenario[]).map((scenario) => {
        const config = SCENARIO_CONFIG[scenario];
        return (
          <Pressable
            key={scenario}
            style={hypStyles.scenarioItem}
            onPress={() => handleSelectScenario(scenario)}
          >
            <View style={[hypStyles.scenarioIcon, { backgroundColor: config.color + '15' }]}>
              {config.icon}
            </View>
            <View style={hypStyles.scenarioContent}>
              <Text style={hypStyles.scenarioLabel}>{config.label}</Text>
              <Text style={hypStyles.scenarioDesc}>{config.description}</Text>
            </View>
            <ChevronRight size={16} color={Colors.textMuted} />
          </Pressable>
        );
      })}
    </View>
  );

  const renderAnalysisResult = () => {
    if (!analysis || !selectedScenario) return null;
    const config = SCENARIO_CONFIG[selectedScenario];

    return (
      <ScrollView style={hypStyles.analysisScroll} showsVerticalScrollIndicator={false}>
        <View style={hypStyles.analysisHeader}>
          <Pressable style={hypStyles.backButton} onPress={handleBack}>
            <ChevronRight size={16} color={Colors.textSecondary} style={{ transform: [{ rotate: '180deg' }] }} />
            <Text style={hypStyles.backText}>Back</Text>
          </Pressable>
        </View>

        <View style={[hypStyles.outcomeCard, { borderColor: analysis.would_proceed ? '#6EE7B720' : Colors.warning + '20' }]}>
          <View style={hypStyles.outcomeHeader}>
            <View style={[hypStyles.outcomeIcon, { backgroundColor: config.color + '15' }]}>
              {config.icon}
            </View>
            <View style={hypStyles.outcomeTitleContainer}>
              <Text style={hypStyles.outcomeTitle}>{analysis.scenario_label}</Text>
              <View style={[
                hypStyles.outcomeBadge,
                { backgroundColor: analysis.would_proceed ? '#6EE7B715' : Colors.warning + '15' }
              ]}>
                <Text style={[
                  hypStyles.outcomeBadgeText,
                  { color: analysis.would_proceed ? '#6EE7B7' : Colors.warning }
                ]}>
                  {analysis.would_proceed ? 'WOULD PROCEED' : 'WOULD BE BLOCKED'}
                </Text>
              </View>
            </View>
          </View>
          <Text style={hypStyles.outcomeSummary}>{analysis.outcome_summary}</Text>
        </View>

        {analysis.next_approvals.length > 0 && (
          <View style={hypStyles.section}>
            <Text style={hypStyles.sectionLabel}>NEXT APPROVALS REQUIRED</Text>
            {analysis.next_approvals.map((approval, idx) => (
              <View key={idx} style={hypStyles.approvalRow}>
                <View style={hypStyles.approvalIconContainer}>
                  <Users size={12} color={Colors.primary} />
                </View>
                <View style={hypStyles.approvalContent}>
                  <Text style={hypStyles.approvalType}>{approval.type}</Text>
                  <Text style={hypStyles.approvalMeta}>
                    From: {approval.required_from} • Quorum: {approval.quorum_needed} • {approval.estimated_wait}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {analysis.potential_blocks.length > 0 && (
          <View style={hypStyles.section}>
            <Text style={hypStyles.sectionLabel}>POTENTIAL BLOCKS</Text>
            {analysis.potential_blocks.map((block, idx) => (
              <View key={idx} style={hypStyles.blockRow}>
                <View style={hypStyles.blockIconContainer}>
                  <AlertOctagon size={12} color={Colors.warning} />
                </View>
                <View style={hypStyles.blockContent}>
                  <Text style={hypStyles.blockReason}>{block.reason}</Text>
                  <Text style={hypStyles.blockFactor}>{block.blocking_factor}</Text>
                  <Text style={hypStyles.blockHint}>→ {block.resolution_hint}</Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {analysis.safety_constraints.length > 0 && (
          <View style={hypStyles.section}>
            <Text style={hypStyles.sectionLabel}>SAFETY CONSTRAINTS</Text>
            {analysis.safety_constraints.map((constraint, idx) => (
              <View key={idx} style={hypStyles.constraintRow}>
                <View style={[
                  hypStyles.constraintStatus,
                  { backgroundColor: getConstraintStatusColor(constraint.status) + '20' }
                ]}>
                  <View style={[
                    hypStyles.constraintDot,
                    { backgroundColor: getConstraintStatusColor(constraint.status) }
                  ]} />
                </View>
                <View style={hypStyles.constraintContent}>
                  <Text style={hypStyles.constraintName}>{constraint.name}</Text>
                  <Text style={hypStyles.constraintValues}>
                    Current: {constraint.current_value} • Required: {constraint.threshold}
                  </Text>
                </View>
                <Text style={[
                  hypStyles.constraintStatusText,
                  { color: getConstraintStatusColor(constraint.status) }
                ]}>
                  {constraint.status}
                </Text>
              </View>
            ))}
          </View>
        )}

        <View style={hypStyles.disclaimerContainer}>
          <Sparkles size={12} color={Colors.textMuted} />
          <Text style={hypStyles.disclaimerText}>{analysis.disclaimer}</Text>
        </View>
      </ScrollView>
    );
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={handleClose}
      statusBarTranslucent
    >
      <Pressable style={hypStyles.modalOverlay} onPress={handleClose}>
        <Animated.View style={[hypStyles.modalBackdrop, { opacity: fadeAnim }]} />
        <Animated.View
          style={[
            hypStyles.modalContent,
            { transform: [{ translateY }] },
          ]}
        >
          <Pressable onPress={(e) => e.stopPropagation()}>
            <View style={hypStyles.modalHeader}>
              <View style={hypStyles.modalTitleRow}>
                <View style={hypStyles.modalIcon}>
                  <Sparkles size={18} color="#A78BFA" />
                </View>
                <View style={hypStyles.modalTitleContainer}>
                  <Text style={hypStyles.modalTitle}>What Would Happen If…</Text>
                  <Text style={hypStyles.modalSubtitle}>Explore governance outcomes</Text>
                </View>
              </View>
              <Pressable style={hypStyles.closeButton} onPress={handleClose} hitSlop={12}>
                <X size={20} color={Colors.textSecondary} />
              </Pressable>
            </View>

            <View style={hypStyles.hypotheticalBanner}>
              <LinearGradient
                colors={['#A78BFA15', '#A78BFA08']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={StyleSheet.absoluteFill}
              />
              <Shield size={12} color="#A78BFA" />
              <Text style={hypStyles.hypotheticalBannerText}>HYPOTHETICAL — NO EXECUTION</Text>
            </View>

            {isLoading ? (
              <View style={hypStyles.loadingContainer}>
                <ActivityIndicator size="small" color={Colors.primary} />
                <Text style={hypStyles.loadingText}>Simulating scenario...</Text>
              </View>
            ) : selectedScenario && analysis ? (
              renderAnalysisResult()
            ) : (
              renderScenarioSelection()
            )}

            <View style={hypStyles.modalFooter}>
              <Text style={hypStyles.footerText}>Read-only simulation • No side effects</Text>
            </View>
          </Pressable>
        </Animated.View>
      </Pressable>
    </Modal>
  );
}

function ExplainDecisionModal({ visible, event, explanation, isLoading, onClose }: ExplainModalProps) {
  const slideAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const confidenceLevel = event ? getEventConfidenceLevel(event) : null;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.spring(slideAnim, {
          toValue: 1,
          damping: 20,
          stiffness: 150,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      fadeAnim.setValue(0);
      slideAnim.setValue(0);
    }
  }, [visible, fadeAnim, slideAnim]);

  const config = event ? EVENT_CONFIG[event.type] : null;

  const translateY = slideAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [300, 0],
  });

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <Pressable style={styles.modalOverlay} onPress={onClose}>
        <Animated.View style={[styles.modalBackdrop, { opacity: fadeAnim }]} />
        <Animated.View
          style={[
            styles.modalContent,
            { transform: [{ translateY }] },
          ]}
        >
          <Pressable onPress={(e) => e.stopPropagation()}>
            <View style={styles.modalHeader}>
              <View style={styles.modalTitleRow}>
                <View style={[styles.modalIcon, { backgroundColor: (config?.color || Colors.primary) + '15' }]}>
                  <HelpCircle size={18} color={config?.color || Colors.primary} />
                </View>
                <View style={styles.modalTitleContainer}>
                  <Text style={styles.modalTitle}>Explain This Decision</Text>
                  <Text style={styles.modalSubtitle}>{config?.label || 'Event'}</Text>
                </View>
              </View>
              <Pressable style={styles.closeButton} onPress={onClose} hitSlop={12}>
                <X size={20} color={Colors.textSecondary} />
              </Pressable>
            </View>

            {isLoading ? (
              <View style={styles.modalLoading}>
                <ActivityIndicator size="small" color={Colors.primary} />
                <Text style={styles.modalLoadingText}>Generating explanation...</Text>
              </View>
            ) : explanation ? (
              <View style={styles.explanationContent}>
                {confidenceLevel && (
                  <DecisionConfidenceMeter level={confidenceLevel} style={styles.confidenceMeter} />
                )}

                <View style={styles.summarySection}>
                  <Text style={styles.summaryLabel}>DECISION SUMMARY</Text>
                  <Text style={styles.summaryText}>{explanation.decision_summary}</Text>
                </View>

                <View style={styles.factorsSection}>
                  <Text style={styles.factorsLabel}>KEY FACTORS</Text>
                  {explanation.key_factors.slice(0, 5).map((factor, idx) => (
                    <View key={idx} style={styles.factorRow}>
                      <CircleDot size={10} color={Colors.textSecondary} />
                      <Text style={styles.factorText}>{factor}</Text>
                    </View>
                  ))}
                </View>

                <View style={styles.requirementSection}>
                  <View style={styles.requirementHeader}>
                    <CheckCircle2 size={14} color="#6EE7B7" />
                    <Text style={styles.requirementLabel}>What Was Required</Text>
                  </View>
                  <Text style={styles.requirementText}>{explanation.what_was_required}</Text>
                </View>

                {explanation.what_was_missing && (
                  <View style={styles.missingSection}>
                    <View style={styles.missingHeader}>
                      <AlertOctagon size={14} color={Colors.warning} />
                      <Text style={styles.missingLabel}>What Was Missing</Text>
                    </View>
                    <Text style={styles.missingText}>{explanation.what_was_missing}</Text>
                  </View>
                )}
              </View>
            ) : (
              <View style={styles.modalEmpty}>
                <Text style={styles.modalEmptyText}>Unable to generate explanation</Text>
              </View>
            )}

            <View style={styles.modalFooter}>
              <Text style={styles.disclaimerText}>Read-only explanation • No actions available</Text>
            </View>
          </Pressable>
        </Animated.View>
      </Pressable>
    </Modal>
  );
}

interface NoteEditorModalProps {
  visible: boolean;
  event: GovernanceEvent | null;
  existingNote: DecisionNote | null;
  onClose: () => void;
  onSave: (eventId: string, content: string) => void;
  onDelete: (eventId: string) => void;
}

function NoteEditorModal({ visible, event, existingNote, onClose, onSave, onDelete }: NoteEditorModalProps) {
  const slideAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const [noteContent, setNoteContent] = useState('');

  useEffect(() => {
    if (visible) {
      setNoteContent(existingNote?.content || '');
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.spring(slideAnim, {
          toValue: 1,
          damping: 20,
          stiffness: 150,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      fadeAnim.setValue(0);
      slideAnim.setValue(0);
    }
  }, [visible, existingNote, fadeAnim, slideAnim]);

  const handleSave = useCallback(() => {
    if (event && noteContent.trim()) {
      console.log('[Governance] Saving note for event:', event.id);
      onSave(event.id, noteContent.trim());
      triggerHaptic('success');
    }
    onClose();
  }, [event, noteContent, onSave, onClose]);

  const handleDelete = useCallback(() => {
    if (event && existingNote) {
      console.log('[Governance] Deleting note for event:', event.id);
      onDelete(event.id);
      triggerHaptic('light');
    }
    onClose();
  }, [event, existingNote, onDelete, onClose]);

  const translateY = slideAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [300, 0],
  });

  const config = event ? EVENT_CONFIG[event.type] : null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <KeyboardAvoidingView
        style={noteStyles.keyboardAvoid}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <Pressable style={noteStyles.modalOverlay} onPress={onClose}>
          <Animated.View style={[noteStyles.modalBackdrop, { opacity: fadeAnim }]} />
          <Animated.View
            style={[
              noteStyles.modalContent,
              { transform: [{ translateY }] },
            ]}
          >
            <Pressable onPress={(e) => e.stopPropagation()}>
              <View style={noteStyles.modalHeader}>
                <View style={noteStyles.modalTitleRow}>
                  <View style={noteStyles.modalIcon}>
                    <PenLine size={18} color="#A78BFA" />
                  </View>
                  <View style={noteStyles.modalTitleContainer}>
                    <Text style={noteStyles.modalTitle}>
                      {existingNote ? 'Edit Note' : 'Add Note'}
                    </Text>
                    <Text style={noteStyles.modalSubtitle} numberOfLines={1}>
                      {config?.label || 'Event'}
                    </Text>
                  </View>
                </View>
                <Pressable style={noteStyles.closeButton} onPress={onClose} hitSlop={12}>
                  <X size={20} color={Colors.textSecondary} />
                </Pressable>
              </View>

              <View style={noteStyles.editorContainer}>
                <Text style={noteStyles.editorLabel}>PERSONAL NOTE</Text>
                <TextInput
                  style={noteStyles.textInput}
                  value={noteContent}
                  onChangeText={setNoteContent}
                  placeholder="Record your reasoning or observations..."
                  placeholderTextColor={Colors.textMuted}
                  multiline
                  textAlignVertical="top"
                  autoFocus
                />
                <Text style={noteStyles.privateHint}>
                  Private • Does not affect system behavior
                </Text>
              </View>

              <View style={noteStyles.modalFooter}>
                {existingNote && (
                  <Pressable style={noteStyles.deleteButton} onPress={handleDelete}>
                    <Trash2 size={16} color={Colors.error} />
                  </Pressable>
                )}
                <View style={noteStyles.footerSpacer} />
                <Pressable style={noteStyles.cancelButton} onPress={onClose}>
                  <Text style={noteStyles.cancelButtonText}>Cancel</Text>
                </Pressable>
                <Pressable
                  style={[
                    noteStyles.saveButton,
                    !noteContent.trim() && noteStyles.saveButtonDisabled,
                  ]}
                  onPress={handleSave}
                  disabled={!noteContent.trim()}
                >
                  <Text style={[
                    noteStyles.saveButtonText,
                    !noteContent.trim() && noteStyles.saveButtonTextDisabled,
                  ]}>
                    Save
                  </Text>
                </Pressable>
              </View>
            </Pressable>
          </Animated.View>
        </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  );
}

interface TimelineSectionProps {
  onExplainEvent: (event: GovernanceEvent) => void;
  onAddNote: (event: GovernanceEvent) => void;
  notes: Record<string, DecisionNote>;
}

type GuardrailCategory = 'approval_requirements' | 'quorum_rules' | 'freeze_conditions' | 'shadow_constraints';

const GUARDRAIL_CATEGORY_CONFIG: Record<GuardrailCategory, {
  icon: React.ReactNode;
  color: string;
  label: string;
}> = {
  approval_requirements: {
    icon: <ShieldCheck size={16} color="#6EE7B7" />,
    color: '#6EE7B7',
    label: 'Approval Requirements',
  },
  quorum_rules: {
    icon: <Scale size={16} color="#A78BFA" />,
    color: '#A78BFA',
    label: 'Quorum Rules',
  },
  freeze_conditions: {
    icon: <AlertCircle size={16} color="#64B5F6" />,
    color: '#64B5F6',
    label: 'Freeze Conditions',
  },
  shadow_constraints: {
    icon: <EyeOff size={16} color="#FCD34D" />,
    color: '#FCD34D',
    label: 'Shadow Constraints',
  },
};

interface GuardrailCategoryCardProps {
  category: GuardrailCategory;
  rules: GuardrailRule[];
  index: number;
}

function GuardrailCategoryCard({ category, rules, index }: GuardrailCategoryCardProps) {
  const config = GUARDRAIL_CATEGORY_CONFIG[category];
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(15)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 350,
        delay: index * 80,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 350,
        delay: index * 80,
        useNativeDriver: true,
      }),
    ]).start();
  }, [fadeAnim, slideAnim, index]);

  return (
    <Animated.View
      style={[
        grStyles.categoryCard,
        {
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
          borderColor: config.color + '20',
        },
      ]}
    >
      <View style={grStyles.categoryHeader}>
        <View style={[grStyles.categoryIcon, { backgroundColor: config.color + '15' }]}>
          {config.icon}
        </View>
        <Text style={[grStyles.categoryLabel, { color: config.color }]}>{config.label}</Text>
      </View>
      <View style={grStyles.rulesList}>
        {rules.map((rule) => (
          <View key={rule.id} style={grStyles.ruleRow}>
            <View style={[grStyles.ruleStatusDot, { backgroundColor: rule.status === 'ACTIVE' ? config.color : Colors.textMuted }]} />
            <View style={grStyles.ruleContent}>
              <Text style={grStyles.ruleTitle}>{rule.title}</Text>
              <Text style={grStyles.ruleDescription}>{rule.description}</Text>
            </View>
          </View>
        ))}
      </View>
    </Animated.View>
  );
}

function GuardrailsSection() {
  const {
    data: guardrails,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ['governanceGuardrails'],
    queryFn: api.getGovernanceGuardrails,
    staleTime: 60000,
    retry: 2,
  });

  if (isLoading) {
    return (
      <View style={grStyles.loadingContainer}>
        <ActivityIndicator size="small" color={Colors.primary} />
        <Text style={grStyles.loadingText}>Loading guardrails...</Text>
      </View>
    );
  }

  if (isError || !guardrails) {
    return (
      <View style={grStyles.emptyContainer}>
        <Shield size={24} color={Colors.textMuted} />
        <Text style={grStyles.emptyText}>Unable to load guardrails</Text>
      </View>
    );
  }

  const categories: GuardrailCategory[] = ['approval_requirements', 'quorum_rules', 'freeze_conditions', 'shadow_constraints'];

  return (
    <View style={grStyles.container}>
      {categories.map((category, index) => (
        <GuardrailCategoryCard
          key={category}
          category={category}
          rules={guardrails[category]}
          index={index}
        />
      ))}
      <View style={grStyles.disclaimerRow}>
        <Shield size={12} color={Colors.textMuted} />
        <Text style={grStyles.disclaimerText}>Read-only view • Safety rules are enforced by governance</Text>
      </View>
    </View>
  );
}

function TimelineSection({ onExplainEvent, onAddNote, notes }: TimelineSectionProps) {
  const {
    data: events,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ['governanceTimeline'],
    queryFn: api.getGovernanceTimeline,
    refetchInterval: 10000,
    retry: 2,
  });

  const sortedEvents = useMemo(() => {
    return [...(events || [])].sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    ).slice(0, 10);
  }, [events]);

  if (isLoading) {
    return (
      <View style={styles.timelineLoading}>
        <ActivityIndicator size="small" color={Colors.primary} />
        <Text style={styles.timelineLoadingText}>Loading timeline...</Text>
      </View>
    );
  }

  if (isError || sortedEvents.length === 0) {
    return (
      <View style={styles.timelineEmpty}>
        <View style={styles.timelineEmptyIcon}>
          <Clock size={24} color={Colors.textMuted} />
        </View>
        <Text style={styles.timelineEmptyText}>No governance events yet</Text>
      </View>
    );
  }

  return (
    <View style={styles.timelineList}>
      {sortedEvents.map((event, index) => (
        <TimelineEvent
          key={event.id}
          event={event}
          isFirst={index === 0}
          index={index}
          onExplain={onExplainEvent}
          onAddNote={onAddNote}
          hasNote={!!notes[event.id]}
        />
      ))}
    </View>
  );
}

export default function GovernanceConsoleScreen() {
  const insets = useSafeAreaInsets();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const { isDarker } = useAdaptiveGlass();
  const { refetchStatus, governanceState, governanceStatus } = useConnection();

  const [explainModalVisible, setExplainModalVisible] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<GovernanceEvent | null>(null);
  const [explanation, setExplanation] = useState<DecisionExplanation | null>(null);
  const [isLoadingExplanation, setIsLoadingExplanation] = useState(false);
  const [hypotheticalModalVisible, setHypotheticalModalVisible] = useState(false);
  const [noteModalVisible, setNoteModalVisible] = useState(false);
  const [noteEvent, setNoteEvent] = useState<GovernanceEvent | null>(null);
  const [decisionNotes, setDecisionNotes] = useState<Record<string, DecisionNote>>({});

  useEffect(() => {
    loadNotesFromStorage().then(setDecisionNotes);
  }, []);

  const handleExplainEvent = useCallback(async (event: GovernanceEvent) => {
    console.log('[Governance] Opening explanation for event:', event.id);
    setSelectedEvent(event);
    setExplanation(null);
    setExplainModalVisible(true);
    setIsLoadingExplanation(true);
    triggerHaptic('light');

    try {
      const result = await api.getDecisionExplanation(event.id, event.type);
      setExplanation(result);
    } catch (err) {
      console.log('[Governance] Failed to fetch explanation:', err);
    } finally {
      setIsLoadingExplanation(false);
    }
  }, []);

  const handleCloseExplainModal = useCallback(() => {
    setExplainModalVisible(false);
    setTimeout(() => {
      setSelectedEvent(null);
      setExplanation(null);
    }, 300);
  }, []);

  const handleOpenHypothetical = useCallback(() => {
    console.log('[Governance] Opening hypothetical analysis modal');
    setHypotheticalModalVisible(true);
    triggerHaptic('light');
  }, []);

  const handleCloseHypothetical = useCallback(() => {
    setHypotheticalModalVisible(false);
  }, []);

  const handleOpenNoteModal = useCallback((event: GovernanceEvent) => {
    console.log('[Governance] Opening note modal for event:', event.id);
    setNoteEvent(event);
    setNoteModalVisible(true);
    triggerHaptic('light');
  }, []);

  const handleCloseNoteModal = useCallback(() => {
    setNoteModalVisible(false);
    setTimeout(() => setNoteEvent(null), 300);
  }, []);

  const handleSaveNote = useCallback((eventId: string, content: string) => {
    const now = new Date().toISOString();
    const existingNote = decisionNotes[eventId];
    const updatedNote: DecisionNote = {
      id: existingNote?.id || `note_${eventId}_${Date.now()}`,
      event_id: eventId,
      content,
      created_at: existingNote?.created_at || now,
      updated_at: now,
    };
    const updatedNotes = { ...decisionNotes, [eventId]: updatedNote };
    setDecisionNotes(updatedNotes);
    saveNotesToStorage(updatedNotes);
  }, [decisionNotes]);

  const handleDeleteNote = useCallback((eventId: string) => {
    const updatedNotes = { ...decisionNotes };
    delete updatedNotes[eventId];
    setDecisionNotes(updatedNotes);
    saveNotesToStorage(updatedNotes);
  }, [decisionNotes]);

  const {
    refetch: refetchTimeline,
    isRefetching: isRefetchingTimeline,
  } = useQuery({
    queryKey: ['governanceTimeline'],
    queryFn: api.getGovernanceTimeline,
    enabled: false,
  });

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 400,
      useNativeDriver: true,
    }).start();
  }, [fadeAnim]);

  const handleRefresh = async () => {
    await Promise.all([refetchStatus(), refetchTimeline()]);
  };

  const isOffline = governanceState === 'OFFLINE';

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
              <Brain size={22} color={Colors.primary} strokeWidth={2.5} />
            </View>
            <Text style={styles.headerTitle}>GOVERNANCE</Text>
          </View>
          <Pressable
            style={styles.hypotheticalButton}
            onPress={handleOpenHypothetical}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <LinearGradient
              colors={['#A78BFA20', '#A78BFA10']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={StyleSheet.absoluteFill}
            />
            <Sparkles size={14} color="#A78BFA" />
            <Text style={styles.hypotheticalButtonText}>What If…</Text>
          </Pressable>
        </View>

        <View style={styles.consoleBanner}>
          <LinearGradient
            colors={[Colors.textMuted + '15', Colors.textMuted + '08']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={StyleSheet.absoluteFill}
          />
          <Eye size={14} color={Colors.textSecondary} />
          <Text style={styles.consoleBannerText}>OBSERVATION DECK — NO EXECUTION CONTROLS</Text>
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isRefetchingTimeline}
              onRefresh={handleRefresh}
              tintColor={Colors.primary}
              colors={[Colors.primary]}
            />
          }
        >
          {isOffline ? (
            <View style={styles.offlineContainer}>
              <View style={styles.offlineIconContainer}>
                <AlertTriangle size={48} color={Colors.warning} />
              </View>
              <Text style={styles.offlineTitle}>Governance Offline</Text>
              <Text style={styles.offlineSubtitle}>
                Unable to connect to n8n governance layer
              </Text>
            </View>
          ) : (
            <>
              <GovernanceBrainCard isDarker={isDarker} />

              <CognitiveLoadIndicator
                pendingDecisions={governanceStatus?.pending_approvals ?? 0}
                globalState={governanceStatus?.global_state}
                lastDecisionTime={governanceStatus?.last_broadcast?.timestamp}
                isDarker={isDarker}
              />

              <CurrentStateCard isDarker={isDarker} />

              <View style={styles.guardrailsSection}>
                <View style={styles.guardrailsHeader}>
                  <View style={styles.guardrailsHeaderLeft}>
                    <Shield size={16} color={Colors.textSecondary} />
                    <Text style={styles.guardrailsSectionTitle}>Governance Guardrails</Text>
                  </View>
                  <Text style={styles.guardrailsSubtitle}>Active safety rules</Text>
                </View>
                <GuardrailsSection />
              </View>

              <View style={styles.timelineSection}>
                <View style={styles.timelineHeader}>
                  <View style={styles.timelineHeaderLeft}>
                    <Clock size={16} color={Colors.textSecondary} />
                    <Text style={styles.timelineSectionTitle}>Recent Activity</Text>
                  </View>
                  <Text style={styles.timelineSubtitle}>Latest governance events</Text>
                </View>
                <TimelineSection
                  onExplainEvent={handleExplainEvent}
                  onAddNote={handleOpenNoteModal}
                  notes={decisionNotes}
                />
              </View>
            </>
          )}
        </ScrollView>

        <ExplainDecisionModal
          visible={explainModalVisible}
          event={selectedEvent}
          explanation={explanation}
          isLoading={isLoadingExplanation}
          onClose={handleCloseExplainModal}
        />

        <HypotheticalAnalysisModal
          visible={hypotheticalModalVisible}
          onClose={handleCloseHypothetical}
        />

        <NoteEditorModal
          visible={noteModalVisible}
          event={noteEvent}
          existingNote={noteEvent ? decisionNotes[noteEvent.id] || null : null}
          onClose={handleCloseNoteModal}
          onSave={handleSaveNote}
          onDelete={handleDeleteNote}
        />
      </Animated.View>
    </View>
  );
}

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  glowOrb: {
    position: 'absolute',
    borderRadius: 999,
    opacity: 0.08,
  },
  glowOrb1: {
    width: 180,
    height: 180,
    top: 80,
    left: -50,
    backgroundColor: '#A78BFA',
  },
  glowOrb2: {
    width: 140,
    height: 140,
    bottom: 200,
    right: -40,
    backgroundColor: '#6EE7B7',
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
  hypotheticalButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#A78BFA30',
    overflow: 'hidden',
  },
  hypotheticalButtonText: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: '#A78BFA',
    letterSpacing: 0.3,
  },
  consoleBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 10,
    marginHorizontal: 16,
    borderRadius: 10,
    overflow: 'hidden',
  },
  consoleBannerText: {
    fontSize: 10,
    fontWeight: '700' as const,
    color: Colors.textSecondary,
    letterSpacing: 0.5,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  brainContainer: {
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 18,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  brainContainerFrozen: {
    borderColor: Colors.warning + '30',
    opacity: 0.85,
  },
  brainContainerDarker: {
    borderColor: 'rgba(255, 255, 255, 0.04)',
  },
  webBrainContainer: {
    backgroundColor: 'rgba(13, 13, 18, 0.75)',
  },
  blurView: {
    flex: 1,
  },
  brainInnerContent: {
    paddingVertical: 16,
    paddingHorizontal: 16,
  },
  brainHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  brainIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  brainGlow: {
    position: 'absolute',
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  brainTitleContainer: {
    flex: 1,
  },
  brainLabel: {
    fontSize: 14,
    fontWeight: '700' as const,
    color: Colors.text,
    letterSpacing: 0.3,
  },
  brainSubtitle: {
    fontSize: 11,
    color: Colors.textMuted,
    marginTop: 2,
  },
  textFrozen: {
    color: Colors.textMuted,
    opacity: 0.7,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    borderWidth: 1,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '700' as const,
    letterSpacing: 0.5,
  },
  brainDetailsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 8,
  },
  brainDetailItem: {
    flex: 1,
    alignItems: 'center',
  },
  brainDetailLabel: {
    fontSize: 9,
    fontWeight: '600' as const,
    color: Colors.textMuted,
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  brainDetailValue: {
    fontSize: 12,
    fontWeight: '700' as const,
    color: Colors.textSecondary,
  },
  brainDetailDivider: {
    width: 1,
    height: 28,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
  },
  decisionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  timestampRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  timestampText: {
    fontSize: 10,
  },
  stateCard: {
    marginHorizontal: 16,
    marginTop: 12,
    padding: 16,
  },
  stateCardDarker: {
    backgroundColor: 'rgba(5, 5, 8, 0.85)',
  },
  stateHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  stateIconContainer: {
    position: 'relative',
  },
  stateIconBg: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stateTitleContainer: {
    flex: 1,
  },
  stateTitle: {
    fontSize: 15,
    fontWeight: '700' as const,
    color: Colors.text,
  },
  stateSubtitle: {
    fontSize: 11,
    color: Colors.textMuted,
    marginTop: 2,
  },
  reasoningContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  reasoningText: {
    fontSize: 13,
    fontWeight: '500' as const,
    color: Colors.textSecondary,
    textAlign: 'center' as const,
    letterSpacing: 0.2,
    lineHeight: 18,
  },
  waitingBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 10,
    marginTop: 12,
    borderRadius: 10,
    overflow: 'hidden',
  },
  waitingText: {
    fontSize: 11,
    fontWeight: '600' as const,
    color: '#A78BFA',
    letterSpacing: 0.3,
  },
  guardrailsSection: {
    marginTop: 20,
    marginHorizontal: 16,
  },
  guardrailsHeader: {
    marginBottom: 12,
  },
  guardrailsHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 2,
  },
  guardrailsSectionTitle: {
    fontSize: 14,
    fontWeight: '700' as const,
    color: Colors.text,
  },
  guardrailsSubtitle: {
    fontSize: 11,
    color: Colors.textMuted,
    marginLeft: 24,
  },
  timelineSection: {
    marginTop: 20,
    marginHorizontal: 16,
  },
  timelineHeader: {
    marginBottom: 12,
  },
  timelineHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 2,
  },
  timelineSectionTitle: {
    fontSize: 14,
    fontWeight: '700' as const,
    color: Colors.text,
  },
  timelineSubtitle: {
    fontSize: 11,
    color: Colors.textMuted,
    marginLeft: 24,
  },
  timelineLoading: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 40,
  },
  timelineLoadingText: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  timelineEmpty: {
    alignItems: 'center',
    paddingVertical: 40,
    gap: 10,
  },
  timelineEmptyIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  timelineEmptyText: {
    fontSize: 13,
    color: Colors.textMuted,
  },
  timelineList: {
    gap: 8,
  },
  eventRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.04)',
  },
  eventRowFirst: {
    borderColor: 'rgba(255, 255, 255, 0.08)',
    backgroundColor: 'rgba(255, 255, 255, 0.035)',
  },
  eventIndicator: {
    width: 32,
    height: 32,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  eventContent: {
    flex: 1,
    gap: 6,
  },
  eventTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  eventTypeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  eventTypeLabel: {
    fontSize: 10,
    fontWeight: '700' as const,
    letterSpacing: 0.3,
  },
  eventTimeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  eventTime: {
    fontSize: 10,
    color: Colors.textMuted,
  },
  eventSummary: {
    fontSize: 12,
    color: Colors.text,
    lineHeight: 17,
  },
  eventMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  eventMetaLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  eventActor: {
    fontSize: 10,
    color: Colors.textMuted,
    fontStyle: 'italic' as const,
  },
  eventDate: {
    fontSize: 10,
    color: Colors.textMuted,
  },
  offlineContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
    gap: 12,
  },
  offlineIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 179, 0, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  offlineTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: Colors.text,
  },
  offlineSubtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center' as const,
    maxWidth: 260,
    lineHeight: 20,
  },
  eventActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  noteButton: {
    width: 28,
    height: 28,
    borderRadius: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  noteButtonActive: {
    backgroundColor: '#A78BFA15',
    borderColor: '#A78BFA30',
  },
  explainButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  explainButtonText: {
    fontSize: 10,
    fontWeight: '600' as const,
    color: Colors.textSecondary,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
  },
  modalContent: {
    backgroundColor: '#0D0D12',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: SCREEN_HEIGHT * 0.75,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderBottomWidth: 0,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.06)',
  },
  modalTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  modalIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalTitleContainer: {
    flex: 1,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: Colors.text,
    letterSpacing: 0.2,
  },
  modalSubtitle: {
    fontSize: 12,
    color: Colors.textMuted,
    marginTop: 2,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalLoading: {
    paddingVertical: 48,
    alignItems: 'center',
    gap: 12,
  },
  modalLoadingText: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  explanationContent: {
    padding: 20,
    gap: 20,
  },
  confidenceMeter: {
    marginBottom: 4,
  },
  summarySection: {
    gap: 8,
  },
  summaryLabel: {
    fontSize: 10,
    fontWeight: '700' as const,
    color: Colors.textMuted,
    letterSpacing: 0.8,
  },
  summaryText: {
    fontSize: 15,
    fontWeight: '500' as const,
    color: Colors.text,
    lineHeight: 22,
  },
  factorsSection: {
    gap: 10,
  },
  factorsLabel: {
    fontSize: 10,
    fontWeight: '700' as const,
    color: Colors.textMuted,
    letterSpacing: 0.8,
    marginBottom: 2,
  },
  factorRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    paddingLeft: 4,
  },
  factorText: {
    fontSize: 13,
    color: Colors.textSecondary,
    flex: 1,
    lineHeight: 18,
  },
  requirementSection: {
    backgroundColor: 'rgba(110, 231, 183, 0.06)',
    borderRadius: 12,
    padding: 14,
    gap: 8,
    borderWidth: 1,
    borderColor: 'rgba(110, 231, 183, 0.15)',
  },
  requirementHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  requirementLabel: {
    fontSize: 11,
    fontWeight: '700' as const,
    color: '#6EE7B7',
    letterSpacing: 0.3,
  },
  requirementText: {
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 18,
  },
  missingSection: {
    backgroundColor: 'rgba(255, 179, 0, 0.06)',
    borderRadius: 12,
    padding: 14,
    gap: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 179, 0, 0.15)',
  },
  missingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  missingLabel: {
    fontSize: 11,
    fontWeight: '700' as const,
    color: Colors.warning,
    letterSpacing: 0.3,
  },
  missingText: {
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 18,
  },
  modalEmpty: {
    paddingVertical: 48,
    alignItems: 'center',
  },
  modalEmptyText: {
    fontSize: 13,
    color: Colors.textMuted,
  },
  modalFooter: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.06)',
    alignItems: 'center',
  },
  disclaimerText: {
    fontSize: 11,
    color: Colors.textMuted,
    fontStyle: 'italic' as const,
  },
});

const grStyles = StyleSheet.create({
  container: {
    gap: 10,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 32,
  },
  loadingText: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 32,
    gap: 10,
  },
  emptyText: {
    fontSize: 13,
    color: Colors.textMuted,
  },
  categoryCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
  },
  categoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  categoryIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  categoryLabel: {
    fontSize: 13,
    fontWeight: '700' as const,
    letterSpacing: 0.3,
  },
  rulesList: {
    gap: 10,
  },
  ruleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  ruleStatusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginTop: 6,
  },
  ruleContent: {
    flex: 1,
  },
  ruleTitle: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: Colors.text,
    marginBottom: 2,
  },
  ruleDescription: {
    fontSize: 11,
    color: Colors.textMuted,
    lineHeight: 16,
  },
  disclaimerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    marginTop: 4,
  },
  disclaimerText: {
    fontSize: 10,
    color: Colors.textMuted,
    fontStyle: 'italic' as const,
  },
});

const noteStyles = StyleSheet.create({
  keyboardAvoid: {
    flex: 1,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
  },
  modalContent: {
    backgroundColor: '#0D0D12',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderBottomWidth: 0,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.06)',
  },
  modalTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  modalIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#A78BFA15',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalTitleContainer: {
    flex: 1,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: Colors.text,
    letterSpacing: 0.2,
  },
  modalSubtitle: {
    fontSize: 12,
    color: Colors.textMuted,
    marginTop: 2,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  editorContainer: {
    padding: 20,
    gap: 10,
  },
  editorLabel: {
    fontSize: 10,
    fontWeight: '700' as const,
    color: Colors.textMuted,
    letterSpacing: 0.8,
  },
  textInput: {
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    padding: 14,
    minHeight: 120,
    maxHeight: 200,
    fontSize: 14,
    color: Colors.text,
    lineHeight: 20,
  },
  privateHint: {
    fontSize: 11,
    color: Colors.textMuted,
    fontStyle: 'italic' as const,
    textAlign: 'center' as const,
  },
  modalFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.06)',
    gap: 10,
  },
  deleteButton: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.2)',
  },
  footerSpacer: {
    flex: 1,
  },
  cancelButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.textSecondary,
  },
  saveButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#A78BFA',
  },
  saveButtonDisabled: {
    backgroundColor: 'rgba(167, 139, 250, 0.3)',
  },
  saveButtonText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#0D0D12',
  },
  saveButtonTextDisabled: {
    color: 'rgba(13, 13, 18, 0.5)',
  },
});

const hypStyles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
  },
  modalContent: {
    backgroundColor: '#0D0D12',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: SCREEN_HEIGHT * 0.85,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderBottomWidth: 0,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.06)',
  },
  modalTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  modalIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#A78BFA15',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalTitleContainer: {
    flex: 1,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: Colors.text,
    letterSpacing: 0.2,
  },
  modalSubtitle: {
    fontSize: 12,
    color: Colors.textMuted,
    marginTop: 2,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  hypotheticalBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 10,
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 10,
    overflow: 'hidden',
  },
  hypotheticalBannerText: {
    fontSize: 10,
    fontWeight: '700' as const,
    color: '#A78BFA',
    letterSpacing: 0.5,
  },
  loadingContainer: {
    paddingVertical: 60,
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  scenarioList: {
    padding: 16,
    gap: 8,
  },
  sectionLabel: {
    fontSize: 10,
    fontWeight: '700' as const,
    color: Colors.textMuted,
    letterSpacing: 0.8,
    marginBottom: 8,
    marginLeft: 4,
  },
  scenarioItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  scenarioIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scenarioContent: {
    flex: 1,
  },
  scenarioLabel: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.text,
  },
  scenarioDesc: {
    fontSize: 12,
    color: Colors.textMuted,
    marginTop: 2,
  },
  analysisScroll: {
    maxHeight: SCREEN_HEIGHT * 0.55,
  },
  analysisHeader: {
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  backText: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontWeight: '500' as const,
  },
  outcomeCard: {
    margin: 16,
    marginTop: 12,
    padding: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 16,
    borderWidth: 1,
  },
  outcomeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  outcomeIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  outcomeTitleContainer: {
    flex: 1,
    gap: 6,
  },
  outcomeTitle: {
    fontSize: 15,
    fontWeight: '700' as const,
    color: Colors.text,
  },
  outcomeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  outcomeBadgeText: {
    fontSize: 9,
    fontWeight: '700' as const,
    letterSpacing: 0.5,
  },
  outcomeSummary: {
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 19,
  },
  section: {
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  approvalRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    borderRadius: 10,
    padding: 12,
    marginTop: 8,
  },
  approvalIconContainer: {
    width: 24,
    height: 24,
    borderRadius: 6,
    backgroundColor: Colors.primary + '15',
    justifyContent: 'center',
    alignItems: 'center',
  },
  approvalContent: {
    flex: 1,
  },
  approvalType: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: Colors.text,
  },
  approvalMeta: {
    fontSize: 11,
    color: Colors.textMuted,
    marginTop: 3,
  },
  blockRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: 'rgba(255, 179, 0, 0.06)',
    borderRadius: 10,
    padding: 12,
    marginTop: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 179, 0, 0.12)',
  },
  blockIconContainer: {
    width: 24,
    height: 24,
    borderRadius: 6,
    backgroundColor: Colors.warning + '15',
    justifyContent: 'center',
    alignItems: 'center',
  },
  blockContent: {
    flex: 1,
  },
  blockReason: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: Colors.text,
  },
  blockFactor: {
    fontSize: 11,
    color: Colors.textMuted,
    marginTop: 2,
  },
  blockHint: {
    fontSize: 11,
    color: Colors.warning,
    marginTop: 4,
    fontStyle: 'italic' as const,
  },
  constraintRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    borderRadius: 10,
    padding: 12,
    marginTop: 8,
  },
  constraintStatus: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  constraintDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  constraintContent: {
    flex: 1,
  },
  constraintName: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: Colors.text,
  },
  constraintValues: {
    fontSize: 11,
    color: Colors.textMuted,
    marginTop: 2,
  },
  constraintStatusText: {
    fontSize: 10,
    fontWeight: '700' as const,
    letterSpacing: 0.5,
  },
  disclaimerContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    borderRadius: 10,
  },
  disclaimerText: {
    fontSize: 11,
    color: Colors.textMuted,
    flex: 1,
    lineHeight: 16,
    fontStyle: 'italic' as const,
  },
  modalFooter: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.06)',
    alignItems: 'center',
  },
  footerText: {
    fontSize: 11,
    color: Colors.textMuted,
    fontStyle: 'italic' as const,
  },
});
