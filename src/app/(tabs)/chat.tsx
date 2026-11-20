import { useState, useRef, useCallback, useEffect, type ComponentRef } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  StyleSheet,
  Modal,
  Alert,
  KeyboardAvoidingView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router, type Href } from 'expo-router';
import { colors, typography, spacing, radius, fonts } from '../../constants/theme';
import {
  type ChatAction,
  type SuggestionChip,
  LANDING_SUGGESTIONS,
  MENU_GROUPS,
} from '../../api/mock/chat';
import { createChatSession, streamChatMessage } from '../../api/chat';
import { getMe } from '../../api/user';
import { getFxAlerts } from '../../api/fx';
import { hasUnseenIds } from '../../utils/fxAlertStorage';
import type { ApiError, ChatBlock } from '../../types/api';
import { useTransferStore } from '../../store/transferStore';
import ChatBlocks from '../../features/chat/blocks/ChatBlocks';
import AnswerText from '../../features/chat/AnswerText';

function openTransfer(amountKRW: number | null) {
  useTransferStore.getState().setInitialAmount(amountKRW);
  router.push('/transfer' as Href);
}

// 송금 카드(REMITTANCE_CONFIRM)의 transferPath(예: /transfer?recipientId=1&amount=500000)로 이동.
// 금액은 송금 화면이 주소의 amount 로 읽는다. store 에 남은 예전 금액이 섞이지 않게 비운다
function openTransferPath(path: string) {
  useTransferStore.getState().setInitialAmount(null);
  router.push(path as Href);
}

// 칩·메뉴 action → 화면 주소. 송금은 금액을 같이 넘겨야 해서 openTransfer 로 따로 연다.
const ACTION_ROUTES: Record<Exclude<ChatAction, 'transfer'>, Href> = {
  visa_tab: '/(tabs)/visa' as Href,
  fx: '/fx' as Href,
  fx_alert: '/fx/alert' as Href,
  products: '/finance/products' as Href,
  credit: '/credit' as Href,
};

function runAction(action: ChatAction) {
  if (action === 'transfer') openTransfer(null);
  else router.push(ACTION_ROUTES[action]);
}

type ChatMessage = {
  id: string;
  role: 'user' | 'ai';
  text: string;
  time: string;
  // 아래 4개는 AI 말풍선만 쓴다
  status?: 'streaming' | 'done' | 'error'; // 답하는 중 → 끝 또는 실패
  statusTexts?: string[]; // 도구 완료 문구. 한 답변에 도구가 여러 번 돌 수 있어 줄마다 쌓는다
  errorMessage?: string; // 실패했을 때 보여 줄 문구
  question?: string;     // [다시 시도] 때 다시 보낼 질문
  blocks?: ChatBlock[]; // 카드 (chat.done.blocks). 끝난 뒤에 붙는다
  suggestions?: SuggestionChip[];
  suggestionsLabel?: string;
};

function nowTime(): string {
  const d = new Date();
  const h = d.getHours();
  const m = String(d.getMinutes()).padStart(2, '0');
  return `${h < 12 ? '오전' : '오후'} ${h % 12 || 12}:${m}`;
}

function getTodayString(): string {
  const days = ['일요일', '월요일', '화요일', '수요일', '목요일', '금요일', '토요일'];
  const d = new Date();
  return `오늘 ${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일 ${days[d.getDay()]}`;
}

function getLandingDateString(): string {
  const d = new Date();
  return `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일`;
}

function preparingAlert() {
  Alert.alert('준비 중', '곧 사용할 수 있어요.');
}

export default function ChatScreen() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [showMenu, setShowMenu] = useState(false);
  const [askedSet, setAskedSet] = useState<Set<string>>(new Set());
  const [streaming, setStreaming] = useState(false); // 답하는 중이면 보내기 버튼을 막는다
  // 첫 인사·상품 카드 헤더의 이름 (users/me shortName). 못 받으면 null → 이름 없이 표시
  const [userName, setUserName] = useState<string | null>(null);
  const scrollRef = useRef<ComponentRef<typeof ScrollView>>(null);
  // ref: 바뀌어도 화면을 다시 그리지 않는 값. 그리기와 상관없는 "기억"에 쓴다
  const sessionIdRef = useRef<number | null>(null);           // 대화방 id. 첫 질문 때 만들고 새 대화까지 재사용
  const abortRef = useRef<AbortController | null>(null);     // 지금 답하는 중인 연결. 있으면 답하는 중

  // 말풍선 하나만 고치기. prev(바로 직전 목록)를 받아서 바꿔야 30ms마다 오는 글자가 서로 덮어쓰지 않는다
  const updateMsg = useCallback((id: string, patch: (m: ChatMessage) => Partial<ChatMessage>) => {
    setMessages(prev => prev.map(m => (m.id === id ? { ...m, ...patch(m) } : m)));
  }, []);

  // AI 말풍선(aiId)에 question 의 답을 흘려 넣는다. send 와 [다시 시도]가 같이 쓴다
  const runStream = useCallback(async (aiId: string, question: string) => {
    const controller = new AbortController();
    abortRef.current = controller;
    setStreaming(true);
    try {
      // 대화방은 첫 질문 때만 만든다 (삭제 API 가 없어 질문마다 만들면 서버에 쌓인다)
      let sessionId = sessionIdRef.current;
      if (sessionId === null) {
        sessionId = await createChatSession();
        if (controller.signal.aborted) return; // 만드는 사이에 새 대화를 눌렀으면 버린다
        sessionIdRef.current = sessionId;
      }
      const result = await streamChatMessage(sessionId, question, {
        onDelta: t => updateMsg(aiId, m => ({ text: m.text + t })),
        // 같은 문구는 한 번만 (같은 도구가 두 번 돌아도 한 줄)
        onStatus: s =>
          updateMsg(aiId, m => (m.statusTexts?.includes(s) ? {} : { statusTexts: [...(m.statusTexts ?? []), s] })),
        signal: controller.signal,
      });
      updateMsg(aiId, () => ({ status: 'done', ...result })); // 카드·추천 버튼은 끝난 뒤에 붙는다
    } catch (e) {
      const err = e as ApiError;
      if (err.code === 'ABORTED') return; // 우리가 끊은 것 (새 대화, 화면 닫힘). 오류로 보여 주지 않는다
      updateMsg(aiId, () => ({ status: 'error', errorMessage: err.message }));
    } finally {
      // 새 대화 뒤 새 질문이 이미 시작됐으면 그 질문의 상태를 건드리지 않는다
      if (abortRef.current === controller) {
        abortRef.current = null;
        setStreaming(false);
      }
    }
  }, [updateMsg]);

  const send = useCallback((text: string) => {
    const trimmed = text.trim();
    // 빈 질문, 답하는 중에 또 보내기는 무시 (칩·카드 버튼도 이 함수를 거치므로 같이 막힌다)
    if (!trimmed || abortRef.current) return;

    const now = Date.now();
    const aiId = `a${now}`;
    // 내 말풍선 + 빈 AI 말풍선을 바로 넣고, 글자는 runStream 이 채운다
    setMessages(prev => [
      ...prev,
      { id: `u${now}`, role: 'user', text: trimmed, time: nowTime() },
      { id: aiId, role: 'ai', text: '', time: nowTime(), status: 'streaming', question: trimmed },
    ]);
    setInput('');
    setAskedSet(prev => new Set([...prev, trimmed]));
    runStream(aiId, trimmed);
  }, [runStream]);

  // 실패한 말풍선을 비우고 같은 질문을 다시 보낸다 (clientMessageId 는 chat.ts 가 매번 새로 만든다)
  const retry = useCallback((msg: ChatMessage) => {
    if (abortRef.current || !msg.question) return;
    updateMsg(msg.id, () => ({
      text: '',
      status: 'streaming',
      statusTexts: undefined,
      errorMessage: undefined,
      blocks: undefined,
    }));
    runStream(msg.id, msg.question);
  }, [runStream, updateMsg]);

  // 화면이 사라지면 연결을 끊는다 (return 한 함수는 화면이 없어질 때 실행된다)
  useEffect(() => () => abortRef.current?.abort(), []);

  // 이름: 금융상품 추천 화면(products.ts)과 같은 방식으로 users/me shortName 을 쓴다
  useEffect(() => {
    let cancelled = false;
    getMe()
      .then((me) => !cancelled && setUserName(me.shortName || null))
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const clearChat = () => {
    abortRef.current?.abort(); // 답하는 중이면 끊기
    abortRef.current = null;
    setStreaming(false);
    sessionIdRef.current = null; // 다음 질문 때 새 대화방
    setMessages([]);
    setAskedSet(new Set());
  };

  const canSend = !!input.trim() && !streaming; // 글자가 있고 답하는 중이 아닐 때만 보내기 버튼 켜기

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Pressable style={styles.headerLeft} onPress={() => setShowMenu(true)}>
          <Text style={styles.headerTitle}>신한걸음</Text>
          <Ionicons name="chevron-down" size={14} color={colors.text.strong} />
        </Pressable>
        <Pressable onPress={clearChat}>
          <Text style={styles.newChatBtn}>새 대화</Text>
        </Pressable>
        <View style={styles.headerRight}>
          <Pressable>
            <Ionicons name="time-outline" size={22} color={colors.text.strong} />
          </Pressable>
          <Pressable onPress={clearChat}>
            <Ionicons name="close" size={22} color={colors.text.strong} />
          </Pressable>
          <View style={styles.avatar}>
            <Ionicons name="person" size={14} color={colors.text.inverse} />
          </View>
        </View>
      </View>

      {/* 키보드가 올라오면 대화 목록과 입력창을 키보드 높이만큼 위로 올린다.
          iOS 는 원래 안 올려 주고, Android 도 edge-to-edge(SDK 54~)라 시스템이 화면을 줄여 주지 않아서 둘 다 padding */}
      <KeyboardAvoidingView style={styles.flex} behavior="padding">
        <ScrollView
          ref={scrollRef}
          style={styles.scroll}
          contentContainerStyle={styles.msgContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          // 내용 높이가 바뀔 때마다(새 말풍선, 글자 추가) 맨 아래로. 글자가 계속 늘어나서 한 번 내리는 걸로는 부족하다
          onContentSizeChange={() => {
            if (messages.length > 0) scrollRef.current?.scrollToEnd({ animated: true });
          }}
        >
          {messages.length === 0 ? (
            <LandingContent onSend={send} userName={userName} />
          ) : (
            <>
              <Text style={styles.dateSep}>{getTodayString()}</Text>
              {messages.map(msg => (
                <MessageItem
                  key={msg.id}
                  msg={msg}
                  onSend={send}
                  onRetry={retry}
                  askedSet={askedSet}
                  userName={userName}
                />
              ))}
            </>
          )}
        </ScrollView>

        <View style={styles.inputBar}>
          <Pressable style={styles.micBtn}>
            <Ionicons name="mic-outline" size={24} color={colors.text.sub} />
          </Pressable>
          <TextInput
            style={styles.textInput}
            value={input}
            onChangeText={setInput}
            placeholder="메시지를 입력하세요"
            placeholderTextColor={colors.text.sub}
            maxLength={2000} // 서버 제한 (CHT-04 content 최대 2000자)
            multiline
            returnKeyType="send"
            blurOnSubmit={false}
            onSubmitEditing={() => send(input)}
          />
          <Pressable
            style={[styles.sendBtn, canSend && styles.sendBtnOn]}
            onPress={() => send(input)}
            disabled={!canSend}
          >
            <Ionicons
              name="arrow-up"
              size={16}
              color={canSend ? colors.text.inverse : colors.text.sub}
            />
          </Pressable>
        </View>
      </KeyboardAvoidingView>

      <MenuSheet visible={showMenu} onClose={() => setShowMenu(false)} />
    </SafeAreaView>
  );
}

function LandingContent({ onSend, userName }: { onSend: (t: string) => void; userName: string | null }) {
  const hello = userName ? `안녕하세요, ${userName}님.` : '안녕하세요.';
  return (
    <View style={landStyles.wrap}>
      <Text style={landStyles.date}>{getLandingDateString()}</Text>
      <Text style={landStyles.greeting}>
        {`${hello}\n한국 생활과 금융, 무엇이 궁금하신가요?`}
      </Text>
      <Text style={landStyles.sub}>아래 질문 확인해 보세요</Text>
      <View style={landStyles.card}>
        {LANDING_SUGGESTIONS.map((s, i) => (
          <Pressable
            key={s}
            style={[landStyles.row, i < LANDING_SUGGESTIONS.length - 1 && landStyles.rowBorder]}
            onPress={() => onSend(s)}
          >
            <Text style={landStyles.rowText}>· {s}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

function SuggestionChipRow({
  chips,
  label,
  onSend,
  askedSet,
}: {
  chips: SuggestionChip[];
  label?: string;
  onSend: (t: string) => void;
  askedSet: Set<string>;
}) {
  const filtered = chips.filter(c => !askedSet.has(c.label));
  if (filtered.length === 0) return null;
  return (
    <View style={msgStyles.sugWrap}>
      {label ? <Text style={msgStyles.sugLabel}>{label}</Text> : null}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={msgStyles.sugRow}
      >
        {filtered.map(chip => (
          <Pressable
            key={chip.label}
            style={msgStyles.sugChip}
            onPress={() => (chip.action ? runAction(chip.action) : onSend(chip.label))}
          >
            {chip.icon ? (
              <Ionicons
                name={chip.icon}
                size={12}
                color={colors.text.strong}
                style={msgStyles.chipIcon}
              />
            ) : null}
            <Text style={msgStyles.sugChipText}>{chip.label}</Text>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}

function MessageItem({
  msg,
  onSend,
  onRetry,
  askedSet,
  userName,
}: {
  msg: ChatMessage;
  onSend: (t: string) => void;
  onRetry: (msg: ChatMessage) => void;
  askedSet: Set<string>;
  userName: string | null;
}) {
  if (msg.role === 'user') {
    return (
      <View style={msgStyles.userWrap}>
        <View style={msgStyles.userBubble}>
          <Text style={msgStyles.userText}>{msg.text}</Text>
        </View>
        <Text style={msgStyles.time}>{msg.time}</Text>
      </View>
    );
  }

  return (
    <View style={msgStyles.aiWrap}>
      {msg.statusTexts?.map(s => (
        <Text key={s} style={msgStyles.statusText}>
          ✓ {s}
        </Text>
      ))}
      {msg.text ? (
        // 답변 서식(**굵게**, "- " 목록)을 그린다. 답하는 중·도중 실패면 끝부분이 덜 온 글
        <AnswerText text={msg.text} style={msgStyles.aiText} partial={msg.status !== 'done'} />
      ) : msg.status === 'streaming' ? (
        // 첫 글자가 오기 전까지
        <Text style={msgStyles.pendingText}>답변을 준비하고 있어요…</Text>
      ) : null}
      {msg.status === 'error' && (
        <View style={msgStyles.errorWrap}>
          <Text style={msgStyles.errorText}>{msg.errorMessage}</Text>
          <Pressable style={[msgStyles.sugChip, msgStyles.retryBtn]} onPress={() => onRetry(msg)}>
            <Ionicons name="refresh" size={12} color={colors.text.strong} style={msgStyles.chipIcon} />
            <Text style={msgStyles.sugChipText}>다시 시도</Text>
          </Pressable>
        </View>
      )}
      {msg.blocks && msg.blocks.length > 0 && (
        <ChatBlocks
          blocks={msg.blocks}
          userName={userName}
          onAction={runAction}
          onOpenTransferPath={openTransferPath}
        />
      )}
      {msg.suggestions && msg.suggestions.length > 0 && (
        <SuggestionChipRow
          chips={msg.suggestions}
          label={msg.suggestionsLabel}
          onSend={onSend}
          askedSet={askedSet}
        />
      )}
    </View>
  );
}

function MenuSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  // action 이 없는 메뉴(설정)는 아직 "준비 중"
  const handleItem = (action?: ChatAction) => {
    if (!action) return preparingAlert();
    onClose();
    runAction(action);
  };

  // "목표 환율 알림" 점: 도달(TRIGGERED)했는데 /fx/alert 에서 아직 확인 안 한 알림이 있을 때. 메뉴를 열 때마다 확인
  const [fxAlertDot, setFxAlertDot] = useState(false);
  useEffect(() => {
    if (!visible) return;
    let cancelled = false;
    getFxAlerts()
      .then((data) =>
        hasUnseenIds(data.items.filter((a) => a.status === 'TRIGGERED').map((a) => a.alertId)),
      )
      .then((unseen) => !cancelled && setFxAlertDot(unseen))
      .catch(() => !cancelled && setFxAlertDot(false));
    return () => {
      cancelled = true;
    };
  }, [visible]);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={menuStyles.wrap}>
        <Pressable style={menuStyles.dim} onPress={onClose} />
        <View style={menuStyles.sheet}>
          <View style={menuStyles.handle} />
          <View style={menuStyles.sheetHead}>
            <Text style={menuStyles.sheetTitle}>전체 메뉴</Text>
            <Pressable onPress={onClose} style={menuStyles.closeBtn}>
              <Ionicons name="close" size={20} color={colors.text.strong} />
            </Pressable>
          </View>
          <ScrollView showsVerticalScrollIndicator={false}>
            {/* hidden 항목은 빼고, 남는 항목이 없는 그룹(설정)은 제목도 그리지 않는다 */}
            {MENU_GROUPS.map(group => ({ ...group, items: group.items.filter(item => !item.hidden) }))
              .filter(group => group.items.length > 0)
              .map(group => (
              <View key={group.section} style={menuStyles.group}>
                <Text style={menuStyles.groupTitle}>{group.section}</Text>
                {group.items.map(item => (
                  <Pressable
                    key={item.label}
                    style={menuStyles.menuRow}
                    onPress={() => handleItem(item.action)}
                  >
                    <View style={{ flex: 1 }}>
                      <View style={menuStyles.labelRow}>
                        <Text style={menuStyles.menuLabel}>{item.label}</Text>
                        {item.action === 'fx_alert' && fxAlertDot && (
                          <View style={menuStyles.dot} accessibilityLabel="확인하지 않은 도달 알림 있음" />
                        )}
                      </View>
                      {item.desc ? <Text style={menuStyles.menuDesc}>{item.desc}</Text> : null}
                    </View>
                    <Ionicons name="chevron-forward" size={16} color={colors.text.sub} />
                  </Pressable>
                ))}
              </View>
            ))}
            <Pressable
              style={menuStyles.solRow}
              onPress={() => {
                onClose();
                router.replace('/'); // SOL Global 홈(SG-000)으로
              }}
            >
              <Text style={menuStyles.solText}>SOL Global로 돌아가기</Text>
            </Pressable>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  flex: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    paddingVertical: 10,
    backgroundColor: colors.surface,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  headerLeft: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 4 },
  headerTitle: { ...typography.h3, color: colors.text.strong },
  newChatBtn: {
    ...typography.body,
    fontFamily: fonts.bold,
    color: colors.primary,
    paddingHorizontal: spacing.sm,
  },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: radius.full,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scroll: { flex: 1 },
  msgContent: { flexGrow: 1, padding: spacing.xl, gap: spacing.lg },
  dateSep: {
    ...typography.badge,
    color: colors.text.sub,
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    backgroundColor: colors.surface,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  micBtn: { padding: 4 },
  textInput: {
    flex: 1,
    ...typography.body,
    color: colors.text.strong,
    paddingVertical: 8,
    maxHeight: 120,
  },
  sendBtn: {
    width: 32,
    height: 32,
    borderRadius: radius.full,
    backgroundColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnOn: { backgroundColor: colors.primary },
});

const landStyles = StyleSheet.create({
  wrap: { flex: 1, paddingTop: spacing.sm },
  date: {
    ...typography.badge,
    color: colors.text.sub,
    textAlign: 'center',
    marginBottom: spacing.xl,
  },
  greeting: { ...typography.h2, color: colors.text.strong, marginBottom: spacing.xs },
  sub: { ...typography.body, color: colors.text.sub, marginBottom: spacing.lg },
  card: { backgroundColor: colors.surface, borderRadius: radius.lg, overflow: 'hidden' },
  row: { paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
  rowBorder: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  rowText: { ...typography.body, color: colors.text.strong },
});

const msgStyles = StyleSheet.create({
  userWrap: { alignItems: 'flex-end', gap: 4 },
  userBubble: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    maxWidth: '80%',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  userText: { ...typography.body, color: colors.text.strong },
  time: { ...typography.badge, color: colors.text.sub },
  aiWrap: { gap: spacing.sm, paddingRight: spacing.md },
  aiText: { ...typography.body, color: colors.text.strong, lineHeight: 22 },
  pendingText: { ...typography.body, color: colors.text.sub },
  statusText: { ...typography.badge, color: colors.text.sub },
  errorWrap: { gap: spacing.xs },
  errorText: { ...typography.badge, color: colors.errorText },
  retryBtn: { alignSelf: 'flex-start' },
  sugWrap: { gap: spacing.xs, marginTop: spacing.xs },
  sugLabel: { ...typography.badge, color: colors.text.sub },
  sugRow: { flexDirection: 'row', gap: spacing.sm, paddingVertical: 2 },
  sugChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    backgroundColor: colors.surface,
    borderRadius: radius.full,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  chipIcon: { marginRight: 4 },
  sugChipText: { ...typography.badge, color: colors.text.strong },
});

const menuStyles = StyleSheet.create({
  wrap: { flex: 1, justifyContent: 'flex-end' },
  dim: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.dim,
  },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '85%',
    paddingBottom: spacing.xxl,
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: colors.border,
    borderRadius: 2,
    alignSelf: 'center',
    marginVertical: spacing.sm,
  },
  sheetHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
  },
  sheetTitle: { ...typography.h3, color: colors.text.strong },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: radius.full,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  group: { paddingHorizontal: spacing.xl, marginBottom: spacing.xs },
  groupTitle: {
    ...typography.badge,
    color: colors.text.sub,
    marginTop: spacing.md,
    marginBottom: spacing.xs,
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    gap: spacing.sm,
  },
  labelRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  dot: { width: spacing.sm, height: spacing.sm, borderRadius: radius.full, backgroundColor: colors.primary },
  menuLabel: { ...typography.h3, color: colors.text.strong },
  menuDesc: { ...typography.body, color: colors.text.sub },
  solRow: {
    marginHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    marginTop: spacing.sm,
  },
  solText: { ...typography.body, color: colors.text.sub, textAlign: 'center' },
});
