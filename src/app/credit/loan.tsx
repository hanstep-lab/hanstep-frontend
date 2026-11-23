// CR-002 SOL 글로벌론 상품 상세 (Figma 447:2). 데이터는 src/api/credit.ts 에서만 받고 글자를 그대로 보여준다.
// 입력 없이 보여주기만 하는 화면. 메뉴에 연결하지 않고 /credit/loan 주소로만 연다.
// 모의 한도는 Figma "신한걸음 진단과 비교"(447:62) 자리에 둔다. 금액은 서버 값을 표시 형식만 바꿔 보여 주고 계산하지 않는다.
// 범위 막대(447:74)는 화면에서 비율을 계산해야 해서 넣지 않는다.
import { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, type Href } from 'expo-router';
import Screen from '../../components/Screen';
import Button from '../../components/Button';
import Pill from '../../components/Pill';
import { colors, typography, spacing, radius, fonts, shadow } from '../../constants/theme';
import { Skeleton, SkeletonCard, SkeletonGroup } from '../../components/Skeleton';
import {
  LOAN_TEXT as T,
  LIMIT_REASON_TEXT,
  LIMIT_REASON_FALLBACK,
  INCOME_SOURCE_TEXT,
  LOAN_ERROR_TEXT,
  LOAN_ERROR_FALLBACK,
} from '../../constants/credit';
import { getGlobalLoan, type GlobalLoan } from '../../api/credit';
import { fmtDate, fmtWon } from '../../utils/format';
import type { ApiError, SolGlobalLoanLimitEstimate } from '../../types/api';

// 오류 코드 → 안내 문구. 서버 메시지는 쓰지 않는다
function errorText(code: string | undefined): string {
  if (code && Object.prototype.hasOwnProperty.call(LOAN_ERROR_TEXT, code)) return LOAN_ERROR_TEXT[code];
  return LOAN_ERROR_FALLBACK;
}

// 모의 한도 기준 한 줄: "2025년 소득 · 최대 10개월(2027.09.30 만기) 기준". 없는 값은 그 부분만 뺀다
function basisLine(e: SolGlobalLoanLimitEstimate): string | null {
  const income =
    e.incomeSource === 'INCOME_RECORD'
      ? e.incomeYear != null
        ? `${e.incomeYear}년 소득`
        : null
      : e.incomeSource === 'CONTRACT_SALARY'
        ? INCOME_SOURCE_TEXT.CONTRACT_SALARY
        : null;
  const term =
    e.maxTermMonths != null
      ? `최대 ${e.maxTermMonths}개월${e.latestMaturityOn ? `(${fmtDate(e.latestMaturityOn)} 만기)` : ''}`
      : null;
  const parts = [income, term].filter((p): p is string => p != null);
  return parts.length > 0 ? `${parts.join(' · ')} 기준` : null;
}

export default function GlobalLoanScreen() {
  const [loan, setLoan] = useState<GlobalLoan | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getGlobalLoan()
      .then(setLoan)
      .catch((e: ApiError) => setError(errorText(e?.code)));
  }, []);

  if (!loan) {
    return (
      <Screen loading={!error}>
        {error ? (
          <Text style={s.stateText}>{error}</Text>
        ) : (
          <SkeletonGroup>
            <SkeletonGroup gap={spacing.sm}>
              <Skeleton width="80%" height={26} />
              <Skeleton width="55%" height={14} />
            </SkeletonGroup>
            <SkeletonCard lines={2} block={56} />
            <SkeletonCard lines={3} />
          </SkeletonGroup>
        )}
      </Screen>
    );
  }

  const { eligibility, terms, limitEstimate } = loan;
  const estimated = limitEstimate?.estimatedLimit ?? null;
  const basis = limitEstimate ? basisLine(limitEstimate) : null;
  const reason =
    (limitEstimate?.reasonCode && LIMIT_REASON_TEXT[limitEstimate.reasonCode]) || LIMIT_REASON_FALLBACK;

  return (
    <Screen
      footer={
        <View style={s.footer}>
          <Button title={T.askButton} showArrow onPress={() => router.push('/(tabs)/chat' as Href)} />
        </View>
      }
    >
      {/* 상품 소개 */}
      <View style={s.intro}>
        <Pill label={loan.productTag} type="step" />
        <View style={s.headingGroup}>
          <Text style={s.name}>{loan.name}</Text>
          <Text style={s.summary}>{loan.summary}</Text>
        </View>
      </View>

      {/* 가입 조건 확인 */}
      <View style={s.section}>
        <View style={s.sectionHeader}>
          <View style={s.titles}>
            <Text style={s.sectionTitle}>{eligibility.title}</Text>
            <Text style={s.sectionSub}>{eligibility.source}</Text>
          </View>
          <Pill label={eligibility.resultLabel} type="step" />
        </View>

        <View style={[s.card, s.conditionCard]}>
          {eligibility.conditions.map((c) => (
            <View key={c.key} style={s.condition}>
              <Ionicons
                name={c.met ? 'checkmark-circle' : 'close-circle'}
                size={20}
                color={c.met ? colors.primary : colors.required.text}
              />
              <View style={s.conditionTexts}>
                <Text style={s.conditionTitle}>{c.title}</Text>
                <Text style={s.conditionDesc}>{c.desc}</Text>
              </View>
            </View>
          ))}
        </View>
      </View>

      {/* 상품 조건 */}
      <View style={s.section}>
        <View style={s.titles}>
          <Text style={s.sectionTitle}>{terms.title}</Text>
          <Text style={s.sectionSub}>{terms.basis}</Text>
        </View>

        <View style={[s.card, s.termsCard]}>
          {terms.rows.map((row, i) => (
            <View key={row.key} style={[s.termRow, i > 0 && s.termDivider]}>
              <Text style={s.termLabel}>{row.label}</Text>
              <Text style={s.termValue}>{row.value}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* 신한걸음 모의 한도 (Figma 진단과 비교 자리) */}
      {limitEstimate && (
        <View style={s.section}>
          <View style={s.sectionHeader}>
            <View style={s.titles}>
              <Text style={s.sectionTitle}>{T.limitTitle}</Text>
              {!limitEstimate.dsrApplied && <Text style={s.sectionSub}>{T.limitDesc}</Text>}
            </View>
            {loan.isMock && <Pill label={T.mockPill} type="step" />}
          </View>

          <View style={[s.card, s.limitCard]}>
            <View style={s.limitRow}>
              <Text style={s.termLabel}>{T.capLabel}</Text>
              <Text style={s.termValue}>{fmtWon(limitEstimate.cap.amount)}</Text>
            </View>
            <View style={s.limitRow}>
              <Text style={s.termLabel}>{T.estimateLabel}</Text>
              {estimated && <Text style={s.limitAmount}>{fmtWon(estimated.amount)}</Text>}
            </View>
            {estimated ? (
              basis != null && <Text style={s.limitBasis}>{basis}</Text>
            ) : (
              <Text style={s.limitBasis}>{reason}</Text>
            )}
          </View>
        </View>
      )}

      {/* 참고 안내 한 줄 */}
      <View style={s.notice}>
        <Ionicons name="information-circle-outline" size={14} color={colors.text.sub} />
        <Text style={s.noticeText}>{loan.notice}</Text>
      </View>
    </Screen>
  );
}

const s = StyleSheet.create({
  stateText: { ...typography.body, color: colors.text.sub, textAlign: 'center' },
  footer: { gap: spacing.sm },

  intro: { gap: spacing.md },
  headingGroup: { gap: spacing.xs },
  name: { ...typography.h2, color: colors.text.strong },
  summary: { ...typography.body, color: colors.text.sub },

  section: { gap: spacing.md, paddingTop: spacing.sm },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: spacing.md },
  titles: { flexShrink: 1, gap: 2 },
  sectionTitle: { ...typography.h3, color: colors.text.strong },
  sectionSub: { ...typography.caption, color: colors.text.sub },

  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    ...shadow.card,
  },

  conditionCard: { padding: spacing.xl, gap: spacing.lg },
  condition: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },
  conditionTexts: { flex: 1, gap: 2 },
  conditionTitle: { ...typography.title, color: colors.text.strong },
  conditionDesc: { ...typography.caption, color: colors.text.sub },

  termsCard: { paddingHorizontal: spacing.xl, paddingVertical: spacing.xs },
  termRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
  },
  termDivider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
  termLabel: { ...typography.body, color: colors.text.sub },
  termValue: { ...typography.body, fontFamily: fonts.bold, color: colors.text.strong, flexShrink: 1, textAlign: 'right' },

  // 모의 한도 카드 (Figma 447:67)
  limitCard: { padding: spacing.xl, gap: spacing.md },
  limitRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: spacing.md },
  limitAmount: { ...typography.amount, color: colors.primary, flexShrink: 1, textAlign: 'right' },
  limitBasis: { ...typography.caption, color: colors.text.sub },

  notice: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.xs },
  noticeText: { ...typography.caption, color: colors.text.sub, flex: 1 },
});
