import { Fragment } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, fonts, typography, spacing, radius } from '../constants/theme';

type OnboardingProgressProps = { current: number; total: number };

export default function OnboardingProgress({ current, total }: OnboardingProgressProps) {
  return (
    <View style={styles.row}>
      <View style={styles.steps}>
        {Array.from({ length: total }, (_, i) => {
          const step = i + 1;
          const isDone = step < current;      // 지난 단계
          const isCurrent = step === current; // 지금 단계

          return (
            <Fragment key={step}>
              {/* 단계 사이 연결선*/}
              {i > 0 && <View style={[styles.line, step <= current && styles.lineActive]} />}

              {/* 단계 동그라미 */}
              <View style={[styles.dot, (isDone || isCurrent) && styles.dotActive]}>
                {isCurrent && <View style={styles.dotInner} />}
              </View>
            </Fragment>
          );
        })}
      </View>
      <Text style={styles.label}>{current} / {total} 단계</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  steps: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  dot: {
    width: 10,
    height: 10,
    borderRadius: radius.full,
    backgroundColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dotActive: { backgroundColor: colors.primary },
  dotInner: { width: 4, height: 4, borderRadius: radius.full, backgroundColor: colors.surface }, // 현재 단계 가운데 흰 점
  line: { width: 32, height: 4, borderRadius: radius.full, backgroundColor: colors.border },
  lineActive: { backgroundColor: colors.primary },
  label: { ...typography.body, fontFamily: fonts.bold, color: colors.primary },
});