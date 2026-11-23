// 불러오는 동안 내용 자리에 보여 주는 회색 상자(스켈레톤)와, 불러온 내용을 부드럽게 나타나게 하는 FadeIn.
// "○○을 불러오는 중이에요" 문구 대신 실제 화면 모양을 미리 보여 줘서, 내용이 뚝 끊기며 바뀌는 느낌을 줄인다.
import { useEffect, useRef, type ReactNode } from 'react';
import { Animated, View, StyleSheet, type DimensionValue, type StyleProp, type ViewStyle } from 'react-native';
import { colors, radius, shadow, spacing } from '../constants/theme';

const SKELETON_COLOR = '#E6EBF2'; // 바탕(#F3F6FB)·카드(흰색) 어디서든 보이는 옅은 회청색

// 모든 상자가 같은 박자로 깜빡이도록 값 하나를 함께 쓴다. 화면에 상자가 하나라도 있을 때만 돈다
const pulse = new Animated.Value(0);
const pulseOpacity = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 0.4] });
let pulseUsers = 0;
let pulseLoop: Animated.CompositeAnimation | null = null;

function usePulse() {
  useEffect(() => {
    pulseUsers += 1;
    if (pulseUsers === 1) {
      pulse.setValue(0);
      pulseLoop = Animated.loop(
        Animated.sequence([
          Animated.timing(pulse, { toValue: 1, duration: 750, useNativeDriver: true }),
          Animated.timing(pulse, { toValue: 0, duration: 750, useNativeDriver: true }),
        ]),
      );
      pulseLoop.start();
    }
    return () => {
      pulseUsers -= 1;
      if (pulseUsers === 0) {
        pulseLoop?.stop();
        pulseLoop = null;
      }
    };
  }, []);
}

type SkeletonProps = {
  width?: DimensionValue;
  height?: number;
  round?: number; // 모서리 둥글기 (기본 radius.sm)
  style?: StyleProp<ViewStyle>;
};

// 회색 상자 하나 (글자 줄·숫자·그래프 자리)
export function Skeleton({ width = '100%', height = 14, round = radius.sm, style }: SkeletonProps) {
  usePulse();
  return (
    <Animated.View
      style={[{ width, height, borderRadius: round, backgroundColor: SKELETON_COLOR, opacity: pulseOpacity }, style]}
    />
  );
}

const LINE_WIDTHS: DimensionValue[] = ['100%', '82%', '64%'];

// 흰 카드 모양: 제목 줄 + 본문 줄(lines 개). block 을 주면 그 높이의 큰 상자(그래프·금액 자리)를 제목 아래에 둔다
export function SkeletonCard({
  lines = 2,
  block,
  style,
}: {
  lines?: number;
  block?: number;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View style={[styles.card, style]}>
      <Skeleton width="42%" height={18} />
      {block != null ? <Skeleton height={block} round={radius.md} /> : null}
      {Array.from({ length: lines }, (_, i) => (
        <Skeleton key={i} width={LINE_WIDTHS[i % LINE_WIDTHS.length]} height={12} />
      ))}
    </View>
  );
}

// 스켈레톤 묶음. 화면 낭독기에는 "불러오는 중" 하나로 읽힌다
export function SkeletonGroup({ children, gap = spacing.lg }: { children: ReactNode; gap?: number }) {
  return (
    <View style={{ gap }} accessible accessibilityRole="progressbar" accessibilityLabel="불러오는 중">
      {children}
    </View>
  );
}

// 처음 그려질 때 0.25초 동안 서서히 나타나며 살짝 올라온다 (불러온 내용을 감쌀 때)
export function FadeIn({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const v = useRef(new Animated.Value(0)).current;
  const translateY = useRef(v.interpolate({ inputRange: [0, 1], outputRange: [8, 0] })).current;
  useEffect(() => {
    Animated.timing(v, { toValue: 1, duration: 250, useNativeDriver: true }).start();
  }, [v]);
  return <Animated.View style={[style, { opacity: v, transform: [{ translateY }] }]}>{children}</Animated.View>;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.xl,
    gap: spacing.md,
    ...shadow.card,
  },
});
