// ON-005 목표별 상세 질문. 들어올 때 목표(GOL-01)·필수 확보액(CMT-01)·송금 이력(CMT-03)·요약(ONB-04)을 불러오고,
// 다음: PUT /goals(목돈 금액·시점) → PUT /commitments(고정·변동 지출, 송금) → POST /steps/GOAL_DETAILS
// 목돈 섹션은 "목돈 마련", 송금 섹션은 "본국 송금"을 골랐을 때만 보인다. 고정·변동 지출은 여유자금 계산에 필요해서 항상 보인다.

import { useCallback, useEffect, useRef, useState, type ComponentRef } from 'react';
import { useTranslation } from 'react-i18next';
import { View, Text, Pressable, StyleSheet, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Screen from '../../components/Screen';
import Button from '../../components/Button';
import { useOnboardingStep } from '../../hooks/useOnboardingStep';
import OnboardingProgress from '../../components/OnboardingProgress';
import { getGoals, saveGoals } from '../../api/goals';
import { getCommitments, getRemittanceCandidates, saveCommitments } from '../../api/commitments';
import { getOnboardingSummary } from '../../api/onboarding';
import { colors, typography, spacing, radius, fonts } from '../../constants/theme';
import { Skeleton, SkeletonGroup } from '../../components/Skeleton';
import { fmtDate, fmtNumber } from '../../utils/format';
import type {
  CommitmentResponse,
  CommitmentSaveItem,
  CommitmentType,
  GoalResponse,
  RemittanceCandidate,
  SummaryUser,
  SummaryVisa,
} from '../../types/api';
import { errorText } from '../../utils/errorText';
import { commitmentLabel } from '../../utils/commitmentLabel';
import { firstName } from '../../utils/name';

const MAN = 10_000;

// 목돈 금액 칩. key 는 만 원 단위, label 은 i18n onboarding.questions.<label>
const AMOUNT_OPTIONS = [
  { key: '200', label: 'amount200' },
  { key: '400', label: 'amount400' },
  { key: '600', label: 'amount600' },
  { key: 'custom', label: 'custom' },
] as const;

// 고정 생활비 기본 줄 (Figma). 같은 유형 여러 줄 가능해서 이름(label)으로 구분.
// label 은 서버에 저장·비교하는 값이라 한국어 그대로 두고, 화면에는 commitmentLabel 로 바꿔 보여 준다. sub 는 i18n 키
const DEFAULT_FIXED: { type: CommitmentType; label: string; sub: FixedSub }[] = [
  { type: 'RENT', label: '월세', sub: null },
  { type: 'UTILITY', label: '공과금', sub: 'utilitySub' },
  { type: 'UTILITY', label: '전기 / 수도세', sub: 'powerSub' },
];

// 고정 생활비로 묶이는 유형 (서버 totals.fixedLiving 기준과 같음)
const FIXED_TYPES: CommitmentType[] = ['RENT', 'UTILITY', 'TELECOM', 'LIVING_MINIMUM', 'OTHER'];

type FixedSub = 'utilitySub' | 'powerSub' | 'savedSub' | null; // i18n onboarding.questions.<sub>
type ExpenseRow = { key: string; type: CommitmentType; label: string; sub: FixedSub; value: string };

// 서버 금액(원) → 입력칸 글자(만 원). 520000 → "52"
const toManText = (won: number) => String(won / MAN);

// 입력칸 글자(만 원) → 원. 비었거나 0 이하·숫자가 아니면 null (저장 안 함). 입력 단위만 바꾸는 변환
function parseMan(text: string): number | null {
  const t = text.trim();
  if (!t) return null;
  const n = Number(t);
  if (!Number.isFinite(n) || n <= 0) return null;
  return Math.round(n * MAN);
}

// 서버 API 가 없는 기능(송금처 추가·수정, 자동이체 등록)

// 숫자와 소수점만 남김
const onlyNumber = (t: string) => t.replace(/[^\d.]/g, '');

function initials(displayName: string): string {
  const words = displayName.trim().split(/\s+/);
  const last = words.length > 1 ? words[words.length - 1] : '';
  return ((words[0]?.[0] ?? '') + (last ? last[0] : '')).toUpperCase();
}

// 만원 단위 금액 입력칸 (목돈 직접 입력·고정 생활비·변동 지출 공통).
// 빈 칸: 흐린 "0"(Medium), 값: 진한 숫자(Bold). 글자 크기는 같아서 입력해도 칸 크기가 그대로.
// 키패드는 numeric: 서버 값이 13.5 만원처럼 소수로 올 수 있어 소수점 키가 필요하다
function AmountField({ value, onChangeText }: { value: string; onChangeText: (text: string) => void }) {
  const inputRef = useRef<ComponentRef<typeof TextInput>>(null);
  const [focused, setFocused] = useState(false);
  const { t } = useTranslation();
  return (
    // 칸 어디를 눌러도("만원" 포함) 입력 시작
    <Pressable
      style={[styles.amountBadge, focused && styles.amountBadgeFocused]}
      onPress={() => inputRef.current?.focus()}
    >
      <TextInput
        ref={inputRef}
        style={[styles.amountInput, value === '' && styles.amountInputEmpty]}
        value={value}
        onChangeText={onChangeText}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        placeholder="0"
        placeholderTextColor={colors.text.placeholder}
        keyboardType="numeric"
        maxLength={6}
      />
      <Text style={styles.amountUnit}>{t('onboarding.questions.unit')}</Text>
    </Pressable>
  );
}

export default function QuestionsScreen() {
  const { goNext, isNavigating, navError, stage, totalStages } = useOnboardingStep();
  const { t } = useTranslation();

  // 서버에서 불러온 값
  const [goals, setGoals] = useState<GoalResponse[]>([]);
  const [candidates, setCandidates] = useState<RemittanceCandidate[]>([]);
  const [user, setUser] = useState<SummaryUser | null>(null);
  const [visa, setVisa] = useState<SummaryVisa | null>(null);
  // 화면이 다루지 않는 기존 항목(의무 저축, 화면에 없는 송금·변동지출 등). 저장할 때 그대로 다시 보내 지워지지 않게 함
  const [keepItems, setKeepItems] = useState<CommitmentResponse[]>([]);

  // 불러오기 상태. 다 불러오기 전에는 다음 버튼을 막는다 (불러오기 전 저장으로 기존 값이 지워지는 것 방지)
  const [loaded, setLoaded] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  // 화면 입력값
  const [savingsTarget, setSavingsTarget] = useState<string | null>(null);
  const [customAmount, setCustomAmount] = useState('');
  const [remitChecked, setRemitChecked] = useState<Set<number>>(new Set()); // lastTransactionId
  const [fixedRows, setFixedRows] = useState<ExpenseRow[]>([]);
  const [varExpense, setVarExpense] = useState('');

  const goalTypes = new Set(goals.map((g) => g.goalType));
  const showLump = goalTypes.has('LUMP_SUM');
  const showRemit = goalTypes.has('REMITTANCE');
  // 송금 섹션이 저장을 맡는 경우: 섹션이 보이고 송금 이력이 있을 때
  const remitManaged = showRemit && candidates.length > 0;

  const load = useCallback(() => {
    setLoaded(false);
    setLoadError(null);
    Promise.all([
      getGoals(),
      getCommitments(),
      getRemittanceCandidates().catch(() => null), // 마이데이터 미연결 등. 없으면 송금 섹션만 안내 문구
      getOnboardingSummary().catch(() => null), // 배너용. 없으면 배너 숨김
    ])
      .then(([goalRes, cmtRes, candRes, summary]) => {
        const items = cmtRes.items;
        const cands = candRes?.candidates ?? [];
        const types = new Set(goalRes.goals.map((g) => g.goalType));

        setGoals(goalRes.goals);
        setCandidates(cands);
        setUser(summary?.user ?? null);
        setVisa(summary?.visa ?? null);

        // 목돈 금액: 칩 값과 같으면 그 칩, 아니면 직접 입력
        const lump = goalRes.goals.find((g) => g.goalType === 'LUMP_SUM');
        if (lump?.targetAmount) {
          const man = String(lump.targetAmount.amount / MAN);
          if (AMOUNT_OPTIONS.some((o) => o.key === man)) {
            setSavingsTarget(man);
          } else {
            setSavingsTarget('custom');
            setCustomAmount(man);
          }
        }

        // 고정 생활비: 기본 3줄 + 기본 줄에 없는 기존 고정비 항목(예: 고정생활비 52만)도 보여 줌 (숨기면 합계에 몰래 더해짐)
        const used = new Set<number>();
        const rows: ExpenseRow[] = DEFAULT_FIXED.map((d, i) => {
          const hit = items.find((it) => !used.has(it.id) && it.commitmentType === d.type && it.label === d.label);
          if (hit) used.add(hit.id);
          return { key: `default-${i}`, ...d, value: hit ? toManText(hit.amount.amount) : '' };
        });
        items
          .filter((it) => FIXED_TYPES.includes(it.commitmentType) && !used.has(it.id))
          .forEach((it) => {
            used.add(it.id);
            rows.push({
              key: `saved-${it.id}`,
              type: it.commitmentType,
              label: it.label ?? '기타 고정비',
              sub: 'savedSub',
              value: toManText(it.amount.amount),
            });
          });
        setFixedRows(rows);

        // 변동 지출: 첫 항목만 화면에서 다루고, 나머지는 유지
        const variable = items.filter((it) => it.commitmentType === 'VARIABLE_EXPENSE');
        setVarExpense(variable[0] ? toManText(variable[0].amount.amount) : '');

        // 송금: 이력에서 이미 고른 항목이 있으면 그것만, 처음이면 전부 체크 (Figma 기본값)
        const detected = items.filter((it) => it.commitmentType === 'REMITTANCE' && it.detectedFromTxnId != null);
        setRemitChecked(
          new Set(
            detected.length > 0
              ? cands.filter((c) => detected.some((d) => d.detectedFromTxnId === c.lastTransactionId)).map((c) => c.lastTransactionId)
              : cands.map((c) => c.lastTransactionId),
          ),
        );

        // 화면이 다루지 않아 그대로 유지할 항목
        const remitHere = types.has('REMITTANCE') && cands.length > 0;
        setKeepItems(
          items.filter((it) => {
            if (FIXED_TYPES.includes(it.commitmentType)) return false; // 고정비 줄로 보여 줌
            if (it.commitmentType === 'VARIABLE_EXPENSE') return it.id !== variable[0]?.id;
            if (it.commitmentType === 'REMITTANCE') return !remitHere;
            return true; // MANDATORY_SAVING 등
          }),
        );

        setLoaded(true);
      })
      .catch((e) => setLoadError(errorText(e, t('common.loadInputError'))));
  }, [t]);

  useEffect(() => {
    load();
  }, [load]);

  const toggleRemit = (txnId: number) =>
    setRemitChecked((prev) => {
      const next = new Set(prev);
      if (next.has(txnId)) next.delete(txnId);
      else next.add(txnId);
      return next;
    });

  const setFixedValue = (key: string, text: string) =>
    setFixedRows((rows) => rows.map((r) => (r.key === key ? { ...r, value: onlyNumber(text) } : r)));

  // 다음 전에 저장. 여기서 throw 하면 다음 단계로 가지 않고 navError 로 표시됨
  const save = async () => {
    // 1) 목돈 목표 금액·시점 (전체 교체라 다른 목표도 그대로 다시 보냄)
    if (showLump) {
      const lump = goals.find((g) => g.goalType === 'LUMP_SUM');
      let amount: number | null = lump?.targetAmount?.amount ?? null;
      if (savingsTarget === 'custom') {
        amount = parseMan(customAmount);
        if (amount == null) throw new Error(t('onboarding.questions.amountRequired'));
      } else if (savingsTarget) {
        amount = Number(savingsTarget) * MAN;
      }
      await saveGoals({
        goals: goals.map((g) =>
          g.goalType === 'LUMP_SUM'
            ? {
                goalType: g.goalType,
                targetAmount: amount != null ? { amount, currency: 'KRW' } : null,
                // 시점은 체류 만료일 (Figma "만료 전 달성"). 등록증 확정 전이면 기존 값 유지
                targetDate: visa?.stayExpiresOn ?? g.targetDate,
              }
            : { goalType: g.goalType, targetAmount: g.targetAmount, targetDate: g.targetDate },
        ),
      });
    }

    // 2) 필수 확보액 (전체 교체)
    const items: CommitmentSaveItem[] = [];
    fixedRows.forEach((r) => {
      const won = parseMan(r.value);
      if (won != null) items.push({ commitmentType: r.type, label: r.label, amount: { amount: won, currency: 'KRW' } });
    });
    const varWon = parseMan(varExpense);
    if (varWon != null) {
      items.push({ commitmentType: 'VARIABLE_EXPENSE', label: '변동지출', amount: { amount: varWon, currency: 'KRW' } });
    }
    if (remitManaged) {
      candidates
        .filter((c) => remitChecked.has(c.lastTransactionId))
        .forEach((c) =>
          items.push({
            commitmentType: 'REMITTANCE',
            label: c.sameNameAsUser ? '본인 명의 계좌' : c.counterpartyName,
            amount: c.avgMonthlyAmount,
            source: 'DETECTED_CONFIRMED',
            detectedFromTxnId: c.lastTransactionId,
          }),
        );
    }
    keepItems.forEach((it) =>
      items.push({
        commitmentType: it.commitmentType,
        label: it.label,
        amount: it.amount,
        source: it.source,
        detectedFromTxnId: it.detectedFromTxnId,
      }),
    );
    await saveCommitments({ items });
  };

  // 보이는 섹션 순서대로 "목표 01" 번호를 다시 매김
  let sectionNo = 0;
  const nextNo = () => t('onboarding.questions.goalNo', { no: String(++sectionNo).padStart(2, '0') });

  const footer = (
    <>
      {navError ? <Text style={styles.navError}>{navError}</Text> : null}
      <Button
        title={
          isNavigating
            ? t('common.processing')
            : !loaded
              ? t('onboarding.questions.loading')
              : t('onboarding.questions.submit')
        }
        showArrow={!isNavigating && loaded}
        onPress={() => goNext(save)}
        disabled={!loaded || isNavigating}
      />
    </>
  );

  // Screen 이 키보드 회피(KeyboardAvoidingView)·스크롤·하단 footer 를 공통으로 처리한다
  return (
    <Screen footer={footer} contentStyle={styles.content}>
        {/* 단계 진행: 도트+선 방식, 현재 3단계 */}
        <View style={styles.progressWrap}>
          <OnboardingProgress current={stage} total={totalStages} />
        </View>

        <View style={styles.titleArea}>
          <Text style={styles.title}>{t('onboarding.questions.title')}</Text>
          <Text style={styles.subtitle}>
            {user
              ? t('onboarding.questions.subtitleUser', { name: firstName(user.displayName) })
              : t('onboarding.questions.subtitleGuest')}
          </Text>
        </View>

        {/* 사용자 정보 미니 배너 (요약을 못 불러오면 숨김) */}
        {user ? (
          <View style={styles.userBanner}>
            <View style={styles.userAvatar}>
              <Text style={styles.userInitial}>{initials(user.displayName)}</Text>
            </View>
            <View style={styles.userInfo}>
              <View style={styles.userNameRow}>
                <Text style={styles.userName}>{t('onboarding.questions.userName', { name: user.displayName })}</Text>
                {user.nationalityCode ? (
                  <View style={styles.countryTag}>
                    <Text style={styles.countryTagText}>{user.nationalityCode}</Text>
                  </View>
                ) : null}
              </View>
              {visa ? (
                <Text style={styles.userSub}>
                  {`${t('onboarding.questions.stayExpiry', { date: fmtDate(visa.stayExpiresOn) })}${visa.monthsRemaining != null ? t('onboarding.questions.monthsLeft', { months: visa.monthsRemaining }) : ''} (${visa.visaTypeCode})`}
                </Text>
              ) : null}
            </View>
          </View>
        ) : null}

        {!loaded ? (
          <View style={styles.section}>
            {loadError ? (
              <>
                <Text style={styles.helperText}>{loadError}</Text>
                <Pressable style={styles.remitEditBtn} onPress={load}>
                  <Text style={styles.remitEditText}>{t('common.reload')}</Text>
                </Pressable>
              </>
            ) : (
              <SkeletonGroup gap={spacing.md}>
                <Skeleton width="60%" height={20} />
                <Skeleton height={48} round={radius.md} />
                <Skeleton height={48} round={radius.md} />
                <Skeleton width="50%" height={20} />
                <Skeleton height={48} round={radius.md} />
              </SkeletonGroup>
            )}
          </View>
        ) : (
          <>
            {/* 목돈 마련 ("목돈 마련"을 고른 경우만) */}
            {showLump ? (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.goalLabel}>{nextNo()}</Text>
                  <Text style={styles.sectionQ}>{t('onboarding.questions.lumpQ')}</Text>
                </View>
                <View style={styles.chipGrid}>
                  {[0, 2].map((rowStart) => (
                    <View key={rowStart} style={styles.chipRow}>
                      {AMOUNT_OPTIONS.slice(rowStart, rowStart + 2).map((opt) => {
                        const on = savingsTarget === opt.key;
                        return (
                          <Pressable
                            key={opt.key}
                            style={[styles.chip, on && styles.chipOn]}
                            onPress={() => setSavingsTarget(opt.key)}
                          >
                            {on && <Ionicons name="checkmark" size={13} color={colors.text.inverse} />}
                            <Text style={[styles.chipText, on && styles.chipTextOn]}>{t(`onboarding.questions.${opt.label}`)}</Text>
                          </Pressable>
                        );
                      })}
                    </View>
                  ))}
                </View>
                {savingsTarget === 'custom' ? (
                  <View style={styles.expenseRow}>
                    <View style={styles.expenseLeft}>
                      <Text style={styles.expenseLabel}>{t('onboarding.questions.lumpAmount')}</Text>
                    </View>
                    <AmountField value={customAmount} onChangeText={(t) => setCustomAmount(onlyNumber(t))} />
                  </View>
                ) : null}
                {visa ? (
                  <Text style={styles.helperText}>
                    {t('onboarding.questions.lumpHelper', { date: fmtDate(visa.stayExpiresOn) })}
                  </Text>
                ) : null}
              </View>
            ) : null}

            {/* 본국 송금 ("본국 송금"을 고른 경우만) */}
            {showRemit ? (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.goalLabel}>{nextNo()}</Text>
                  {/* 이력이 없으면 "찾아봤어요"가 아래 안내와 안 맞아서 질문 한 줄만 */}
                  <Text style={styles.sectionQ}>
                    {candidates.length > 0
                      ? t('onboarding.questions.remitQFound')
                      : t('onboarding.questions.remitQ')}
                  </Text>
                </View>
                {candidates.length > 0 ? (
                  <>
                    <View style={styles.mydataBadge}>
                      <Text style={styles.mydataBadgeText}>{t('onboarding.questions.remitBadge')}</Text>
                    </View>
                    <View style={styles.remitList}>
                      {candidates.map((c) => {
                        const on = remitChecked.has(c.lastTransactionId);
                        return (
                          <Pressable key={c.lastTransactionId} style={styles.remitCard} onPress={() => toggleRemit(c.lastTransactionId)}>
                            <View style={styles.remitLeft}>
                              <View style={styles.remitNameRow}>
                                <Text style={styles.remitName}>
                                  {c.sameNameAsUser ? t('commitmentLabels.ownAccount') : c.counterpartyName}
                                </Text>
                                {c.counterpartyBank ? (
                                  <View style={styles.bankTag}>
                                    <Text style={styles.bankTagText}>{c.counterpartyBank}</Text>
                                  </View>
                                ) : null}
                              </View>
                              <Text style={styles.remitDesc}>
                                {t('onboarding.questions.remitDesc', {
                                  months: c.monthsSent,
                                  amount: fmtNumber(c.avgMonthlyAmount.amount),
                                })}
                              </Text>
                            </View>
                            <Ionicons
                              name={on ? 'checkbox' : 'square-outline'}
                              size={20}
                              color={on ? colors.primary : colors.border}
                            />
                          </Pressable>
                        );
                      })}
                    </View>
                  </>
                ) : (
                  <Text style={styles.helperText}>{t('onboarding.questions.remitNoData')}</Text>
                )}
              </View>
            ) : null}

            {/* 고정 생활비 (항상) */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.goalLabel}>{nextNo()}</Text>
                <Text style={styles.sectionQ}>{t('onboarding.questions.fixedQ')}</Text>
              </View>
              <View style={styles.expenseList}>
                {fixedRows.map((row) => (
                  <View key={row.key} style={styles.expenseRow}>
                    <View style={styles.expenseLeft}>
                      <Text style={styles.expenseLabel}>{commitmentLabel(row.label)}</Text>
                      {row.sub ? <Text style={styles.expenseSub}>{t(`onboarding.questions.${row.sub}`)}</Text> : null}
                    </View>
                    <AmountField value={row.value} onChangeText={(t) => setFixedValue(row.key, t)} />
                  </View>
                ))}
              </View>
              <Text style={styles.helperText}>{t('onboarding.questions.fixedHelper')}</Text>
            </View>

            {/* 변동 지출 (항상) */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.goalLabel}>{nextNo()}</Text>
                <Text style={styles.sectionQ}>{t('onboarding.questions.varQ')}</Text>
              </View>
              <View style={styles.expenseList}>
                <View style={styles.expenseRow}>
                  <View style={styles.expenseLeft}>
                    <Text style={styles.expenseLabel}>{t('onboarding.questions.varLabel')}</Text>
                    <Text style={styles.expenseSub}>{t('onboarding.questions.varSub')}</Text>
                  </View>
                  <AmountField value={varExpense} onChangeText={(t) => setVarExpense(onlyNumber(t))} />
                </View>
              </View>
              <Text style={styles.helperText}>{t('onboarding.questions.varHelper')}</Text>
            </View>
          </>
        )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  // Screen 기본 여백(사방 xl, 간격 lg)을 덮어씀: 위쪽 여백 없음, 섹션 간격 xl
  content: { paddingTop: 0, gap: spacing.xl },

  progressWrap: { paddingTop: spacing.md },

  titleArea: { gap: 6 },
  title: { ...typography.h2, color: colors.text.strong },
  subtitle: { ...typography.body, color: colors.text.sub },

  userBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.background,
    borderRadius: radius.lg,
    padding: 14,
  },
  userAvatar: {
    width: 40,
    height: 40,
    borderRadius: radius.full,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  userInitial: { ...typography.title, color: colors.text.inverse },
  userInfo: { flex: 1, gap: 4 }, // 영어 이름·체류 문구가 길면 배너 안에서 줄바꿈
  userNameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  userName: { ...typography.body, fontFamily: fonts.bold, color: colors.text.strong, flexShrink: 1 },
  countryTag: {
    backgroundColor: colors.primary,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    flexShrink: 0,
  },
  countryTagText: { ...typography.badge, color: colors.text.inverse },
  userSub: { ...typography.body, color: colors.text.sub },

  section: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.xl,
    gap: 14,
  },
  sectionHeader: { gap: 4 },
  goalLabel: {
    ...typography.badge,
    fontFamily: fonts.bold,
    color: colors.primary,
    textTransform: 'uppercase' as const,
  },
  sectionQ: { ...typography.h3, color: colors.text.strong },

  chipGrid: { gap: spacing.sm },
  chipRow: { flexDirection: 'row', gap: spacing.sm },
  chip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    backgroundColor: colors.background,
    borderRadius: radius.md,
    paddingVertical: 12,
  },
  chipOn: { backgroundColor: colors.primary },
  chipText: { ...typography.body, fontFamily: fonts.bold, color: colors.text.strong, flexShrink: 1, textAlign: 'center' },
  chipTextOn: { color: colors.text.inverse },

  mydataBadge: {
    alignSelf: 'flex-start',
    backgroundColor: colors.background,
    borderRadius: radius.full,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  mydataBadgeText: { ...typography.badge, color: colors.text.strong },

  remitList: { gap: 10 },
  remitCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.background,
    borderRadius: radius.lg,
    padding: 14,
    gap: spacing.md,
  },
  remitLeft: { flex: 1, gap: 2 }, // 영어 설명이 길어도 오른쪽 체크박스를 밀어내지 않게
  remitNameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  remitName: { ...typography.body, fontFamily: fonts.bold, color: colors.text.strong, flexShrink: 1 },
  bankTag: {
    backgroundColor: colors.border,
    paddingHorizontal: 4,
    borderRadius: 4,
    flexShrink: 0,
  },
  bankTagText: { ...typography.badge, color: colors.text.sub },
  remitDesc: { ...typography.body, color: colors.text.sub },
  remitEditBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: colors.background,
    borderRadius: radius.md,
    paddingVertical: 10,
  },
  remitEditText: { ...typography.body, fontFamily: fonts.bold, color: colors.primary },

  expenseList: { gap: 10 },
  expenseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.background,
    borderRadius: radius.lg,
    padding: 14,
    gap: spacing.md,
  },
  expenseLeft: { flex: 1, gap: 4 }, // 영어 항목 이름이 길면 줄바꿈, 금액 칸은 그대로
  expenseLabel: { ...typography.body, fontFamily: fonts.bold, color: colors.text.strong },
  expenseSub: { ...typography.body, color: colors.text.sub },
  amountBadge: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    paddingHorizontal: 12,
    paddingVertical: 6,
    // 테두리는 항상 같은 두께(평소 투명) → 포커스로 색만 바뀌어도 칸 크기가 그대로
    borderWidth: 1.5,
    borderColor: 'transparent',
    flexShrink: 0,
  },
  amountBadgeFocused: { borderColor: colors.primary },
  amountNum: { ...typography.body, fontFamily: fonts.bold, color: colors.text.strong },
  amountUnit: { ...typography.badge, color: colors.text.sub },
  amountInput: {
    ...typography.body,
    fontFamily: fonts.bold,
    color: colors.text.strong,
    minWidth: 30,
    padding: 0,
    textAlign: 'right' as const,
  },
  // 빈 칸: placeholder 는 입력칸 글꼴을 그대로 써서 Medium 으로 낮춘다 (크기는 같음)
  amountInputEmpty: { fontFamily: fonts.medium },

  helperText: { ...typography.caption, color: colors.text.sub },

  navError: { ...typography.body, color: colors.errorText, textAlign: 'center', marginBottom: spacing.sm },
});
