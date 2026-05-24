import { useRef, useState } from 'react';
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

// ─── Palette ──────────────────────────────────────────────────────────────────
const C = {
  bg:         '#090f12',
  card:       '#141c1f',
  cardDeep:   '#1a2123',
  border:     '#3c494e',
  primary:    '#00D1FF',
  primaryDim: '#00566a',
  tertiary:   '#FEB127',
  success:    '#10B981',
  danger:     '#EF4444',
  neutral:    '#71787B',
  textHi:     '#dde3e7',
  textLo:     '#859399',
};

export default function CoachScreen() {
  const { messages, isSending, error, proposalStatus, canSend, sendMessage, confirmProposal } =
    useAgentChat();
  const [input, setInput] = useState('');
  const scrollRef = useRef<ScrollView>(null);

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
          <Ionicons name="chevron-back" size={24} color={C.primary} />
        </TouchableOpacity>
        <View style={s.headerCenter}>
          <View style={s.headerAvatar}>
            <Ionicons name="barbell" size={16} color={C.bg} />
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
              <ActivityIndicator size="small" color={C.primary} />
            </View>
          )}
          {error && (
            <View style={s.errorBox}>
              <Ionicons name="alert-circle" size={16} color={C.danger} />
              <Text style={s.errorText}>{error}</Text>
            </View>
          )}
        </ScrollView>

        {/* Input bar */}
        <View style={s.inputBar}>
          <TextInput
            style={s.input}
            placeholder={canSend ? 'Escribile a tu entrenador…' : 'Cargando…'}
            placeholderTextColor={C.neutral}
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
            <Ionicons name="arrow-up" size={20} color={C.bg} />
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
  const created = status === 'created';
  const creating = status === 'creating';

  return (
    <View style={s.proposalCard}>
      {proposal.kind === 'plan' ? (
        <>
          <View style={s.proposalHead}>
            <Ionicons name="albums" size={16} color={C.primary} />
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
            <Ionicons name="list" size={16} color={C.primary} />
            <Text style={s.proposalKind}>RUTINA PROPUESTA</Text>
          </View>
          <Text style={s.proposalTitle}>{proposal.name}</Text>
          {proposal.blocks.map((b, bi) => (
            <View key={bi} style={s.blockRow}>
              <View style={s.blockHead}>
                <Ionicons name={getBlockIcon(b.block_type) as any} size={13} color={C.tertiary} />
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
          <ActivityIndicator size="small" color={C.bg} />
        ) : created ? (
          <>
            <Ionicons name="checkmark-circle" size={16} color={C.bg} />
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

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  headerCenter: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  headerAvatar: {
    width: 32, height: 32, borderRadius: 16, backgroundColor: C.primary,
    alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: { color: C.textHi, fontSize: 13, fontFamily: 'SpaceGrotesk_700Bold', letterSpacing: 1 },
  headerSub: { color: C.textLo, fontSize: 11, fontFamily: 'SpaceGrotesk_400Regular' },

  messagesWrap: { padding: 16, gap: 10 },
  bubble: { maxWidth: '85%', borderRadius: 16, paddingHorizontal: 14, paddingVertical: 10 },
  bubbleUser: { backgroundColor: C.primaryDim, borderBottomRightRadius: 4 },
  bubbleAgent: { backgroundColor: C.card, borderWidth: 1, borderColor: C.border, borderBottomLeftRadius: 4 },
  bubbleTextUser: { color: C.textHi, fontSize: 14, fontFamily: 'SpaceGrotesk_400Regular', lineHeight: 20 },
  bubbleTextAgent: { color: C.textHi, fontSize: 14, fontFamily: 'SpaceGrotesk_400Regular', lineHeight: 20 },

  proposalCard: {
    maxWidth: '90%', backgroundColor: C.cardDeep, borderWidth: 1, borderColor: C.primaryDim,
    borderRadius: 14, padding: 14, marginTop: 8, gap: 8,
  },
  proposalHead: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  proposalKind: { color: C.primary, fontSize: 10, fontFamily: 'SpaceGrotesk_700Bold', letterSpacing: 1.2 },
  proposalTitle: { color: C.textHi, fontSize: 15, fontFamily: 'SpaceGrotesk_700Bold' },
  proposalMeta: { color: C.textLo, fontSize: 12, fontFamily: 'SpaceGrotesk_400Regular' },

  blockRow: { marginTop: 4, gap: 2 },
  blockHead: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  blockLabel: { color: C.tertiary, fontSize: 11, fontFamily: 'SpaceGrotesk_600SemiBold', letterSpacing: 0.5 },
  exLine: { color: C.textLo, fontSize: 12, fontFamily: 'SpaceGrotesk_400Regular', marginLeft: 4 },

  confirmBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    backgroundColor: C.primary, borderRadius: 10, paddingVertical: 10, marginTop: 6,
  },
  confirmBtnDone: { backgroundColor: C.success },
  confirmText: { color: C.bg, fontSize: 13, fontFamily: 'SpaceGrotesk_700Bold' },

  errorBox: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 4 },
  errorText: { color: C.danger, fontSize: 12, fontFamily: 'SpaceGrotesk_400Regular', flex: 1 },

  inputBar: {
    flexDirection: 'row', alignItems: 'flex-end', gap: 8,
    paddingHorizontal: 14, paddingVertical: 10,
    borderTopWidth: 1, borderTopColor: C.border, backgroundColor: C.card,
  },
  input: {
    flex: 1, color: C.textHi, fontSize: 14, fontFamily: 'SpaceGrotesk_400Regular',
    backgroundColor: C.cardDeep, borderRadius: 20, paddingHorizontal: 16, paddingVertical: 10,
    maxHeight: 120, borderWidth: 1, borderColor: C.border,
  },
  sendBtn: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: C.primary,
    alignItems: 'center', justifyContent: 'center',
  },
  sendBtnOff: { backgroundColor: C.primaryDim, opacity: 0.5 },
});
