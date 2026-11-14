// 값 하나를 고르는 가로 슬라이더 (FX-002 목표 환율). 외부 패키지 없이 PanResponder 로 만든다.
// min·max·step 은 서버(Mock)가 준 값을 그대로 받는다. 여기서는 손가락 위치를 값으로 바꾸는 것만 한다.
import { useRef, useState } from 'react';
import { View, PanResponder, StyleSheet, type LayoutChangeEvent } from 'react-native';
import { colors, radius, shadow } from '../constants/theme';

type RangeSliderProps = {
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
};

const THUMB = 20;

// step 의 소수 자리 수 (0.05 → 2, 1 → 0). 부동소수 오차 정리용
const decimalsOf = (step: number) => (String(step).split('.')[1] ?? '').length;

export default function RangeSlider({ value, min, max, step, onChange }: RangeSliderProps) {
  const [width, setWidth] = useState(0);

  // PanResponder 는 한 번만 만들기 때문에 최신 값은 ref 로 읽는다
  const latest = useRef({ width, min, max, step, onChange, value });
  latest.current = { width, min, max, step, onChange, value };

  const emit = (x: number) => {
    const { width: w, min: lo, max: hi, step: st, onChange: cb, value: prev } = latest.current;
    if (w <= 0 || hi <= lo) return;
    const ratio = Math.min(Math.max(x / w, 0), 1);
    const raw = lo + ratio * (hi - lo);
    const next = Number((Math.round((raw - lo) / st) * st + lo).toFixed(decimalsOf(st)));
    if (next !== prev) cb(Math.min(Math.max(next, lo), hi));
  };

  const responder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderTerminationRequest: () => false, // 세로 스크롤이 손가락을 가져가지 않게
      onPanResponderGrant: (e) => emit(e.nativeEvent.locationX),
      onPanResponderMove: (e) => emit(e.nativeEvent.locationX),
    }),
  ).current;

  const onLayout = (e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width);
  const ratio = max > min ? (Math.min(Math.max(value, min), max) - min) / (max - min) : 0;
  const nudge = (dir: 1 | -1) => {
    const next = Number((value + dir * step).toFixed(decimalsOf(step)));
    if (next >= min && next <= max) onChange(next);
  };

  return (
    <View
      style={s.touch}
      onLayout={onLayout}
      accessibilityRole="adjustable"
      accessibilityValue={{ min, max, now: value }}
      accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
      onAccessibilityAction={(e) => nudge(e.nativeEvent.actionName === 'increment' ? 1 : -1)}
      {...responder.panHandlers}
    >
      {/* 자식이 터치를 받으면 locationX 기준이 바뀌므로 막아 둔다 */}
      <View style={s.track} pointerEvents="none">
        <View style={[s.fill, { width: `${ratio * 100}%` }]} />
      </View>
      {width > 0 && (
        <View pointerEvents="none" style={[s.thumb, { left: ratio * width - THUMB / 2 }]} />
      )}
    </View>
  );
}

const s = StyleSheet.create({
  touch: { height: 28, justifyContent: 'center' },
  track: { height: 8, borderRadius: radius.md, backgroundColor: colors.background, overflow: 'hidden' },
  fill: { height: '100%', backgroundColor: colors.primary },
  thumb: {
    position: 'absolute',
    width: THUMB,
    height: THUMB,
    borderRadius: radius.full,
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.primary,
    ...shadow.button,
  },
});
