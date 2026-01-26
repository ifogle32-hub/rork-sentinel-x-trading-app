import React, { useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { 
  Clock, 
  History,
  CheckCircle2,
  XCircle,
  Users,
  Snowflake,
  Play,
  Ghost,
  FileCheck,
  AlertTriangle,
  Timer,
} from 'lucide-react-native';
import Colors from '@/constants/colors';
import { api } from '@/lib/api';
import { GovernanceEvent, GovernanceEventType } from '@/types/bot';
import GlassCard, { GlassBadge } from '@/components/GlassCard';

const EVENT_CONFIG: Record<GovernanceEventType, { 
  icon: React.ReactNode; 
  color: string; 
  label: string;
}> = {
  APPROVAL_REQUESTED: {
    icon: <FileCheck size={18} color={Colors.warning} />,
    color: Colors.warning,
    label: 'Approval Requested',
  },
  APPROVAL_GRANTED: {
    icon: <CheckCircle2 size={18} color={Colors.success} />,
    color: Colors.success,
    label: 'Approval Granted',
  },
  APPROVAL_DENIED: {
    icon: <XCircle size={18} color={Colors.error} />,
    color: Colors.error,
    label: 'Approval Denied',
  },
  APPROVAL_TIMED_OUT: {
    icon: <Timer size={18} color={Colors.textMuted} />,
    color: Colors.textMuted,
    label: 'Approval Timed Out',
  },
  QUORUM_REACHED: {
    icon: <Users size={18} color={Colors.primary} />,
    color: Colors.primary,
    label: 'Quorum Reached',
  },
  SYSTEM_FROZEN: {
    icon: <Snowflake size={18} color="#64B5F6" />,
    color: '#64B5F6',
    label: 'System Frozen',
  },
  SYSTEM_RESUMED: {
    icon: <Play size={18} color={Colors.success} />,
    color: Colors.success,
    label: 'System Resumed',
  },
  SHADOW_STRATEGY_CREATED: {
    icon: <Ghost size={18} color={Colors.textSecondary} />,
    color: Colors.textSecondary,
    label: 'Shadow Strategy Created',
  },
};

function formatTimestamp(timestamp: string): { date: string; time: string } {
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
    date = `${diffDays} days ago`;
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

interface TimelineNodeProps {
  event: GovernanceEvent;
  isFirst: boolean;
  isLast: boolean;
  index: number;
}

function TimelineNode({ event, isFirst, isLast, index }: TimelineNodeProps) {
  const config = EVENT_CONFIG[event.type];
  const { date, time } = formatTimestamp(event.timestamp);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        delay: index * 80,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 400,
        delay: index * 80,
        useNativeDriver: true,
      }),
    ]).start();
  }, [fadeAnim, slideAnim, index]);

  return (
    <Animated.View 
      style={[
        styles.nodeContainer,
        { 
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
        }
      ]}
    >
      <View style={styles.timelineTrack}>
        {!isFirst && (
          <LinearGradient
            colors={['transparent', config.color + '40']}
            style={styles.connectorTop}
          />
        )}
        
        <View style={[styles.nodeOuter, { borderColor: config.color + '50' }]}>
          <View style={[styles.nodeInner, { backgroundColor: config.color + '20' }]}>
            {config.icon}
          </View>
          {isFirst && (
            <View style={[styles.pulseRing, { borderColor: config.color }]} />
          )}
        </View>
        
        {!isLast && (
          <LinearGradient
            colors={[config.color + '40', 'transparent']}
            style={styles.connectorBottom}
          />
        )}
      </View>
      
      <View style={styles.nodeContent}>
        <GlassCard 
          style={[
            styles.eventCard,
            isFirst && styles.eventCardHighlight,
          ]} 
          variant={isFirst ? 'elevated' : 'subtle'}
          noPadding
        >
          {isFirst && (
            <LinearGradient
              colors={[config.color + '15', 'transparent']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.highlightGradient}
            />
          )}
          
          <View style={styles.cardInner}>
            <View style={styles.eventHeader}>
              <GlassBadge color={config.color} style={styles.typeBadge}>
                <Text style={[styles.typeLabel, { color: config.color }]}>
                  {config.label}
                </Text>
              </GlassBadge>
              <View style={styles.timeContainer}>
                <Clock size={12} color={Colors.textMuted} />
                <Text style={styles.timeText}>{time}</Text>
              </View>
            </View>
            
            <Text style={styles.summaryText} numberOfLines={2}>
              {event.summary}
            </Text>
            
            <View style={styles.eventFooter}>
              {event.actor && (
                <Text style={styles.actorText}>by {event.actor}</Text>
              )}
              <Text style={styles.dateText}>{date}</Text>
            </View>
          </View>
        </GlassCard>
      </View>
    </Animated.View>
  );
}

function EmptyState() {
  return (
    <View style={styles.emptyState}>
      <View style={styles.emptyIconContainer}>
        <History size={48} color={Colors.textMuted} />
      </View>
      <Text style={styles.emptyTitle}>No Governance Events</Text>
      <Text style={styles.emptySubtitle}>
        Governance events will appear here as they occur
      </Text>
    </View>
  );
}

export default function TimelineScreen() {
  const insets = useSafeAreaInsets();
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 400,
      useNativeDriver: true,
    }).start();
  }, [fadeAnim]);

  const {
    data: events,
    isLoading,
    isError,
    refetch,
    isRefetching,
  } = useQuery({
    queryKey: ['governanceTimeline'],
    queryFn: api.getGovernanceTimeline,
    refetchInterval: 10000,
    retry: 2,
  });

  if (isLoading) {
    return (
      <View style={styles.container}>
        <LinearGradient
          colors={['#0A0A12', '#050508', '#080810']}
          style={StyleSheet.absoluteFill}
        />
        <View style={[styles.content, { paddingTop: insets.top }]}>
          <View style={styles.header}>
            <Text style={styles.headerTitle}>TIMELINE</Text>
          </View>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={Colors.primary} />
            <Text style={styles.loadingText}>Loading timeline...</Text>
          </View>
        </View>
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
        <View style={[styles.content, { paddingTop: insets.top }]}>
          <View style={styles.header}>
            <Text style={styles.headerTitle}>TIMELINE</Text>
          </View>
          <View style={styles.errorContainer}>
            <View style={styles.errorIconContainer}>
              <AlertTriangle size={32} color={Colors.textMuted} />
            </View>
            <Text style={styles.errorTitle}>Timeline Unavailable</Text>
            <Text style={styles.errorText}>
              Awaiting governance connection
            </Text>
          </View>
        </View>
      </View>
    );
  }

  const sortedEvents = [...(events || [])].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );

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
              <History size={22} color={Colors.primary} strokeWidth={2.5} />
            </View>
            <Text style={styles.headerTitle}>TIMELINE</Text>
          </View>
          <GlassBadge style={styles.headerBadge}>
            <View style={styles.headerBadgeContent}>
              <Clock size={14} color={Colors.textSecondary} />
              <Text style={styles.headerCount}>
                {sortedEvents.length} events
              </Text>
            </View>
          </GlassBadge>
        </View>

        <View style={styles.auditBanner}>
          <LinearGradient
            colors={[Colors.textMuted + '15', Colors.textMuted + '08']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={StyleSheet.absoluteFill}
          />
          <History size={14} color={Colors.textSecondary} />
          <Text style={styles.auditText}>
            READ-ONLY AUDIT LENS — NO CONTROLS
          </Text>
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={refetch}
              tintColor={Colors.primary}
              colors={[Colors.primary]}
            />
          }
        >
          {sortedEvents.length === 0 ? (
            <EmptyState />
          ) : (
            <View style={styles.timeline}>
              {sortedEvents.map((event, index) => (
                <TimelineNode
                  key={event.id}
                  event={event}
                  isFirst={index === 0}
                  isLast={index === sortedEvents.length - 1}
                  index={index}
                />
              ))}
            </View>
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
    opacity: 0.1,
  },
  glowOrb1: {
    width: 200,
    height: 200,
    top: 100,
    left: -60,
    backgroundColor: Colors.primary,
  },
  glowOrb2: {
    width: 160,
    height: 160,
    bottom: 240,
    right: -50,
    backgroundColor: '#64B5F6',
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
  auditBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 10,
    marginHorizontal: 16,
    borderRadius: 10,
    overflow: 'hidden',
  },
  auditText: {
    fontSize: 11,
    fontWeight: '700' as const,
    color: Colors.textSecondary,
    letterSpacing: 0.5,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
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
  errorIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  errorTitle: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.textSecondary,
  },
  errorText: {
    fontSize: 13,
    color: Colors.textMuted,
    textAlign: 'center',
    lineHeight: 18,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 80,
    gap: 12,
  },
  emptyIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.05)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: Colors.text,
  },
  emptySubtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    maxWidth: 260,
    lineHeight: 20,
  },
  timeline: {
    paddingLeft: 8,
  },
  nodeContainer: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  timelineTrack: {
    width: 56,
    alignItems: 'center',
  },
  connectorTop: {
    width: 2,
    height: 20,
  },
  connectorBottom: {
    width: 2,
    flex: 1,
    minHeight: 20,
  },
  nodeOuter: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
  },
  nodeInner: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pulseRing: {
    position: 'absolute',
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 2,
    opacity: 0.3,
  },
  nodeContent: {
    flex: 1,
    paddingLeft: 12,
    paddingBottom: 16,
  },
  eventCard: {
    overflow: 'hidden',
  },
  eventCardHighlight: {
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
  },
  highlightGradient: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 20,
  },
  cardInner: {
    padding: 14,
    gap: 10,
  },
  eventHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  typeBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  typeLabel: {
    fontSize: 11,
    fontWeight: '700' as const,
    letterSpacing: 0.3,
  },
  timeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  timeText: {
    fontSize: 12,
    color: Colors.textMuted,
  },
  summaryText: {
    fontSize: 14,
    color: Colors.text,
    lineHeight: 20,
  },
  eventFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  actorText: {
    fontSize: 12,
    color: Colors.textMuted,
    fontStyle: 'italic',
  },
  dateText: {
    fontSize: 12,
    color: Colors.textMuted,
  },
});
