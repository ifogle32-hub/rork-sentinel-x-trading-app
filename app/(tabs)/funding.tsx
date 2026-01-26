import { StyleSheet, Text, View, ScrollView, TouchableOpacity, Modal, TextInput, ActivityIndicator, Alert } from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Wallet,
  ArrowDownToLine,
  ArrowUpFromLine,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Shield,
  Lock,
  FileText,
  WifiOff,
  ChevronRight,
  Info
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useState } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Colors from '@/constants/colors';
import { api } from '@/lib/api';
import { useConnection } from '@/providers/ConnectionProvider';
import StatusBar from '@/components/StatusBar';

type FundingStep = 'select' | 'amount' | 'schedule' | 'review' | 'submitted';
type FundingType = 'DEPOSIT' | 'WITHDRAWAL';
type Frequency = 'one-time' | 'weekly' | 'monthly';

export default function FundingScreen() {
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  
  const [showFundingModal, setShowFundingModal] = useState(false);
  const [fundingStep, setFundingStep] = useState<FundingStep>('select');
  const [fundingType, setFundingType] = useState<FundingType>('DEPOSIT');
  const [amount, setAmount] = useState('');
  const [frequency, setFrequency] = useState<Frequency>('one-time');
  

  const { connectionState, status } = useConnection();
  const isOnline = connectionState === 'ONLINE';
  const isOffline = connectionState === 'OFFLINE' || connectionState === 'CONNECTING';

  const { data: transfers } = useQuery({
    queryKey: ['transfers'],
    queryFn: api.getTransfers,
    enabled: isOnline,
  });

  const transferMutation = useMutation({
    mutationFn: ({ type, amount: amt }: { type: FundingType; amount: number }) => 
      api.scheduleTransfer(type, amt),
    onSuccess: (result) => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      queryClient.invalidateQueries({ queryKey: ['transfers'] });
      setFundingStep('submitted');
    },
    onError: (err: Error) => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Request Failed', err.message);
    },
  });

  const resetModal = () => {
    setFundingStep('select');
    setFundingType('DEPOSIT');
    setAmount('');
    setFrequency('one-time');
    setShowFundingModal(false);
  };

  const openFundingModal = () => {
    if (!isOnline) {
      Alert.alert('Offline', 'Cannot schedule transfers while disconnected from Sentinel X');
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setShowFundingModal(true);
  };

  const handleSelectType = (type: FundingType) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setFundingType(type);
    setFundingStep('amount');
  };

  const handleAmountNext = () => {
    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      Alert.alert('Invalid Amount', 'Please enter a valid amount');
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setFundingStep('schedule');
  };

  const handleScheduleNext = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setFundingStep('review');
  };

  const handleSubmit = () => {
    const parsedAmount = parseFloat(amount);
    
    if (fundingType === 'WITHDRAWAL') {
      Alert.alert(
        'Confirm Withdrawal Request',
        `You are requesting to withdraw $${parsedAmount.toLocaleString()}.\n\nThis request requires:\n• Server-side validation\n• Hardware key approval\n• Minimum execution delay\n\nProceed?`,
        [
          { text: 'Cancel', style: 'cancel' },
          { 
            text: 'Submit Request', 
            onPress: () => transferMutation.mutate({ type: fundingType, amount: parsedAmount })
          },
        ]
      );
    } else {
      transferMutation.mutate({ type: fundingType, amount: parsedAmount });
    }
  };

  const getTransferStatusIcon = (transferStatus: string) => {
    switch (transferStatus) {
      case 'EXECUTED': return <CheckCircle size={16} color={Colors.success} />;
      case 'REJECTED': return <XCircle size={16} color={Colors.error} />;
      case 'APPROVED': return <CheckCircle size={16} color={Colors.primary} />;
      case 'PENDING':
      case 'AWAITING_APPROVAL': return <Clock size={16} color={Colors.warning} />;
      default: return <AlertTriangle size={16} color={Colors.textMuted} />;
    }
  };

  const getStatusColor = (transferStatus: string) => {
    switch (transferStatus) {
      case 'EXECUTED': return Colors.success;
      case 'REJECTED': return Colors.error;
      case 'APPROVED': return Colors.primary;
      case 'PENDING':
      case 'AWAITING_APPROVAL': return Colors.warning;
      default: return Colors.textMuted;
    }
  };

  const pendingTransfers = transfers?.filter(t => 
    ['PENDING', 'AWAITING_APPROVAL', 'APPROVED'].includes(t.status)
  ) ?? [];

  const completedTransfers = transfers?.filter(t => 
    ['EXECUTED', 'REJECTED'].includes(t.status)
  ) ?? [];

  const renderModalContent = () => {
    switch (fundingStep) {
      case 'select':
        return (
          <View style={styles.modalBody}>
            <Text style={styles.modalTitle}>Select Action</Text>
            <Text style={styles.modalSubtitle}>Choose the type of capital movement</Text>
            
            <TouchableOpacity 
              style={styles.typeOption}
              onPress={() => handleSelectType('DEPOSIT')}
            >
              <View style={[styles.typeIconContainer, { backgroundColor: Colors.success + '20' }]}>
                <ArrowDownToLine size={24} color={Colors.success} />
              </View>
              <View style={styles.typeInfo}>
                <Text style={styles.typeTitle}>Schedule Deposit</Text>
                <Text style={styles.typeDesc}>Add funds to your trading account</Text>
              </View>
              <ChevronRight size={20} color={Colors.textMuted} />
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.typeOption}
              onPress={() => handleSelectType('WITHDRAWAL')}
            >
              <View style={[styles.typeIconContainer, { backgroundColor: Colors.warning + '20' }]}>
                <ArrowUpFromLine size={24} color={Colors.warning} />
              </View>
              <View style={styles.typeInfo}>
                <Text style={styles.typeTitle}>Request Withdrawal</Text>
                <Text style={styles.typeDesc}>Requires approval & execution delay</Text>
              </View>
              <ChevronRight size={20} color={Colors.textMuted} />
            </TouchableOpacity>

            <View style={styles.safetyNote}>
              <Shield size={14} color={Colors.textMuted} />
              <Text style={styles.safetyNoteText}>
                All funding actions are validated server-side. No instant withdrawals.
              </Text>
            </View>
          </View>
        );

      case 'amount':
        return (
          <View style={styles.modalBody}>
            <Text style={styles.modalTitle}>
              {fundingType === 'DEPOSIT' ? 'Deposit Amount' : 'Withdrawal Amount'}
            </Text>
            <Text style={styles.modalSubtitle}>Enter the amount in USD</Text>

            <View style={styles.currentEquityCard}>
              <Text style={styles.currentEquityLabel}>CURRENT EQUITY</Text>
              <Text style={styles.currentEquityValue}>
                ${status?.equity?.toLocaleString() ?? '—'}
              </Text>
            </View>

            <View style={styles.amountInputContainer}>
              <Text style={styles.currencySymbol}>$</Text>
              <TextInput
                style={styles.amountInput}
                placeholder="0"
                placeholderTextColor={Colors.textMuted}
                keyboardType="numeric"
                value={amount}
                onChangeText={setAmount}
                autoFocus
              />
            </View>

            {fundingType === 'WITHDRAWAL' && (
              <View style={styles.withdrawalWarning}>
                <AlertTriangle size={14} color={Colors.warning} />
                <Text style={styles.withdrawalWarningText}>
                  Withdrawals cannot exceed available equity and are subject to minimum balance requirements.
                </Text>
              </View>
            )}

            <View style={styles.modalActions}>
              <TouchableOpacity 
                style={styles.backButton}
                onPress={() => setFundingStep('select')}
              >
                <Text style={styles.backButtonText}>Back</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.nextButton}
                onPress={handleAmountNext}
              >
                <Text style={styles.nextButtonText}>Continue</Text>
              </TouchableOpacity>
            </View>
          </View>
        );

      case 'schedule':
        return (
          <View style={styles.modalBody}>
            <Text style={styles.modalTitle}>Schedule</Text>
            <Text style={styles.modalSubtitle}>Select execution timing</Text>

            <View style={styles.frequencyOptions}>
              {(['one-time', 'weekly', 'monthly'] as Frequency[]).map((freq) => (
                <TouchableOpacity
                  key={freq}
                  style={[styles.frequencyOption, frequency === freq && styles.frequencyOptionActive]}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setFrequency(freq);
                  }}
                >
                  <Text style={[styles.frequencyText, frequency === freq && styles.frequencyTextActive]}>
                    {freq === 'one-time' ? 'One-Time' : freq === 'weekly' ? 'Weekly' : 'Monthly'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.delayNotice}>
              <Clock size={14} color={Colors.textSecondary} />
              <Text style={styles.delayNoticeText}>
                {fundingType === 'WITHDRAWAL' 
                  ? 'Withdrawals have a minimum 24-hour execution delay after approval.'
                  : 'Deposits are processed within 1-2 business days.'}
              </Text>
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity 
                style={styles.backButton}
                onPress={() => setFundingStep('amount')}
              >
                <Text style={styles.backButtonText}>Back</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.nextButton}
                onPress={handleScheduleNext}
              >
                <Text style={styles.nextButtonText}>Review</Text>
              </TouchableOpacity>
            </View>
          </View>
        );

      case 'review':
        return (
          <View style={styles.modalBody}>
            <Text style={styles.modalTitle}>Review Request</Text>
            <Text style={styles.modalSubtitle}>Confirm your funding request</Text>

            <View style={styles.reviewCard}>
              <View style={styles.reviewRow}>
                <Text style={styles.reviewLabel}>Type</Text>
                <Text style={[styles.reviewValue, { color: fundingType === 'DEPOSIT' ? Colors.success : Colors.warning }]}>
                  {fundingType}
                </Text>
              </View>
              <View style={styles.reviewRow}>
                <Text style={styles.reviewLabel}>Amount</Text>
                <Text style={styles.reviewValue}>${parseFloat(amount).toLocaleString()}</Text>
              </View>
              <View style={styles.reviewRow}>
                <Text style={styles.reviewLabel}>Frequency</Text>
                <Text style={styles.reviewValue}>
                  {frequency === 'one-time' ? 'One-Time' : frequency === 'weekly' ? 'Weekly' : 'Monthly'}
                </Text>
              </View>
              <View style={[styles.reviewRow, styles.lastRow]}>
                <Text style={styles.reviewLabel}>Status After Submit</Text>
                <Text style={[styles.reviewValue, { color: Colors.warning }]}>PENDING</Text>
              </View>
            </View>

            {fundingType === 'WITHDRAWAL' && (
              <View style={styles.approvalNotice}>
                <Lock size={14} color={Colors.primary} />
                <Text style={styles.approvalNoticeText}>
                  This withdrawal requires hardware key approval before execution.
                </Text>
              </View>
            )}

            <View style={styles.modalActions}>
              <TouchableOpacity 
                style={styles.backButton}
                onPress={() => setFundingStep('schedule')}
              >
                <Text style={styles.backButtonText}>Back</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.submitButton, fundingType === 'WITHDRAWAL' && styles.submitButtonWithdraw]}
                onPress={handleSubmit}
                disabled={transferMutation.isPending}
              >
                {transferMutation.isPending ? (
                  <ActivityIndicator size="small" color={Colors.background} />
                ) : (
                  <Text style={styles.submitButtonText}>Submit Request</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        );

      case 'submitted':
        return (
          <View style={styles.modalBody}>
            <View style={styles.successIcon}>
              <CheckCircle size={48} color={Colors.success} />
            </View>
            <Text style={styles.successTitle}>Request Submitted</Text>
            <Text style={styles.successSubtitle}>
              Your {fundingType.toLowerCase()} request for ${parseFloat(amount).toLocaleString()} has been submitted.
            </Text>

            <View style={styles.nextStepsCard}>
              <Text style={styles.nextStepsTitle}>What&apos;s Next?</Text>
              <View style={styles.nextStepItem}>
                <View style={styles.stepNumber}><Text style={styles.stepNumberText}>1</Text></View>
                <Text style={styles.stepText}>Request validation by server</Text>
              </View>
              {fundingType === 'WITHDRAWAL' && (
                <View style={styles.nextStepItem}>
                  <View style={styles.stepNumber}><Text style={styles.stepNumberText}>2</Text></View>
                  <Text style={styles.stepText}>Hardware key approval required</Text>
                </View>
              )}
              <View style={styles.nextStepItem}>
                <View style={styles.stepNumber}><Text style={styles.stepNumberText}>{fundingType === 'WITHDRAWAL' ? '3' : '2'}</Text></View>
                <Text style={styles.stepText}>Execution after delay period</Text>
              </View>
            </View>

            <TouchableOpacity 
              style={styles.doneButton}
              onPress={resetModal}
            >
              <Text style={styles.doneButtonText}>Done</Text>
            </TouchableOpacity>
          </View>
        );
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>FUNDING</Text>
        <View style={styles.safetyBadge}>
          <Lock size={10} color={Colors.primary} />
          <Text style={styles.safetyBadgeText}>GATED</Text>
        </View>
      </View>

      <View style={styles.safetyBanner}>
        <Shield size={14} color={Colors.warning} />
        <Text style={styles.safetyBannerText}>All funding actions require server validation</Text>
      </View>

      <StatusBar />

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {isOffline && (
          <View style={styles.offlineBanner}>
            <WifiOff size={18} color={Colors.warning} />
            <Text style={styles.offlineBannerText}>Funding unavailable while offline</Text>
          </View>
        )}

        <View style={styles.equityCard}>
          <Wallet size={28} color={Colors.primary} />
          <View style={styles.equityInfo}>
            <Text style={styles.equityLabel}>CURRENT EQUITY</Text>
            <Text style={styles.equityValue}>
              ${isOnline && status?.equity ? status.equity.toLocaleString() : '—'}
            </Text>
          </View>
        </View>

        <View style={styles.actionsSection}>
          <Text style={styles.sectionTitle}>FUNDING ACTIONS</Text>
          
          <TouchableOpacity
            style={[styles.actionButton, !isOnline && styles.buttonDisabled]}
            onPress={openFundingModal}
            disabled={!isOnline}
          >
            <View style={styles.actionButtonContent}>
              <View style={[styles.actionIcon, { backgroundColor: Colors.success + '20' }]}>
                <ArrowDownToLine size={20} color={Colors.success} />
              </View>
              <View style={styles.actionInfo}>
                <Text style={styles.actionTitle}>Schedule Add Funds</Text>
                <Text style={styles.actionDesc}>Deposit capital to your account</Text>
              </View>
            </View>
            <ChevronRight size={20} color={Colors.textMuted} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, !isOnline && styles.buttonDisabled]}
            onPress={openFundingModal}
            disabled={!isOnline}
          >
            <View style={styles.actionButtonContent}>
              <View style={[styles.actionIcon, { backgroundColor: Colors.warning + '20' }]}>
                <ArrowUpFromLine size={20} color={Colors.warning} />
              </View>
              <View style={styles.actionInfo}>
                <Text style={styles.actionTitle}>Request Withdrawal</Text>
                <Text style={styles.actionDesc}>Requires approval & delay</Text>
              </View>
            </View>
            <ChevronRight size={20} color={Colors.textMuted} />
          </TouchableOpacity>
        </View>

        <View style={styles.rulesCard}>
          <View style={styles.rulesHeader}>
            <Info size={16} color={Colors.textSecondary} />
            <Text style={styles.rulesTitle}>Funding Rules</Text>
          </View>
          <View style={styles.ruleItem}>
            <Text style={styles.ruleBullet}>•</Text>
            <Text style={styles.ruleText}>Cannot withdraw below minimum equity</Text>
          </View>
          <View style={styles.ruleItem}>
            <Text style={styles.ruleBullet}>•</Text>
            <Text style={styles.ruleText}>Cannot withdraw during risk-off state</Text>
          </View>
          <View style={styles.ruleItem}>
            <Text style={styles.ruleBullet}>•</Text>
            <Text style={styles.ruleText}>Cooldown period between funding actions</Text>
          </View>
          <View style={styles.ruleItem}>
            <Text style={styles.ruleBullet}>•</Text>
            <Text style={styles.ruleText}>Hardware key required for withdrawals</Text>
          </View>
        </View>

        {pendingTransfers.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>PENDING REQUESTS</Text>
            <View style={styles.transfersList}>
              {pendingTransfers.map((transfer) => (
                <View key={transfer.id} style={styles.transferItem}>
                  <View style={styles.transferIcon}>
                    {transfer.type === 'DEPOSIT' ? (
                      <ArrowDownToLine size={16} color={Colors.success} />
                    ) : (
                      <ArrowUpFromLine size={16} color={Colors.warning} />
                    )}
                  </View>
                  <View style={styles.transferInfo}>
                    <Text style={styles.transferType}>{transfer.type}</Text>
                    <Text style={styles.transferAmount}>${transfer.amount.toLocaleString()}</Text>
                  </View>
                  <View style={styles.transferStatus}>
                    {getTransferStatusIcon(transfer.status)}
                    <Text style={[styles.transferStatusText, { color: getStatusColor(transfer.status) }]}>
                      {transfer.status}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          </View>
        )}

        {completedTransfers.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>HISTORY</Text>
              <TouchableOpacity style={styles.exportButton}>
                <FileText size={14} color={Colors.primary} />
                <Text style={styles.exportButtonText}>Export</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.transfersList}>
              {completedTransfers.slice(0, 5).map((transfer) => (
                <View key={transfer.id} style={styles.transferItem}>
                  <View style={styles.transferIcon}>
                    {transfer.type === 'DEPOSIT' ? (
                      <ArrowDownToLine size={16} color={Colors.success} />
                    ) : (
                      <ArrowUpFromLine size={16} color={Colors.warning} />
                    )}
                  </View>
                  <View style={styles.transferInfo}>
                    <Text style={styles.transferType}>{transfer.type}</Text>
                    <Text style={styles.transferDate}>
                      {new Date(transfer.createdAt).toLocaleDateString()}
                    </Text>
                  </View>
                  <View style={styles.transferAmountCol}>
                    <Text style={styles.transferAmountValue}>${transfer.amount.toLocaleString()}</Text>
                    {getTransferStatusIcon(transfer.status)}
                  </View>
                </View>
              ))}
            </View>
          </View>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>

      <Modal
        visible={showFundingModal}
        transparent
        animationType="slide"
        onRequestClose={resetModal}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHandle} />
            {renderModalContent()}
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
  safetyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.primary + '20',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: Colors.primary + '40',
  },
  safetyBadgeText: {
    fontSize: 9,
    fontWeight: '800' as const,
    color: Colors.primary,
    letterSpacing: 1,
  },
  safetyBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.warning + '15',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.warning + '30',
  },
  safetyBannerText: {
    fontSize: 11,
    fontWeight: '600' as const,
    color: Colors.warning,
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
  equityCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 20,
  },
  equityInfo: {
    flex: 1,
  },
  equityLabel: {
    fontSize: 10,
    fontWeight: '700' as const,
    color: Colors.textMuted,
    letterSpacing: 1.5,
    marginBottom: 4,
  },
  equityValue: {
    fontSize: 28,
    fontWeight: '800' as const,
    color: Colors.text,
  },
  actionsSection: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '700' as const,
    color: Colors.textMuted,
    letterSpacing: 1.5,
    marginBottom: 12,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  actionButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  actionIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionInfo: {
    gap: 2,
  },
  actionTitle: {
    fontSize: 15,
    fontWeight: '700' as const,
    color: Colors.text,
  },
  actionDesc: {
    fontSize: 12,
    color: Colors.textMuted,
  },
  rulesCard: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 20,
  },
  rulesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  rulesTitle: {
    fontSize: 13,
    fontWeight: '700' as const,
    color: Colors.text,
  },
  ruleItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginBottom: 6,
  },
  ruleBullet: {
    fontSize: 12,
    color: Colors.textMuted,
    marginTop: 1,
  },
  ruleText: {
    flex: 1,
    fontSize: 12,
    color: Colors.textSecondary,
    lineHeight: 18,
  },
  section: {
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  exportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  exportButtonText: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: Colors.primary,
  },
  transfersList: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
  },
  transferItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  transferIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: Colors.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  transferInfo: {
    flex: 1,
    marginLeft: 12,
  },
  transferType: {
    fontSize: 13,
    fontWeight: '700' as const,
    color: Colors.text,
  },
  transferAmount: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  transferDate: {
    fontSize: 11,
    color: Colors.textMuted,
    marginTop: 2,
  },
  transferStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  transferStatusText: {
    fontSize: 10,
    fontWeight: '700' as const,
    letterSpacing: 0.5,
  },
  transferAmountCol: {
    alignItems: 'flex-end',
    gap: 4,
  },
  transferAmountValue: {
    fontSize: 14,
    fontWeight: '700' as const,
    color: Colors.text,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '85%',
  },
  modalHandle: {
    width: 40,
    height: 4,
    backgroundColor: Colors.border,
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 8,
  },
  modalBody: {
    padding: 24,
    paddingBottom: 40,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '800' as const,
    color: Colors.text,
    marginBottom: 6,
  },
  modalSubtitle: {
    fontSize: 14,
    color: Colors.textMuted,
    marginBottom: 24,
  },
  typeOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceElevated,
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  typeIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  typeInfo: {
    flex: 1,
    marginLeft: 14,
  },
  typeTitle: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: Colors.text,
  },
  typeDesc: {
    fontSize: 12,
    color: Colors.textMuted,
    marginTop: 2,
  },
  safetyNote: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 12,
    padding: 14,
    backgroundColor: Colors.background,
    borderRadius: 10,
  },
  safetyNoteText: {
    flex: 1,
    fontSize: 12,
    color: Colors.textMuted,
    lineHeight: 18,
  },
  currentEquityCard: {
    backgroundColor: Colors.surfaceElevated,
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    alignItems: 'center',
  },
  currentEquityLabel: {
    fontSize: 10,
    fontWeight: '700' as const,
    color: Colors.textMuted,
    letterSpacing: 1,
    marginBottom: 4,
  },
  currentEquityValue: {
    fontSize: 24,
    fontWeight: '800' as const,
    color: Colors.text,
  },
  amountInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceElevated,
    borderRadius: 12,
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  currencySymbol: {
    fontSize: 28,
    fontWeight: '700' as const,
    color: Colors.textMuted,
  },
  amountInput: {
    flex: 1,
    fontSize: 32,
    fontWeight: '700' as const,
    color: Colors.text,
    paddingVertical: 20,
    paddingLeft: 8,
  },
  withdrawalWarning: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: Colors.warning + '15',
    borderRadius: 10,
    padding: 14,
    marginBottom: 20,
  },
  withdrawalWarningText: {
    flex: 1,
    fontSize: 12,
    color: Colors.warning,
    lineHeight: 18,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  backButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
  },
  backButtonText: {
    fontSize: 15,
    fontWeight: '700' as const,
    color: Colors.textSecondary,
  },
  nextButton: {
    flex: 2,
    paddingVertical: 16,
    borderRadius: 12,
    backgroundColor: Colors.primary,
    alignItems: 'center',
  },
  nextButtonText: {
    fontSize: 15,
    fontWeight: '700' as const,
    color: Colors.background,
  },
  frequencyOptions: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 20,
  },
  frequencyOption: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    backgroundColor: Colors.surfaceElevated,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  frequencyOptionActive: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primary + '15',
  },
  frequencyText: {
    fontSize: 13,
    fontWeight: '700' as const,
    color: Colors.textMuted,
  },
  frequencyTextActive: {
    color: Colors.primary,
  },
  delayNotice: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: Colors.surfaceElevated,
    borderRadius: 10,
    padding: 14,
    marginBottom: 20,
  },
  delayNoticeText: {
    flex: 1,
    fontSize: 12,
    color: Colors.textSecondary,
    lineHeight: 18,
  },
  reviewCard: {
    backgroundColor: Colors.surfaceElevated,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  reviewRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  lastRow: {
    borderBottomWidth: 0,
  },
  reviewLabel: {
    fontSize: 13,
    color: Colors.textMuted,
  },
  reviewValue: {
    fontSize: 14,
    fontWeight: '700' as const,
    color: Colors.text,
  },
  approvalNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: Colors.primary + '15',
    borderRadius: 10,
    padding: 14,
    marginBottom: 20,
  },
  approvalNoticeText: {
    flex: 1,
    fontSize: 12,
    color: Colors.primary,
    lineHeight: 18,
  },
  submitButton: {
    flex: 2,
    paddingVertical: 16,
    borderRadius: 12,
    backgroundColor: Colors.success,
    alignItems: 'center',
  },
  submitButtonWithdraw: {
    backgroundColor: Colors.warning,
  },
  submitButtonText: {
    fontSize: 15,
    fontWeight: '700' as const,
    color: Colors.background,
  },
  successIcon: {
    alignItems: 'center',
    marginBottom: 20,
  },
  successTitle: {
    fontSize: 22,
    fontWeight: '800' as const,
    color: Colors.text,
    textAlign: 'center',
    marginBottom: 8,
  },
  successSubtitle: {
    fontSize: 14,
    color: Colors.textMuted,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  nextStepsCard: {
    backgroundColor: Colors.surfaceElevated,
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  nextStepsTitle: {
    fontSize: 13,
    fontWeight: '700' as const,
    color: Colors.text,
    marginBottom: 12,
  },
  nextStepItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 10,
  },
  stepNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Colors.primary + '20',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepNumberText: {
    fontSize: 12,
    fontWeight: '700' as const,
    color: Colors.primary,
  },
  stepText: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  doneButton: {
    paddingVertical: 16,
    borderRadius: 12,
    backgroundColor: Colors.primary,
    alignItems: 'center',
  },
  doneButtonText: {
    fontSize: 15,
    fontWeight: '700' as const,
    color: Colors.background,
  },
});
