// 국적별 환영 화면. ON-006 "시작하기" 뒤, 환영 설정이 있는 국적(지금은 필리핀)만 챗봇 전에 한 번 본다.
// 연출(약 2.5초): 뒤에서 해가 돌며 퍼짐 + 쏠이 화면 왼쪽에서 들어와 손 흔듦(GIF, 계속 반복)
//   → "Mabuhay, 이름!" 아래에서 떠오름 → 환영 문구 → 시작하기 버튼
// "건너뛰기"·"시작하기" 모두 챗봇으로 간다(replace 라 뒤로 가기로 이 화면에 돌아오지 않는다).
// 시스템 '동작 줄이기'가 켜져 있으면 처음부터 다 보이는 정지 상태로 그린다(쏠은 손 든 모습 한 장).

import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { router, type Href } from 'expo-router';
import Animated, {
  Easing,
  interpolate,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import Button from '../components/Button';
import { Sun } from '../features/welcome/FlagShapes';
import { countryWelcome, greetingWithName } from '../constants/countryWelcome';
import { useOnboardingStore } from '../store/onboardingStore';
import { firstName } from '../utils/name';
import { colors, typography, spacing, fonts } from '../constants/theme';

// 연출 시간표 (ms). 시작 시각 기준. 쏠 GIF 는 들어오자마자 재생되고, 손 흔들기가 끝날 즈음 제목이 떠오른다
const SUN = { delay: 0, duration: 900 };
const TITLE = { delay: 1400, duration: 500 };
const MESSAGE = { delay: 1750, duration: 450 };
const CTA = { delay: 2100, duration: 400 };

// 쏠 인사 GIF (296×313, 16장·1.76초 반복). 쏠이 그림 왼쪽 끝에서 들어와 손 흔들고 다시 나간다.
// 가운데에 두면 화면 한가운데의 보이지 않는 선에서 나타나 보여서, 그림 왼쪽 끝을 화면 왼쪽 끝에 붙인다
const SOL_HI = require('../../assets/images/welcome/sol-say-hi.gif');
const SOL_HI_STILL = require('../../assets/images/welcome/sol-say-hi-still.png'); // 동작 줄이기용: 같은 GIF 의 손 든 장면
const SOL_WIDTH = 240;
const SOL_HEIGHT = Math.round((SOL_WIDTH * 313) / 296);
// 쏠 뒤 배경 해 (국기 해 모양·국기 노란색). 화면 가운데에 둔다. 크기는 예전 환영 화면 해와 같다
const SUN_SIZE = 170;

const goChat = () => router.replace('/chat' as Href);

export default function WelcomeScreen() {
  const { t } = useTranslation();
  const reduceMotion = useReducedMotion();
  const profile = useOnboardingStore((s) => s.welcomeProfile);
  const welcome = countryWelcome(profile?.nationalityCode);

  // 0 → 1 진행값. 동작 줄이기면 처음부터 1(다 보인 상태)
  const start = reduceMotion ? 1 : 0;
  const sun = useSharedValue(start);
  const title = useSharedValue(start);
  const message = useSharedValue(start);
  const cta = useSharedValue(start);

  useEffect(() => {
    if (reduceMotion) return;
    const run = (v: SharedValue<number>, delay: number, duration: number) => {
      v.value = withDelay(delay, withTiming(1, { duration, easing: Easing.out(Easing.cubic) }));
    };
    run(sun, SUN.delay, SUN.duration);
    run(title, TITLE.delay, TITLE.duration);
    run(message, MESSAGE.delay, MESSAGE.duration);
    run(cta, CTA.delay, CTA.duration);
    // 화면에 들어올 때 한 번만 재생
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 해: 작게 기울어진 채로 시작해 돌면서 커진다
  const sunStyle = useAnimatedStyle(() => ({
    opacity: interpolate(sun.value, [0, 0.4, 1], [0, 1, 1]),
    transform: [
      { rotate: `${interpolate(sun.value, [0, 1], [-135, 0])}deg` },
      { scale: interpolate(sun.value, [0, 1], [0.3, 1]) },
    ],
  }));
  // 글자·버튼: 아래에서 떠오르며 나타남
  // (함수를 만들어 돌려주는 모양이라 'worklet' 을 직접 적어야 UI 스레드에서 돈다)
  const riseStyle = (v: SharedValue<number>, from: number) => () => {
    'worklet';
    return {
      opacity: v.value,
      transform: [{ translateY: interpolate(v.value, [0, 1], [from, 0]) }],
    };
  };
  const titleStyle = useAnimatedStyle(riseStyle(title, 24));
  const messageStyle = useAnimatedStyle(riseStyle(message, 16));
  const ctaStyle = useAnimatedStyle(riseStyle(cta, 12));

  // 환영 설정이 없는 국적으로 들어온 경우(직접 이동 등)는 연출 없이 바로 챗봇
  useEffect(() => {
    if (!welcome) goChat();
  }, [welcome]);
  if (!welcome) return null;

  const name = profile ? firstName(profile.displayName) : '';

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.topBar}>
        <Pressable onPress={goChat} hitSlop={12} accessibilityRole="button">
          <Text style={styles.skip}>{t('welcome.skip')}</Text>
        </Pressable>
      </View>

      <View style={styles.body}>
        {/* 뒤에 해(화면 가운데), 앞에 쏠(화면 왼쪽 끝에서 들어옴) */}
        <View style={styles.hero} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
          <Animated.View style={[styles.sun, sunStyle]}>
            <Sun size={SUN_SIZE} color={welcome.palette.sun} />
          </Animated.View>
          <Image
            source={reduceMotion ? SOL_HI_STILL : SOL_HI}
            style={styles.sol}
            contentFit="contain"
            autoplay={!reduceMotion}
          />
        </View>

        <Animated.View style={[styles.titleRow, titleStyle]}>
          <Image source={welcome.flag} style={styles.flag} />
          <Text style={styles.title}>{greetingWithName(welcome, name)}</Text>
        </Animated.View>

        <Animated.Text style={[styles.message, messageStyle]}>{t(`welcome.${welcome.textKey}.message`)}</Animated.Text>
      </View>

      <Animated.View style={[styles.footer, ctaStyle]}>
        <Button title={t('welcome.start')} showArrow onPress={goChat} />
      </Animated.View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.surface },
  topBar: { flexDirection: 'row', justifyContent: 'flex-end', paddingHorizontal: spacing.xl, paddingVertical: spacing.md },
  skip: { ...typography.bodyLg, color: colors.text.sub },

  body: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.xl, gap: spacing.lg },
  // 화면 폭 전체(body 좌우 여백만큼 바깥으로). 쏠 그림 왼쪽 끝이 화면 왼쪽 끝에 붙는다
  hero: { alignSelf: 'stretch', marginHorizontal: -spacing.xl, height: SOL_HEIGHT, marginBottom: spacing.md },
  sun: {
    position: 'absolute',
    left: '50%',
    marginLeft: -SUN_SIZE / 2,
    top: (SOL_HEIGHT - SUN_SIZE) / 2,
    width: SUN_SIZE,
    height: SUN_SIZE,
  },
  sol: { width: SOL_WIDTH, height: SOL_HEIGHT },

  titleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  flag: { width: 28, height: 28 },
  title: { ...typography.display, color: colors.text.strong, flexShrink: 1 },
  message: { ...typography.subtitle, fontFamily: fonts.medium, color: colors.text.sub, textAlign: 'center' },

  footer: { paddingHorizontal: spacing.xl, paddingBottom: spacing.lg },
});
