// 토스트 표시. 루트 레이아웃(src/app/_layout.tsx)에 하나만 두고, 문구는 store/toastStore 의 showToast 로 띄운다.
// 2초 뒤 사라지고, 터치는 아래 화면으로 그대로 통과한다.

import { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { hideToast, useToastStore } from '../store/toastStore';
import { colors, typography, spacing, radius } from '../constants/theme';

const VISIBLE_MS = 2000;

export default function ToastHost() {
  const message = useToastStore((s) => s.message);
  const id = useToastStore((s) => s.id);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(hideToast, VISIBLE_MS);
    return () => clearTimeout(timer);
  }, [message, id]);

  if (!message) return null;

  return (
    <View pointerEvents="none" style={[styles.wrap, { bottom: insets.bottom + spacing.xxl }]}>
      <View style={styles.toast} accessibilityRole="alert" accessibilityLiveRegion="polite">
        <Text style={styles.text}>{message}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: spacing.xl, right: spacing.xl, alignItems: 'center' },
  toast: {
    backgroundColor: colors.text.strong,
    borderRadius: radius.full,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  text: { ...typography.body, color: colors.text.inverse },
});
