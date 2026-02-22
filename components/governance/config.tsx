import React from 'react';
import {
  FileCheck,
  CheckCircle2,
  XCircle,
  Timer,
  Users,
  Snowflake,
  Play,
  Ghost,
  TrendingUp,
  Settings,
  Zap,
  Lock,
  ShieldCheck,
  Scale,
  AlertCircle,
  EyeOff,
} from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Colors from '@/constants/colors';
import { GovernanceEventType, GlobalSystemState, HypotheticalScenario, DecisionNote, GovernanceEvent } from '@/types/bot';
import { ConfidenceLevel, getConfidenceLevelFromScore } from '@/components/DecisionConfidenceMeter';

export type BrainStatus = 'ONLINE' | 'WAITING' | 'FROZEN';
export type GuardrailCategory = 'approval_requirements' | 'quorum_rules' | 'freeze_conditions' | 'shadow_constraints';

export const getBrainStatus = (
  governanceOnline: boolean,
  globalState?: GlobalSystemState,
  pendingApprovals?: number
): BrainStatus => {
  if (!governanceOnline) return 'ONLINE';
  if (globalState === 'FROZEN') return 'FROZEN';
  if (pendingApprovals && pendingApprovals > 0) return 'WAITING';
  return 'ONLINE';
};

export const getStatusColor = (status: BrainStatus, isFrozen: boolean) => {
  if (isFrozen) return Colors.textMuted;
  switch (status) {
    case 'ONLINE': return '#6EE7B7';
    case 'WAITING': return '#A78BFA';
    case 'FROZEN': return Colors.warning;
    default: return Colors.textMuted;
  }
};

export const getModeLabel = (state?: GlobalSystemState): string => {
  switch (state) {
    case 'LIVE': return 'LIVE';
    case 'SHADOW_ONLY': return 'SHADOW';
    case 'FROZEN': return 'FROZEN';
    case 'OFF': return 'OFF';
    default: return '—';
  }
};

export const formatTimestamp = (timestamp?: string): string => {
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

export const getReasoningSummary = (
  globalState?: GlobalSystemState,
  pendingApprovals?: number,
  brainStatus?: BrainStatus
): string => {
  if (globalState === 'FROZEN') return 'Execution blocked: system frozen';
  if (globalState === 'SHADOW_ONLY') {
    if (pendingApprovals && pendingApprovals > 0) return 'Shadow mode active – awaiting human decision';
    return 'Shadow strategies only – execution disabled';
  }
  if (globalState === 'OFF') return 'System offline – no active operations';
  if (globalState === 'LIVE') {
    if (pendingApprovals && pendingApprovals > 0) {
      return pendingApprovals === 1 ? 'Awaiting quorum approval' : `Awaiting approval on ${pendingApprovals} decisions`;
    }
    return 'Live operation – all systems nominal';
  }
  if (brainStatus === 'WAITING') return 'Awaiting human decision';
  return 'Monitoring system activity';
};

export const EVENT_CONFIG: Record<GovernanceEventType, { icon: React.ReactNode; color: string; label: string }> = {
  APPROVAL_REQUESTED: { icon: <FileCheck size={14} color={Colors.warning} />, color: Colors.warning, label: 'Approval Requested' },
  APPROVAL_GRANTED: { icon: <CheckCircle2 size={14} color={Colors.success} />, color: Colors.success, label: 'Approved' },
  APPROVAL_DENIED: { icon: <XCircle size={14} color={Colors.error} />, color: Colors.error, label: 'Rejected' },
  APPROVAL_TIMED_OUT: { icon: <Timer size={14} color={Colors.textMuted} />, color: Colors.textMuted, label: 'Timed Out' },
  QUORUM_REACHED: { icon: <Users size={14} color={Colors.primary} />, color: Colors.primary, label: 'Quorum Reached' },
  SYSTEM_FROZEN: { icon: <Snowflake size={14} color="#64B5F6" />, color: '#64B5F6', label: 'System Frozen' },
  SYSTEM_RESUMED: { icon: <Play size={14} color={Colors.success} />, color: Colors.success, label: 'System Resumed' },
  SHADOW_STRATEGY_CREATED: { icon: <Ghost size={14} color={Colors.textSecondary} />, color: Colors.textSecondary, label: 'Shadow Created' },
};

export const SCENARIO_CONFIG: Record<HypotheticalScenario, { icon: React.ReactNode; color: string; label: string; description: string }> = {
  PROMOTE_SHADOW: { icon: <TrendingUp size={18} color="#A78BFA" />, color: '#A78BFA', label: 'Promote Shadow', description: 'What if I promoted a shadow strategy?' },
  APPROVE_TRADE: { icon: <CheckCircle2 size={18} color="#6EE7B7" />, color: '#6EE7B7', label: 'Approve Trade', description: 'What if I approved a pending trade?' },
  CHANGE_CONFIG: { icon: <Settings size={18} color="#FCD34D" />, color: '#FCD34D', label: 'Change Config', description: 'What if I changed system configuration?' },
  GO_LIVE: { icon: <Zap size={18} color="#F472B6" />, color: '#F472B6', label: 'Go Live', description: 'What if I enabled live trading?' },
  FREEZE_SYSTEM: { icon: <Lock size={18} color="#64B5F6" />, color: '#64B5F6', label: 'Freeze System', description: 'What if I froze the system?' },
};

export const GUARDRAIL_CATEGORY_CONFIG: Record<GuardrailCategory, { icon: React.ReactNode; color: string; label: string }> = {
  approval_requirements: { icon: <ShieldCheck size={16} color="#6EE7B7" />, color: '#6EE7B7', label: 'Approval Requirements' },
  quorum_rules: { icon: <Scale size={16} color="#A78BFA" />, color: '#A78BFA', label: 'Quorum Rules' },
  freeze_conditions: { icon: <AlertCircle size={16} color="#64B5F6" />, color: '#64B5F6', label: 'Freeze Conditions' },
  shadow_constraints: { icon: <EyeOff size={16} color="#FCD34D" />, color: '#FCD34D', label: 'Shadow Constraints' },
};

export function formatEventTime(timestamp: string): { date: string; time: string } {
  const d = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  let date: string;
  if (diffDays === 0) date = 'Today';
  else if (diffDays === 1) date = 'Yesterday';
  else if (diffDays < 7) date = `${diffDays}d ago`;
  else date = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  const time = d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
  return { date, time };
}

export const getEventConfidenceLevel = (event: GovernanceEvent): ConfidenceLevel | null => {
  const confidence = event.metadata?.confidence as number | undefined;
  if (typeof confidence === 'number') return getConfidenceLevelFromScore(confidence);
  if (event.type === 'APPROVAL_GRANTED' || event.type === 'QUORUM_REACHED') return 'HIGH';
  if (event.type === 'APPROVAL_REQUESTED') return 'MODERATE';
  return null;
};

export const NOTES_STORAGE_KEY = '@sentinel_decision_notes';

export const loadNotesFromStorage = async (): Promise<Record<string, DecisionNote>> => {
  try {
    const stored = await AsyncStorage.getItem(NOTES_STORAGE_KEY);
    return stored ? JSON.parse(stored) : {};
  } catch (err) {
    console.log('[Governance] Failed to load notes:', err);
    return {};
  }
};

export const saveNotesToStorage = async (notes: Record<string, DecisionNote>): Promise<void> => {
  try {
    await AsyncStorage.setItem(NOTES_STORAGE_KEY, JSON.stringify(notes));
  } catch (err) {
    console.log('[Governance] Failed to save notes:', err);
  }
};
