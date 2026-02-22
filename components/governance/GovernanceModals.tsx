import React, { useRef, useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Animated,
  Platform,
  Modal,
  Pressable,
  Dimensions,
  TextInput,
  KeyboardAvoidingView,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import {
  X,
  CheckCircle2,
  AlertOctagon,
  Sparkles,
  ChevronRight,
  Shield,
  Users,
  HelpCircle,
  CircleDot,
  PenLine,
  FileText,
  Trash2,
} from 'lucide-react-native';
import Colors from '@/constants/colors';
import { api } from '@/lib/api';
import { GovernanceEvent, DecisionExplanation, HypotheticalScenario, HypotheticalAnalysis, DecisionNote } from '@/types/bot';
import { triggerHaptic } from '@/hooks/useHaptics';
import DecisionConfidenceMeter from '@/components/DecisionConfidenceMeter';
import { EVENT_CONFIG, SCENARIO_CONFIG, getEventConfidenceLevel } from './config';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

const baseModal = {
  overlay: {
    flex: 1,
    justifyContent: 'flex-end' as const,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
  },
  content: {
    backgroundColor: '#0D0D12',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderBottomWidth: 0,
  },
  header: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'flex-start' as const,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.06)',
  },
  titleRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 12,
    flex: 1,
  },
  icon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
  },
  titleContainer: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: Colors.text,
    letterSpacing: 0.2,
  },
  subtitle: {
    fontSize: 12,
    color: Colors.textMuted,
    marginTop: 2,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
  },
  footer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.06)',
    alignItems: 'center' as const,
  },
  footerText: {
    fontSize: 11,
    color: Colors.textMuted,
    fontStyle: 'italic' as const,
  },
};

interface ExplainModalProps {
  visible: boolean;
  event: GovernanceEvent | null;
  explanation: DecisionExplanation | null;
  isLoading: boolean;
  onClose: () => void;
}

export function ExplainDecisionModal({ visible, event, explanation, isLoading, onClose }: ExplainModalProps) {
  const slideAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const confidenceLevel = event ? getEventConfidenceLevel(event) : null;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 250, useNativeDriver: true }),
        Animated.spring(slideAnim, { toValue: 1, damping: 20, stiffness: 150, useNativeDriver: true }),
      ]).start();
    } else {
      fadeAnim.setValue(0);
      slideAnim.setValue(0);
    }
  }, [visible, fadeAnim, slideAnim]);

  const config = event ? EVENT_CONFIG[event.type] : null;
  const translateY = slideAnim.interpolate({ inputRange: [0, 1], outputRange: [300, 0] });

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose} statusBarTranslucent>
      <Pressable style={explainStyles.overlay} onPress={onClose}>
        <Animated.View style={[explainStyles.backdrop, { opacity: fadeAnim }]} />
        <Animated.View style={[explainStyles.content, { transform: [{ translateY }] }]}>
          <Pressable onPress={(e) => e.stopPropagation()}>
            <View style={explainStyles.header}>
              <View style={explainStyles.titleRow}>
                <View style={[explainStyles.icon, { backgroundColor: (config?.color || Colors.primary) + '15' }]}>
                  <HelpCircle size={18} color={config?.color || Colors.primary} />
                </View>
                <View style={explainStyles.titleContainer}>
                  <Text style={explainStyles.title}>Explain This Decision</Text>
                  <Text style={explainStyles.subtitle}>{config?.label || 'Event'}</Text>
                </View>
              </View>
              <Pressable style={explainStyles.closeBtn} onPress={onClose} hitSlop={12}>
                <X size={20} color={Colors.textSecondary} />
              </Pressable>
            </View>

            {isLoading ? (
              <View style={explainStyles.loading}>
                <ActivityIndicator size="small" color={Colors.primary} />
                <Text style={explainStyles.loadingText}>Generating explanation...</Text>
              </View>
            ) : explanation ? (
              <View style={explainStyles.explanationContent}>
                {confidenceLevel && <DecisionConfidenceMeter level={confidenceLevel} style={{ marginBottom: 4 }} />}
                <View style={explainStyles.section}>
                  <Text style={explainStyles.sectionLabel}>DECISION SUMMARY</Text>
                  <Text style={explainStyles.summaryText}>{explanation.decision_summary}</Text>
                </View>
                <View style={explainStyles.section}>
                  <Text style={explainStyles.sectionLabel}>KEY FACTORS</Text>
                  {explanation.key_factors.slice(0, 5).map((factor, idx) => (
                    <View key={idx} style={explainStyles.factorRow}>
                      <CircleDot size={10} color={Colors.textSecondary} />
                      <Text style={explainStyles.factorText}>{factor}</Text>
                    </View>
                  ))}
                </View>
                <View style={explainStyles.requirementBox}>
                  <View style={explainStyles.reqHeader}>
                    <CheckCircle2 size={14} color="#6EE7B7" />
                    <Text style={explainStyles.reqLabel}>What Was Required</Text>
                  </View>
                  <Text style={explainStyles.reqText}>{explanation.what_was_required}</Text>
                </View>
                {explanation.what_was_missing && (
                  <View style={explainStyles.missingBox}>
                    <View style={explainStyles.reqHeader}>
                      <AlertOctagon size={14} color={Colors.warning} />
                      <Text style={explainStyles.missingLabel}>What Was Missing</Text>
                    </View>
                    <Text style={explainStyles.reqText}>{explanation.what_was_missing}</Text>
                  </View>
                )}
              </View>
            ) : (
              <View style={explainStyles.loading}>
                <Text style={explainStyles.loadingText}>Unable to generate explanation</Text>
              </View>
            )}

            <View style={explainStyles.footer}>
              <Text style={explainStyles.footerText}>Read-only explanation • No actions available</Text>
            </View>
          </Pressable>
        </Animated.View>
      </Pressable>
    </Modal>
  );
}

interface HypotheticalModalProps {
  visible: boolean;
  onClose: () => void;
}

export function HypotheticalAnalysisModal({ visible, onClose }: HypotheticalModalProps) {
  const slideAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const [selectedScenario, setSelectedScenario] = useState<HypotheticalScenario | null>(null);
  const [analysis, setAnalysis] = useState<HypotheticalAnalysis | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 250, useNativeDriver: true }),
        Animated.spring(slideAnim, { toValue: 1, damping: 20, stiffness: 150, useNativeDriver: true }),
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
    setTimeout(() => { setSelectedScenario(null); setAnalysis(null); }, 300);
  }, [onClose]);

  const translateY = slideAnim.interpolate({ inputRange: [0, 1], outputRange: [400, 0] });

  const getConstraintColor = (status: 'PASS' | 'WARN' | 'BLOCK') => {
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
        const cfg = SCENARIO_CONFIG[scenario];
        return (
          <Pressable key={scenario} style={hypStyles.scenarioItem} onPress={() => handleSelectScenario(scenario)}>
            <View style={[hypStyles.scenarioIcon, { backgroundColor: cfg.color + '15' }]}>{cfg.icon}</View>
            <View style={hypStyles.scenarioContent}>
              <Text style={hypStyles.scenarioLabel}>{cfg.label}</Text>
              <Text style={hypStyles.scenarioDesc}>{cfg.description}</Text>
            </View>
            <ChevronRight size={16} color={Colors.textMuted} />
          </Pressable>
        );
      })}
    </View>
  );

  const renderAnalysisResult = () => {
    if (!analysis || !selectedScenario) return null;
    const cfg = SCENARIO_CONFIG[selectedScenario];
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
            <View style={[hypStyles.outcomeIcon, { backgroundColor: cfg.color + '15' }]}>{cfg.icon}</View>
            <View style={hypStyles.outcomeTitleContainer}>
              <Text style={hypStyles.outcomeTitle}>{analysis.scenario_label}</Text>
              <View style={[hypStyles.outcomeBadge, { backgroundColor: analysis.would_proceed ? '#6EE7B715' : Colors.warning + '15' }]}>
                <Text style={[hypStyles.outcomeBadgeText, { color: analysis.would_proceed ? '#6EE7B7' : Colors.warning }]}>
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
                <View style={hypStyles.smallIcon}><Users size={12} color={Colors.primary} /></View>
                <View style={{ flex: 1 }}>
                  <Text style={hypStyles.itemTitle}>{approval.type}</Text>
                  <Text style={hypStyles.itemMeta}>From: {approval.required_from} • Quorum: {approval.quorum_needed} • {approval.estimated_wait}</Text>
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
                <View style={hypStyles.blockIcon}><AlertOctagon size={12} color={Colors.warning} /></View>
                <View style={{ flex: 1 }}>
                  <Text style={hypStyles.itemTitle}>{block.reason}</Text>
                  <Text style={hypStyles.itemMeta}>{block.blocking_factor}</Text>
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
                <View style={[hypStyles.constraintDotOuter, { backgroundColor: getConstraintColor(constraint.status) + '20' }]}>
                  <View style={[hypStyles.constraintDot, { backgroundColor: getConstraintColor(constraint.status) }]} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={hypStyles.itemTitle}>{constraint.name}</Text>
                  <Text style={hypStyles.itemMeta}>Current: {constraint.current_value} • Required: {constraint.threshold}</Text>
                </View>
                <Text style={[hypStyles.constraintStatus, { color: getConstraintColor(constraint.status) }]}>{constraint.status}</Text>
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
    <Modal visible={visible} transparent animationType="none" onRequestClose={handleClose} statusBarTranslucent>
      <Pressable style={hypStyles.overlay} onPress={handleClose}>
        <Animated.View style={[hypStyles.backdrop, { opacity: fadeAnim }]} />
        <Animated.View style={[hypStyles.content, { transform: [{ translateY }] }]}>
          <Pressable onPress={(e) => e.stopPropagation()}>
            <View style={hypStyles.header}>
              <View style={hypStyles.titleRow}>
                <View style={hypStyles.icon}><Sparkles size={18} color="#A78BFA" /></View>
                <View style={{ flex: 1 }}>
                  <Text style={hypStyles.title}>What Would Happen If…</Text>
                  <Text style={hypStyles.subtitle}>Explore governance outcomes</Text>
                </View>
              </View>
              <Pressable style={hypStyles.closeBtn} onPress={handleClose} hitSlop={12}>
                <X size={20} color={Colors.textSecondary} />
              </Pressable>
            </View>
            <View style={hypStyles.banner}>
              <LinearGradient colors={['#A78BFA15', '#A78BFA08']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={StyleSheet.absoluteFill} />
              <Shield size={12} color="#A78BFA" />
              <Text style={hypStyles.bannerText}>HYPOTHETICAL — NO EXECUTION</Text>
            </View>
            {isLoading ? (
              <View style={hypStyles.loading}><ActivityIndicator size="small" color={Colors.primary} /><Text style={hypStyles.loadingText}>Simulating scenario...</Text></View>
            ) : selectedScenario && analysis ? renderAnalysisResult() : renderScenarioSelection()}
            <View style={hypStyles.footer}>
              <Text style={hypStyles.footerText}>Read-only simulation • No side effects</Text>
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

export function NoteEditorModal({ visible, event, existingNote, onClose, onSave, onDelete }: NoteEditorModalProps) {
  const slideAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const [noteContent, setNoteContent] = useState('');

  useEffect(() => {
    if (visible) {
      setNoteContent(existingNote?.content || '');
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 250, useNativeDriver: true }),
        Animated.spring(slideAnim, { toValue: 1, damping: 20, stiffness: 150, useNativeDriver: true }),
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

  const translateY = slideAnim.interpolate({ inputRange: [0, 1], outputRange: [300, 0] });
  const config = event ? EVENT_CONFIG[event.type] : null;

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose} statusBarTranslucent>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Pressable style={noteStyles.overlay} onPress={onClose}>
          <Animated.View style={[noteStyles.backdrop, { opacity: fadeAnim }]} />
          <Animated.View style={[noteStyles.content, { transform: [{ translateY }] }]}>
            <Pressable onPress={(e) => e.stopPropagation()}>
              <View style={noteStyles.header}>
                <View style={noteStyles.titleRow}>
                  <View style={noteStyles.icon}><PenLine size={18} color="#A78BFA" /></View>
                  <View style={{ flex: 1 }}>
                    <Text style={noteStyles.title}>{existingNote ? 'Edit Note' : 'Add Note'}</Text>
                    <Text style={noteStyles.subtitle} numberOfLines={1}>{config?.label || 'Event'}</Text>
                  </View>
                </View>
                <Pressable style={noteStyles.closeBtn} onPress={onClose} hitSlop={12}>
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
                <Text style={noteStyles.privateHint}>Private • Does not affect system behavior</Text>
              </View>
              <View style={noteStyles.footerRow}>
                {existingNote && (
                  <Pressable style={noteStyles.deleteButton} onPress={handleDelete}>
                    <Trash2 size={16} color={Colors.error} />
                  </Pressable>
                )}
                <View style={{ flex: 1 }} />
                <Pressable style={noteStyles.cancelButton} onPress={onClose}>
                  <Text style={noteStyles.cancelText}>Cancel</Text>
                </Pressable>
                <Pressable
                  style={[noteStyles.saveButton, !noteContent.trim() && noteStyles.saveDisabled]}
                  onPress={handleSave}
                  disabled={!noteContent.trim()}
                >
                  <Text style={[noteStyles.saveText, !noteContent.trim() && noteStyles.saveTextDisabled]}>Save</Text>
                </Pressable>
              </View>
            </Pressable>
          </Animated.View>
        </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const explainStyles = StyleSheet.create({
  overlay: baseModal.overlay,
  backdrop: baseModal.backdrop,
  content: { ...baseModal.content, maxHeight: SCREEN_HEIGHT * 0.75 },
  header: baseModal.header,
  titleRow: baseModal.titleRow,
  icon: baseModal.icon,
  titleContainer: baseModal.titleContainer,
  title: baseModal.title,
  subtitle: baseModal.subtitle,
  closeBtn: baseModal.closeBtn,
  footer: baseModal.footer,
  footerText: baseModal.footerText,
  loading: { paddingVertical: 48, alignItems: 'center' as const, gap: 12 },
  loadingText: { fontSize: 13, color: Colors.textSecondary },
  explanationContent: { padding: 20, gap: 20 },
  section: { gap: 8 },
  sectionLabel: { fontSize: 10, fontWeight: '700' as const, color: Colors.textMuted, letterSpacing: 0.8 },
  summaryText: { fontSize: 15, fontWeight: '500' as const, color: Colors.text, lineHeight: 22 },
  factorRow: { flexDirection: 'row' as const, alignItems: 'flex-start' as const, gap: 10, paddingLeft: 4 },
  factorText: { fontSize: 13, color: Colors.textSecondary, flex: 1, lineHeight: 18 },
  requirementBox: { backgroundColor: 'rgba(110, 231, 183, 0.06)', borderRadius: 12, padding: 14, gap: 8, borderWidth: 1, borderColor: 'rgba(110, 231, 183, 0.15)' },
  reqHeader: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 8 },
  reqLabel: { fontSize: 11, fontWeight: '700' as const, color: '#6EE7B7', letterSpacing: 0.3 },
  reqText: { fontSize: 13, color: Colors.textSecondary, lineHeight: 18 },
  missingBox: { backgroundColor: 'rgba(255, 179, 0, 0.06)', borderRadius: 12, padding: 14, gap: 8, borderWidth: 1, borderColor: 'rgba(255, 179, 0, 0.15)' },
  missingLabel: { fontSize: 11, fontWeight: '700' as const, color: Colors.warning, letterSpacing: 0.3 },
});

const hypStyles = StyleSheet.create({
  overlay: baseModal.overlay,
  backdrop: baseModal.backdrop,
  content: { ...baseModal.content, maxHeight: SCREEN_HEIGHT * 0.85 },
  header: baseModal.header,
  titleRow: baseModal.titleRow,
  icon: { ...baseModal.icon, backgroundColor: '#A78BFA15' },
  title: baseModal.title,
  subtitle: baseModal.subtitle,
  closeBtn: baseModal.closeBtn,
  footer: baseModal.footer,
  footerText: baseModal.footerText,
  banner: { flexDirection: 'row' as const, alignItems: 'center' as const, justifyContent: 'center' as const, gap: 8, paddingVertical: 10, marginHorizontal: 16, marginTop: 12, borderRadius: 10, overflow: 'hidden' as const },
  bannerText: { fontSize: 10, fontWeight: '700' as const, color: '#A78BFA', letterSpacing: 0.5 },
  loading: { paddingVertical: 60, alignItems: 'center' as const, gap: 12 },
  loadingText: { fontSize: 13, color: Colors.textSecondary },
  scenarioList: { padding: 16, gap: 8 },
  sectionLabel: { fontSize: 10, fontWeight: '700' as const, color: Colors.textMuted, letterSpacing: 0.8, marginBottom: 8, marginLeft: 4 },
  scenarioItem: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 12, backgroundColor: 'rgba(255, 255, 255, 0.03)', borderRadius: 14, padding: 14, borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.06)' },
  scenarioIcon: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center' as const, alignItems: 'center' as const },
  scenarioContent: { flex: 1 },
  scenarioLabel: { fontSize: 14, fontWeight: '600' as const, color: Colors.text },
  scenarioDesc: { fontSize: 12, color: Colors.textMuted, marginTop: 2 },
  analysisScroll: { maxHeight: SCREEN_HEIGHT * 0.55 },
  analysisHeader: { paddingHorizontal: 16, paddingTop: 12 },
  backButton: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 4, paddingVertical: 6, paddingHorizontal: 8, backgroundColor: 'rgba(255, 255, 255, 0.04)', borderRadius: 8, alignSelf: 'flex-start' as const },
  backText: { fontSize: 12, color: Colors.textSecondary, fontWeight: '500' as const },
  outcomeCard: { margin: 16, marginTop: 12, padding: 16, backgroundColor: 'rgba(255, 255, 255, 0.03)', borderRadius: 16, borderWidth: 1 },
  outcomeHeader: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 12, marginBottom: 12 },
  outcomeIcon: { width: 44, height: 44, borderRadius: 12, justifyContent: 'center' as const, alignItems: 'center' as const },
  outcomeTitleContainer: { flex: 1, gap: 6 },
  outcomeTitle: { fontSize: 15, fontWeight: '700' as const, color: Colors.text },
  outcomeBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, alignSelf: 'flex-start' as const },
  outcomeBadgeText: { fontSize: 9, fontWeight: '700' as const, letterSpacing: 0.5 },
  outcomeSummary: { fontSize: 13, color: Colors.textSecondary, lineHeight: 19 },
  section: { paddingHorizontal: 16, marginBottom: 16 },
  approvalRow: { flexDirection: 'row' as const, alignItems: 'flex-start' as const, gap: 10, backgroundColor: 'rgba(255, 255, 255, 0.02)', borderRadius: 10, padding: 12, marginTop: 8 },
  smallIcon: { width: 24, height: 24, borderRadius: 6, backgroundColor: Colors.primary + '15', justifyContent: 'center' as const, alignItems: 'center' as const },
  itemTitle: { fontSize: 13, fontWeight: '600' as const, color: Colors.text },
  itemMeta: { fontSize: 11, color: Colors.textMuted, marginTop: 3 },
  blockRow: { flexDirection: 'row' as const, alignItems: 'flex-start' as const, gap: 10, backgroundColor: 'rgba(255, 179, 0, 0.06)', borderRadius: 10, padding: 12, marginTop: 8, borderWidth: 1, borderColor: 'rgba(255, 179, 0, 0.12)' },
  blockIcon: { width: 24, height: 24, borderRadius: 6, backgroundColor: Colors.warning + '15', justifyContent: 'center' as const, alignItems: 'center' as const },
  blockHint: { fontSize: 11, color: Colors.warning, marginTop: 4, fontStyle: 'italic' as const },
  constraintRow: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 10, backgroundColor: 'rgba(255, 255, 255, 0.02)', borderRadius: 10, padding: 12, marginTop: 8 },
  constraintDotOuter: { width: 24, height: 24, borderRadius: 12, justifyContent: 'center' as const, alignItems: 'center' as const },
  constraintDot: { width: 8, height: 8, borderRadius: 4 },
  constraintStatus: { fontSize: 10, fontWeight: '700' as const, letterSpacing: 0.5 },
  disclaimerContainer: { flexDirection: 'row' as const, alignItems: 'flex-start' as const, gap: 8, marginHorizontal: 16, marginBottom: 16, padding: 12, backgroundColor: 'rgba(255, 255, 255, 0.02)', borderRadius: 10 },
  disclaimerText: { fontSize: 11, color: Colors.textMuted, flex: 1, lineHeight: 16, fontStyle: 'italic' as const },
});

const noteStyles = StyleSheet.create({
  overlay: baseModal.overlay,
  backdrop: baseModal.backdrop,
  content: baseModal.content,
  header: baseModal.header,
  titleRow: baseModal.titleRow,
  icon: { ...baseModal.icon, backgroundColor: '#A78BFA15' },
  title: baseModal.title,
  subtitle: baseModal.subtitle,
  closeBtn: baseModal.closeBtn,
  editorContainer: { padding: 20, gap: 10 },
  editorLabel: { fontSize: 10, fontWeight: '700' as const, color: Colors.textMuted, letterSpacing: 0.8 },
  textInput: { backgroundColor: 'rgba(255, 255, 255, 0.04)', borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.08)', padding: 14, minHeight: 120, maxHeight: 200, fontSize: 14, color: Colors.text, lineHeight: 20 },
  privateHint: { fontSize: 11, color: Colors.textMuted, fontStyle: 'italic' as const, textAlign: 'center' as const },
  footerRow: { flexDirection: 'row' as const, alignItems: 'center' as const, paddingHorizontal: 20, paddingVertical: 16, borderTopWidth: 1, borderTopColor: 'rgba(255, 255, 255, 0.06)', gap: 10 },
  deleteButton: { width: 40, height: 40, borderRadius: 10, backgroundColor: 'rgba(239, 68, 68, 0.1)', justifyContent: 'center' as const, alignItems: 'center' as const, borderWidth: 1, borderColor: 'rgba(239, 68, 68, 0.2)' },
  cancelButton: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10, backgroundColor: 'rgba(255, 255, 255, 0.06)' },
  cancelText: { fontSize: 14, fontWeight: '600' as const, color: Colors.textSecondary },
  saveButton: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 10, backgroundColor: '#A78BFA' },
  saveDisabled: { backgroundColor: 'rgba(167, 139, 250, 0.3)' },
  saveText: { fontSize: 14, fontWeight: '600' as const, color: '#0D0D12' },
  saveTextDisabled: { color: 'rgba(13, 13, 18, 0.5)' },
});
