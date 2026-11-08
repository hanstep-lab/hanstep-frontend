import { useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  StyleSheet,
  Modal,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { colors, typography, spacing, radius, fonts } from '../../constants/theme';
import {
  type ChatCardType,
  type SuggestionChip,
  type MockChatResponse,
  getMockResponse,
  LANDING_SUGGESTIONS,
  MENU_GROUPS,
} from '../../api/mock/chat';

type ChatMessage = {
  id: string;
  role: 'user' | 'ai';
  text: string;
  time: string;
  card?: ChatCardType;
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

function getTodayRateDate(): string {
  const d = new Date();
  const y = d.getFullYear();
  const mo = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}.${mo}.${day} 수출입은행 고시`;
}

function preparingAlert() {
  Alert.alert('준비 중', '곧 사용할 수 있어요.');
}

export default function ChatScreen() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [showMenu, setShowMenu] = useState(false);
  const [askedSet, setAskedSet] = useState<Set<string>>(new Set());
  const scrollRef = useRef<{ scrollToEnd: (options?: { animated?: boolean }) => void }>(null);
  const aiCallCount = useRef(0);

  const send = useCallback((text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;

    aiCallCount.current += 1;
    const raw: MockChatResponse = getMockResponse(trimmed, aiCallCount.current);

    const userMsg: ChatMessage = {
      id: `u${Date.now()}`,
      role: 'user',
      text: trimmed,
      time: nowTime(),
    };
    const aiMsg: ChatMessage = {
      id: `a${Date.now() + 1}`,
      role: 'ai',
      time: nowTime(),
      text: raw.text,
      card: raw.card,
      suggestions: raw.suggestions,
      suggestionsLabel: raw.suggestionsLabel,
    };

    setMessages(prev => [...prev, userMsg, aiMsg]);
    setInput('');
    setAskedSet(prev => new Set([...prev, trimmed]));
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 150);
  }, []);

  const clearChat = () => {
    setMessages([]);
    setAskedSet(new Set());
    aiCallCount.current = 0;
  };

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

      <ScrollView
        ref={scrollRef as any}
        style={styles.scroll}
        contentContainerStyle={styles.msgContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {messages.length === 0 ? (
          <LandingContent onSend={send} />
        ) : (
          <>
            <Text style={styles.dateSep}>{getTodayString()}</Text>
            {messages.map(msg => (
              <MessageItem key={msg.id} msg={msg} onSend={send} askedSet={askedSet} />
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
          multiline
          returnKeyType="send"
          blurOnSubmit={false}
          onSubmitEditing={() => send(input)}
        />
        <Pressable
          style={[styles.sendBtn, !!input.trim() && styles.sendBtnOn]}
          onPress={() => send(input)}
          disabled={!input.trim()}
        >
          <Ionicons
            name="arrow-up"
            size={16}
            color={input.trim() ? colors.text.inverse : colors.text.sub}
          />
        </Pressable>
      </View>

      <MenuSheet visible={showMenu} onClose={() => setShowMenu(false)} />
    </SafeAreaView>
  );
}

function LandingContent({ onSend }: { onSend: (t: string) => void }) {
  return (
    <View style={landStyles.wrap}>
      <Text style={landStyles.date}>{getLandingDateString()}</Text>
      <Text style={landStyles.greeting}>
        {'안녕하세요, Nguyen님.\n한국 생활과 금융, 무엇이 궁금하신가요?'}
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
            onPress={() =>
              chip.action === 'visa_tab'
                ? router.push('/(tabs)/visa' as any)
                : onSend(chip.label)
            }
          >
            {chip.icon ? (
              <Ionicons
                name={chip.icon as any}
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
  askedSet,
}: {
  msg: ChatMessage;
  onSend: (t: string) => void;
  askedSet: Set<string>;
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
      <Text style={msgStyles.aiText}>{msg.text}</Text>
      {msg.card === 'remit_confirm' && <RemitConfirmCard onSend={onSend} />}
      {msg.card === 'remit_calc' && <RemitCalcCard />}
      {msg.card === 'rate_info' && <RateInfoCard />}
      {msg.card === 'visa_roadmap' && <VisaRoadmapCard />}
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

function RemitConfirmCard({ onSend }: { onSend: (t: string) => void }) {
  const OPTIONS = ['네, 맞아요', 'VND 기준이에요', '어머니는 한국에 계세요'];
  return (
    <View style={cardStyles.wrap}>
      <View style={cardStyles.quickRow}>
        {OPTIONS.map((opt, i) => (
          <Pressable
            key={opt}
            style={[cardStyles.chip, i === 0 && cardStyles.chipPrimary]}
            onPress={() => onSend(opt)}
          >
            <Text style={[cardStyles.chipText, i === 0 && cardStyles.chipTextPrimary]}>
              {opt}
            </Text>
          </Pressable>
        ))}
      </View>
      <Pressable style={cardStyles.remitRow} onPress={preparingAlert}>
        <View style={cardStyles.remitLeft}>
          <View style={cardStyles.remitIcon}>
            <Ionicons name="swap-horizontal-outline" size={18} color={colors.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={cardStyles.remitTitle}>해외송금 ↗</Text>
            <Text style={cardStyles.remitDesc}>받는 분: 어머니 · Vietcombank (베트남)</Text>
            <Text style={cardStyles.remitDesc}>출금 50,000 KRW → 수취 약 921,000 VND</Text>
          </View>
        </View>
        <Ionicons name="chevron-forward" size={16} color={colors.text.sub} />
      </Pressable>
    </View>
  );
}

function RemitCalcCard() {
  return (
    <View style={calcStyles.wrap}>
      <View style={calcStyles.card}>
        <View style={calcStyles.cardHead}>
          <Text style={calcStyles.cardTitle}>예상 수취 금액 계산</Text>
          <View style={calcStyles.badge}>
            <Text style={calcStyles.badgeText}>시장 환율 참고값</Text>
          </View>
        </View>
        <View style={calcStyles.row}>
          <Text style={calcStyles.rowLabel}>송금 금액</Text>
          <Text style={calcStyles.rowVal}>500,000 KRW</Text>
        </View>
        <View style={calcStyles.row}>
          <Text style={calcStyles.rowLabel}>적용 환율</Text>
          <Text style={calcStyles.rowVal}>100 VND = 5.43 KRW</Text>
        </View>
        <View style={calcStyles.divider} />
        <View style={calcStyles.row}>
          <Text style={calcStyles.rowLabel}>현지 수취 예상</Text>
          <Text style={calcStyles.total}>약 9,210,000 VND</Text>
        </View>
      </View>
      <Pressable style={calcStyles.btn} onPress={preparingAlert}>
        <Text style={calcStyles.btnText}>송금하기 →</Text>
      </Pressable>
      <Pressable onPress={preparingAlert}>
        <Text style={calcStyles.link}>환율 알림 및 상세 계산기 ↗</Text>
      </Pressable>
    </View>
  );
}

const RATE_TABLE = [
  { currency: 'USD', base: '1,382.50', send: '1,389.20', recv: '1,375.80' },
  { currency: 'VND(100)', base: '5.43', send: '시장 환율\n참고값', recv: '—' },
];

function RateInfoCard() {
  return (
    <View style={rateStyles.wrap}>
      <View style={rateStyles.card}>
        <View style={rateStyles.cardTop}>
          <View style={rateStyles.dotLabel}>
            <View style={rateStyles.dot} />
            <Text style={rateStyles.cardTitle}>오늘 고시 환율</Text>
          </View>
          <Text style={rateStyles.cardDate}>{getTodayRateDate()}</Text>
        </View>
        <View style={rateStyles.rateRow}>
          <View style={rateStyles.flagBox}>
            <Text style={rateStyles.flag}>$</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={rateStyles.rateName}>미국 USD</Text>
            <Text style={rateStyles.rateDesc}>매매기준율</Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={rateStyles.rateVal}>1,382.50 원</Text>
            <Text style={[rateStyles.rateChange, { color: '#E53935' }]}>▲+3.20 (0.23%)</Text>
          </View>
        </View>
        <View style={rateStyles.divider} />
        <View style={rateStyles.rateRow}>
          <View style={rateStyles.flagBox}>
            <Text style={rateStyles.flag}>₫</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={rateStyles.rateName}>베트남 VND</Text>
            <Text style={rateStyles.rateDesc}>100 VND · 시장 환율 참고값</Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={rateStyles.rateVal}>5.43 원</Text>
            <Text style={[rateStyles.rateChange, { color: colors.primary }]}>▼-0.02 (-0.36%)</Text>
          </View>
        </View>
        <View style={rateStyles.divider} />
        <View style={rateStyles.table}>
          <View style={rateStyles.tableRow}>
            {['통화', '매매기준율', '송금 보낼 때', '송금 받을 때'].map((h, i) => (
              <Text key={h} style={[rateStyles.th, i === 0 && { textAlign: 'left' }]}>{h}</Text>
            ))}
          </View>
          {RATE_TABLE.map(r => (
            <View key={r.currency} style={rateStyles.tableRow}>
              <Text style={[rateStyles.td, { textAlign: 'left' }]}>{r.currency}</Text>
              <Text style={rateStyles.td}>{r.base}</Text>
              <Text style={[rateStyles.td, { fontSize: 10 }]}>{r.send}</Text>
              <Text style={rateStyles.td}>{r.recv}</Text>
            </View>
          ))}
          <Text style={rateStyles.note}>
            기준: 수출입은행 일별 고시 · VND는 시장 환율 참고값(10:00 기준)
          </Text>
        </View>
      </View>
      <Pressable onPress={preparingAlert}>
        <Text style={rateStyles.link}>환율 상세 보기 ↗</Text>
      </Pressable>
      <Pressable style={rateStyles.btn} onPress={preparingAlert}>
        <Text style={rateStyles.btnText}>▶ 이 환율로 바로 송금하기</Text>
      </Pressable>
    </View>
  );
}

function VisaRoadmapCard() {
  return (
    <View style={calcStyles.wrap}>
      <Pressable
        style={calcStyles.btn}
        onPress={() => router.push('/(tabs)/visa' as any)}
      >
        <Text style={calcStyles.btnText}>비자 탭에서 내 점수 확인하기 →</Text>
      </Pressable>
    </View>
  );
}

function MenuSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const handleItem = (label: string) => {
    if (label === '비자 로드맵') {
      onClose();
      router.push('/(tabs)/visa' as any);
    } else {
      preparingAlert();
    }
  };

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
            {MENU_GROUPS.map(group => (
              <View key={group.section} style={menuStyles.group}>
                <Text style={menuStyles.groupTitle}>{group.section}</Text>
                {group.items.map(item => (
                  <Pressable
                    key={item.label}
                    style={menuStyles.menuRow}
                    onPress={() => handleItem(item.label)}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={menuStyles.menuLabel}>{item.label}</Text>
                      <Text style={menuStyles.menuDesc}>{item.desc}</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={16} color={colors.text.sub} />
                  </Pressable>
                ))}
              </View>
            ))}
            <Pressable style={menuStyles.solRow} onPress={onClose}>
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

const cardStyles = StyleSheet.create({
  wrap: { gap: spacing.sm, marginTop: spacing.sm },
  quickRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  chipPrimary: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { ...typography.body, color: colors.text.strong },
  chipTextPrimary: { color: colors.text.inverse },
  remitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderRadius: radius.lg,
    padding: spacing.md,
    gap: spacing.sm,
  },
  remitLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flex: 1 },
  remitIcon: {
    width: 36,
    height: 36,
    borderRadius: radius.full,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  remitTitle: { ...typography.body, fontFamily: fonts.bold, color: colors.text.strong },
  remitDesc: { ...typography.badge, color: colors.text.sub },
});

const calcStyles = StyleSheet.create({
  wrap: { gap: spacing.sm, marginTop: spacing.sm },
  card: {
    backgroundColor: colors.background,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  cardHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  cardTitle: { ...typography.body, fontFamily: fonts.bold, color: colors.text.strong },
  badge: {
    backgroundColor: colors.border,
    borderRadius: radius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  badgeText: { ...typography.badge, color: colors.text.sub },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  rowLabel: { ...typography.body, color: colors.text.sub },
  rowVal: { ...typography.body, color: colors.text.strong },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: colors.border, marginVertical: 2 },
  total: { ...typography.subtitle, fontFamily: fonts.bold, color: colors.primary },
  btn: {
    backgroundColor: colors.primary,
    borderRadius: radius.lg,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnText: { ...typography.button, color: colors.text.inverse },
  link: { ...typography.body, color: colors.primary, textAlign: 'center' },
});

const rateStyles = StyleSheet.create({
  wrap: { gap: spacing.sm, marginTop: spacing.sm },
  card: {
    backgroundColor: colors.background,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.md,
  },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  dotLabel: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.primary },
  cardTitle: { ...typography.body, fontFamily: fonts.bold, color: colors.text.strong },
  cardDate: { ...typography.badge, color: colors.text.sub },
  rateRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  flagBox: {
    width: 32,
    height: 32,
    borderRadius: radius.full,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  flag: { ...typography.h3, color: colors.text.strong },
  rateName: { ...typography.body, fontFamily: fonts.bold, color: colors.text.strong },
  rateDesc: { ...typography.badge, color: colors.text.sub },
  rateVal: { ...typography.subtitle, fontFamily: fonts.bold, color: colors.text.strong },
  rateChange: { ...typography.badge },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: colors.border },
  table: { gap: 6 },
  tableRow: { flexDirection: 'row' },
  th: { flex: 1, ...typography.badge, color: colors.text.sub, textAlign: 'right' },
  td: { flex: 1, ...typography.badge, color: colors.text.strong, textAlign: 'right' },
  note: { fontSize: 10, fontFamily: fonts.medium, color: colors.text.sub, marginTop: 2 },
  link: { ...typography.body, color: colors.primary },
  btn: {
    backgroundColor: colors.primary,
    borderRadius: radius.lg,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnText: { ...typography.button, color: colors.text.inverse },
});

const menuStyles = StyleSheet.create({
  wrap: { flex: 1, justifyContent: 'flex-end' },
  dim: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(15,20,31,0.5)',
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
