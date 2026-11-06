import { View, Text, StyleSheet } from 'react-native';
import { colors, fonts, typography, spacing, radius } from '../constants/theme';

type OnboardingProgressProps = { current: number; total: number };

export default function OnboardingProgress({ current, total }: OnboardingProgressProps) {
  return (
    <View style={styles.row}>
      <View style={styles.dots}>
        {Array.from({ length: total }, (_, i) => (
          <View key={i} style={[styles.dot, i + 1 === current && styles.active]} />
        ))}
      </View>
      <Text style={styles.label}>{current} / {total} 단계</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  dots: { flexDirection: 'row', gap: spacing.xs },
  dot: { width: 8, height: 8, borderRadius: radius.full, backgroundColor: colors.border },
  active: { width: 24, backgroundColor: colors.primary }, // 현재 단계만 긴 알약
  label: { ...typography.caption, fontFamily: fonts.bold, color: colors.primary },
});