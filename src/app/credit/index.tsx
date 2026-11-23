// CR-001 대안신용 사전진단 (Figma 445:2). 주소 /credit.
// 데이터는 src/api 에서만 받는다: 대안신용 = altCredit.ts(서버/Mock), 이름 = user.ts(getMe), SOL 글로벌론 = credit.ts.
// 점수 구간·등급 판단은 서버가 하고, 화면은 코드를 src/constants/altCredit.ts 표로 문구·색으로만 바꾼다.
// scoreBand·factors·eligibilityChecks 가 혹시 없거나 비어 있으면 그 부분만 숨긴다.
// SOL 글로벌론(credit.ts)만 실패하면 SOL 카드만 숨기고 나머지는 그대로 보여 준다.
// 가입 조건 met 이 null 이면 옆 값 대신 "확인 불가"를 보여 준다.
import { useEffect, useState, type ReactNode } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, type Href } from 'expo-router';
import Screen from '../../components/Screen';
import ScreenTitle from '../../components/ScreenTitle';
import StepBadge from '../../components/StepBadge';
import Pill from '../../components/Pill';
import Button from '../../components/Button';
import { colors, typography, spacing, radius, fonts, shadow } from '../../constants/theme';
import { Skeleton, SkeletonCard, SkeletonGroup } from '../../components/Skeleton';
import {
  ALT_CREDIT_TEXT as T,
  LEVEL_BADGE,
  ELIGIBILITY_BADGE,
  BAND_SEGMENTS,
  FACTOR_ORDER,
  FACTOR_NAME,
  FACTOR_DESC,
  CHECK_ORDER,
  CHECK_TITLE,
  checkValue,
  REASON_TEXT,
  TIP_ORDER,
  TIP_LEVELS,
  TIP_MAX,
  TIPS,
  DEFAULT_TIP,
  ERROR_TEXT,
  type BadgeTone,
} from '../../constants/altCredit';
import { getAltAssessment, type AltCreditAssessment, type AltCreditErrorCode } from '../../api/altCredit';
import { getMe } from '../../api/user';
import { getGlobalLoan, type GlobalLoan } from '../../api/credit';
import { fmtNumber, fmtWon } from '../../utils/format';
import { isKoreanUi } from '../../i18n';
import type { ApiError } from '../../types/api';

type Loaded = { alt: AltCreditAssessment; name: string; loan: GlobalLoan | null };


// 원 → 만 원 표시. 만 원 미만은 버린다. 6,234,567 → "623만 원", 30,000,000 → "3,000만 원" (영어 화면은 ₩6,230,000)
const fmtManWon = (won: number) =>
  isKoreanUi() ? `${fmtNumber(Math.floor(won / 10000))}만 원` : fmtWon(Math.floor(won / 10000) * 10000);

// 오류 코드 → 안내 문구. 표에 없는 코드(404·401 등)는 기본 문구
function errorText(code: string | undefined): string {
  if (code && Object.prototype.hasOwnProperty.call(ERROR_TEXT, code)) {
    return ERROR_TEXT[code as AltCreditErrorCode];
  }
  return T.errorFallback;
}

// 작은 둥근 배지 (등급, 가입 조건 충족 여부)
function Badge({ label, tone }: { label: string; tone: BadgeTone }) {
  return (
    <View
      style={[
        s.badge,
        { backgroundColor: tone.bg },
        tone.border != null && { borderWidth: 1, borderColor: tone.border },
      ]}
    >
      <Text style={[s.badgeText, { color: tone.color }]}>{label}</Text>
    </View>
  );
}

// 가입 조건 충족 / 미충족 배지
function EligibilityBadge({ met }: { met: boolean }) {
  const tone = met ? ELIGIBILITY_BADGE.met : ELIGIBILITY_BADGE.unmet;
  return <Badge label={tone.label} tone={tone} />;
}

// 충족 여부 아이콘: 충족 = 파란 체크, 미충족 = X, 확인 안 됨(null) = 회색 빈 원
function checkIcon(met: boolean | null) {
  if (met === true) return { name: 'checkmark-circle' as const, color: colors.primary };
  if (met === false) return { name: 'close-circle' as const, color: colors.required.text };
  return { name: 'ellipse-outline' as const, color: colors.text.muted };
}

// 가입 조건 한 줄: 충족 아이콘 + 조건 + (옆 값)
function CheckRow({ title, met, value }: { title: string; met: boolean | null; value?: string | null }) {
  const icon = checkIcon(met);
  return (
    <View style={s.checkRow}>
      <Ionicons name={icon.name} size={18} color={icon.color} />
      <Text style={s.checkTitle}>{title}</Text>
      {value != null && <Text style={s.checkValue}>{value}</Text>}
    </View>
  );
}

// 상품 조건 한 줄: 라벨 + 값
function TermRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={s.termRow}>
      <Text style={s.termLabel}>{label}</Text>
      <Text style={s.termValue}>{value}</Text>
    </View>
  );
}

// 추천 대출 상품 카드 틀
function LoanCard({
  tag,
  name,
  badge,
  children,
  onDetail,
}: {
  tag: string;
  name: string;
  badge?: ReactNode;
  children: ReactNode;
  onDetail?: () => void; // 상세 화면이 있는 상품만. 없으면 '자세히 보기' 버튼을 그리지 않는다
}) {
  return (
    <View style={[s.card, s.loanCard]}>
      <View style={s.loanHeader}>
        <View style={s.titles}>
          <Text style={s.loanTag}>{tag}</Text>
          <Text style={s.loanName}>{name}</Text>
        </View>
        {badge}
      </View>
      {children}
      {onDetail ? <Button title={T.detailButton} variant="secondary" onPress={onDetail} /> : null}
    </View>
  );
}

export default function AltCreditScreen() {
  const [data, setData] = useState<Loaded | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([getAltAssessment(), getMe(), getGlobalLoan().catch(() => null)])
      .then(([alt, me, loan]) => setData({ alt, name: me.shortName || me.displayName, loan }))
      .catch((e: ApiError) => setError(errorText(e?.code)));
  }, []);

  if (!data) {
    return (
      <Screen loading={!error}>
        {error ? (
          <Text style={s.stateText}>{error}</Text>
        ) : (
          <SkeletonGroup>
            <SkeletonGroup gap={spacing.sm}>
              <Skeleton width="85%" height={26} />
              <Skeleton width="60%" height={14} />
            </SkeletonGroup>
            <SkeletonCard lines={2} block={56} />
            <SkeletonCard lines={3} />
            <SkeletonCard lines={3} />
          </SkeletonGroup>
        )}
      </Screen>
    );
  }

  const { alt, name, loan } = data;
  const band = alt.scoreBand ?? null;
  const bandFill = band?.index;
  const factors = alt.factors ?? [];
  const checks = alt.eligibilityChecks ?? [];

  // 진단 근거: 고정 순서로, 서버가 준 항목만
  const factorRows = FACTOR_ORDER.flatMap((key) => {
    const f = factors.find((x) => x.key === key);
    return f ? [f] : [];
  });

  // 신한걸음 글로벌론 가입 조건 줄: 고정 순서로, 서버가 준 조건만. 체크 아이콘에만 쓴다 (배지는 decision 으로)
  const checkRows = CHECK_ORDER.flatMap((key) => {
    const c = checks.find((x) => x.key === key);
    return c ? [c] : [];
  });

  // SOL 글로벌론 (서버/Mock). 불러오지 못했으면 카드만 숨긴다
  const solLimit = loan?.terms.rows.find((r) => r.key === 'limit');
  const solTerm = loan?.terms.rows.find((r) => r.key === 'term');
  const solConditions = loan?.eligibility.conditions ?? [];
  const solMet = solConditions.length > 0 && solConditions.every((c) => c.met);

  // 점수를 높이는 방법: 정한 순서에서 보통·보완 필요 항목을 앞에서부터 최대 2개, 없으면 기본 카드
  const tipKeys = TIP_ORDER.filter((key) =>
    factors.some((f) => f.key === key && TIP_LEVELS.includes(f.level)),
  ).slice(0, TIP_MAX);
  const tips = tipKeys.length > 0 ? tipKeys.map((key) => TIPS[key]) : [DEFAULT_TIP];

  const eligible = alt.decision === 'ELIGIBLE';
  const reason = (alt.reasonCode && REASON_TEXT[alt.reasonCode]) || T.reasonFallback;

  return (
    <Screen>
      {/* 상단 */}
      <View style={s.intro}>
        <StepBadge label={T.badge} />
        <ScreenTitle
          title={
            isKoreanUi()
              ? `${name}님의 대안신용 점수는 ${fmtNumber(alt.score)}점이에요`
              : `${name}'s alternative credit score is ${fmtNumber(alt.score)}`
          }
          description={T.description}
        />
      </View>

      {/* 점수 카드 */}
      <View style={[s.card, s.scoreCard]}>
        <View style={s.scoreHeader}>
          <View style={s.scoreValue}>
            <Text style={s.score}>{fmtNumber(alt.score)}</Text>
            <Text style={s.scoreMax}> / {T.scoreMax}</Text>
          </View>
          {band && (
            <Pill
              label={
                isKoreanUi()
                  ? `${fmtNumber(band.min)}~${fmtNumber(band.max)}점`
                  : `${fmtNumber(band.min)}–${fmtNumber(band.max)} pts`
              }
              type="step"
            />
          )}
        </View>

        {bandFill != null && (
          <View style={s.bar}>
            {Array.from({ length: BAND_SEGMENTS }, (_, i) => (
              <View key={i} style={[s.segment, i < bandFill && s.segmentOn]} />
            ))}
          </View>
        )}

        {band && <Text style={s.caption}>{T.bandNotice}</Text>}
      </View>

      {/* 진단 근거 */}
      {factorRows.length > 0 && (
        <View style={s.section}>
          <View style={s.titles}>
            <Text style={s.sectionTitle}>{T.factorsTitle}</Text>
            <Text style={s.caption}>{T.factorsBasis}</Text>
          </View>

          <View style={[s.card, s.listCard]}>
            {factorRows.map((f, i) => {
              const level = LEVEL_BADGE[f.level];
              const desc = FACTOR_DESC[f.key]?.[f.level];
              return (
                <View key={f.key} style={[s.factorRow, i > 0 && s.divider]}>
                  <View style={s.factorHeader}>
                    <Text style={s.factorName}>{FACTOR_NAME[f.key]}</Text>
                    {level && <Badge label={level.label} tone={level} />}
                  </View>
                  {desc != null && <Text style={s.caption}>{desc}</Text>}
                </View>
              );
            })}
          </View>
        </View>
      )}

      {/* 추천 대출 상품 */}
      <View style={s.section}>
        <View style={s.titles}>
          <Text style={s.sectionTitle}>{T.productsTitle}</Text>
          <Text style={s.caption}>{T.productsDesc}</Text>
        </View>

        {loan && (
          <LoanCard
            tag={T.solGlobalTag}
            name={loan.name}
            badge={<EligibilityBadge met={solMet} />}
            onDetail={() => router.push('/credit/loan' as Href)}
          >
            {(solLimit || solTerm) && (
              <View style={s.terms}>
                {solLimit && <TermRow label={solLimit.label} value={solLimit.value} />}
                {solTerm && <TermRow label={solTerm.label} value={solTerm.value} />}
              </View>
            )}
            <View style={s.checks}>
              {solConditions.map((c) => (
                <CheckRow key={c.key} title={c.title} met={c.met} />
              ))}
            </View>
          </LoanCard>
        )}

        <LoanCard
          tag={T.hanstepLoanTag}
          name={T.hanstepLoanName}
          badge={<EligibilityBadge met={eligible} />}
        >
          {eligible ? (
            <View style={s.terms}>
              <TermRow
                label={T.limitLabel}
                value={`${fmtManWon(alt.minLimit)} ~ ${fmtManWon(alt.maxLimit)}`}
              />
              <TermRow
                label={T.termLabel}
                value={isKoreanUi() ? `${alt.loanTermMonths}개월` : `${alt.loanTermMonths} months`}
              />
            </View>
          ) : (
            <View style={s.unmetBox}>
              <Text style={s.unmetTitle}>{ELIGIBILITY_BADGE.unmet.label}</Text>
              <Text style={s.caption}>{reason}</Text>
            </View>
          )}
          {checkRows.length > 0 && (
            <View style={s.checks}>
              {checkRows.map((c) => (
                <CheckRow
                  key={c.key}
                  title={CHECK_TITLE[c.key]}
                  met={c.met}
                  value={c.met === null ? T.checkUnknown : checkValue(c.key, alt.inputs)}
                />
              ))}
            </View>
          )}
        </LoanCard>
      </View>

      {/* 점수를 높이는 방법 */}
      <View style={s.section}>
        <Text style={s.sectionTitle}>{T.tipsTitle}</Text>
        {tips.map((tip) => (
          <View key={tip.title} style={[s.card, s.tipCard]}>
            <View style={s.titles}>
              <Text style={s.tipTitle}>{tip.title}</Text>
              <Text style={s.tipDesc}>{tip.desc}</Text>
            </View>
          </View>
        ))}
      </View>

      {/* 하단 안내 */}
      <View style={s.notice}>
        <Ionicons name="information-circle-outline" size={14} color={colors.text.sub} />
        <Text style={s.noticeText}>{T.notice}</Text>
      </View>
    </Screen>
  );
}

const s = StyleSheet.create({
  stateText: { ...typography.body, color: colors.text.sub, textAlign: 'center' },
  caption: { ...typography.caption, color: colors.text.sub },

  intro: { gap: spacing.md },

  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    ...shadow.card,
  },

  // 점수 카드
  scoreCard: { padding: spacing.xl, gap: spacing.md },
  scoreHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: spacing.md },
  scoreValue: { flexDirection: 'row', alignItems: 'baseline', flexShrink: 1 },
  score: { ...typography.display, color: colors.primary },
  scoreMax: { ...typography.subtitle, color: colors.text.sub },
  bar: { flexDirection: 'row', gap: spacing.xs },
  segment: { flex: 1, height: 8, borderRadius: radius.full, backgroundColor: colors.primarySoft },
  segmentOn: { backgroundColor: colors.primary },

  // 구역 공통
  section: { gap: spacing.md, paddingTop: spacing.sm },
  titles: { flexShrink: 1, gap: 2 },
  sectionTitle: { ...typography.h3, color: colors.text.strong },
  divider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },

  // 배지
  badge: {
    alignSelf: 'flex-start',
    borderRadius: radius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  badgeText: { ...typography.badge },

  // 진단 근거
  listCard: { paddingHorizontal: spacing.xl, paddingVertical: spacing.xs },
  factorRow: { gap: spacing.xs, paddingVertical: spacing.md },
  factorHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: spacing.md },
  factorName: { ...typography.title, color: colors.text.strong, flexShrink: 1 },

  // 상품 카드
  loanCard: { padding: spacing.xl, gap: spacing.lg },
  loanHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: spacing.md },
  loanTag: { ...typography.caption, color: colors.text.sub },
  loanName: { ...typography.h3, color: colors.text.strong },
  terms: { gap: spacing.sm },
  termRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: spacing.md },
  termLabel: { ...typography.body, color: colors.text.sub },
  termValue: { ...typography.body, fontFamily: fonts.bold, color: colors.text.strong, flexShrink: 1, textAlign: 'right' },
  checks: { gap: spacing.sm },
  checkRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  checkTitle: { ...typography.body, color: colors.text.strong, flex: 1 },
  checkValue: { ...typography.caption, color: colors.text.sub },
  unmetBox: { gap: 2 },
  unmetTitle: { ...typography.body, fontFamily: fonts.bold, color: colors.required.text },

  // 점수를 높이는 방법
  tipCard: { padding: spacing.xl, gap: spacing.md },
  tipTitle: { ...typography.title, color: colors.text.strong },
  tipDesc: { ...typography.body, color: colors.text.sub },

  // 하단 안내
  notice: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.xs },
  noticeText: { ...typography.caption, color: colors.text.sub, flex: 1 },
});
