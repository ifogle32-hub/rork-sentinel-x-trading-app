import { StyleSheet, Text, View, ScrollView, ActivityIndicator, Alert, TouchableOpacity } from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Bell,
  FlaskConical,
  Settings,
  Users,
  Shield,
  Key,
  Clock,
  AlertTriangle,
  XCircle,
  Info,
  Zap,
  TrendingUp,
  Download,
  ChevronRight,
  FileText,
  Activity,
  ArrowLeft,
  SlidersHorizontal,
  LayoutDashboard,
  BarChart3,
  Landmark,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import React, { useCallback, useMemo, useState } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import Colors from '@/constants/colors';
import GlassCard from '@/components/GlassCard';
import PressableScale from '@/components/PressableScale';
import { api } from '@/lib/api';
import { AlertEvent } from '@/types/bot';

type MoreMode = 'home' | 'alerts' | 'research' | 'investor' | 'settings';

const getAlertIcon = (type: AlertEvent['type']) => {
  switch (type) {
    case 'TRADE': return <Zap size={14} color={Colors.primary} />;
    case 'RISK_BREACH': return <AlertTriangle size={14} color={Colors.error} />;
    case 'KILL_SWITCH': return <XCircle size={14} color={Colors.error} />;
    case 'STRATEGY_DISABLED': return <AlertTriangle size={14} color={Colors.warning} />;
    case 'CAPITAL_MOVEMENT': return <TrendingUp size={14} color={Colors.success} />;
    case 'ERROR': return <XCircle size={14} color={Colors.error} />;
    default: return <Info size={14} color={Colors.textMuted} />;
  }
};

const getSeverityColor = (severity: AlertEvent['severity']) => {
  switch (severity) {
    case 'CRITICAL': return Colors.error;
    case 'HIGH': return Colors.error;
    case 'MEDIUM': return Colors.warning;
    case 'LOW': return Colors.textMuted;
    default: return Colors.textMuted;
  }
};

export default function MoreScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [mode, setMode] = useState<MoreMode>('home');

  const { data: alerts, isLoading: loadingAlerts } = useQuery({
    queryKey: ['alerts'],
    queryFn: () => api.getAlerts(50),
    refetchInterval: 10000,
  });

  const { data: researchJobs, isLoading: loadingResearch } = useQuery({
    queryKey: ['researchJobs'],
    queryFn: api.getResearchJobs,
  });

  const { data: securityInfo } = useQuery({
    queryKey: ['securityInfo'],
    queryFn: api.getSecurityInfo,
  });

  const { data: status } = useQuery({
    queryKey: ['status'],
    queryFn: api.getStatus,
    refetchInterval: 30000,
  });

  const spawnResearchMutation = useMutation({
    mutationFn: (name: string) => api.spawnResearchJob(name),
    onSuccess: () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      queryClient.invalidateQueries({ queryKey: ['researchJobs'] });
    },
    onError: (err: Error) => {
      Alert.alert('Error', err.message);
    },
  });

  const handleSpawnResearch = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.prompt(
      'New Research Job',
      'Enter a name for the research job:',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Spawn', 
          onPress: (name?: string) => {
            if (name && name.trim()) {
              spawnResearchMutation.mutate(name.trim());
            }
          }
        },
      ],
      'plain-text'
    );
  };

  const renderAlerts = () => (
    <View style={styles.sectionContent}>
      {loadingAlerts ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      ) : alerts && alerts.length > 0 ? (
        <>
          {alerts.map((alert) => (
            <View key={alert.id} style={styles.alertItem}>
              <View style={styles.alertIcon}>
                {getAlertIcon(alert.type)}
              </View>
              <View style={styles.alertContent}>
                <View style={styles.alertHeader}>
                  <Text style={styles.alertType}>{alert.type}</Text>
                  <View style={[styles.severityBadge, { backgroundColor: getSeverityColor(alert.severity) + '20' }]}>
                    <Text style={[styles.severityText, { color: getSeverityColor(alert.severity) }]}>
                      {alert.severity}
                    </Text>
                  </View>
                </View>
                <Text style={styles.alertMessage}>{alert.message}</Text>
                <Text style={styles.alertTime}>
                  {new Date(alert.timestamp).toLocaleString()}
                </Text>
              </View>
            </View>
          ))}
        </>
      ) : (
        <View style={styles.emptyState}>
          <Bell size={48} color={Colors.textMuted} />
          <Text style={styles.emptyText}>No alerts</Text>
        </View>
      )}
    </View>
  );

  const renderResearch = () => (
    <View style={styles.sectionContent}>
      <TouchableOpacity
        style={styles.spawnButton}
        onPress={handleSpawnResearch}
        disabled={spawnResearchMutation.isPending}
      >
        <FlaskConical size={20} color={Colors.primary} />
        <Text style={styles.spawnButtonText}>Spawn Research Job</Text>
      </TouchableOpacity>

      <Text style={styles.subSectionTitle}>RESEARCH JOBS</Text>

      {loadingResearch ? (
        <ActivityIndicator size="large" color={Colors.primary} />
      ) : researchJobs && researchJobs.length > 0 ? (
        <>
          {researchJobs.map((job) => (
            <View key={job.id} style={styles.researchCard}>
              <View style={styles.researchHeader}>
                <Text style={styles.researchName}>{job.name}</Text>
                <View style={[
                  styles.jobStatusBadge,
                  { backgroundColor: job.status === 'COMPLETED' ? Colors.success + '20' : 
                    job.status === 'FAILED' ? Colors.error + '20' : Colors.warning + '20' }
                ]}>
                  <Text style={[
                    styles.jobStatusText,
                    { color: job.status === 'COMPLETED' ? Colors.success : 
                      job.status === 'FAILED' ? Colors.error : Colors.warning }
                  ]}>
                    {job.status}
                  </Text>
                </View>
              </View>
              {job.status === 'RUNNING' && (
                <View style={styles.progressBar}>
                  <View style={[styles.progressFill, { width: `${job.progress}%` }]} />
                </View>
              )}
              <Text style={styles.researchTime}>
                Started: {new Date(job.startedAt).toLocaleString()}
              </Text>
              {job.results && job.results.length > 0 && (
                <View style={styles.candidatesSection}>
                  <Text style={styles.candidatesTitle}>Candidates:</Text>
                  {job.results.map((candidate) => (
                    <View key={candidate.id} style={styles.candidateItem}>
                      <Text style={styles.candidateName}>{candidate.name}</Text>
                      <Text style={styles.candidateStats}>
                        Sharpe: {candidate.expectedSharpe.toFixed(2)} | Return: {candidate.expectedReturn.toFixed(1)}%
                      </Text>
                    </View>
                  ))}
                </View>
              )}
            </View>
          ))}
        </>
      ) : (
        <View style={styles.emptyState}>
          <FlaskConical size={48} color={Colors.textMuted} />
          <Text style={styles.emptyText}>No research jobs</Text>
        </View>
      )}
    </View>
  );

  const renderInvestor = () => (
    <View style={styles.sectionContent}>
      <View style={styles.investorBanner}>
        <Users size={24} color={Colors.primary} />
        <Text style={styles.investorBannerText}>READ-ONLY INVESTOR DASHBOARD</Text>
      </View>

      <View style={styles.investorCard}>
        <Text style={styles.investorLabel}>CURRENT EQUITY</Text>
        <Text style={styles.investorValue}>
          {status?.equity ? `$${status.equity.toLocaleString()}` : '--'}
        </Text>
      </View>

      <View style={styles.investorCard}>
        <Text style={styles.investorLabel}>DAILY P&L</Text>
        <Text style={[
          styles.investorValue,
          { color: (status?.dailyPnL ?? 0) >= 0 ? Colors.success : Colors.error }
        ]}>
          {status?.dailyPnL !== undefined 
            ? `${status.dailyPnL >= 0 ? '+' : ''}$${status.dailyPnL.toLocaleString()}`
            : '--'}
        </Text>
      </View>

      <View style={styles.investorCard}>
        <Text style={styles.investorLabel}>SYSTEM STATUS</Text>
        <View style={styles.investorStatusRow}>
          <View style={[
            styles.investorStatusDot,
            { backgroundColor: status?.state === 'TRADING' ? Colors.success : Colors.textMuted }
          ]} />
          <Text style={styles.investorStatusText}>{status?.state || 'OFFLINE'}</Text>
        </View>
      </View>

      <TouchableOpacity style={styles.exportButton}>
        <Download size={18} color={Colors.primary} />
        <Text style={styles.exportButtonText}>Export Statement</Text>
      </TouchableOpacity>
    </View>
  );

  const renderSettings = () => (
    <View style={styles.sectionContent}>
      <Text style={styles.subSectionTitle}>SECURITY</Text>
      
      <View style={styles.settingsCard}>
        <View style={styles.settingsRow}>
          <View style={styles.settingsItem}>
            <Key size={18} color={securityInfo?.hardwareKeyConnected ? Colors.success : Colors.error} />
            <Text style={styles.settingsLabel}>Hardware Key</Text>
          </View>
          <Text style={[
            styles.settingsValue,
            { color: securityInfo?.hardwareKeyConnected ? Colors.success : Colors.error }
          ]}>
            {securityInfo?.hardwareKeyConnected ? 'Connected' : 'Disconnected'}
          </Text>
        </View>

        <View style={styles.settingsRow}>
          <View style={styles.settingsItem}>
            <Shield size={18} color={securityInfo?.twoFactorEnabled ? Colors.success : Colors.warning} />
            <Text style={styles.settingsLabel}>Two-Factor Auth</Text>
          </View>
          <Text style={[
            styles.settingsValue,
            { color: securityInfo?.twoFactorEnabled ? Colors.success : Colors.warning }
          ]}>
            {securityInfo?.twoFactorEnabled ? 'Enabled' : 'Disabled'}
          </Text>
        </View>

        <View style={styles.settingsRow}>
          <View style={styles.settingsItem}>
            <Activity size={18} color={Colors.textSecondary} />
            <Text style={styles.settingsLabel}>Active Sessions</Text>
          </View>
          <Text style={styles.settingsValue}>
            {securityInfo?.activeSessions ?? '--'}
          </Text>
        </View>

        <View style={[styles.settingsRow, styles.lastSettingsRow]}>
          <View style={styles.settingsItem}>
            <Clock size={18} color={Colors.textSecondary} />
            <Text style={styles.settingsLabel}>Last Approval</Text>
          </View>
          <Text style={styles.settingsValue}>
            {securityInfo?.lastApprovalEvent 
              ? new Date(securityInfo.lastApprovalEvent).toLocaleDateString()
              : 'Never'}
          </Text>
        </View>
      </View>

      <Text style={styles.subSectionTitle}>EXPORTS</Text>

      <TouchableOpacity style={styles.settingsButton}>
        <FileText size={18} color={Colors.textSecondary} />
        <Text style={styles.settingsButtonText}>Export Trades CSV</Text>
        <ChevronRight size={18} color={Colors.textMuted} />
      </TouchableOpacity>

      <TouchableOpacity style={styles.settingsButton}>
        <FileText size={18} color={Colors.textSecondary} />
        <Text style={styles.settingsButtonText}>Export Audit Logs</Text>
        <ChevronRight size={18} color={Colors.textMuted} />
      </TouchableOpacity>

      <TouchableOpacity style={styles.settingsButton}>
        <FileText size={18} color={Colors.textSecondary} />
        <Text style={styles.settingsButtonText}>Capital Statements</Text>
        <ChevronRight size={18} color={Colors.textMuted} />
      </TouchableOpacity>

      <TouchableOpacity style={styles.settingsButton}>
        <Shield size={18} color={Colors.textSecondary} />
        <Text style={styles.settingsButtonText}>Regulator Bundle</Text>
        <ChevronRight size={18} color={Colors.textMuted} />
      </TouchableOpacity>
    </View>
  );

  const headerTitle = useMemo(() => {
    switch (mode) {
      case 'alerts':
        return 'ALERTS';
      case 'research':
        return 'RESEARCH';
      case 'investor':
        return 'INVESTOR';
      case 'settings':
        return 'SETTINGS';
      default:
        return 'MORE';
    }
  }, [mode]);

  const canGoBack = mode !== 'home';

  const handleBack = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setMode('home');
  }, []);

  const navigateTo = useCallback(
    (href: string) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      router.push(href as any);
    },
    [router]
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header} testID="moreHeader">
        <View style={styles.headerRow}>
          <View style={styles.headerLeft}>
            {canGoBack ? (
              <PressableScale
                onPress={handleBack}
                hapticType="selection"
                style={styles.backButton}
                testID="moreBackButton"
              >
                <ArrowLeft size={18} color={Colors.text} />
              </PressableScale>
            ) : (
              <View style={styles.backButtonPlaceholder} />
            )}
          </View>

          <Text style={styles.headerTitle} testID="moreHeaderTitle">
            {headerTitle}
          </Text>

          <View style={styles.headerRight} />
        </View>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false} testID="moreScroll">
        {mode === 'home' ? (
          <View style={styles.homeWrap} testID="moreHome">
            <Text style={styles.groupTitle}>PRIMARY</Text>

            <GlassCard style={styles.glassGroup} intensity="high" variant="primary" noPadding>
              <PressableScale
                onPress={() => setMode('alerts')}
                hapticType="selection"
                style={styles.row}
                testID="moreRowAlerts"
              >
                <View style={styles.rowLeft}>
                  <View style={[styles.rowIcon, { backgroundColor: `${Colors.primary}12` }]}>
                    <Bell size={18} color={Colors.primary} />
                  </View>
                  <View style={styles.rowTextWrap}>
                    <Text style={styles.rowTitle}>Alerts</Text>
                    <Text style={styles.rowSubtitle}>Operational events, risk, and system notices</Text>
                  </View>
                </View>
                <ChevronRight size={18} color={Colors.textMuted} />
              </PressableScale>

              <View style={styles.rowDivider} />

              <PressableScale
                onPress={() => setMode('research')}
                hapticType="selection"
                style={styles.row}
                testID="moreRowResearch"
              >
                <View style={styles.rowLeft}>
                  <View style={[styles.rowIcon, { backgroundColor: 'rgba(255,255,255,0.06)' }]}>
                    <FlaskConical size={18} color={Colors.text} />
                  </View>
                  <View style={styles.rowTextWrap}>
                    <Text style={styles.rowTitle}>Research</Text>
                    <Text style={styles.rowSubtitle}>Spawn + review research jobs</Text>
                  </View>
                </View>
                <ChevronRight size={18} color={Colors.textMuted} />
              </PressableScale>

              <View style={styles.rowDivider} />

              <PressableScale
                onPress={() => setMode('investor')}
                hapticType="selection"
                style={styles.row}
                testID="moreRowInvestor"
              >
                <View style={styles.rowLeft}>
                  <View style={[styles.rowIcon, { backgroundColor: 'rgba(255,255,255,0.06)' }]}>
                    <Users size={18} color={Colors.text} />
                  </View>
                  <View style={styles.rowTextWrap}>
                    <Text style={styles.rowTitle}>Investor</Text>
                    <Text style={styles.rowSubtitle}>Read-only snapshot & exports</Text>
                  </View>
                </View>
                <ChevronRight size={18} color={Colors.textMuted} />
              </PressableScale>

              <View style={styles.rowDivider} />

              <PressableScale
                onPress={() => setMode('settings')}
                hapticType="selection"
                style={styles.row}
                testID="moreRowSettings"
              >
                <View style={styles.rowLeft}>
                  <View style={[styles.rowIcon, { backgroundColor: 'rgba(255,255,255,0.06)' }]}>
                    <Settings size={18} color={Colors.text} />
                  </View>
                  <View style={styles.rowTextWrap}>
                    <Text style={styles.rowTitle}>Settings</Text>
                    <Text style={styles.rowSubtitle}>Security posture + export tools</Text>
                  </View>
                </View>
                <ChevronRight size={18} color={Colors.textMuted} />
              </PressableScale>
            </GlassCard>

            <Text style={[styles.groupTitle, { marginTop: 18 }]}>TOOLS</Text>

            <GlassCard style={styles.glassGroup} intensity="high" variant="subtle" noPadding>
              <PressableScale
                onPress={() => navigateTo('/approvals')}
                hapticType="selection"
                style={styles.row}
                testID="moreRowApprovals"
              >
                <View style={styles.rowLeft}>
                  <View style={[styles.rowIcon, { backgroundColor: `${Colors.primary}10` }]}>
                    <Shield size={18} color={Colors.primary} />
                  </View>
                  <View style={styles.rowTextWrap}>
                    <Text style={styles.rowTitle}>Approvals</Text>
                    <Text style={styles.rowSubtitle}>Human decision queue</Text>
                  </View>
                </View>
                <ChevronRight size={18} color={Colors.textMuted} />
              </PressableScale>

              <View style={styles.rowDivider} />

              <PressableScale
                onPress={() => navigateTo('/timeline')}
                hapticType="selection"
                style={styles.row}
                testID="moreRowAudit"
              >
                <View style={styles.rowLeft}>
                  <View style={[styles.rowIcon, { backgroundColor: 'rgba(255,255,255,0.06)' }]}>
                    <Clock size={18} color={Colors.text} />
                  </View>
                  <View style={styles.rowTextWrap}>
                    <Text style={styles.rowTitle}>Audit Timeline</Text>
                    <Text style={styles.rowSubtitle}>Activity history</Text>
                  </View>
                </View>
                <ChevronRight size={18} color={Colors.textMuted} />
              </PressableScale>

              <View style={styles.rowDivider} />

              <PressableScale
                onPress={() => navigateTo('/metrics')}
                hapticType="selection"
                style={styles.row}
                testID="moreRowMetrics"
              >
                <View style={styles.rowLeft}>
                  <View style={[styles.rowIcon, { backgroundColor: 'rgba(255,255,255,0.06)' }]}>
                    <BarChart3 size={18} color={Colors.text} />
                  </View>
                  <View style={styles.rowTextWrap}>
                    <Text style={styles.rowTitle}>Metrics</Text>
                    <Text style={styles.rowSubtitle}>System telemetry</Text>
                  </View>
                </View>
                <ChevronRight size={18} color={Colors.textMuted} />
              </PressableScale>

              <View style={styles.rowDivider} />

              <PressableScale
                onPress={() => navigateTo('/dashboard')}
                hapticType="selection"
                style={styles.row}
                testID="moreRowDashboard"
              >
                <View style={styles.rowLeft}>
                  <View style={[styles.rowIcon, { backgroundColor: 'rgba(255,255,255,0.06)' }]}>
                    <LayoutDashboard size={18} color={Colors.text} />
                  </View>
                  <View style={styles.rowTextWrap}>
                    <Text style={styles.rowTitle}>Dashboard</Text>
                    <Text style={styles.rowSubtitle}>Legacy overview</Text>
                  </View>
                </View>
                <ChevronRight size={18} color={Colors.textMuted} />
              </PressableScale>

              <View style={styles.rowDivider} />

              <PressableScale
                onPress={() => navigateTo('/positions')}
                hapticType="selection"
                style={styles.row}
                testID="moreRowPositions"
              >
                <View style={styles.rowLeft}>
                  <View style={[styles.rowIcon, { backgroundColor: 'rgba(255,255,255,0.06)' }]}>
                    <Landmark size={18} color={Colors.text} />
                  </View>
                  <View style={styles.rowTextWrap}>
                    <Text style={styles.rowTitle}>Positions</Text>
                    <Text style={styles.rowSubtitle}>Holdings & exposures</Text>
                  </View>
                </View>
                <ChevronRight size={18} color={Colors.textMuted} />
              </PressableScale>

              <View style={styles.rowDivider} />

              <PressableScale
                onPress={() => navigateTo('/control')}
                hapticType="selection"
                style={styles.row}
                testID="moreRowControl"
              >
                <View style={styles.rowLeft}>
                  <View style={[styles.rowIcon, { backgroundColor: 'rgba(255,255,255,0.06)' }]}>
                    <SlidersHorizontal size={18} color={Colors.text} />
                  </View>
                  <View style={styles.rowTextWrap}>
                    <Text style={styles.rowTitle}>Control</Text>
                    <Text style={styles.rowSubtitle}>Advanced operations</Text>
                  </View>
                </View>
                <ChevronRight size={18} color={Colors.textMuted} />
              </PressableScale>
            </GlassCard>

            <View style={{ height: 120 }} />
          </View>
        ) : mode === 'alerts' ? (
          renderAlerts()
        ) : mode === 'research' ? (
          renderResearch()
        ) : mode === 'investor' ? (
          renderInvestor()
        ) : (
          renderSettings()
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerLeft: {
    width: 44,
    alignItems: 'flex-start',
  },
  headerRight: {
    width: 44,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  backButtonPlaceholder: {
    width: 40,
    height: 40,
  },
  headerTitle: {
    fontSize: 14,
    fontWeight: '800' as const,
    color: Colors.text,
    letterSpacing: 3,
  },

  content: {
    flex: 1,
  },
  homeWrap: {
    padding: 16,
  },
  groupTitle: {
    marginTop: 8,
    marginBottom: 10,
    fontSize: 11,
    fontWeight: '700' as const,
    color: Colors.textMuted,
    letterSpacing: 1.8,
  },
  glassGroup: {
    borderRadius: 18,
  },
  row: {
    paddingHorizontal: 14,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  rowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
    paddingRight: 12,
  },
  rowIcon: {
    width: 34,
    height: 34,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  rowTextWrap: {
    flex: 1,
  },
  rowTitle: {
    fontSize: 14,
    fontWeight: '700' as const,
    color: Colors.text,
  },
  rowSubtitle: {
    marginTop: 2,
    fontSize: 12,
    color: Colors.textSecondary,
  },
  rowDivider: {
    height: 1,
    marginLeft: 14 + 34 + 12,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  sectionContent: {
    padding: 16,
  },
  loadingContainer: {
    paddingVertical: 60,
    alignItems: 'center',
  },
  alertItem: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  alertIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  alertContent: {
    flex: 1,
    marginLeft: 12,
  },
  alertHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  alertType: {
    fontSize: 12,
    fontWeight: '700' as const,
    color: Colors.text,
  },
  severityBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  severityText: {
    fontSize: 9,
    fontWeight: '700' as const,
  },
  alertMessage: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginBottom: 4,
  },
  alertTime: {
    fontSize: 10,
    color: Colors.textMuted,
  },
  emptyState: {
    paddingVertical: 60,
    alignItems: 'center',
    gap: 12,
  },
  emptyText: {
    fontSize: 14,
    color: Colors.textMuted,
  },
  spawnButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: Colors.primary + '15',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: Colors.primary + '30',
  },
  spawnButtonText: {
    fontSize: 14,
    fontWeight: '700' as const,
    color: Colors.primary,
  },
  subSectionTitle: {
    fontSize: 11,
    fontWeight: '700' as const,
    color: Colors.textMuted,
    letterSpacing: 1.5,
    marginBottom: 12,
    marginTop: 8,
  },
  researchCard: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  researchHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  researchName: {
    fontSize: 15,
    fontWeight: '700' as const,
    color: Colors.text,
  },
  jobStatusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  jobStatusText: {
    fontSize: 10,
    fontWeight: '700' as const,
  },
  progressBar: {
    height: 4,
    backgroundColor: Colors.surfaceElevated,
    borderRadius: 2,
    marginBottom: 8,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: Colors.primary,
    borderRadius: 2,
  },
  researchTime: {
    fontSize: 11,
    color: Colors.textMuted,
  },
  candidatesSection: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  candidatesTitle: {
    fontSize: 11,
    fontWeight: '600' as const,
    color: Colors.textMuted,
    marginBottom: 8,
  },
  candidateItem: {
    backgroundColor: Colors.surfaceElevated,
    borderRadius: 8,
    padding: 10,
    marginBottom: 6,
  },
  candidateName: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: Colors.text,
  },
  candidateStats: {
    fontSize: 11,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  investorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: Colors.primary + '15',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: Colors.primary + '30',
  },
  investorBannerText: {
    fontSize: 12,
    fontWeight: '800' as const,
    color: Colors.primary,
    letterSpacing: 1,
  },
  investorCard: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 20,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
  },
  investorLabel: {
    fontSize: 11,
    fontWeight: '700' as const,
    color: Colors.textMuted,
    letterSpacing: 1,
    marginBottom: 8,
  },
  investorValue: {
    fontSize: 28,
    fontWeight: '800' as const,
    color: Colors.text,
  },
  investorStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  investorStatusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  investorStatusText: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: Colors.text,
  },
  exportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 16,
    marginTop: 8,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  exportButtonText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.primary,
  },
  settingsCard: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 20,
  },
  settingsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  lastSettingsRow: {
    borderBottomWidth: 0,
  },
  settingsItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  settingsLabel: {
    fontSize: 14,
    color: Colors.text,
  },
  settingsValue: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.textSecondary,
  },
  settingsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  settingsButtonText: {
    flex: 1,
    fontSize: 14,
    color: Colors.text,
  },
});
