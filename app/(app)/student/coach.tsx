import { useRef, useState, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAgentChat } from '@/lib/agent/useAgentChat';
import { getBlockLabel, getBlockIcon, formatExerciseValue } from '@/lib/services/routineService';
import { getFrequencyLabel } from '@/lib/services/planService';
import type { AgentProposal, ChatMessage, ProposalStatus } from '@/lib/agent/types';
import { useTheme } from '@/contexts/ThemeContext';
import { ThemeTokens } from '@/constants/theme';

export default function CoachScreen() {
  const { messages, isSending, error, proposalStatus, canSend, sendMessage, confirmProposal } =
    useAgentChat();
  const [input, setInput] = useState('');
  const scrollRef = useRef<ScrollView>(null);
  const { T, activeTheme } = useTheme();
  const actionDimBg = activeTheme === 'dark' ? '#00566a' : '#e0f7fa';
  const s = useMemo(() => createStyles(T, actionDimBg), [T, actionDimBg]);

  const handleSend = () => {
    if (!input.trim() || isSending) return;
    sendMessage(input);
    setInput('');
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
  };

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={10}>
          <Ionicons name="chevron-back" size={24} color={T.action} />
        </TouchableOpacity>
        <View style={s.headerCenter}>
          <View style={s.headerAvatar}>
            <Ionicons name="barbell" size={16} color={T.surface} />
          </View>
          <View>
            <Text style={s.headerTitle}>ENTRENADOR IA</Text>
            <Text style={s.headerSub}>Tu coach GO Workout</Text>
          </View>
        </View>
        <View style={{ width: 24 }} />
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        <ScrollView
          ref={scrollRef}
          style={{ flex: 1 }}
          contentContainerStyle={s.messagesWrap}
          onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
        >
          {messages.map((m) => (
            <MessageBubble
              key={m.id}
              message={m}
              proposalStatus={proposalStatus}
              onConfirm={confirmProposal}
            />
          ))}
          {isSending && (
            <View style={[s.bubble, s.bubbleAgent]}>
              <ActivityIndicator size="small" color={T.action} />
            </View>
          )}
          {error && (
            <View style={s.errorBox}>
              <Ionicons name="alert-circle" size={16} color="#EF4444" />
              <Text style={s.errorText}>{error}</Text>
            </View>
          )}
        </ScrollView>

        {/* Input bar */}
        <View style={s.inputBar}>
          <TextInput
            style={s.input}
            placeholder={canSend ? 'Escribile a tu entrenador…' : 'Cargando…'}
            placeholderTextColor={T.textSecondary}
            value={input}
            onChangeText={setInput}
            multiline
            editable={canSend}
            onSubmitEditing={handleSend}
          />
          <TouchableOpacity
            style={[s.sendBtn, (!input.trim() || isSending) && s.sendBtnOff]}
            onPress={handleSend}
            disabled={!input.trim() || isSending}
          >
            <Ionicons name="arrow-up" size={20} color={T.surface} />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ─── Message bubble ────────────────────────────────────────────────────────────

function MessageBubble({
  message,
  proposalStatus,
  onConfirm,
}: {
  message: ChatMessage;
  proposalStatus: Record<string, ProposalStatus>;
  onConfirm: (p: AgentProposal) => Promise<{ ok: boolean }>;
}) {
  const { T, activeTheme } = useTheme();
  const actionDimBg = activeTheme === 'dark' ? '#00566a' : '#e0f7fa';
  const s = useMemo(() => createStyles(T, actionDimBg), [T, actionDimBg]);
  const isUser = message.role === 'user';
  return (
    <View style={{ alignItems: isUser ? 'flex-end' : 'flex-start' }}>
      <View style={[s.bubble, isUser ? s.bubbleUser : s.bubbleAgent]}>
        <Text style={isUser ? s.bubbleTextUser : s.bubbleTextAgent}>{message.text}</Text>
      </View>
      {message.proposals?.map((p) => (
        <ProposalCard
          key={p.proposalId}
          proposal={p}
          status={proposalStatus[p.proposalId] ?? 'pending'}
          onConfirm={onConfirm}
        />
      ))}
    </View>
  );
}

// ─── Proposal cards ────────────────────────────────────────────────────────────

function ProposalCard({
  proposal,
  status,
  onConfirm,
}: {
  proposal: AgentProposal;
  status: ProposalStatus;
  onConfirm: (p: AgentProposal) => Promise<{ ok: boolean }>;
}) {
  const { T, activeTheme } = useTheme();
  const actionDimBg = activeTheme === 'dark' ? '#00566a' : '#e0f7fa';
  const s = useMemo(() => createStyles(T, actionDimBg), [T, actionDimBg]);
  const created = status === 'created';
  const creating = status === 'creating';

  return (
    <View style={s.proposalCard}>
      {proposal.kind === 'plan' ? (
        <>
          <View style={s.proposalHead}>
            <Ionicons name="albums" size={16} color={T.action} />
            <Text style={s.proposalKind}>PLAN PROPUESTO</Text>
          </View>
          <Text style={s.proposalTitle}>{proposal.data.name}</Text>
          <Text style={s.proposalMeta}>
            {proposal.data.discipline} · {getFrequencyLabel(proposal.data.weekly_frequency)}
          </Text>
        </>
      ) : (
        <>
          <View style={s.proposalHead}>
            <Ionicons name="list" size={16} color={T.action} />
            <Text style={s.proposalKind}>RUTINA PROPUESTA</Text>
          </View>
          <Text style={s.proposalTitle}>{proposal.name}</Text>
          {proposal.blocks.map((b, bi) => (
            <View key={bi} style={s.blockRow}>
              <View style={s.blockHead}>
                <Ionicons name={getBlockIcon(b.block_type) as any} size={13} color={T.attention} />
                <Text style={s.blockLabel}>{getBlockLabel(b.block_type)}</Text>
              </View>
              {b.exercises.map((ex, ei) => (
                <Text key={ei} style={s.exLine}>
                  • {ex.name} — {ex.sets}×{formatExerciseValue(ex.exercise_type, ex.value)}
                </Text>
              ))}
            </View>
          ))}
        </>
      )}

      <TouchableOpacity
        style={[s.confirmBtn, created && s.confirmBtnDone]}
        onPress={() => !created && !creating && onConfirm(proposal)}
        disabled={created || creating}
      >
        {creating ? (
          <ActivityIndicator size="small" color={T.surface} />
        ) : created ? (
          <>
            <Ionicons name="checkmark-circle" size={16} color={T.surface} />
            <Text style={s.confirmText}>
              {proposal.kind === 'plan' ? 'Plan creado' : 'Rutina creada'}
            </Text>
          </>
        ) : (
          <Text style={s.confirmText}>
            {proposal.kind === 'plan' ? 'Crear plan' : 'Crear rutina'}
          </Text>
        )}
      </TouchableOpacity>
    </View>
  );
}

function createStyles(T: ThemeTokens, actionDimBg: string) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: T.surface },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: T.border,
    },
    headerCenter: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    headerAvatar: {
      width: 32, height: 32, borderRadius: 16, backgroundColor: T.action,
      alignItems: 'center', justifyContent: 'center',
    },
    headerTitle: { color: T.textPrimary, fontSize: 13, fontFamily: 'SpaceGrotesk_700Bold', letterSpacing: 1 },
    headerSub: { color: T.textSecondary, fontSize: 11, fontFamily: 'SpaceGrotesk_400Regular' },

    messagesWrap: { padding: 16, gap: 10 },
    bubble: { maxWidth: '85%', borderRadius: 16, paddingHorizontal: 14, paddingVertical: 10 },
    bubbleUser: { backgroundColor: actionDimBg, borderBottomRightRadius: 4 },
    bubbleAgent: { backgroundColor: T.surfaceElevated, borderWidth: 1, borderColor: T.border, borderBottomLeftRadius: 4 },
    bubbleTextUser: { color: T.textPrimary, fontSize: 14, fontFamily: 'SpaceGrotesk_400Regular', lineHeight: 20 },
    bubbleTextAgent: { color: T.textPrimary, fontSize: 14, fontFamily: 'SpaceGrotesk_400Regular', lineHeight: 20 },

    proposalCard: {
      maxWidth: '90%', backgroundColor: T.border, borderWidth: 1, borderColor: actionDimBg,
      borderRadius: 14, padding: 14, marginTop: 8, gap: 8,
    },
    proposalHead: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    proposalKind: { color: T.action, fontSize: 10, fontFamily: 'SpaceGrotesk_700Bold', letterSpacing: 1.2 },
    proposalTitle: { color: T.textPrimary, fontSize: 15, fontFamily: 'SpaceGrotesk_700Bold' },
    proposalMeta: { color: T.textSecondary, fontSize: 12, fontFamily: 'SpaceGrotesk_400Regular' },

    blockRow: { marginTop: 4, gap: 2 },
    blockHead: { flexDirection: 'row', alignItems: 'center', gap: 5 },
    blockLabel: { color: T.attention, fontSize: 11, fontFamily: 'SpaceGrotesk_600SemiBold', letterSpacing: 0.5 },
    exLine: { color: T.textSecondary, fontSize: 12, fontFamily: 'SpaceGrotesk_400Regular', marginLeft: 4 },

    confirmBtn: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
      backgroundColor: T.action, borderRadius: 10, paddingVertical: 10, marginTop: 6,
    },
    confirmBtnDone: { backgroundColor: T.done },
    confirmText: { color: T.surface, fontSize: 13, fontFamily: 'SpaceGrotesk_700Bold' },

    errorBox: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 4 },
    errorText: { color: '#EF4444', fontSize: 12, fontFamily: 'SpaceGrotesk_400Regular', flex: 1 },

    inputBar: {
      flexDirection: 'row', alignItems: 'flex-end', gap: 8,
      paddingHorizontal: 14, paddingVertical: 10,
      borderTopWidth: 1, borderTopColor: T.border, backgroundColor: T.surfaceElevated,
    },
    input: {
      flex: 1, color: T.textPrimary, fontSize: 14, fontFamily: 'SpaceGrotesk_400Regular',
      backgroundColor: T.border, borderRadius: 20, paddingHorizontal: 16, paddingVertical: 10,
      maxHeight: 120, borderWidth: 1, borderColor: T.border,
    },
    sendBtn: {
      width: 40, height: 40, borderRadius: 20, backgroundColor: T.action,
      alignItems: 'center', justifyContent: 'center',
    },
    sendBtnOff: { backgroundColor: actionDimBg, opacity: 0.5 },
  });
}
