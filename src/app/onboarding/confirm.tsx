// ON-006 온보딩 최종 확인. GET /onboarding/summary(ONB-04) 한 번으로 프로필·체류·목표·월 수지를 보여 준다.
// 잔여 개월·합계·여유자금은 모두 서버 계산값이라 화면은 표시 형식만 바꾼다.
// 다음: POST /steps/SUMMARY_CONFIRM

import { useCallback, useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import Header from '../../components/Header';
import Button from '../../components/Button';
import { useOnboardingStep } from '../../hooks/useOnboardingStep';
import OnboardingProgress from '../../components/OnboardingProgress';
import { getOnboardingSummary } from '../../api/onboarding';
import { colors, typography, spacing, radius, fonts } from '../../constants/theme';
import { Skeleton, SkeletonGroup } from '../../components/Skeleton';
import { languageName } from '../../constants/languages';
import { goalLabel } from '../../constants/goals';
import { fmtNumber, fmtWon } from '../../utils/format';
import type { CommitmentType, OnboardingSummaryResponse } from '../../types/api';
import { errorText } from '../../utils/errorText';

// 고정 생활비로 묶이는 항목 (서버 totals.fixedLiving 과 같은 기준)
const FIXED_TYPES: CommitmentType[] = ['RENT', 'UTILITY', 'TELECOM', 'LIVING_MINIMUM', 'OTHER'];

// "MARK ANTHONY REYES" → "MR" (첫 단어·마지막 단어 첫 글자)
function initials(name: string): string {
  const words = name.trim().split(/\s+/);
  if (words.length === 0 || !words[0]) return '';
  const last = words.length > 1 ? words[words.length - 1] : '';
  return (words[0][0] + (last ? last[0] : '')).toUpperCase();
}

// "2027-09-30" → "2027.09"
const yearMonth = (iso: string) => iso.slice(0, 7).replace('-', '.');

type GoalRow = { label: string; amount: string; amountBlue: boolean; sub: string };

// 목표 요약 카드 줄: 목돈 목표 + 송금·고정 생활비(필수 확보액). 금액은 서버 값·합계 그대로
function buildGoalRows(s: OnboardingSummaryResponse): GoalRow[] {
  const rows: GoalRow[] = [];

  const lump = s.goals.find((g) => g.goalType === 'LUMP_SUM');
  if (lump) {
    const subs: string[] = [];
    if (lump.targetDate) subs.push(`${yearMonth(lump.targetDate)}까지`);
    if (lump.monthlyRequired) subs.push(`월 ${fmtWon(lump.monthlyRequired.amount)}씩`);
    rows.push({
      label: '목돈 마련 플랜',
      amount: lump.targetAmount ? fmtWon(lump.targetAmount.amount) : '금액 미입력',
      amountBlue: true,
      sub: subs.join(' · ') || '목표 금액과 시점을 정하면 월 저축액을 알려 드려요',
    });
  }

  const { items, totals } = s.commitments;
  const remitItems = items.filter((i) => i.commitmentType === 'REMITTANCE');
  if (remitItems.length > 0) {
    rows.push({
      label: '본국 정기 송금',
      amount: `월 ${fmtWon(totals.remittance.amount)}`,
      amountBlue: false,
      sub: remitItems.map((i) => i.label ?? '송금').join(' · '),
    });
  }

  const fixedItems = items.filter((i) => FIXED_TYPES.includes(i.commitmentType));
  if (fixedItems.length > 0) {
    rows.push({
      label: '고정 생활비',
      amount: `월 ${fmtWon(totals.fixedLiving.amount)}`,
      amountBlue: false,
      sub: fixedItems.map((i) => `${i.label ?? '기타'} ${fmtWon(i.amount.amount)}`).join(' · '),
    });
  }

  return rows;
}

export default function ConfirmScreen() {
  const { goNext, isNavigating, navError, stage, totalStages } = useOnboardingStep();
  const [summary, setSummary] = useState<OnboardingSummaryResponse | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoadError(null);
    getOnboardingSummary()
      .then(setSummary)
      .catch((e) => setLoadError(errorText(e, '입력하신 정보를 불러오지 못했어요.')));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const { user, visa, goals, balance } = summary ?? {};
  const goalRows = summary ? buildGoalRows(summary) : [];

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <Header title="신한걸음" showBack />

      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        <View style={styles.progressWrap}>
          <OnboardingProgress current={stage} total={totalStages} />
        </View>

        <View style={styles.titleArea}>
          <Text style={styles.title}>입력하신 정보가 맞나요?</Text>
          <Text style={styles.subtitle}>입력하신 정보로 금융 분석을 시작해요.</Text>
        </View>

        {!summary ? (
          <View style={[styles.card, styles.stateCard]}>
            {loadError ? (
              <>
                <Text style={styles.stateText}>{loadError}</Text>
                <Pressable style={styles.retryBtn} onPress={load}>
                  <Text style={styles.retryText}>다시 불러오기</Text>
                </Pressable>
              </>
            ) : (
              <View style={{ alignSelf: 'stretch' }}>
                <SkeletonGroup gap={spacing.md}>
                  <Skeleton width="40%" height={16} />
                  <Skeleton height={12} />
                  <Skeleton width="82%" height={12} />
                  <Skeleton width="64%" height={12} />
                </SkeletonGroup>
              </View>
            )}
          </View>
        ) : (
          <>
            {/* 프로필 카드 */}
            <View style={styles.card}>
              <View style={styles.profileTop}>
                <View style={styles.profileLeft}>
                  <View style={styles.avatar}>
                    <Text style={styles.avatarText}>{initials(user!.displayName)}</Text>
                  </View>
                  <View style={styles.profileInfo}>
                    <View style={styles.profileNameRow}>
                      <Text style={styles.profileName}>{user!.displayName}</Text>
                      {user!.nationalityCode ? (
                        <View style={styles.countryTag}>
                          <Text style={styles.countryTagText}>{user!.nationalityCode}</Text>
                        </View>
                      ) : null}
                    </View>
                  </View>
                </View>
                <View style={styles.langChip}>
                  <Ionicons name="globe-outline" size={12} color={colors.primary} />
                  <Text style={styles.langChipText}>{languageName(user!.preferredLanguage)}</Text>
                </View>
              </View>
              <View style={styles.cardDivider} />
              <View style={styles.infoBoxRow}>
                <View style={styles.infoBox}>
                  <Text style={styles.infoBoxLabel}>체류 자격</Text>
                  {visa ? (
                    <View style={styles.visaRow}>
                      <Text style={styles.infoBoxValue}>{visa.visaTypeCode}</Text>
                      <Text style={styles.infoBoxValueSub} numberOfLines={2}>{visa.visaTypeName}</Text>
                    </View>
                  ) : (
                    <Text style={styles.infoBoxValueSub}>등록증 확인 전</Text>
                  )}
                </View>
                <View style={styles.infoBox}>
                  <Text style={styles.infoBoxLabel}>체류 유효기간</Text>
                  {visa ? (
                    <Text style={[styles.infoBoxValue, { color: colors.primary }]}>
                      {visa.monthsRemaining != null
                        ? `잔여 약 ${visa.monthsRemaining}개월`
                        : visa.daysRemaining < 0
                          ? '만료됨'
                          : `잔여 ${visa.daysRemaining}일`}
                    </Text>
                  ) : (
                    <Text style={styles.infoBoxValueSub}>등록증 확인 전</Text>
                  )}
                </View>
              </View>
            </View>

            {/* 금융 목표 요약 카드 */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>설정한 금융 목표 요약</Text>
              {goals && goals.length > 0 ? (
                <Text style={styles.goalNames}>{goals.map((g) => goalLabel(g.goalType)).join(' · ')}</Text>
              ) : (
                <Text style={styles.goalSub}>선택한 목표가 없어요</Text>
              )}
              {goalRows.length > 0 ? (
                <View style={styles.goalList}>
                  {goalRows.map((g) => (
                    <View key={g.label} style={styles.goalRow}>
                      <View style={styles.goalTop}>
                        <Text style={styles.goalLabel}>{g.label}</Text>
                        <Text style={[styles.goalAmount, g.amountBlue && { color: colors.primary }]}>
                          {g.amount}
                        </Text>
                      </View>
                      <Text style={styles.goalSub}>{g.sub}</Text>
                    </View>
                  ))}
                </View>
              ) : null}
            </View>

            {/* 예상 월 금융 밸런스 리포트 */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>예상 월 금융 밸런스 리포트</Text>
              {balance ? (
                <>
                  <View style={styles.incomeBox}>
                    <Text style={styles.incomeLabel}>예상 월 수입</Text>
                    <Text style={styles.incomeAmount}>약 {fmtNumber(balance.avgMonthlyIncome.amount)}원</Text>
                  </View>
                  <View style={styles.distSection}>
                    <View style={styles.distLabelRow}>
                      <Text style={styles.distLabel}>자금 배분 비율</Text>
                      <Text style={styles.distLabel}>합계 {fmtNumber(balance.avgMonthlyIncome.amount)}원</Text>
                    </View>
                    {/* 막대 길이는 서버 금액을 그대로 비율로 사용 (여유자금이 음수면 막대 없음) */}
                    <View style={styles.distBar}>
                      <View style={[styles.distSeg, { flexGrow: balance.fixedLiving.amount, backgroundColor: colors.primary }]} />
                      <View style={[styles.distSeg, { flexGrow: balance.remittance.amount, backgroundColor: colors.primary }]} />
                      <View style={[styles.distSeg, { flexGrow: balance.variableExpense.amount, backgroundColor: colors.disabled }]} />
                      <View style={[styles.distSeg, { flexGrow: Math.max(balance.spare.amount, 0), backgroundColor: colors.primary }]} />
                    </View>
                  </View>
                  <View style={styles.legendList}>
                    {[
                      { color: colors.primary, label: '고정 지출', amount: `${fmtNumber(balance.fixedLiving.amount)}원`, blue: false },
                      { color: colors.primary, label: '본국 송금', amount: `${fmtNumber(balance.remittance.amount)}원`, blue: false },
                      { color: colors.disabled, label: '변동 지출 (식비·교통 등)', amount: `약 ${fmtNumber(balance.variableExpense.amount)}원`, blue: false },
                      { color: colors.primary, label: '여유자금 (사용 가능 자금)', amount: `약 ${fmtNumber(balance.spare.amount)}원`, blue: true },
                    ].map((row) => (
                      <View key={row.label} style={styles.legendRow}>
                        <View style={styles.legendLeft}>
                          <View style={[styles.legendDot, { backgroundColor: row.color }]} />
                          <Text style={styles.legendLabel}>{row.label}</Text>
                        </View>
                        <Text style={[styles.legendAmount, row.blue && { color: colors.primary }]}>{row.amount}</Text>
                      </View>
                    ))}
                  </View>
                </>
              ) : (
                <Text style={styles.goalSub}>금융 분석 준비 중이에요. 마이데이터 연결 후 보여 드려요.</Text>
              )}
            </View>
          </>
        )}

        {/* 하단 버튼 (스크롤 콘텐츠 내부) */}
        <View style={styles.btnBlock}>
          {navError ? <Text style={styles.navError}>{navError}</Text> : null}
          <Button
            title={isNavigating ? '처리 중...' : '네, 맞아요! 신한걸음 시작하기'}
            showArrow={!isNavigating}
            onPress={() => goNext()}
            disabled={isNavigating}
          />
          <Button
            title="정보 수정하기"
            variant="secondary"
            icon="pencil-outline"
            onPress={() => router.back()}
            disabled={isNavigating}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  scroll: { flex: 1 },
  content: { paddingHorizontal: spacing.xl, paddingBottom: spacing.xl, gap: spacing.lg },

  progressWrap: { paddingTop: spacing.md },

  titleArea: { gap: 6 },
  title: { ...typography.h2, color: colors.text.strong },
  subtitle: { ...typography.subtitle, color: colors.text.sub },

  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.xl,
    gap: 12,
  },
  cardTitle: { ...typography.h3, color: colors.text.strong },
  cardDivider: { height: 1, backgroundColor: colors.border },

  stateCard: { alignItems: 'center', paddingVertical: spacing.xl },
  stateText: { ...typography.body, color: colors.text.sub, textAlign: 'center' },
  retryBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
  },
  retryText: { ...typography.body, fontFamily: fonts.bold, color: colors.text.inverse },

  profileTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  profileLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: radius.full,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { ...typography.h3, color: colors.text.inverse },
  profileInfo: { gap: 4, flex: 1 },
  profileNameRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  profileName: { ...typography.subtitle, fontFamily: fonts.bold, color: colors.text.strong },
  countryTag: {
    backgroundColor: colors.background,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: 4,
  },
  countryTagText: { ...typography.badge, color: colors.text.sub },
  langChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.background,
    borderRadius: radius.full,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  langChipText: { ...typography.badge, color: colors.primary },

  infoBoxRow: { flexDirection: 'row', gap: spacing.sm },
  infoBox: {
    flex: 1,
    backgroundColor: colors.background,
    borderRadius: radius.md,
    padding: 12,
    gap: 4,
  },
  infoBoxLabel: { ...typography.badge, color: colors.text.sub },
  infoBoxValue: { ...typography.body, fontFamily: fonts.bold, color: colors.text.strong },
  infoBoxValueSub: { ...typography.body, color: colors.text.sub },
  visaRow: { gap: 2 },

  goalNames: { ...typography.body, fontFamily: fonts.bold, color: colors.primary },
  goalList: { gap: 12 },
  goalRow: {
    backgroundColor: colors.background,
    borderRadius: radius.md,
    padding: 14,
    gap: 6,
  },
  goalTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  goalLabel: { ...typography.body, fontFamily: fonts.bold, color: colors.text.strong },
  goalAmount: { ...typography.subtitle, fontFamily: fonts.bold, color: colors.text.strong },
  goalSub: { ...typography.body, color: colors.text.sub },

  incomeBox: {
    backgroundColor: colors.background,
    borderRadius: radius.md,
    padding: spacing.lg,
    gap: 2,
  },
  incomeLabel: { ...typography.body, color: colors.text.sub },
  incomeAmount: { ...typography.amount, color: colors.text.strong },

  distSection: { gap: spacing.sm },
  distLabelRow: { flexDirection: 'row', justifyContent: 'space-between' },
  distLabel: { ...typography.badge, color: colors.text.sub },
  distBar: {
    height: 12,
    borderRadius: radius.full,
    overflow: 'hidden',
    flexDirection: 'row',
    backgroundColor: colors.background,
  },
  distSeg: { height: '100%' },

  legendList: { gap: 10 },
  legendRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 4 },
  legendLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  legendDot: { width: 10, height: 10, borderRadius: radius.full },
  legendLabel: { ...typography.body, color: colors.text.strong },
  legendAmount: { ...typography.body, fontFamily: fonts.bold, color: colors.text.strong },

  btnBlock: { gap: 12, paddingTop: spacing.sm },
  navError: { ...typography.body, color: colors.errorText, textAlign: 'center' },
});
