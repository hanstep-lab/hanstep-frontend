// 온보딩 진행 표시 (온보딩 전 화면 공통). 디자인은 ON-005(Figma) 기준: 점 + 연결선, 현재 단계는 흰 점이 든 큰 원, 숫자는 pill.
// current·total 은 useOnboardingStep 의 stage·totalStages 를 넘긴다(화면에 숫자를 직접 쓰지 않음).
// sub: 1단계처럼 한 단계에 화면이 여러 개일 때, 아래 줄에 지금 세부 화면 이름 + 작은 점(지나온·지금·남은)을 보여 준다.
import { Fragment } from 'react';
import { useTranslation } from 'react-i18next';
import { View, Text, StyleSheet } from 'react-native';
import { colors, fonts, typography, radius, spacing } from '../constants/theme';
import { STAGE1_SUBSTEPS, type Stage1SubStep } from '../constants/onboardingSteps';

type OnboardingProgressProps = { current: number; total: number; sub?: Stage1SubStep };

export default function OnboardingProgress({ current, total, sub }: OnboardingProgressProps) {
  const { t } = useTranslation();
  const subIndex = sub ? STAGE1_SUBSTEPS.indexOf(sub) : -1;

  return (
    <View style={styles.wrap}>
      <View style={styles.row}>
        <View style={styles.steps}>
          {Array.from({ length: total }, (_, i) => {
            const step = i + 1;
            return (
              <Fragment key={step}>
                {/* 단계 사이 연결선: 지금 단계까지 파랑 */}
                {i > 0 && <View style={[styles.line, step <= current ? styles.on : styles.off]} />}
                {step === current ? (
                  <View style={styles.current}>
                    <View style={styles.currentInner} />
                  </View>
                ) : (
                  <View style={[styles.dot, step < current ? styles.on : styles.off]} />
                )}
              </Fragment>
            );
          })}
        </View>
        <View style={styles.pill}>
          <Text style={styles.num}>{current}</Text>
          <Text style={styles.total}>{t('onboarding.progressTotal', { total })}</Text>
        </View>
      </View>

      {sub ? (
        <View style={styles.subRow}>
          <Text style={styles.subLabel}>{t(`onboarding.substep.${sub}`)}</Text>
          <View style={styles.subDots}>
            {STAGE1_SUBSTEPS.map((name, i) => (
              <View key={name} style={[styles.subDot, i <= subIndex ? styles.on : styles.off]} />
            ))}
          </View>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.sm },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  steps: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  dot: { width: 10, height: 10, borderRadius: radius.full },
  line: { width: 20, height: 2 },
  on: { backgroundColor: colors.primary },
  off: { backgroundColor: colors.border },
  current: {
    width: 12,
    height: 12,
    borderRadius: radius.full,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  currentInner: { width: 6, height: 6, borderRadius: radius.full, backgroundColor: colors.surface },
  pill: {
    flexDirection: 'row',
    alignItems: 'baseline',
    backgroundColor: colors.background,
    borderRadius: radius.full,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  num: { ...typography.badge, fontFamily: fonts.bold, color: colors.primary },
  total: { ...typography.badge, color: colors.text.sub },

  subRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  subLabel: { ...typography.caption, fontFamily: fonts.bold, color: colors.text.sub },
  subDots: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  subDot: { width: 6, height: 6, borderRadius: radius.full },
});
