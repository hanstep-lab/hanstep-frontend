// 국적별 환영 화면. ON-006 "시작하기" 뒤, 환영 설정이 있는 국적(지금은 필리핀)만 챗봇 전에 한 번 본다.
// 연출(약 2.5초): 쏠이 화면 왼쪽에서 들어와 손 흔듦(GIF, 계속 반복) → "Mabuhay, 이름!" 아래에서 떠오름 → 환영 문구 → 시작하기 버튼
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
import { countryWelcome, greetingWithName } from '../constants/countryWelcome';
import { useOnboardingStore } from '../store/onboardingStore';
import { firstName } from '../utils/name';
import { colors, typography, spacing, fonts } from '../constants/theme';

// 연출 시간표 (ms). 시작 시각 기준. 쏠 GIF 는 들어오자마자 재생되고, 손 흔들기가 끝날 즈음 제목이 떠오른다
const TITLE = { delay: 1400, duration: 500 };
const MESSAGE = { delay: 1750, duration: 450 };
const CTA = { delay: 2100, duration: 400 };

// 쏠 인사 GIF (296×313, 16장·1.76초 반복). 쏠이 그림 왼쪽 끝에서 들어와 손 흔들고 다시 나간다.
// 가운데에 두면 화면 한가운데의 보이지 않는 선에서 나타나 보여서, 그림 왼쪽 끝을 화면 왼쪽 끝에 붙인다
const SOL_HI = require('../../assets/images/welcome/sol-say-hi.gif');
const SOL_HI_STILL = require('../../assets/images/welcome/sol-say-hi-still.png'); // 동작 줄이기용: 같은 GIF 의 손 든 장면
const SOL_WIDTH = 240;
const SOL_ASPECT = 296 / 313;

const goChat = () => router.replace('/chat' as Href);

export default function WelcomeScreen() {
  const { t } = useTranslation();
  const reduceMotion = useReducedMotion();
  const profile = useOnboardingStore((s) => s.welcomeProfile);
  const welcome = countryWelcome(profile?.nationalityCode);

  // 0 → 1 진행값. 동작 줄이기면 처음부터 1(다 보인 상태)
  const start = reduceMotion ? 1 : 0;
  const title = useSharedValue(start);
  const message = useSharedValue(start);
  const cta = useSharedValue(start);

  useEffect(() => {
    if (reduceMotion) return;
    const run = (v: SharedValue<number>, delay: number, duration: number) => {
      v.value = withDelay(delay, withTiming(1, { duration, easing: Easing.out(Easing.cubic) }));
    };
    run(title, TITLE.delay, TITLE.duration);
    run(message, MESSAGE.delay, MESSAGE.duration);
    run(cta, CTA.delay, CTA.duration);
    // 화면에 들어올 때 한 번만 재생
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
        <View style={styles.sol} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
          <Image
            source={reduceMotion ? SOL_HI_STILL : SOL_HI}
            style={styles.solImage}
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
  // 그림 왼쪽 끝을 화면 왼쪽 끝에 붙인다 (body 좌우 여백만큼 왼쪽으로)
  sol: { width: SOL_WIDTH, aspectRatio: SOL_ASPECT, alignSelf: 'flex-start', marginLeft: -spacing.xl, marginBottom: spacing.md },
  solImage: { width: '100%', height: '100%' },

  titleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  flag: { width: 28, height: 28 },
  title: { ...typography.display, color: colors.text.strong, flexShrink: 1 },
  message: { ...typography.subtitle, fontFamily: fonts.medium, color: colors.text.sub, textAlign: 'center' },

  footer: { paddingHorizontal: spacing.xl, paddingBottom: spacing.lg },
});
