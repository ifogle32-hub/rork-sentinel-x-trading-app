import React, { useRef, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import { Clock, HelpCircle, PenLine, FileText, Shield } from 'lucide-react-native';
import { useQuery } from '@tanstack/react-query';
import Colors from '@/constants/colors';
import { api } from '@/lib/api';
import { GovernanceEvent, GuardrailRule, DecisionNote } from '@/types/bot';
import { triggerHaptic } from '@/hooks/useHaptics';
import { GlassBadge } from '@/components/GlassCard';
import DecisionConfidenceMeter from '@/components/DecisionConfidenceMeter';
import {
  EVENT_CONFIG,
  GUARDRAIL_CATEGORY_CONFIG,
  GuardrailCategory,
  formatEventTime,
  getEventConfidenceLevel,
} from './config';

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
      Animated.timing(fadeAnim, { toValue: 1, duration: 300, delay: index * 50, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 300, delay: index * 50, useNativeDriver: true }),
    ]).start();
  }, [fadeAnim, slideAnim, index]);

  return (
    <Animated.View style={[styles.eventRow, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }, isFirst && styles.eventRowFirst]}>
      <View style={[styles.eventIndicator, { backgroundColor: config.color + '20' }]}>{config.icon}</View>
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
        <Text style={styles.eventSummary} numberOfLines={2}>{event.summary}</Text>
        <View style={styles.eventMeta}>
          <View style={styles.eventMetaLeft}>
            {event.actor && <Text style={styles.eventActor}>by {event.actor}</Text>}
            {confidenceLevel && <DecisionConfidenceMeter level={confidenceLevel} compact />}
          </View>
          <View style={styles.eventActions}>
            <Pressable style={[styles.noteButton, hasNote && styles.noteButtonActive]} onPress={() => { triggerHaptic('selection'); onAddNote(event); }} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              {hasNote ? <FileText size={12} color="#A78BFA" /> : <PenLine size={12} color={Colors.textMuted} />}
            </Pressable>
            <Pressable style={styles.explainButton} onPress={() => { triggerHaptic('selection'); onExplain(event); }} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <HelpCircle size={12} color={Colors.textSecondary} />
              <Text style={styles.explainButtonText}>Explain</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Animated.View>
  );
}

interface TimelineSectionProps {
  onExplainEvent: (event: GovernanceEvent) => void;
  onAddNote: (event: GovernanceEvent) => void;
  notes: Record<string, DecisionNote>;
}

export function TimelineSection({ onExplainEvent, onAddNote, notes }: TimelineSectionProps) {
  const { data: events, isLoading, isError } = useQuery({
    queryKey: ['governanceTimeline'],
    queryFn: api.getGovernanceTimeline,
    refetchInterval: 10000,
    retry: 2,
  });

  const sortedEvents = useMemo(() => {
    return [...(events || [])].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).slice(0, 10);
  }, [events]);

  if (isLoading) {
    return (
      <View style={styles.centerRow}><ActivityIndicator size="small" color={Colors.primary} /><Text style={styles.centerText}>Loading timeline...</Text></View>
    );
  }

  if (isError || sortedEvents.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <View style={styles.emptyIcon}><Clock size={24} color={Colors.textMuted} /></View>
        <Text style={styles.emptyText}>No governance events yet</Text>
      </View>
    );
  }

  return (
    <View style={styles.timelineList}>
      {sortedEvents.map((event, index) => (
        <TimelineEvent key={event.id} event={event} isFirst={index === 0} index={index} onExplain={onExplainEvent} onAddNote={onAddNote} hasNote={!!notes[event.id]} />
      ))}
    </View>
  );
}

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
      Animated.timing(fadeAnim, { toValue: 1, duration: 350, delay: index * 80, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 350, delay: index * 80, useNativeDriver: true }),
    ]).start();
  }, [fadeAnim, slideAnim, index]);

  return (
    <Animated.View style={[grStyles.categoryCard, { opacity: fadeAnim, transform: [{ translateY: slideAnim }], borderColor: config.color + '20' }]}>
      <View style={grStyles.categoryHeader}>
        <View style={[grStyles.categoryIcon, { backgroundColor: config.color + '15' }]}>{config.icon}</View>
        <Text style={[grStyles.categoryLabel, { color: config.color }]}>{config.label}</Text>
      </View>
      <View style={grStyles.rulesList}>
        {rules.map((rule) => (
          <View key={rule.id} style={grStyles.ruleRow}>
            <View style={[grStyles.ruleStatusDot, { backgroundColor: rule.status === 'ACTIVE' ? config.color : Colors.textMuted }]} />
            <View style={{ flex: 1 }}>
              <Text style={grStyles.ruleTitle}>{rule.title}</Text>
              <Text style={grStyles.ruleDescription}>{rule.description}</Text>
            </View>
          </View>
        ))}
      </View>
    </Animated.View>
  );
}

export function GuardrailsSection() {
  const { data: guardrails, isLoading, isError } = useQuery({
    queryKey: ['governanceGuardrails'],
    queryFn: api.getGovernanceGuardrails,
    staleTime: 60000,
    retry: 2,
  });

  if (isLoading) {
    return <View style={styles.centerRow}><ActivityIndicator size="small" color={Colors.primary} /><Text style={styles.centerText}>Loading guardrails...</Text></View>;
  }

  if (isError || !guardrails) {
    return <View style={styles.emptyContainer}><Shield size={24} color={Colors.textMuted} /><Text style={styles.emptyText}>Unable to load guardrails</Text></View>;
  }

  const categories: GuardrailCategory[] = ['approval_requirements', 'quorum_rules', 'freeze_conditions', 'shadow_constraints'];

  return (
    <View style={grStyles.container}>
      {categories.map((category, index) => (
        <GuardrailCategoryCard key={category} category={category} rules={guardrails[category]} index={index} />
      ))}
      <View style={grStyles.disclaimerRow}>
        <Shield size={12} color={Colors.textMuted} />
        <Text style={grStyles.disclaimerText}>Read-only view • Safety rules are enforced by governance</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  centerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, paddingVertical: 40 },
  centerText: { fontSize: 13, color: Colors.textSecondary },
  emptyContainer: { alignItems: 'center', paddingVertical: 40, gap: 10 },
  emptyIcon: { width: 56, height: 56, borderRadius: 28, backgroundColor: 'rgba(255, 255, 255, 0.04)', justifyContent: 'center', alignItems: 'center' },
  emptyText: { fontSize: 13, color: Colors.textMuted },
  timelineList: { gap: 8 },
  eventRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, backgroundColor: 'rgba(255, 255, 255, 0.02)', borderRadius: 14, padding: 12, borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.04)' },
  eventRowFirst: { borderColor: 'rgba(255, 255, 255, 0.08)', backgroundColor: 'rgba(255, 255, 255, 0.035)' },
  eventIndicator: { width: 32, height: 32, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  eventContent: { flex: 1, gap: 6 },
  eventTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  eventTypeBadge: { paddingHorizontal: 8, paddingVertical: 3 },
  eventTypeLabel: { fontSize: 10, fontWeight: '700' as const, letterSpacing: 0.3 },
  eventTimeContainer: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  eventTime: { fontSize: 10, color: Colors.textMuted },
  eventSummary: { fontSize: 12, color: Colors.text, lineHeight: 17 },
  eventMeta: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  eventMetaLeft: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 },
  eventActor: { fontSize: 10, color: Colors.textMuted, fontStyle: 'italic' as const },
  eventActions: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  noteButton: { width: 28, height: 28, borderRadius: 6, backgroundColor: 'rgba(255, 255, 255, 0.04)', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.06)' },
  noteButtonActive: { backgroundColor: '#A78BFA15', borderColor: '#A78BFA30' },
  explainButton: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, backgroundColor: 'rgba(255, 255, 255, 0.04)', borderRadius: 6, borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.06)' },
  explainButtonText: { fontSize: 10, fontWeight: '600' as const, color: Colors.textSecondary },
});

const grStyles = StyleSheet.create({
  container: { gap: 10 },
  categoryCard: { backgroundColor: 'rgba(255, 255, 255, 0.02)', borderRadius: 14, padding: 14, borderWidth: 1 },
  categoryHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  categoryIcon: { width: 32, height: 32, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  categoryLabel: { fontSize: 13, fontWeight: '700' as const, letterSpacing: 0.3 },
  rulesList: { gap: 10 },
  ruleRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  ruleStatusDot: { width: 6, height: 6, borderRadius: 3, marginTop: 6 },
  ruleTitle: { fontSize: 12, fontWeight: '600' as const, color: Colors.text, marginBottom: 2 },
  ruleDescription: { fontSize: 11, color: Colors.textMuted, lineHeight: 16 },
  disclaimerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 12, marginTop: 4 },
  disclaimerText: { fontSize: 10, color: Colors.textMuted, fontStyle: 'italic' as const },
});
