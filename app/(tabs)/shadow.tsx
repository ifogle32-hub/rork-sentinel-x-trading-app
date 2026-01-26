import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  Animated,
  RefreshControl,
  LayoutAnimation,
  Platform,
  UIManager,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Ghost,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  Clock,
  Eye,
  RefreshCw,
  X,
  Lightbulb,
  ShieldAlert,
  AlertOctagon,
  ArrowRightCircle,
  ArrowLeftCircle,
  Brain,
  Server,
  Activity,
  FileText,
} from 'lucide-react-native';
import { useConnection } from '@/providers/ConnectionProvider';
import { api } from '@/lib/api';
import Colors from '@/constants/colors';
import { N8NShadowStrategy } from '@/types/bot';
import GlassCard, { GlassBadge, GlassDivider } from '@/components/GlassCard';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

interface DossierSectionProps {
  title: string;
  icon: React.ReactNode;
  content: string;
  color: string;
  defaultExpanded?: boolean;
  delay?: number;
}

function DossierSection({ title, icon, content, color, defaultExpanded = false, delay = 0 }: DossierSectionProps) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const [visible, setVisible] = useState(delay === 0);
  const fadeAnim = useRef(new Animated.Value(delay === 0 ? 1 : 0)).current;
  const contentHeight = useRef(new Animated.Value(defaultExpanded ? 1 : 0)).current;

  useEffect(() => {
    if (delay > 0) {
      const timer = setTimeout(() => {
        setVisible(true);
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }).start();
      }, delay);
      return () => clearTimeout(timer);
    }
  }, [delay, fadeAnim]);

  const toggleExpand = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpanded(!expanded);
    Animated.timing(contentHeight, {
      toValue: expanded ? 0 : 1,
      duration: 250,
      useNativeDriver: false,
    }).start();
  };

  if (!visible && delay > 0) {
    return (
      <View style={sectionStyles.placeholder}>
        <View style={sectionStyles.placeholderShimmer} />
      </View>
    );
  }

  return (
    <Animated.View style={[sectionStyles.container, { opacity: fadeAnim }]}>
      <TouchableOpacity 
        style={sectionStyles.header} 
        onPress={toggleExpand}
        activeOpacity={0.7}
      >
        <View style={sectionStyles.headerLeft}>
          <View style={[sectionStyles.iconContainer, { backgroundColor: color + '20' }]}>
            {icon}
          </View>
          <Text style={sectionStyles.title}>{title}</Text>
        </View>
        <View style={[sectionStyles.expandButton, expanded && sectionStyles.expandButtonActive]}>
          {expanded ? (
            <ChevronUp color={Colors.textMuted} size={16} />
          ) : (
            <ChevronDown color={Colors.textMuted} size={16} />
          )}
        </View>
      </TouchableOpacity>
      
      {expanded && (
        <View style={sectionStyles.contentWrapper}>
          <LinearGradient
            colors={[color + '08', 'transparent']}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
            style={sectionStyles.contentGradient}
          />
          <Text style={sectionStyles.content}>{content || 'No data available'}</Text>
        </View>
      )}
    </Animated.View>
  );
}

const sectionStyles = StyleSheet.create({
  container: {
    marginBottom: 2,
    overflow: 'hidden',
  },
  placeholder: {
    height: 52,
    marginBottom: 2,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.02)',
    overflow: 'hidden',
  },
  placeholderShimmer: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.03)',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 4,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: Colors.text,
    letterSpacing: 0.3,
  },
  expandButton: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.05)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  expandButtonActive: {
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  contentWrapper: {
    paddingLeft: 44,
    paddingRight: 8,
    paddingBottom: 12,
    position: 'relative',
  },
  contentGradient: {
    position: 'absolute',
    left: 44,
    right: 8,
    top: 0,
    height: 40,
  },
  content: {
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 20,
  },
});

interface StrategyDossierCardProps {
  strategy: N8NShadowStrategy;
  onPress: () => void;
  index: number;
}

function StrategyDossierCard({ strategy, onPress, index }: StrategyDossierCardProps) {
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const cardFadeAnim = useRef(new Animated.Value(0)).current;
  const [sectionsReady, setSectionsReady] = useState(false);

  useEffect(() => {
    const delay = index * 100;
    const timer = setTimeout(() => {
      Animated.timing(cardFadeAnim, {
        toValue: 1,
        duration: 350,
        useNativeDriver: true,
      }).start(() => {
        setSectionsReady(true);
      });
    }, delay);
    return () => clearTimeout(timer);
  }, [index, cardFadeAnim]);

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 0.5,
          duration: 1500,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1500,
          useNativeDriver: true,
        }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, [pulseAnim]);

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    
    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return date.toLocaleDateString();
  };

  return (
    <Animated.View style={[dossierStyles.cardWrapper, { opacity: cardFadeAnim }]}>
      <GlassCard style={dossierStyles.card} variant="elevated" noPadding>
        <View style={dossierStyles.cardInner}>
          <View style={dossierStyles.thinkingBanner}>
            <LinearGradient
              colors={['rgba(90,90,110,0.15)', 'rgba(90,90,110,0.05)']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={StyleSheet.absoluteFill}
            />
            <Animated.View style={{ opacity: pulseAnim }}>
              <Brain color={Colors.textMuted} size={14} />
            </Animated.View>
            <Text style={dossierStyles.thinkingText}>SHADOW ONLY – THINKING MODE</Text>
          </View>

          <TouchableOpacity 
            style={dossierStyles.headerTouchable}
            onPress={onPress}
            activeOpacity={0.8}
          >
            <View style={dossierStyles.headerContent}>
              <View style={dossierStyles.idBadge}>
                <Ghost color={Colors.primary} size={16} />
                <Text style={dossierStyles.strategyId} numberOfLines={1}>
                  {strategy.strategy_id}
                </Text>
              </View>
              <View style={dossierStyles.timestampBadge}>
                <Clock color={Colors.textMuted} size={11} />
                <Text style={dossierStyles.timestampText}>
                  {formatTime(strategy.created_at)}
                </Text>
              </View>
            </View>
            
            <View style={dossierStyles.summaryContainer}>
              <Text style={dossierStyles.summaryText} numberOfLines={2}>
                {strategy.summary}
              </Text>
            </View>
          </TouchableOpacity>

          <View style={dossierStyles.sectionsContainer}>
            <GlassDivider style={dossierStyles.divider} />
            
            <DossierSection
              title="Hypothesis"
              icon={<Lightbulb color={Colors.success} size={16} />}
              content={strategy.hypothesis}
              color={Colors.success}
              defaultExpanded={true}
              delay={sectionsReady ? 0 : 150}
            />
            
            <DossierSection
              title="Entry Logic"
              icon={<ArrowRightCircle color={Colors.primary} size={16} />}
              content={strategy.entry_logic}
              color={Colors.primary}
              delay={sectionsReady ? 0 : 300}
            />
            
            <DossierSection
              title="Exit Logic"
              icon={<ArrowLeftCircle color="#8B5CF6" size={16} />}
              content={strategy.exit_logic}
              color="#8B5CF6"
              delay={sectionsReady ? 0 : 450}
            />
            
            <DossierSection
              title="Risk Assumptions"
              icon={<ShieldAlert color={Colors.warning} size={16} />}
              content={strategy.risk_assumptions}
              color={Colors.warning}
              delay={sectionsReady ? 0 : 600}
            />
            
            <DossierSection
              title="Failure Modes"
              icon={<AlertOctagon color={Colors.error} size={16} />}
              content={strategy.failure_modes}
              color={Colors.error}
              delay={sectionsReady ? 0 : 750}
            />
          </View>

          <View style={dossierStyles.cardFooter}>
            <GlassBadge color={Colors.warning} style={dossierStyles.statusBadge}>
              <View style={dossierStyles.statusBadgeContent}>
                <Eye color={Colors.warning} size={11} />
                <Text style={dossierStyles.statusBadgeText}>NOT EXECUTABLE</Text>
              </View>
            </GlassBadge>
            <TouchableOpacity 
              style={dossierStyles.viewDetailButton}
              onPress={onPress}
              activeOpacity={0.7}
            >
              <FileText color={Colors.textSecondary} size={14} />
              <Text style={dossierStyles.viewDetailText}>Full Dossier</Text>
            </TouchableOpacity>
          </View>
        </View>
      </GlassCard>
    </Animated.View>
  );
}

const dossierStyles = StyleSheet.create({
  cardWrapper: {
    marginBottom: 16,
  },
  card: {
    borderRadius: 24,
  },
  cardInner: {
    padding: 0,
  },
  thinkingBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 10,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: 'hidden',
  },
  thinkingText: {
    fontSize: 10,
    fontWeight: '700' as const,
    color: Colors.textMuted,
    letterSpacing: 1.5,
  },
  headerTouchable: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 8,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  idBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
    marginRight: 12,
  },
  strategyId: {
    fontSize: 15,
    fontWeight: '700' as const,
    color: Colors.text,
    flex: 1,
  },
  timestampBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255,255,255,0.05)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  timestampText: {
    fontSize: 10,
    color: Colors.textMuted,
  },
  summaryContainer: {
    backgroundColor: 'rgba(255,255,255,0.02)',
    borderRadius: 12,
    padding: 12,
  },
  summaryText: {
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 19,
  },
  sectionsContainer: {
    paddingHorizontal: 16,
  },
  divider: {
    marginVertical: 8,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.04)',
    marginTop: 8,
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
  statusBadgeText: {
    fontSize: 9,
    fontWeight: '700' as const,
    color: Colors.warning,
    letterSpacing: 0.5,
  },
  viewDetailButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.05)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  viewDetailText: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontWeight: '500' as const,
  },
});

export default function ShadowScreen() {
  const insets = useSafeAreaInsets();
  const { governanceState, engineState } = useConnection();
  const [strategies, setStrategies] = useState<N8NShadowStrategy[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedStrategy, setSelectedStrategy] = useState<N8NShadowStrategy | null>(null);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const isGovernanceOnline = governanceState === 'ONLINE';
  const isEngineOffline = engineState === 'EXPECTED_OFFLINE' || engineState === 'OFFLINE';

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 400,
      useNativeDriver: true,
    }).start();
  }, [fadeAnim]);

  const fetchStrategies = useCallback(async () => {
    if (!isGovernanceOnline) {
      console.log('[Shadow] Governance offline, skipping fetch');
      return;
    }
    
    try {
      console.log('[Shadow] Fetching shadow strategies from governance...');
      const data = await api.getShadowStrategiesFromGovernance();
      console.log('[Shadow] Received strategies:', data.length);
      setStrategies(data);
      setLastUpdate(new Date());
      setError(null);
    } catch (err) {
      console.log('[Shadow] Error fetching strategies:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch shadow strategies');
    } finally {
      setLoading(false);
    }
  }, [isGovernanceOnline]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchStrategies();
    setRefreshing(false);
  }, [fetchStrategies]);

  useEffect(() => {
    fetchStrategies();
    
    if (isGovernanceOnline) {
      pollIntervalRef.current = setInterval(fetchStrategies, 10000);
    }
    
    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, [fetchStrategies, isGovernanceOnline]);

  const openStrategyDetail = (strategy: N8NShadowStrategy) => {
    setSelectedStrategy(strategy);
    setDetailModalVisible(true);
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    
    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return date.toLocaleDateString();
  };

  const renderGovernanceOffline = () => (
    <View style={styles.container}>
      <LinearGradient
        colors={['#0A0A12', '#050508', '#080810']}
        style={StyleSheet.absoluteFill}
      />
      <View style={[styles.glowOrb, styles.glowOrb1]} />
      <View style={styles.centerContainer}>
        <Ghost color={Colors.textMuted} size={64} />
        <Text style={styles.offlineTitle}>GOVERNANCE OFFLINE</Text>
        <Text style={styles.offlineSubtitle}>
          Connect to n8n governance layer to view shadow strategies
        </Text>
        <TouchableOpacity style={styles.retryButton} onPress={onRefresh}>
          <RefreshCw color={Colors.text} size={16} />
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  if (!isGovernanceOnline) return renderGovernanceOffline();

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
          <View style={styles.headerTop}>
            <View style={styles.titleRow}>
              <View style={styles.logoContainer}>
                <Brain color={Colors.primary} size={22} />
              </View>
              <Text style={styles.title}>SHADOW</Text>
            </View>
            <GlassBadge>
              <Text style={styles.headerBadgeText}>THINKING MODE</Text>
            </GlassBadge>
          </View>

          {isEngineOffline && (
            <GlassCard style={styles.engineOfflineBanner} variant="subtle" noPadding>
              <View style={styles.engineOfflineContent}>
                <Server color={Colors.textSecondary} size={14} />
                <Text style={styles.engineOfflineText}>
                  Engine offline — Shadow data from governance layer
                </Text>
              </View>
            </GlassCard>
          )}
          
          {lastUpdate && (
            <View style={styles.updateInfo}>
              <Activity color={Colors.textMuted} size={12} />
              <Text style={styles.updateText}>
                Updated {formatTime(lastUpdate.toISOString())}
              </Text>
            </View>
          )}
        </View>

        <View style={styles.disclaimerBanner}>
          <LinearGradient
            colors={[Colors.warning + '15', Colors.warning + '08']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={StyleSheet.absoluteFill}
          />
          <AlertTriangle color={Colors.warning} size={14} />
          <Text style={styles.disclaimerText}>
            NO CAPITAL AT RISK — NOT EXECUTABLE
          </Text>
        </View>

        {loading ? (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color={Colors.primary} />
            <Text style={styles.loadingText}>Loading shadow strategies...</Text>
          </View>
        ) : error ? (
          <View style={styles.centerContainer}>
            <AlertTriangle color={Colors.error} size={48} />
            <Text style={styles.errorTitle}>Error Loading Data</Text>
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity style={styles.retryButton} onPress={onRefresh}>
              <RefreshCw color={Colors.text} size={16} />
              <Text style={styles.retryText}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : strategies.length === 0 ? (
          <View style={styles.centerContainer}>
            <Brain color={Colors.textMuted} size={64} />
            <Text style={styles.emptyTitle}>No Shadow Strategies</Text>
            <Text style={styles.emptyText}>
              No shadow strategies generated yet.
            </Text>
            <Text style={styles.emptySubtext}>
              Shadow strategies will appear here when generated by the governance layer.
            </Text>
          </View>
        ) : (
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor={Colors.primary}
              />
            }
          >
            <GlassCard style={styles.summaryBar} variant="elevated">
              <View style={styles.summaryItem}>
                <Text style={styles.summaryValue}>{strategies.length}</Text>
                <Text style={styles.summaryLabel}>Strategy Dossiers</Text>
              </View>
            </GlassCard>

            {strategies.map((strategy, index) => (
              <StrategyDossierCard
                key={strategy.strategy_id}
                strategy={strategy}
                onPress={() => openStrategyDetail(strategy)}
                index={index}
              />
            ))}

            <View style={styles.footerDisclaimer}>
              <AlertTriangle color={Colors.textMuted} size={14} />
              <Text style={styles.footerDisclaimerText}>
                Execution requires engine + live ceremony
              </Text>
            </View>
          </ScrollView>
        )}

        <StrategyDetailModal
          visible={detailModalVisible}
          strategy={selectedStrategy}
          onClose={() => setDetailModalVisible(false)}
        />
      </Animated.View>
    </View>
  );
}

interface StrategyDetailModalProps {
  visible: boolean;
  strategy: N8NShadowStrategy | null;
  onClose: () => void;
}

function StrategyDetailModal({
  visible,
  strategy,
  onClose,
}: StrategyDetailModalProps) {
  const insets = useSafeAreaInsets();
  
  if (!strategy) return null;

  const formatDate = (timestamp: string) => {
    return new Date(timestamp).toLocaleString();
  };

  const sections = [
    { title: 'Summary', content: strategy.summary, icon: <FileText color={Colors.primary} size={18} />, color: Colors.primary },
    { title: 'Hypothesis', content: strategy.hypothesis, icon: <Lightbulb color={Colors.success} size={18} />, color: Colors.success },
    { title: 'Entry Logic', content: strategy.entry_logic, icon: <ArrowRightCircle color={Colors.primary} size={18} />, color: Colors.primary },
    { title: 'Exit Logic', content: strategy.exit_logic, icon: <ArrowLeftCircle color="#8B5CF6" size={18} />, color: '#8B5CF6' },
    { title: 'Risk Assumptions', content: strategy.risk_assumptions, icon: <ShieldAlert color={Colors.warning} size={18} />, color: Colors.warning },
    { title: 'Failure Modes', content: strategy.failure_modes, icon: <AlertOctagon color={Colors.error} size={18} />, color: Colors.error },
  ];

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={modalStyles.container}>
        <LinearGradient
          colors={['#0A0A12', '#050508']}
          style={StyleSheet.absoluteFill}
        />
        
        <View style={[modalStyles.header, { paddingTop: insets.top + 16 }]}>
          <View style={modalStyles.headerLeft}>
            <Brain color={Colors.primary} size={20} />
            <Text style={modalStyles.headerTitle} numberOfLines={1}>
              {strategy.strategy_id}
            </Text>
          </View>
          <TouchableOpacity onPress={onClose} style={modalStyles.closeButton}>
            <X color={Colors.text} size={24} />
          </TouchableOpacity>
        </View>

        <View style={modalStyles.warningBanner}>
          <LinearGradient
            colors={['rgba(90,90,110,0.15)', 'rgba(90,90,110,0.05)']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={StyleSheet.absoluteFill}
          />
          <Brain color={Colors.textMuted} size={14} />
          <Text style={modalStyles.warningText}>SHADOW ONLY – THINKING MODE</Text>
        </View>

        <ScrollView style={modalStyles.content} showsVerticalScrollIndicator={false}>
          {sections.map((section, index) => (
            <GlassCard key={section.title} style={modalStyles.section} variant="primary">
              <View style={modalStyles.sectionHeader}>
                <View style={[modalStyles.sectionIconContainer, { backgroundColor: section.color + '20' }]}>
                  {section.icon}
                </View>
                <Text style={modalStyles.sectionTitle}>{section.title}</Text>
              </View>
              <View style={modalStyles.sectionContentWrapper}>
                <LinearGradient
                  colors={[section.color + '08', 'transparent']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 0, y: 1 }}
                  style={[StyleSheet.absoluteFill, { borderRadius: 12 }]}
                />
                <Text style={modalStyles.sectionText}>{section.content || 'No data available'}</Text>
              </View>
            </GlassCard>
          ))}

          <GlassCard style={modalStyles.metaSection} variant="subtle">
            <View style={modalStyles.metaRow}>
              <Text style={modalStyles.metaLabel}>Status</Text>
              <GlassBadge color={Colors.warning}>
                <View style={modalStyles.statusBadgeInner}>
                  <Eye color={Colors.warning} size={11} />
                  <Text style={modalStyles.statusBadgeText}>{strategy.status}</Text>
                </View>
              </GlassBadge>
            </View>
            <GlassDivider style={modalStyles.divider} />
            <View style={modalStyles.metaRow}>
              <Text style={modalStyles.metaLabel}>Created</Text>
              <Text style={modalStyles.metaValue}>{formatDate(strategy.created_at)}</Text>
            </View>
          </GlassCard>

          <GlassCard style={modalStyles.footerDisclaimer} variant="subtle">
            <AlertTriangle color={Colors.textMuted} size={14} />
            <Text style={modalStyles.footerDisclaimerText}>
              This strategy is for analysis only. No trades can be executed from this view. Execution requires engine + live ceremony.
            </Text>
          </GlassCard>
        </ScrollView>
      </View>
    </Modal>
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
    width: 200,
    height: 200,
    top: 80,
    left: -60,
    backgroundColor: Colors.textMuted,
  },
  glowOrb2: {
    width: 180,
    height: 180,
    bottom: 150,
    right: -50,
    backgroundColor: '#8B5CF6',
  },
  content: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  titleRow: {
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
  title: {
    fontSize: 22,
    fontWeight: '800' as const,
    color: Colors.text,
    letterSpacing: 2,
  },
  headerBadgeText: {
    fontSize: 9,
    fontWeight: '700' as const,
    color: Colors.textMuted,
    letterSpacing: 0.5,
  },
  engineOfflineBanner: {
    marginTop: 12,
  },
  engineOfflineContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
  },
  engineOfflineText: {
    fontSize: 11,
    color: Colors.textSecondary,
    flex: 1,
  },
  updateInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 10,
  },
  updateText: {
    fontSize: 11,
    color: Colors.textMuted,
  },
  disclaimerBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 10,
    marginHorizontal: 16,
    borderRadius: 10,
    overflow: 'hidden',
  },
  disclaimerText: {
    fontSize: 10,
    fontWeight: '700' as const,
    color: Colors.warning,
    letterSpacing: 0.5,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  offlineTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: Colors.text,
    marginTop: 16,
    letterSpacing: 1,
  },
  offlineSubtitle: {
    fontSize: 14,
    color: Colors.textMuted,
    marginTop: 8,
    textAlign: 'center',
  },
  loadingText: {
    fontSize: 14,
    color: Colors.textMuted,
    marginTop: 16,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: Colors.error,
    marginTop: 16,
  },
  errorText: {
    fontSize: 14,
    color: Colors.textMuted,
    marginTop: 8,
    textAlign: 'center',
  },
  retryButton: {
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
  retryText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.text,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: Colors.text,
    marginTop: 16,
  },
  emptyText: {
    fontSize: 14,
    color: Colors.textMuted,
    marginTop: 8,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 12,
    color: Colors.textMuted,
    marginTop: 8,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  summaryBar: {
    marginBottom: 16,
    alignItems: 'center',
  },
  summaryItem: {
    alignItems: 'center',
  },
  summaryValue: {
    fontSize: 32,
    fontWeight: '700' as const,
    color: Colors.text,
  },
  summaryLabel: {
    fontSize: 11,
    color: Colors.textMuted,
    marginTop: 4,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.5,
  },
  footerDisclaimer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    marginTop: 8,
  },
  footerDisclaimerText: {
    fontSize: 11,
    color: Colors.textMuted,
  },
});

const modalStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
    marginRight: 12,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: Colors.text,
    flex: 1,
  },
  closeButton: {
    padding: 8,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 12,
  },
  warningBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 10,
    marginHorizontal: 16,
    borderRadius: 10,
    overflow: 'hidden',
  },
  warningText: {
    fontSize: 10,
    fontWeight: '700' as const,
    color: Colors.textMuted,
    letterSpacing: 1.5,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  section: {
    marginBottom: 12,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  sectionIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700' as const,
    color: Colors.text,
    letterSpacing: 0.3,
  },
  sectionContentWrapper: {
    backgroundColor: 'rgba(255,255,255,0.02)',
    borderRadius: 12,
    padding: 14,
    overflow: 'hidden',
  },
  sectionText: {
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 20,
  },
  metaSection: {
    marginBottom: 12,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  metaLabel: {
    fontSize: 13,
    color: Colors.textMuted,
  },
  metaValue: {
    fontSize: 13,
    color: Colors.text,
    fontWeight: '500' as const,
  },
  divider: {
    marginVertical: 12,
  },
  statusBadgeInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: '700' as const,
    color: Colors.warning,
    letterSpacing: 0.5,
  },
  footerDisclaimer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginBottom: 40,
  },
  footerDisclaimerText: {
    fontSize: 12,
    color: Colors.textMuted,
    flex: 1,
    lineHeight: 18,
  },
});
