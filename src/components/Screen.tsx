import { ReactNode, useLayoutEffect, useRef } from 'react';
import { View, ScrollView, StyleSheet, KeyboardAvoidingView, Animated, type StyleProp, type ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Header from './Header';
import { colors, spacing } from '../constants/theme';

type ScreenProps = {
  children: ReactNode; // 태그 사이에 넣은 내용
  footer?: ReactNode;  // 하단 고정 영역
  title?: string;
  showBack?: boolean; //뒤로가기를 위한 boolean
  contentStyle?: StyleProp<ViewStyle>; // 스크롤 내용 여백·간격을 화면별로 덮어쓸 때
  loading?: boolean; // 스켈레톤을 보여 주는 중이면 true. false 로 바뀌는 순간 불러온 내용이 서서히 나타난다
};

export default function Screen({ children, footer, title = '신한걸음', showBack = true, contentStyle, loading = false }: ScreenProps) {
  // 로딩 → 내용으로 바뀔 때만 내용 영역을 0.25초 동안 서서히 보이게 (그려지기 전에 투명하게 해 두려고 LayoutEffect)
  const fade = useRef(new Animated.Value(1)).current;
  const wasLoading = useRef(loading);
  useLayoutEffect(() => {
    if (wasLoading.current && !loading) {
      fade.setValue(0);
      Animated.timing(fade, { toValue: 1, duration: 250, useNativeDriver: true }).start();
    }
    wasLoading.current = loading;
  }, [loading, fade]);

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <Header title={title} showBack={showBack} />
      {/* 키보드가 올라오면 스크롤 영역과 footer 를 키보드 높이만큼 위로 올린다(입력칸·하단 버튼이 가려지지 않게).
          iOS 는 원래 안 올려 주고, Android 도 edge-to-edge(SDK 54~)라 시스템이 화면을 줄여 주지 않아서 둘 다 padding.
          입력칸이 없는 화면은 키보드가 안 뜨므로 영향 없음 */}
      <KeyboardAvoidingView style={styles.flex} behavior="padding">
        <Animated.ScrollView
          style={[styles.flex, { opacity: fade }]}
          contentContainerStyle={[styles.content, contentStyle]}
          keyboardShouldPersistTaps="handled"
        >
          {children}
        </Animated.ScrollView>
        {footer && <View style={styles.footer}>{footer}</View>}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  flex: { flex: 1 },
  content: { padding: spacing.xl, gap: spacing.lg },
  footer: { paddingHorizontal: spacing.xl, paddingTop: spacing.md, paddingBottom: spacing.sm },
});
