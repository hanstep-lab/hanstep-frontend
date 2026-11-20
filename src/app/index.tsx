// SG-000 SOL Global 홈 (Figma 683:14). 앱을 켜면 실제 SOL Global 홈을 시연용으로 재현해 보여 준다.
// 상단 AI 버튼(쏠)을 누르면 신한걸음 진입: POST /auth/entry → GET /users/me 로 이동할 화면 결정
//   - 온보딩 미완료 → currentStep 에 해당하는 온보딩 화면 (처음이면 ON-001 언어)
//   - 온보딩 완료  → AI 채팅
// AI 버튼 말고는 시연용 모양이라 "준비 중" 안내만 한다(우리 앱에 해당 기능 없음).
// 데모 토큰일 때만 숨은 기능: "SOL Global" 로고를 1.5초 안에 3번 탭 → 확인 창 → 데모 계정 초기화 → ON-001 언어
//   로고에는 눈에 보이는 표시·접근성 라벨 변화를 넣지 않는다. 초기화 범위·앱 상태 처리는 features/demo/demoReset.ts

import { useState } from 'react';
import { View, Text, Pressable, StyleSheet, Alert, ActivityIndicator, ScrollView } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { router, type Href } from 'expo-router';
import { entry } from '../api/auth';
import { getMe } from '../api/user';
import { isDemoAccount } from '../api/demo';
import { resetDemoAccount } from '../features/demo/demoReset';
import { useMultiTap } from '../hooks/useMultiTap';
import { useAuthStore } from '../store/authStore';
import { showToast } from '../store/toastStore';
import { getRouteFromStepCode } from '../constants/onboardingSteps';
import { ENTRY_TOKEN } from '../api/config';
import { colors, fonts, radius, spacing } from '../constants/theme';
import { confirmDialog } from '../utils/confirm';
import { errorText } from '../utils/errorText';

const IMG = {
  sol: require('../../assets/images/sol-home/sol.png'), // 신한은행 캐릭터 쏠
  language: require('../../assets/images/sol-home/icon-language.svg'),
  headset: require('../../assets/images/sol-home/icon-headset.svg'),
  bell: require('../../assets/images/sol-home/icon-bell.svg'),
  globe: require('../../assets/images/sol-home/globe.svg'),
  coinWon: require('../../assets/images/sol-home/coin-won.svg'),
  coinDollar: require('../../assets/images/sol-home/coin-dollar.svg'),
  chevronLeft: require('../../assets/images/sol-home/chevron-left.svg'),
  chevronRightSmall: require('../../assets/images/sol-home/chevron-right-small.svg'),
  pause: require('../../assets/images/sol-home/icon-pause.svg'),
  pin: require('../../assets/images/sol-home/icon-pin.svg'),
  chevronRight: require('../../assets/images/sol-home/icon-chevron-right.svg'),
  tabHome: require('../../assets/images/sol-home/tab-home.svg'),
  tabProduct: require('../../assets/images/sol-home/tab-product.svg'),
  tabMenu: require('../../assets/images/sol-home/tab-menu.svg'),
  bubbleArrow: require('../../assets/images/sol-home/bubble-arrow.svg'),
  bubbleClose: require('../../assets/images/sol-home/bubble-close.svg'),
};

// 배너 목록. 지금은 Figma 에 1장뿐. Figma 에 배너가 늘면 여기에 추가하면 넘기기·"1 / 2" 표시가 동작한다
const BANNERS = [
  {
    title: 'SOL글로벌 입출금통장',
    desc: '해외송금 환율 및 수수료 50%우대, ATM출금 수수료 면제, 단체 상해보험을 제공 받을 수 있어요.',
  },
];

const TABS = [
  { label: '홈', icon: IMG.tabHome, on: true },
  { label: '상품', icon: IMG.tabProduct, on: false },
  { label: '전체메뉴', icon: IMG.tabMenu, on: false },
];

const preparing = () => Alert.alert('준비 중', '곧 사용할 수 있어요.');

// 데모 초기화 확인 창 문구. 범위는 backend Swagger(POST /demo/reset) 설명 기준
const RESET_TITLE = '데모 계정 초기화';
const RESET_MESSAGE =
  '온보딩·등록증·E-7-4·비자 로드맵 기록을 지우고 금융 목표·고정 지출·목표 환율 알림을 취소한 뒤 처음 화면으로 돌아갑니다. 마이데이터와 금융 분석은 그대로 둬요.';

export default function SolGlobalHome() {
  const insets = useSafeAreaInsets();
  const setToken = useAuthStore((s) => s.setToken);
  const [entering, setEntering] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [showBubble, setShowBubble] = useState(true);
  const [page, setPage] = useState(0);
  const busy = entering || resetting; // 진입·초기화가 겹치지 않게 두 버튼을 함께 막는다

  // AI 버튼: 신한걸음 진입 (SOL 로그인 완료 전제, 진입 토큰으로 JWT 발급)
  const enterShinhan = async () => {
    if (busy) return;
    setEntering(true);
    try {
      const entryRes = await entry(ENTRY_TOKEN);
      setToken(entryRes.accessToken);
      const me = await getMe();
      if (me.onboarding.completed) {
        router.push('/chat' as Href);
      } else {
        const target = me.onboarding.currentStep
          ? getRouteFromStepCode(me.onboarding.currentStep)
          : '/onboarding/language';
        router.push(target as Href);
      }
    } catch (e) {
      Alert.alert('신한걸음을 열 수 없어요', errorText(e, '잠시 후 다시 시도해 주세요.'));
    } finally {
      setEntering(false);
    }
  };

  // 데모 계정 초기화. 초기화 뒤 서버 온보딩은 첫 단계(NOT_STARTED)라 users/me 없이 ON-001 로 간다.
  // 403·404(데모 계정 아님·서버에서 꺼짐)는 토스트, 그 밖의 오류는 공통 오류 문구. 실패하면 앱 상태는 그대로 둔다
  const runDemoReset = async () => {
    if (busy) return;
    setResetting(true);
    try {
      const result = await resetDemoAccount();
      if (result.status === 'done') {
        router.push('/onboarding/language' as Href);
        showToast('초기화했어요');
      } else if (result.status === 'unavailable') {
        showToast('지금은 초기화할 수 없어요');
      } else if (result.status === 'failed') {
        Alert.alert('초기화하지 못했어요', errorText(result.error, '잠시 후 다시 시도해 주세요.'));
      }
    } finally {
      setResetting(false);
    }
  };

  const onLogoTripleTap = useMultiTap(async () => {
    if (busy) return;
    const ok = await confirmDialog({
      title: RESET_TITLE,
      message: RESET_MESSAGE,
      cancelText: '취소',
      confirmText: '초기화',
      destructive: true,
    });
    if (ok) runDemoReset();
  });

  const banner = BANNERS[page];
  const movePage = (delta: number) =>
    setPage((p) => (p + delta + BANNERS.length) % BANNERS.length);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* 헤더: SOL Global + AI 버튼(쏠) · 언어 · 상담 · 알림 */}
      <View style={styles.header}>
        {/* 데모 토큰이 아니면 탭을 받지 않는다(일반 텍스트 그대로) */}
        <Text style={styles.logo} onPress={isDemoAccount ? onLogoTripleTap : undefined} suppressHighlighting>
          SOL Global
        </Text>
        <View style={styles.headerActions}>
          <View>
            <Pressable
              style={styles.aiButton}
              onPress={enterShinhan}
              disabled={busy}
              accessibilityRole="button"
              accessibilityLabel="신한걸음 AI 시작하기"
            >
              {entering ? (
                <ActivityIndicator color={colors.primary} />
              ) : (
                <Image source={IMG.sol} style={styles.solFace} contentFit="contain" />
              )}
              <View style={styles.aiBadge}>
                <Text style={styles.aiBadgeText}>AI</Text>
              </View>
            </Pressable>

            {/* AI 안내 말풍선. X 로 닫으면 이번 실행 동안 숨김 */}
            {showBubble ? (
              <View style={styles.bubbleWrap} pointerEvents="box-none">
                <View style={styles.bubbleArrowWrap}>
                  <Image source={IMG.bubbleArrow} style={styles.bubbleArrow} />
                </View>
                <View style={styles.bubble}>
                  <Text style={styles.bubbleText} numberOfLines={1}>쏠과 함께 시작하는 신한걸음</Text>
                  <Pressable style={styles.bubbleClose} onPress={() => setShowBubble(false)} hitSlop={10}>
                    <Image source={IMG.bubbleClose} style={styles.bubbleCloseIcon} />
                  </Pressable>
                </View>
              </View>
            ) : null}
          </View>
          <Pressable onPress={preparing} hitSlop={6}>
            <Image source={IMG.language} style={styles.icon26} />
          </Pressable>
          <Pressable onPress={preparing} hitSlop={6}>
            <Image source={IMG.headset} style={styles.icon26} />
          </Pressable>
          <Pressable onPress={preparing} hitSlop={6}>
            <Image source={IMG.bell} style={styles.icon26} />
          </Pressable>
        </View>
      </View>

      <ScrollView style={styles.flex} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* 배너 */}
        <View style={styles.banner}>
          <View style={styles.illust}>
            <Image source={IMG.globe} style={styles.globe} />
            <Image source={IMG.coinWon} style={styles.coinWon} />
            <Text style={styles.coinWonText}>₩</Text>
            <Image source={IMG.coinDollar} style={styles.coinDollar} />
            <Text style={styles.coinDollarText}>$</Text>
          </View>
          <Text style={styles.bannerTitle}>{banner.title}</Text>
          <Text style={styles.bannerDesc}>{banner.desc}</Text>
          <View style={styles.pagerRow}>
            <View style={styles.pager}>
              <Pressable onPress={() => movePage(-1)} hitSlop={8}>
                <Image source={IMG.chevronLeft} style={styles.icon10} />
              </Pressable>
              <Text style={styles.pagerText}>{`${page + 1} / ${BANNERS.length}`}</Text>
              <Pressable onPress={() => movePage(1)} hitSlop={8}>
                <Image source={IMG.chevronRightSmall} style={styles.icon10} />
              </Pressable>
            </View>
            {/* 자동 넘김 일시정지: 배너가 2장 이상일 때 연결 */}
            <Image source={IMG.pause} style={styles.icon26} />
          </View>
        </View>

        {/* 영업점 찾기 */}
        <Pressable style={styles.branchCard} onPress={preparing}>
          <Image source={IMG.pin} style={styles.icon26} />
          <View style={styles.branchText}>
            <Text style={styles.branchTitle}>영업점 찾기</Text>
            <Text style={styles.branchSub}>내 주변 가까운 신한은행 찾기</Text>
          </View>
          <Image source={IMG.chevronRight} style={styles.icon20} />
        </Pressable>
      </ScrollView>

      {/* SOL 앱 탭 모양 (화면 전환 없음: 홈은 현재 화면, 나머지는 준비 중) */}
      <View style={[styles.tabBar, { paddingBottom: Math.max(insets.bottom, spacing.md) }]}>
        {TABS.map((t) => (
          <Pressable key={t.label} style={styles.tab} onPress={t.on ? undefined : preparing}>
            <Image source={t.icon} style={styles.icon26} />
            <Text style={[styles.tabLabel, t.on ? styles.tabLabelOn : styles.tabLabelOff]}>{t.label}</Text>
          </Pressable>
        ))}
      </View>
    </SafeAreaView>
  );
}

const S = colors.solHome;

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: S.bg },
  flex: { flex: 1 },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xl,
    paddingVertical: 10,
    zIndex: 10, // 말풍선이 배너 위에 보이도록
  },
  logo: { fontFamily: fonts.bold, fontSize: 27, letterSpacing: -0.54, color: S.title },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },

  aiButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 2,
    borderColor: colors.surface,
    backgroundColor: S.aiButton,
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0px 2px 3px rgba(0, 70, 255, 0.22)',
  },
  solFace: { width: 36, height: 36 },
  aiBadge: {
    position: 'absolute',
    left: 27,
    top: 29,
    backgroundColor: colors.primary,
    borderWidth: 1.5,
    borderColor: colors.surface,
    borderRadius: 7,
    paddingHorizontal: 4,
    paddingVertical: 1,
  },
  aiBadgeText: { fontFamily: fonts.bold, fontSize: 9, color: colors.text.inverse },

  // 말풍선 자리. 부모(AI 버튼, 42px) 폭에 갇히면 글자가 세로로 줄바꿈되므로 자리 폭을 따로 준다
  bubbleWrap: {
    position: 'absolute',
    left: -1,
    top: 43,
    width: 200,
  },
  bubbleArrowWrap: { paddingLeft: 15, marginBottom: -1 },
  bubbleArrow: { width: 14, height: 8 },
  bubble: {
    alignSelf: 'flex-start', // 글자 길이만큼만
    backgroundColor: colors.primary,
    borderRadius: 9,
    paddingLeft: 10,
    paddingRight: 19,
    paddingVertical: 6,
    boxShadow: '0px 4px 5px rgba(0, 70, 255, 0.25)',
  },
  bubbleText: { fontFamily: fonts.medium, fontSize: 11, color: colors.text.inverse },
  bubbleClose: { position: 'absolute', right: 6, top: 5 },
  bubbleCloseIcon: { width: 7, height: 7 },

  icon10: { width: 10, height: 10 },
  icon20: { width: 20, height: 20 },
  icon26: { width: 26, height: 26 },

  content: { paddingTop: spacing.sm, paddingHorizontal: spacing.lg, gap: spacing.md, paddingBottom: spacing.lg },

  banner: {
    backgroundColor: S.banner,
    borderRadius: 20,
    paddingTop: 18,
    paddingBottom: 14,
    paddingHorizontal: 14,
    alignItems: 'center',
    overflow: 'hidden',
  },
  // 일러스트: Figma 좌표 그대로 (동전 SVG 는 그림자 여백만큼 박스보다 커서 그만큼 위치 보정)
  illust: { width: 180.4, height: 145.96, marginBottom: 10 },
  globe: { position: 'absolute', left: 0, top: 0, width: 180.4, height: 145.96 },
  coinWon: { position: 'absolute', left: 54.12, top: 22.14, width: 50.84, height: 50.84 },
  coinWonText: { position: 'absolute', left: 73.39, top: 33.21, fontFamily: fonts.bold, fontSize: 19.68, color: S.coinWon },
  coinDollar: { position: 'absolute', left: 75.44, top: 43.46, width: 55.76, height: 55.76 },
  coinDollarText: { position: 'absolute', left: 95.94, top: 55.35, fontFamily: fonts.bold, fontSize: 22.14, color: S.coinDollar },
  bannerTitle: { fontFamily: fonts.bold, fontSize: 24, color: colors.text.inverse, textAlign: 'center', marginBottom: 6 },
  bannerDesc: {
    fontFamily: fonts.medium,
    fontSize: 13,
    lineHeight: 21,
    color: S.bannerSub,
    textAlign: 'center',
    maxWidth: 316,
    marginBottom: 14,
  },
  pagerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 6, alignSelf: 'stretch' },
  pager: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: S.pager,
    borderRadius: 14,
    paddingHorizontal: 9,
    paddingVertical: 4,
  },
  pagerText: { fontFamily: fonts.bold, fontSize: 13, color: colors.text.inverse },

  branchCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: S.cardBorder,
    borderRadius: radius.xl,
    paddingVertical: 16,
    paddingLeft: 16,
    paddingRight: 14,
    boxShadow: '0px 2px 8px rgba(26, 31, 39, 0.04)',
  },
  branchText: { flex: 1, gap: 4 },
  branchTitle: { fontFamily: fonts.bold, fontSize: 16, color: S.title },
  branchSub: { fontFamily: fonts.medium, fontSize: 13, color: S.sub },

  tabBar: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: S.tabBorder,
    paddingTop: 10,
  },
  tab: { flex: 1, alignItems: 'center', gap: 4 },
  tabLabel: { fontSize: 11 },
  tabLabelOn: { fontFamily: fonts.bold, color: S.tabOn },
  tabLabelOff: { fontFamily: fonts.medium, color: S.tabOff },
});
