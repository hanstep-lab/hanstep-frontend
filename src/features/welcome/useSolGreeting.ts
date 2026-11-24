// SOL 홈 쏠 인사 연출. 홈에 들어올 때마다(화면 포커스) 한 번 재생하고, play() 로 다시 재생한다.
//   쏠: 살짝 튀어 오르며 좌우로 흔들림 / 말풍선: 페이드인 → SHOW_MS 뒤 페이드아웃
// enabled 가 false 면 아무것도 하지 않는다(기존 홈 그대로).
// 시스템 '동작 줄이기'면 쏠은 움직이지 않고 말풍선은 바로 나타났다 바로 사라진다.

import { useCallback, useRef, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

const SHOW_MS = 4000; // 말풍선이 떠 있는 시간 (페이드아웃 포함 전)
const FADE_MS = 300;

export function useSolGreeting(enabled: boolean) {
  const reduceMotion = useReducedMotion();
  const [visible, setVisible] = useState(false);
  const bubble = useSharedValue(0); // 말풍선 투명도
  const hop = useSharedValue(0); // 쏠 위아래(px)
  const tilt = useSharedValue(0); // 쏠 기울기(deg)
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  const clearTimers = () => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
  };

  const play = useCallback(() => {
    if (!enabled) return;
    clearTimers();
    setVisible(true);

    if (reduceMotion) {
      bubble.value = 1;
    } else {
      bubble.value = 0;
      bubble.value = withTiming(1, { duration: FADE_MS });
      hop.value = withSequence(
        withTiming(-8, { duration: 180, easing: Easing.out(Easing.quad) }),
        withTiming(0, { duration: 260, easing: Easing.bounce }),
      );
      tilt.value = withSequence(
        withTiming(-12, { duration: 100 }),
        withTiming(12, { duration: 180 }),
        withTiming(-7, { duration: 150 }),
        withTiming(0, { duration: 120 }),
      );
    }

    timers.current.push(
      setTimeout(() => {
        if (reduceMotion) {
          bubble.value = 0;
          setVisible(false);
          return;
        }
        bubble.value = withTiming(0, { duration: FADE_MS });
        timers.current.push(setTimeout(() => setVisible(false), FADE_MS));
      }, SHOW_MS),
    );
    // shared value 는 같은 객체라 의존성에 넣지 않는다
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, reduceMotion]);

  // 홈에 들어올 때마다 재생, 떠날 때 정리
  useFocusEffect(
    useCallback(() => {
      play();
      return () => {
        clearTimers();
        bubble.value = 0;
        setVisible(false);
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [play]),
  );

  const solStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: hop.value }, { rotate: `${tilt.value}deg` }],
  }));
  const bubbleStyle = useAnimatedStyle(() => ({ opacity: bubble.value }));

  return { visible: enabled && visible, play, solStyle, bubbleStyle };
}
