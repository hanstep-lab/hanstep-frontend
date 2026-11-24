import { useState, useRef, useCallback, useEffect, type ComponentRef } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  StyleSheet,
  Modal,
  KeyboardAvoidingView,
  Animated,
  PanResponder,
  Dimensions,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router, type Href } from 'expo-router';
import { colors, typography, spacing, radius, fonts } from '../../constants/theme';
import {
  type ChatAction,
  type SuggestionChip,
  MENU_GROUPS,
} from '../../api/mock/chat';
import { createChatSession, streamChatMessage, type ChatCardBlock } from '../../api/chat';
import { getMe } from '../../api/user';
import i18n, { setAppLanguage } from '../../i18n';
import { useTranslation } from 'react-i18next';
import { getFxAlerts } from '../../api/fx';
import { hasUnseenIds } from '../../utils/fxAlertStorage';
import type { ApiError } from '../../types/api';
import { useTransferStore } from '../../store/transferStore';
import ChatBlocks from '../../features/chat/blocks/ChatBlocks';
import AnswerText from '../../features/chat/AnswerText';
import { cardLanguage, type CardLanguage } from '../../features/chat/blocks/productLines';
import {
  SCENARIO_KEYS,
  remainingScenario,
  type ScenarioQuestion,
} from '../../features/chat/demoScenario';
import { isCreditQuestion } from '../../features/chat/creditLink';
import Button from '../../components/Button';

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
  blocks?: ChatCardBlock[]; // 카드 (chat.done.blocks). 끝난 뒤에 붙는다. 개발 빌드에서는 모르는 카드 자리도 들어 있다
  suggestions?: SuggestionChip[];
  suggestionsLabel?: string;
};

// 영어 화면 날짜용 (한국어 화면은 아래 함수의 한국어 형식 그대로)
const EN_DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const EN_MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const isKo = () => i18n.language === 'ko';

// 오전 9:05 / 9:05 AM
function nowTime(): string {
  const d = new Date();
  const h = d.getHours();
  const m = String(d.getMinutes()).padStart(2, '0');
  const ampm = i18n.t(h < 12 ? 'chat.am' : 'chat.pm');
  return isKo() ? `${ampm} ${h % 12 || 12}:${m}` : `${h % 12 || 12}:${m} ${ampm}`;
}

// 2026년 11월 23일 / November 23, 2026
function landingDate(d: Date): string {
  return isKo()
    ? `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일`
    : `${EN_MONTHS[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
}

// 오늘 2026년 11월 23일 월요일 / Today, Monday, November 23, 2026
function getTodayString(): string {
  const days = ['일요일', '월요일', '화요일', '수요일', '목요일', '금요일', '토요일'];
  const d = new Date();
  const date = isKo() ? `${landingDate(d)} ${days[d.getDay()]}` : `${EN_DAYS[d.getDay()]}, ${landingDate(d)}`;
  return i18n.t('chat.today', { date });
}

function getLandingDateString(): string {
  return landingDate(new Date());
}

export default function ChatScreen() {
  const { t } = useTranslation();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [showMenu, setShowMenu] = useState(false);
  const [askedSet, setAskedSet] = useState<Set<string>>(new Set());
  const [streaming, setStreaming] = useState(false); // 답하는 중이면 보내기 버튼을 막는다
  // 첫 인사·상품 카드 헤더의 이름 (users/me shortName). 못 받으면 null → 이름 없이 표시
  const [userName, setUserName] = useState<string | null>(null);
  // 상품 추천 카드 글자 언어 (users/me preferredLanguage). 못 받으면 한국어
  const [cardLang, setCardLang] = useState<CardLanguage>('ko');
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

  // 이름: 금융상품 추천 화면(products.ts)과 같은 방식으로 users/me shortName 을 쓴다. 언어도 같이 받는다
  useEffect(() => {
    let cancelled = false;
    getMe()
      .then((me) => {
        if (cancelled) return;
        setUserName(me.shortName || null);
        setCardLang(cardLanguage(me.preferredLanguage));
        setAppLanguage(me.preferredLanguage); // 앱을 채팅에서 다시 열었을 때도 사용자 언어로
      })
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
  // 시연 시나리오 칩: 대화 중에만, 아직 안 보낸 질문이 남았을 때만 입력창 위에 보인다 (첫 화면은 LandingContent 목록)
  const scenarioLeft = remainingScenario(
    SCENARIO_KEYS.map(key => ({ key, text: t(`chat.landing.${key}`) })),
    askedSet,
  );
  const showScenario = messages.length > 0 && scenarioLeft.length > 0;

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Pressable style={styles.headerLeft} onPress={() => setShowMenu(true)}>
          <Text style={styles.headerTitle}>{t('common.appName')}</Text>
          <Ionicons name="chevron-down" size={14} color={colors.text.strong} />
        </Pressable>
        <Pressable onPress={clearChat}>
          <Text style={styles.newChatBtn}>{t('chat.newChat')}</Text>
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
                  cardLang={cardLang}
                />
              ))}
            </>
          )}
        </ScrollView>

        {showScenario && <ScenarioChipRow questions={scenarioLeft} disabled={streaming} onSend={send} />}

        <View style={[styles.inputBar, showScenario && styles.inputBarJoined]}>
          <Pressable style={styles.micBtn}>
            <Ionicons name="mic-outline" size={24} color={colors.text.sub} />
          </Pressable>
          <TextInput
            style={styles.textInput}
            value={input}
            onChangeText={setInput}
            placeholder={t('chat.inputPlaceholder')}
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

      <MenuSheet visible={showMenu} onClose={() => setShowMenu(false)} userName={userName} />
    </SafeAreaView>
  );
}

function LandingContent({ onSend, userName }: { onSend: (t: string) => void; userName: string | null }) {
  const { t } = useTranslation();
  const hello = userName ? t('chat.helloName', { name: userName }) : t('chat.hello');
  return (
    <View style={landStyles.wrap}>
      <Text style={landStyles.date}>{getLandingDateString()}</Text>
      <Text style={landStyles.greeting}>
        {`${hello}\n${t('chat.landingAsk')}`}
      </Text>
      <Text style={landStyles.sub}>{t('chat.landingSub')}</Text>
      <View style={landStyles.card}>
        {SCENARIO_KEYS.map((key, i) => (
          <Pressable
            key={key}
            style={[landStyles.row, i < SCENARIO_KEYS.length - 1 && landStyles.rowBorder]}
            onPress={() => onSend(t(`chat.landing.${key}`))}
          >
            <Text style={landStyles.rowText}>· {t(`chat.landing.${key}`)}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

// 대화 중 입력창 바로 위 시연 시나리오 칩 줄. 맨 앞(다음 순서) 칩을 강조한다.
// 답하는 중에는 send 가 무시하므로 칩도 막고 비활성 모양으로 보인다
function ScenarioChipRow({
  questions,
  disabled,
  onSend,
}: {
  questions: ScenarioQuestion[];
  disabled: boolean;
  onSend: (t: string) => void;
}) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      keyboardShouldPersistTaps="handled" // 키보드가 떠 있어도 칩을 한 번에 누를 수 있게
      style={scenarioStyles.scroll}
      contentContainerStyle={scenarioStyles.list}
    >
      {questions.map((q, i) => {
        const next = i === 0;
        return (
          <Pressable
            key={q.key}
            style={[
              scenarioStyles.chip,
              next && scenarioStyles.chipNext,
              next && disabled && scenarioStyles.chipNextDisabled,
            ]}
            onPress={() => onSend(q.text)}
            disabled={disabled}
            accessibilityRole="button"
            accessibilityState={{ disabled }}
          >
            <Text
              numberOfLines={1}
              style={[
                scenarioStyles.chipText,
                next && scenarioStyles.chipTextNext,
                !next && disabled && scenarioStyles.chipTextDisabled,
              ]}
            >
              {q.text}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
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
  cardLang,
}: {
  msg: ChatMessage;
  onSend: (t: string) => void;
  onRetry: (msg: ChatMessage) => void;
  askedSet: Set<string>;
  userName: string | null;
  cardLang: CardLanguage;
}) {
  const { t } = useTranslation();
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
        <Text style={msgStyles.pendingText}>{t('chat.preparing')}</Text>
      ) : null}
      {msg.status === 'error' && (
        <View style={msgStyles.errorWrap}>
          <Text style={msgStyles.errorText}>{msg.errorMessage}</Text>
          <Pressable style={[msgStyles.sugChip, msgStyles.retryBtn]} onPress={() => onRetry(msg)}>
            <Ionicons name="refresh" size={12} color={colors.text.strong} style={msgStyles.chipIcon} />
            <Text style={msgStyles.sugChipText}>{t('chat.retry')}</Text>
          </Pressable>
        </View>
      )}
      {msg.blocks && msg.blocks.length > 0 && (
        <ChatBlocks
          blocks={msg.blocks}
          userName={userName}
          language={cardLang}
          onAction={runAction}
          onOpenTransferPath={openTransferPath}
        />
      )}
      {msg.status === 'done' && msg.question && isCreditQuestion(msg.question) && (
        // 대출·신용 질문: 대안신용 사전진단 화면으로 바로 가는 버튼 (AI 답과 상관없이 FE 가 붙인다).
        // 모양은 송금 카드의 [송금하기](RemittanceConfirmCard)와 같다
        <Button title={t('chat.creditCheck')} showArrow onPress={() => runAction('credit')} />
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

function MenuSheet({
  visible,
  onClose,
  userName,
}: {
  visible: boolean;
  onClose: () => void;
  userName: string | null; // '금융상품 추천' 설명에 넣는 이름 (users/me shortName)
}) {
  // Modal 은 별도 창이라 화면의 SafeAreaView 하단 여백이 안 먹는다. 시트에 시스템 내비게이션 바 높이를 더한다
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  // 'SOL Global로 돌아가기' 줄: 구분선 아래 빈 영역의 세로 가운데에 둔다.
  // 영역 높이 = 예전(위 8 + 글자 줄 18 + 아래 8 + 시트 아래 4 + 시스템 내비게이션 바)의 2/3. 위아래 여백을 같게 나눈다
  const solLine = typography.body.lineHeight;
  const solArea = Math.round((spacing.sm * 2 + spacing.xs + insets.bottom + solLine) * (2 / 3));
  const solPad = Math.max((solArea - solLine) / 2, spacing.sm);
  // action 이 없는 메뉴는 목록에서 숨긴다(hidden). 혹시 보이더라도 눌러서 아무것도 하지 않는다
  const handleItem = (action?: ChatAction) => {
    if (!action) return;
    onClose();
    runAction(action);
  };

  // 시트 애니메이션은 직접 한다(Modal 의 slide 는 어두운 배경까지 같이 밀어 내려서 끌어 닫을 때 배경 사각형이 따로 내려가 보임).
  // 열 때: 시트는 아래에서 올라오고 배경은 짧게 나타난다. 닫을 때: 시트를 내린 뒤 모달을 닫아 배경은 한 번에 사라진다
  const dragY = useRef(new Animated.Value(0)).current; // 시트 세로 위치 (0 = 제자리)
  const dimOpacity = useRef(new Animated.Value(0)).current;
  const closeRef = useRef(onClose); // PanResponder 는 한 번만 만들어서 최신 onClose 를 ref 로 읽는다
  useEffect(() => {
    closeRef.current = onClose;
  }, [onClose]);
  useEffect(() => {
    if (!visible) return;
    dragY.setValue(Dimensions.get('window').height);
    dimOpacity.setValue(0);
    Animated.parallel([
      Animated.timing(dragY, { toValue: 0, duration: 250, useNativeDriver: true }),
      Animated.timing(dimOpacity, { toValue: 1, duration: 150, useNativeDriver: true }),
    ]).start();
  }, [visible, dragY, dimOpacity]);
  const sheet = useRef({
    // 시트를 화면 밖으로 내린 뒤 닫는다 (X·바깥 탭·뒤로가기·끌어서 닫기)
    close: () =>
      Animated.timing(dragY, {
        toValue: Dimensions.get('window').height,
        duration: 200,
        useNativeDriver: true,
      }).start(() => closeRef.current()),
    move: (dy: number) => dragY.setValue(Math.max(dy, 0)),
    // 많이 끌었거나(100px) 빠르게 튕기면 닫고, 덜 끌었으면 제자리로
    release: (dy: number, vy: number) => {
      if (dy > 100 || vy > 0.8) sheet.close();
      else Animated.spring(dragY, { toValue: 0, useNativeDriver: true, bounciness: 4 }).start();
    },
    reset: () => Animated.spring(dragY, { toValue: 0, useNativeDriver: true, bounciness: 4 }).start(),
  }).current;
  // 끌어서 닫기는 손잡이·제목 줄에서만. 손가락을 대는 순간부터 시트가 터치를 맡는다. X 버튼은 자식이라 먼저 눌린다.
  // 목록 영역은 메뉴 터치·스크롤만 한다(목록에서 끌기를 가로채면 Android 에서 메뉴가 눌리지 않았음)
  const headPan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dy) > 2,
      onPanResponderTerminationRequest: () => false, // 끄는 도중 다른 곳에 뺏기지 않게
      onPanResponderMove: (_, g) => sheet.move(g.dy),
      onPanResponderRelease: (_, g) => sheet.release(g.dy, g.vy),
      onPanResponderTerminate: () => sheet.reset(),
    }),
  ).current;

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
    <Modal visible={visible} transparent animationType="none" onRequestClose={sheet.close}>
      <View style={menuStyles.wrap}>
        <Animated.View style={[menuStyles.dim, { opacity: dimOpacity }]}>
          <Pressable style={menuStyles.dimTouch} onPress={sheet.close} />
        </Animated.View>
        <Animated.View
          style={[
            menuStyles.sheet,
            { paddingBottom: 0, transform: [{ translateY: dragY }] }, // 아래 여백은 SOL 줄(solPad)이 맡는다
          ]}
        >
          <View {...headPan.panHandlers}>
            <View style={menuStyles.handle} />
            <View style={menuStyles.sheetHead}>
              <Text style={menuStyles.sheetTitle}>{t('chat.menuTitle')}</Text>
              <Pressable onPress={sheet.close} style={menuStyles.closeBtn}>
                <Ionicons name="close" size={20} color={colors.text.strong} />
              </Pressable>
            </View>
          </View>
          <ScrollView showsVerticalScrollIndicator={false}>
            {/* hidden 항목은 빼고, 남는 항목이 없는 그룹(설정)은 제목도 그리지 않는다 */}
            {MENU_GROUPS.map(group => ({ ...group, items: group.items.filter(item => !item.hidden) }))
              .filter(group => group.items.length > 0)
              .map(group => (
              <View key={group.section} style={menuStyles.group}>
                <Text style={menuStyles.groupTitle}>{t(`chat.menu.sections.${group.section}`)}</Text>
                {group.items.map(item => (
                  <Pressable
                    key={item.key}
                    style={menuStyles.menuRow}
                    onPress={() => handleItem(item.action)}
                  >
                    <View style={{ flex: 1 }}>
                      <View style={menuStyles.labelRow}>
                        <Text style={menuStyles.menuLabel}>{t(`chat.menu.items.${item.key}.label`)}</Text>
                        {item.action === 'fx_alert' && fxAlertDot && (
                          <View style={menuStyles.dot} accessibilityLabel={t('chat.unseenAlert')} />
                        )}
                      </View>
                      <Text style={menuStyles.menuDesc}>
                        {item.key === 'products' && userName
                          ? t('chat.menu.productsDescNamed', { name: userName })
                          : t(`chat.menu.items.${item.key}.desc`)}
                      </Text>
                    </View>
                    <Ionicons name="chevron-forward" size={16} color={colors.text.sub} />
                  </Pressable>
                ))}
              </View>
            ))}
            <Pressable
              style={[menuStyles.solRow, { paddingTop: solPad, paddingBottom: solPad }]}
              onPress={() => {
                onClose();
                router.replace('/'); // SOL Global 홈(SG-000)으로
              }}
            >
              <Text style={menuStyles.solText}>{t('chat.backToSol')}</Text>
            </Pressable>
          </ScrollView>
        </Animated.View>
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
  headerTitle: { ...typography.h3, color: colors.text.strong, flexShrink: 1 },
  newChatBtn: {
    ...typography.body,
    fontFamily: fonts.bold,
    color: colors.primary,
    paddingHorizontal: spacing.sm,
  },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, flexShrink: 0 },
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
  inputBarJoined: { borderTopWidth: 0 }, // 위에 시나리오 칩 줄이 있으면 구분선은 칩 줄 위에만
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

// 시연 시나리오 칩 줄. 모양은 fx/alert.tsx 통화 칩(chip·chipSelected)을 따르고, 입력창과 같은 흰 바탕에 붙여 한 덩어리로 보이게 한다
const scenarioStyles = StyleSheet.create({
  scroll: {
    flexGrow: 0, // 가로 ScrollView 가 세로로 늘어나지 않게 (칩 한 줄 높이 유지)
    backgroundColor: colors.surface,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  list: { paddingHorizontal: spacing.lg, paddingTop: spacing.sm, gap: spacing.sm },
  chip: {
    // 짧은 질문(1·2, 영어 2번 319pt 포함)은 다 보이고 긴 질문(3·4)은 말줄임. 375pt 화면에서도 옆 칩이 20pt쯤 보여서 넘길 수 있는 줄 알 수 있다
    maxWidth: 330,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    backgroundColor: colors.background,
  },
  chipNext: { backgroundColor: colors.primary },
  chipNextDisabled: { backgroundColor: colors.disabled },
  chipText: { ...typography.body, fontFamily: fonts.bold, color: colors.text.sub },
  chipTextNext: { color: colors.text.inverse },
  chipTextDisabled: { color: colors.text.placeholder },
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
  dimTouch: { flex: 1 },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '85%',
    paddingBottom: spacing.xs,
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
  sheetTitle: { ...typography.h3, color: colors.text.strong, flexShrink: 1 },
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
  menuLabel: { ...typography.h3, color: colors.text.strong, flexShrink: 1 },
  menuDesc: { ...typography.body, color: colors.text.sub },
  solRow: {
    marginHorizontal: spacing.xl,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    marginTop: spacing.sm,
  },
  solText: { ...typography.body, color: colors.text.sub, textAlign: 'center' },
});
