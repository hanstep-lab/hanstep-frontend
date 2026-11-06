

import { View, Text, StyleSheet } from 'react-native';
import { colors, typography, spacing, radius } from '../constants/theme';

// UI 컴포넌트 - 온보딩 단계 배지 
type StepBadgeProps = {
  label:string;
};

export default function StepBadge({ label }: StepBadgeProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignSelf: 'flex-start', // 영역은 글자 길이만큼만
    backgroundColor: colors.primarySoft,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.full,
  },
  label: { ...typography.badge, color: colors.primary },
});