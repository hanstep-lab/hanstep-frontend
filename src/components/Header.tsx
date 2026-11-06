import { View, Text, Pressable, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors, typography, spacing, radius } from '../constants/theme';

// showBack: 뒤로가기 버튼 표시 여부 (안 넘기면 true)
type HeaderProps = { title: string; showBack?: boolean };

export default function Header({ title, showBack = true }: HeaderProps) {
  return (
    <View style={styles.container}>
      <View style={styles.side}>
        {showBack && (
          <Pressable onPress={() => router.back()} hitSlop={8}>
            <Ionicons name="chevron-back" size={24} color={colors.text.strong} />
          </Pressable>
        )}
      </View>

      <Text style={styles.title}>{title}</Text>

      <View style={[styles.side, styles.right]}>
        {/* 앱인앱 종료 자리. 지금은 임시로 홈 이동 */}
        <Pressable onPress={() => router.replace('/home')} hitSlop={8}>
          <Ionicons name="close" size={24} color={colors.text.strong} />
        </Pressable>
        <View style={styles.profile}>
          <Ionicons name="person" size={16} color={colors.text.inverse} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
  },
  side: { width: 72, flexDirection: 'row', alignItems: 'center' },
  right: { justifyContent: 'flex-end', gap: spacing.md },
  title: { ...typography.h3, color: colors.text.strong, flex: 1, textAlign: 'center' },
  profile: {
    width: 32,
    height: 32,
    borderRadius: radius.full,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
});