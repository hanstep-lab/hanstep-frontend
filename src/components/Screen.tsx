import { ReactNode } from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Header from './Header';
import { colors, spacing } from '../constants/theme';

type ScreenProps = {
  children: ReactNode; // 태그 사이에 넣은 내용
  footer?: ReactNode;  // 하단 고정 영역
  title?: string;
  showBack?: boolean; //뒤로가기를 위한 boolean
};

export default function Screen({ children, footer, title = '신한걸음', showBack = true }: ScreenProps) {
  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <Header title={title} showBack={showBack} />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">{children}</ScrollView>
      {footer && <View style={styles.footer}>{footer}</View>}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.xl, gap: spacing.lg },
  footer: { paddingHorizontal: spacing.xl, paddingTop: spacing.md, paddingBottom: spacing.sm },
});