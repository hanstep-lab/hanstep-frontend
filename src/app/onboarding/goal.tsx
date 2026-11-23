// ON-004 금융 목표 선택. 들어올 때 저장된 목표(GOL-01)를 불러와 체크해 두고,
// 다음: PUT /goals(GOL-02, 전체 교체) → POST /steps/GOALS

import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View, Text, Pressable, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Header from '../../components/Header';
import Button from '../../components/Button';
import { useOnboardingStep } from '../../hooks/useOnboardingStep';
import OnboardingProgress from '../../components/OnboardingProgress';
import { getGoals, saveGoals } from '../../api/goals';
import { colors, typography, spacing, radius } from '../../constants/theme';
import { GOALS } from '../../constants/goals';
import type { GoalResponse, GoalType } from '../../types/api';

export default function GoalScreen() {
  const { goNext, isNavigating, navError, stage, totalStages } = useOnboardingStep();
  const { t } = useTranslation();
  const [selected, setSelected] = useState<Set<GoalType>>(new Set());
  // 서버에 저장돼 있던 목표. 다시 저장할 때 목표 금액·시점(ON-005 에서 입력)을 지우지 않으려고 들고 있음
  const [savedGoals, setSavedGoals] = useState<GoalResponse[]>([]);
  // 저장된 목표를 불러오기 전에는 카드·다음 버튼을 막는다.
  // 막지 않으면 (1) 불러오기 전에 저장해서 목돈 금액·시점이 지워지고 (2) 늦게 온 응답이 사용자 선택을 덮어씀
  const [loaded, setLoaded] = useState(false);

  // 처음 들어올 때 저장된 목표를 체크해 둔다.
  // 실패하면 빈 선택으로 진행 허용 (이때 저장하면 목돈 금액이 비지만, 바로 다음 ON-005 에서 다시 입력함)
  useEffect(() => {
    let cancelled = false;
    getGoals()
      .then((res) => {
        if (cancelled) return;
        setSavedGoals(res.goals);
        setSelected(new Set(res.goals.map((g) => g.goalType)));
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // 고른 목표 전체를 저장(전체 교체). 이미 있던 목표는 금액·시점을 그대로 다시 보낸다
  const save = async () => {
    const goals = GOALS.filter((g) => selected.has(g.key)).map((g) => {
      const prev = savedGoals.find((s) => s.goalType === g.key);
      return {
        goalType: g.key,
        targetAmount: prev?.targetAmount ?? null,
        targetDate: prev?.targetDate ?? null,
      };
    });
    await saveGoals({ goals });
  };

  const toggle = (key: GoalType) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const count = selected.size;

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <Header title={t('common.appName')} showBack />

      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.progressWrap}>
          <OnboardingProgress current={stage} total={totalStages} />
        </View>

        <View style={styles.titleArea}>
          <Text style={styles.title}>{t('onboarding.goal.title')}</Text>
          <Text style={styles.subtitle}>{t('onboarding.goal.subtitle')}</Text>
        </View>

        <View style={styles.cardList}>
          {GOALS.map((goal) => {
            const on = selected.has(goal.key);
            return (
              <Pressable
                key={goal.key}
                style={[styles.card, on ? styles.cardOn : styles.cardOff]}
                onPress={() => toggle(goal.key)}
                disabled={!loaded}
              >
                <View style={styles.cardLeft}>
                  <View style={styles.cardTitleRow}>
                    <Text style={[styles.cardLabel, on ? styles.labelOn : styles.labelOff]}>
                      {t(`goals.${goal.key}.label`)}
                    </Text>
                    {goal.tag && (
                      <View style={[styles.tagPill, on ? styles.tagPillOn : styles.tagPillOff]}>
                        <Text style={[styles.tagText, on ? styles.tagTextOn : styles.tagTextOff]}>
                          {t(`goalTags.${goal.tag}`)}
                        </Text>
                      </View>
                    )}
                  </View>
                  <Text style={[styles.cardDesc, on ? styles.descOn : styles.descOff]}>
                    {t(`goals.${goal.key}.desc`)}
                  </Text>
                </View>
                <View style={[styles.checkCircle, on ? styles.checkOn : styles.checkOff]}>
                  <Ionicons
                    name="checkmark"
                    size={14}
                    color={on ? colors.text.inverse : colors.border}
                  />
                </View>
              </Pressable>
            );
          })}
        </View>

        <View style={styles.helperNote}>
          <Ionicons name="information-circle-outline" size={18} color={colors.text.sub} style={{ marginTop: 1 }} />
          <Text style={styles.helperText}>{t('onboarding.goal.helper')}</Text>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        {navError ? <Text style={styles.navError}>{navError}</Text> : null}
        <Button
          title={
            isNavigating
              ? t('common.processing')
              : !loaded
                ? t('onboarding.goal.loadingSaved')
                : count > 0
                ? t('onboarding.goal.done', { n: count })
                : t('onboarding.goal.choose')
          }
          showArrow={!isNavigating && count > 0}
          onPress={() => goNext(save)}
          disabled={!loaded || count === 0 || isNavigating}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  scroll: { flex: 1 },
  content: { paddingHorizontal: spacing.xl, paddingBottom: spacing.xl, gap: spacing.xl },

  progressWrap: { paddingTop: spacing.md },

  titleArea: { gap: 6 },
  title: { ...typography.h2, color: colors.text.strong },
  subtitle: { ...typography.body, color: colors.text.sub },

  cardList: { gap: spacing.md },
  card: {
    borderRadius: radius.xl,
    padding: spacing.lg,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    overflow: 'hidden',
  },
  cardOn:  { backgroundColor: colors.primary },
  cardOff: { backgroundColor: colors.surface },

  cardLeft: { flex: 1, gap: 2 },
  cardTitleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },

  cardLabel: { ...typography.h3 },
  labelOn:   { color: colors.text.inverse },
  labelOff:  { color: colors.text.strong },

  cardDesc: { ...typography.body },
  descOn:   { color: colors.onColor.sub },
  descOff:  { color: colors.text.sub },

  tagPill: { paddingHorizontal: spacing.sm, paddingVertical: 2, borderRadius: radius.full },
  tagPillOn:  { backgroundColor: colors.onColor.fill },
  tagPillOff: { backgroundColor: colors.background },
  tagText: { ...typography.badge },
  tagTextOn:  { color: colors.text.inverse },
  tagTextOff: { color: colors.text.sub },

  checkCircle: {
    width: 28,
    height: 28,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkOn:  { backgroundColor: colors.onColor.fill },
  checkOff: { backgroundColor: colors.background },

  helperNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: colors.background,
    borderRadius: radius.lg,
    padding: 14,
  },
  helperText: { ...typography.body, color: colors.text.sub, flex: 1 },

  footer: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    backgroundColor: colors.background,
  },
  navError: { ...typography.body, color: colors.errorText, textAlign: 'center', marginBottom: spacing.sm },
});
