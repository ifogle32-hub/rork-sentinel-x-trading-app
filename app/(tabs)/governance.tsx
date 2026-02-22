import React, { useRef, useEffect, useMemo, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Animated,
  Platform,
  Pressable,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import {
  Brain,
  Activity,
  Clock,
  Eye,
  Radio,
  Snowflake,
  AlertTriangle,
  Shield,
  Sparkles,
} from 'lucide-react-native';
import Colors from '@/constants/colors';
import { api } from '@/lib/api';
import { useConnection } from '@/providers/ConnectionProvider';
import { useAdaptiveGlass } from '@/providers/AdaptiveGlassProvider';
import { GovernanceEvent, DecisionExplanation, DecisionNote } from '@/types/bot';
import { triggerHaptic } from '@/hooks/useHaptics';
import GlassCard from '@/components/GlassCard';
import CognitiveLoadIndicator from '@/components/CognitiveLoadIndicator';
import {
  BrainStatus,
  getBrainStatus,
  getStatusColor,
  getModeLabel,
  formatTimestamp,
  getReasoningSummary,
  loadNotesFromStorage,
  saveNotesToStorage,
} from '@/components/governance/config';
import { ExplainDecisionModal, HypotheticalAnalysisModal, NoteEditorModal } from '@/components/governance/GovernanceModals';
import { TimelineSection, GuardrailsSection } from '@/components/governance/GovernanceSections';

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
      const pulse = Animated.loop(Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 0.6, duration: 1800, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 1800, useNativeDriver: true }),
      ]));
      const glow = Animated.loop(Animated.sequence([
        Animated.timing(glowAnim, { toValue: 1, duration: 2000, useNativeDriver: true }),
        Animated.timing(glowAnim, { toValue: 0, duration: 2000, useNativeDriver: true }),
      ]));
      pulse.start();
      glow.start();
      return () => { pulse.stop(); glow.stop(); };
    } else {
      pulseAnim.setValue(1);
      glowAnim.setValue(0);
    }
  }, [isWaiting, isFrozen, pulseAnim, glowAnim]);

  const renderContent = () => (
    <View style={styles.brainInnerContent}>
      <View style={styles.brainHeaderRow}>
        <View style={styles.brainIconContainer}>
          <Animated.View style={[styles.brainGlow, { backgroundColor: statusColor, opacity: glowAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 0.3] }) }]} />
          <Brain size={20} color={statusColor} strokeWidth={1.8} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.brainLabel, isFrozen && styles.textFrozen]}>Governance Brain</Text>
          <Text style={styles.brainSubtitle}>n8n orchestration layer</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: statusColor + '20', borderColor: statusColor + '40' }]}>
          <Animated.View style={[styles.statusDot, { backgroundColor: statusColor, opacity: pulseAnim }]} />
          <Text style={[styles.statusText, { color: statusColor }]}>{brainStatus}</Text>
        </View>
      </View>
      <View style={styles.brainDetailsRow}>
        <View style={styles.brainDetailItem}>
          <Text style={[styles.brainDetailLabel, isFrozen && styles.textFrozen]}>MODE</Text>
          <Text style={[styles.brainDetailValue, isFrozen && styles.textFrozen]}>{getModeLabel(globalState)}</Text>
        </View>
        <View style={styles.brainDetailDivider} />
        <View style={styles.brainDetailItem}>
          <Text style={[styles.brainDetailLabel, isFrozen && styles.textFrozen]}>DECISIONS</Text>
          <View style={styles.inlineRow}>
            <Activity size={10} color={pendingApprovals > 0 ? statusColor : Colors.textMuted} />
            <Text style={[styles.brainDetailValue, pendingApprovals > 0 && !isFrozen && { color: statusColor }, isFrozen && styles.textFrozen]}>{pendingApprovals}</Text>
          </View>
        </View>
        <View style={styles.brainDetailDivider} />
        <View style={styles.brainDetailItem}>
          <Text style={[styles.brainDetailLabel, isFrozen && styles.textFrozen]}>LAST</Text>
          <View style={styles.inlineRow}>
            <Clock size={10} color={Colors.textMuted} />
            <Text style={[styles.brainDetailValue, { fontSize: 10 }, isFrozen && styles.textFrozen]}>{formatTimestamp(lastBroadcast?.timestamp)}</Text>
          </View>
        </View>
      </View>
    </View>
  );

  if (Platform.OS === 'web') {
    return (
      <View style={[styles.brainContainer, isFrozen && styles.brainContainerFrozen, isDarker && styles.brainContainerDarker, styles.webBrainContainer]}>
        {renderContent()}
      </View>
    );
  }

  return (
    <View style={[styles.brainContainer, isFrozen && styles.brainContainerFrozen, isDarker && styles.brainContainerDarker]}>
      <BlurView intensity={isDarker ? 50 : 35} tint="dark" style={{ flex: 1 }}>{renderContent()}</BlurView>
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
      const pulse = Animated.loop(Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1, duration: 1500, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 0.4, duration: 1500, useNativeDriver: true }),
      ]));
      pulse.start();
      return () => pulse.stop();
    } else {
      pulseAnim.setValue(0.4);
    }
  }, [isWaiting, pulseAnim]);

  const stateColor = isWaiting ? '#A78BFA' : isFrozen ? '#64B5F6' : '#6EE7B7';
  const stateIcon = isWaiting ? <Radio size={18} color={stateColor} /> : isFrozen ? <Snowflake size={18} color={stateColor} /> : <Eye size={18} color={stateColor} />;
  const stateLabel = isWaiting ? 'Awaiting Decision' : isFrozen ? 'System Frozen' : 'Standing By';

  return (
    <GlassCard style={[styles.stateCard, isDarker && styles.stateCardDarker]} variant="elevated">
      <View style={styles.stateHeader}>
        <Animated.View style={[styles.stateIconContainer, { opacity: isWaiting ? pulseAnim : 1 }]}>
          <View style={[styles.stateIconBg, { backgroundColor: stateColor + '15' }]}>{stateIcon}</View>
        </Animated.View>
        <View style={{ flex: 1 }}>
          <Text style={styles.stateTitle}>{stateLabel}</Text>
          <Text style={styles.stateSubtitle}>Current governance posture</Text>
        </View>
      </View>
      <View style={[styles.reasoningContainer, { borderColor: stateColor + '20' }]}>
        <Text style={styles.reasoningText}>{reasoningSummary}</Text>
      </View>
      {isWaiting && (
        <View style={styles.waitingBanner}>
          <LinearGradient colors={['#A78BFA15', '#A78BFA08']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={StyleSheet.absoluteFill} />
          <Radio size={12} color="#A78BFA" />
          <Text style={styles.waitingText}>Governance awaiting human decision</Text>
        </View>
      )}
    </GlassCard>
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

  useEffect(() => { loadNotesFromStorage().then(setDecisionNotes); }, []);

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
    setTimeout(() => { setSelectedEvent(null); setExplanation(null); }, 300);
  }, []);

  const handleOpenHypothetical = useCallback(() => {
    console.log('[Governance] Opening hypothetical analysis modal');
    setHypotheticalModalVisible(true);
    triggerHaptic('light');
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

  const { refetch: refetchTimeline, isRefetching: isRefetchingTimeline } = useQuery({
    queryKey: ['governanceTimeline'],
    queryFn: api.getGovernanceTimeline,
    enabled: false,
  });

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }).start();
  }, [fadeAnim]);

  const handleRefresh = async () => {
    await Promise.all([refetchStatus(), refetchTimeline()]);
  };

  const isOffline = governanceState === 'OFFLINE';

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#0A0A12', '#050508', '#080810']} style={StyleSheet.absoluteFill} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />
      <View style={[styles.glowOrb, styles.glowOrb1]} />
      <View style={[styles.glowOrb, styles.glowOrb2]} />

      <Animated.View style={[styles.content, { paddingTop: insets.top, opacity: fadeAnim }]}>
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <View style={styles.logoContainer}><Brain size={22} color={Colors.primary} strokeWidth={2.5} /></View>
            <Text style={styles.headerTitle}>GOVERNANCE</Text>
          </View>
          <Pressable style={styles.hypotheticalButton} onPress={handleOpenHypothetical} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <LinearGradient colors={['#A78BFA20', '#A78BFA10']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={StyleSheet.absoluteFill} />
            <Sparkles size={14} color="#A78BFA" />
            <Text style={styles.hypotheticalButtonText}>What If…</Text>
          </Pressable>
        </View>

        <View style={styles.consoleBanner}>
          <LinearGradient colors={[Colors.textMuted + '15', Colors.textMuted + '08']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={StyleSheet.absoluteFill} />
          <Eye size={14} color={Colors.textSecondary} />
          <Text style={styles.consoleBannerText}>OBSERVATION DECK — NO EXECUTION CONTROLS</Text>
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={isRefetchingTimeline} onRefresh={handleRefresh} tintColor={Colors.primary} colors={[Colors.primary]} />}
        >
          {isOffline ? (
            <View style={styles.offlineContainer}>
              <View style={styles.offlineIconContainer}><AlertTriangle size={48} color={Colors.warning} /></View>
              <Text style={styles.offlineTitle}>Governance Offline</Text>
              <Text style={styles.offlineSubtitle}>Unable to connect to n8n governance layer</Text>
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
              <View style={styles.sectionContainer}>
                <View style={styles.sectionHeader}>
                  <View style={styles.sectionHeaderLeft}><Shield size={16} color={Colors.textSecondary} /><Text style={styles.sectionTitle}>Governance Guardrails</Text></View>
                  <Text style={styles.sectionSubtitle}>Active safety rules</Text>
                </View>
                <GuardrailsSection />
              </View>
              <View style={styles.sectionContainer}>
                <View style={styles.sectionHeader}>
                  <View style={styles.sectionHeaderLeft}><Clock size={16} color={Colors.textSecondary} /><Text style={styles.sectionTitle}>Recent Activity</Text></View>
                  <Text style={styles.sectionSubtitle}>Latest governance events</Text>
                </View>
                <TimelineSection onExplainEvent={handleExplainEvent} onAddNote={handleOpenNoteModal} notes={decisionNotes} />
              </View>
            </>
          )}
        </ScrollView>

        <ExplainDecisionModal visible={explainModalVisible} event={selectedEvent} explanation={explanation} isLoading={isLoadingExplanation} onClose={handleCloseExplainModal} />
        <HypotheticalAnalysisModal visible={hypotheticalModalVisible} onClose={() => setHypotheticalModalVisible(false)} />
        <NoteEditorModal visible={noteModalVisible} event={noteEvent} existingNote={noteEvent ? decisionNotes[noteEvent.id] || null : null} onClose={handleCloseNoteModal} onSave={handleSaveNote} onDelete={handleDeleteNote} />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  glowOrb: { position: 'absolute', borderRadius: 999, opacity: 0.08 },
  glowOrb1: { width: 180, height: 180, top: 80, left: -50, backgroundColor: '#A78BFA' },
  glowOrb2: { width: 140, height: 140, bottom: 200, right: -40, backgroundColor: '#6EE7B7' },
  content: { flex: 1 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 16 },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  logoContainer: { width: 44, height: 44, borderRadius: 14, backgroundColor: Colors.primary + '15', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: Colors.primary + '30' },
  headerTitle: { fontSize: 20, fontWeight: '800' as const, color: Colors.text, letterSpacing: 1 },
  hypotheticalButton: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, borderWidth: 1, borderColor: '#A78BFA30', overflow: 'hidden' },
  hypotheticalButtonText: { fontSize: 12, fontWeight: '600' as const, color: '#A78BFA', letterSpacing: 0.3 },
  consoleBanner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 10, marginHorizontal: 16, borderRadius: 10, overflow: 'hidden' },
  consoleBannerText: { fontSize: 10, fontWeight: '700' as const, color: Colors.textSecondary, letterSpacing: 0.5 },
  scrollView: { flex: 1 },
  scrollContent: { paddingBottom: 100 },
  brainContainer: { marginHorizontal: 16, marginTop: 12, borderRadius: 18, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.06)' },
  brainContainerFrozen: { borderColor: Colors.warning + '30', opacity: 0.85 },
  brainContainerDarker: { borderColor: 'rgba(255, 255, 255, 0.04)' },
  webBrainContainer: { backgroundColor: 'rgba(13, 13, 18, 0.75)' },
  brainInnerContent: { paddingVertical: 16, paddingHorizontal: 16 },
  brainHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 },
  brainIconContainer: { width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(255, 255, 255, 0.04)', justifyContent: 'center', alignItems: 'center', position: 'relative' },
  brainGlow: { position: 'absolute', width: 50, height: 50, borderRadius: 25 },
  brainLabel: { fontSize: 14, fontWeight: '700' as const, color: Colors.text, letterSpacing: 0.3 },
  brainSubtitle: { fontSize: 11, color: Colors.textMuted, marginTop: 2 },
  textFrozen: { color: Colors.textMuted, opacity: 0.7 },
  statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10, borderWidth: 1 },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusText: { fontSize: 10, fontWeight: '700' as const, letterSpacing: 0.5 },
  brainDetailsRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255, 255, 255, 0.02)', borderRadius: 12, paddingVertical: 12, paddingHorizontal: 8 },
  brainDetailItem: { flex: 1, alignItems: 'center' },
  brainDetailLabel: { fontSize: 9, fontWeight: '600' as const, color: Colors.textMuted, letterSpacing: 0.8, marginBottom: 4 },
  brainDetailValue: { fontSize: 12, fontWeight: '700' as const, color: Colors.textSecondary },
  brainDetailDivider: { width: 1, height: 28, backgroundColor: 'rgba(255, 255, 255, 0.06)' },
  inlineRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  stateCard: { marginHorizontal: 16, marginTop: 12, padding: 16 },
  stateCardDarker: { backgroundColor: 'rgba(5, 5, 8, 0.85)' },
  stateHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  stateIconContainer: { position: 'relative' },
  stateIconBg: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  stateTitle: { fontSize: 15, fontWeight: '700' as const, color: Colors.text },
  stateSubtitle: { fontSize: 11, color: Colors.textMuted, marginTop: 2 },
  reasoningContainer: { backgroundColor: 'rgba(255, 255, 255, 0.03)', borderRadius: 10, paddingVertical: 12, paddingHorizontal: 14, borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.05)' },
  reasoningText: { fontSize: 13, fontWeight: '500' as const, color: Colors.textSecondary, textAlign: 'center' as const, letterSpacing: 0.2, lineHeight: 18 },
  waitingBanner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 10, marginTop: 12, borderRadius: 10, overflow: 'hidden' },
  waitingText: { fontSize: 11, fontWeight: '600' as const, color: '#A78BFA', letterSpacing: 0.3 },
  sectionContainer: { marginTop: 20, marginHorizontal: 16 },
  sectionHeader: { marginBottom: 12 },
  sectionHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 2 },
  sectionTitle: { fontSize: 14, fontWeight: '700' as const, color: Colors.text },
  sectionSubtitle: { fontSize: 11, color: Colors.textMuted, marginLeft: 24 },
  offlineContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 80, gap: 12 },
  offlineIconContainer: { width: 80, height: 80, borderRadius: 40, backgroundColor: 'rgba(255, 179, 0, 0.1)', justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
  offlineTitle: { fontSize: 18, fontWeight: '700' as const, color: Colors.text },
  offlineSubtitle: { fontSize: 14, color: Colors.textSecondary, textAlign: 'center' as const, maxWidth: 260, lineHeight: 20 },
});
