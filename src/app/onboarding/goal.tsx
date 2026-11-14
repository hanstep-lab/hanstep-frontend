import { useState } from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Header from '../../components/Header';
import Button from '../../components/Button';
import { useOnboardingStep } from '../../hooks/useOnboardingStep';
import { colors, typography, spacing, radius, fonts } from '../../constants/theme';

const GOALS = [
  { key: 'SAVE',   label: '목돈 마련',      desc: '목표 금액을 체계적으로 모으고 싶어요',      tag: null },
  { key: 'REMIT',  label: '본국 송금',      desc: '가족에게 안전하고 신속하게 돈을 보내요',    tag: null },
  { key: 'BUDGET', label: '생활비 관리',    desc: '불필요한 지출을 스마트하게 줄이고 싶어요',   tag: null },
  { key: 'CREDIT', label: '신용 관리',      desc: '한국에서 안전하게 신용 점수를 쌓고 싶어요',  tag: null },
  { key: 'SETTLE', label: '장기 정착 준비', desc: '전월세 보증금 및 영주·장기 비자 준비',       tag: '비자·대출' },
];

export default function GoalScreen() {
  const { goNext, isNavigating, navError } = useOnboardingStep();
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const toggle = (key: string) => {
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
      <Header title="신한걸음" showBack />

      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.progressRow}>
          <View style={styles.dots}>
            <View style={[styles.dot, styles.dotOff]} />
            <View style={[styles.dot, styles.dotOn]} />
            <View style={[styles.dot, styles.dotOff]} />
            <View style={[styles.dot, styles.dotOff]} />
          </View>
          <Text style={styles.stepText}>2 / 4 단계</Text>
        </View>

        <View style={styles.titleArea}>
          <Text style={styles.title}>{'한국에서 이루고 싶은\n금융 목표는 무엇인가요?'}</Text>
          <Text style={styles.subtitle}>여러 개를 고를 수 있어요. 고른 목표에 따라 다음 질문이 달라져요.</Text>
        </View>

        <View style={styles.cardList}>
          {GOALS.map((goal) => {
            const on = selected.has(goal.key);
            return (
              <Pressable
                key={goal.key}
                style={[styles.card, on ? styles.cardOn : styles.cardOff]}
                onPress={() => toggle(goal.key)}
              >
                <View style={styles.cardLeft}>
                  <View style={styles.cardTitleRow}>
                    <Text style={[styles.cardLabel, on ? styles.labelOn : styles.labelOff]}>
                      {goal.label}
                    </Text>
                    {goal.tag && (
                      <View style={[styles.tagPill, on ? styles.tagPillOn : styles.tagPillOff]}>
                        <Text style={[styles.tagText, on ? styles.tagTextOn : styles.tagTextOff]}>
                          {goal.tag}
                        </Text>
                      </View>
                    )}
                  </View>
                  <Text style={[styles.cardDesc, on ? styles.descOn : styles.descOff]}>
                    {goal.desc}
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
          <Text style={styles.helperText}>
            선택한 목표는 언제든지 마이페이지에서 추가하거나 수정할 수 있어요.
          </Text>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        {navError ? <Text style={styles.navError}>{navError}</Text> : null}
        <Button
          title={
            isNavigating
              ? '처리 중...'
              : count > 0
                ? `선택 완료 (${count}개) - 세부 계획 세우기`
                : '목표를 선택해 주세요'
          }
          showArrow={!isNavigating && count > 0}
          onPress={() => goNext()}
          disabled={count === 0 || isNavigating}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  scroll: { flex: 1 },
  content: { paddingHorizontal: spacing.xl, paddingBottom: spacing.xl, gap: spacing.xl },

  progressRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: spacing.md,
  },
  dots: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dot: { height: 10, borderRadius: radius.full },
  dotOn:  { width: 24, backgroundColor: colors.primary },
  dotOff: { width: 10, backgroundColor: colors.border },
  stepText: { ...typography.badge, fontFamily: fonts.bold, color: colors.primary },

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
