// ON-005 목표별 상세 질문. 들어올 때 목표(GOL-01)·필수 확보액(CMT-01)·송금 이력(CMT-03)·요약(ONB-04)을 불러오고,
// 다음: PUT /goals(목돈 금액·시점) → PUT /commitments(고정·변동 지출, 송금) → POST /steps/GOAL_DETAILS
// 목돈 섹션은 "목돈 마련", 송금 섹션은 "본국 송금"을 골랐을 때만 보인다. 고정·변동 지출은 여유자금 계산에 필요해서 항상 보인다.

import { useCallback, useEffect, useState } from 'react';
import { View, Text, Pressable, StyleSheet, TextInput, Alert, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Screen from '../../components/Screen';
import Button from '../../components/Button';
import { useOnboardingStep } from '../../hooks/useOnboardingStep';
import { getGoals, saveGoals } from '../../api/goals';
import { getCommitments, getRemittanceCandidates, saveCommitments } from '../../api/commitments';
import { getOnboardingSummary } from '../../api/onboarding';
import { colors, typography, spacing, radius, fonts } from '../../constants/theme';
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

const MAN = 10_000;

// 목돈 금액 칩. key 는 만 원 단위
const AMOUNT_OPTIONS = [
  { key: '200', label: '200만원' },
  { key: '400', label: '400만원' },
  { key: '600', label: '600만원' },
  { key: 'custom', label: '직접 입력' },
];

// 고정 생활비 기본 줄 (Figma). 같은 유형 여러 줄 가능해서 이름(label)으로 구분
const DEFAULT_FIXED = [
  { type: 'RENT' as CommitmentType, label: '월세', sub: '원룸 자동이체 연결' },
  { type: 'UTILITY' as CommitmentType, label: '공과금', sub: '도시가스, 건물 관리비 등' },
  { type: 'UTILITY' as CommitmentType, label: '전기 / 수도세', sub: '계절별 평균 지출액' },
];

// 고정 생활비로 묶이는 유형 (서버 totals.fixedLiving 기준과 같음)
const FIXED_TYPES: CommitmentType[] = ['RENT', 'UTILITY', 'TELECOM', 'LIVING_MINIMUM', 'OTHER'];

type ExpenseRow = { key: string; type: CommitmentType; label: string; sub: string; value: string };

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

// 숫자와 소수점만 남김
const onlyNumber = (t: string) => t.replace(/[^\d.]/g, '');

// "MARK ANTHONY REYES" → "Mark"
function firstName(displayName: string): string {
  const w = displayName.trim().split(/\s+/)[0] ?? '';
  return w ? w[0].toUpperCase() + w.slice(1).toLowerCase() : '';
}

function initials(displayName: string): string {
  const words = displayName.trim().split(/\s+/);
  const last = words.length > 1 ? words[words.length - 1] : '';
  return ((words[0]?.[0] ?? '') + (last ? last[0] : '')).toUpperCase();
}

export default function QuestionsScreen() {
  const { goNext, isNavigating, navError } = useOnboardingStep();

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
  const [autoTransfer, setAutoTransfer] = useState(true); // 저장 API 없음 (화면에만)

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
              sub: '이전에 입력한 항목',
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
      .catch((e) => setLoadError(e?.message ?? '입력하신 정보를 불러오지 못했어요.'));
  }, []);

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
        if (amount == null) throw new Error('모으고 싶은 금액을 만 원 단위 숫자로 입력해 주세요.');
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
  const nextNo = () => `목표 ${String(++sectionNo).padStart(2, '0')}`;

  const footer = (
    <>
      {navError ? <Text style={styles.navError}>{navError}</Text> : null}
      <Button
        title={isNavigating ? '처리 중...' : !loaded ? '불러오는 중...' : '세부 설정 완료하고 요약 확인하기'}
        showArrow={!isNavigating && loaded}
        onPress={() => goNext(save)}
        disabled={!loaded || isNavigating}
      />
    </>
  );

  // Screen 이 키보드 회피(KeyboardAvoidingView)·스크롤·하단 footer 를 공통으로 처리한다
  return (
    <Screen title="신한걸음" footer={footer} contentStyle={styles.content}>
        {/* 단계 진행: 도트+선 방식, 현재 3단계 */}
        <View style={styles.progressRow}>
          <View style={styles.stepLine}>
            <View style={[styles.stepDot, styles.stepDone]} />
            <View style={[styles.stepConn, styles.connDone]} />
            <View style={[styles.stepDot, styles.stepDone]} />
            <View style={[styles.stepConn, styles.connDone]} />
            <View style={styles.stepCurrent}>
              <View style={styles.stepCurrentInner} />
            </View>
            <View style={[styles.stepConn, styles.connOff]} />
            <View style={[styles.stepDot, styles.stepOff]} />
          </View>
          <View style={styles.stepLabelPill}>
            <Text style={styles.stepLabelNum}>3</Text>
            <Text style={styles.stepLabelTotal}> / 4 단계</Text>
          </View>
        </View>

        <View style={styles.titleArea}>
          <Text style={styles.title}>{'선택하신 목표에 대한\n맞춤 질문이에요'}</Text>
          <Text style={styles.subtitle}>
            {`${user ? `${firstName(user.displayName)}님` : '회원님'}의 상황에 맞춰\n지출·저축 루틴을 제안해 드릴게요.`}
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
                <Text style={styles.userName}>{user.displayName} 님</Text>
                {user.nationalityCode ? (
                  <View style={styles.countryTag}>
                    <Text style={styles.countryTagText}>{user.nationalityCode}</Text>
                  </View>
                ) : null}
              </View>
              {visa ? (
                <Text style={styles.userSub}>
                  {`체류 만료 ${fmtDate(visa.stayExpiresOn)}${visa.monthsRemaining != null ? ` · 약 ${visa.monthsRemaining}개월 남음` : ''} (${visa.visaTypeCode})`}
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
                  <Text style={styles.remitEditText}>다시 불러오기</Text>
                </Pressable>
              </>
            ) : (
              <ActivityIndicator color={colors.primary} />
            )}
          </View>
        ) : (
          <>
            {/* 목돈 마련 ("목돈 마련"을 고른 경우만) */}
            {showLump ? (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.goalLabel}>{nextNo()}</Text>
                  <Text style={styles.sectionQ}>{'한국에서 얼마를 모으고\n싶으신가요?'}</Text>
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
                            <Text style={[styles.chipText, on && styles.chipTextOn]}>{opt.label}</Text>
                          </Pressable>
                        );
                      })}
                    </View>
                  ))}
                </View>
                {savingsTarget === 'custom' ? (
                  <View style={styles.expenseRow}>
                    <View style={styles.expenseLeft}>
                      <Text style={styles.expenseLabel}>모으고 싶은 금액</Text>
                    </View>
                    <View style={styles.amountBadge}>
                      <TextInput
                        style={styles.amountInput}
                        value={customAmount}
                        onChangeText={(t) => setCustomAmount(onlyNumber(t))}
                        placeholder="입력"
                        placeholderTextColor={colors.text.sub}
                        keyboardType="numeric"
                        maxLength={6}
                      />
                      <Text style={styles.amountUnit}>만원</Text>
                    </View>
                  </View>
                ) : null}
                {visa ? (
                  <Text style={styles.helperText}>체류 만료일({fmtDate(visa.stayExpiresOn)})까지 모으는 목표로 저장돼요.</Text>
                ) : null}
              </View>
            ) : null}

            {/* 본국 송금 ("본국 송금"을 고른 경우만) */}
            {showRemit ? (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.goalLabel}>{nextNo()}</Text>
                  <Text style={styles.sectionQ}>{'이전 송금 이력을 분석했어요.\n이 지출이 맞나요?'}</Text>
                </View>
                {candidates.length > 0 ? (
                  <>
                    <View style={styles.mydataBadge}>
                      <Text style={styles.mydataBadgeText}>마이데이터 신한 해외송금 Top 3</Text>
                    </View>
                    <View style={styles.remitList}>
                      {candidates.map((c) => {
                        const on = remitChecked.has(c.lastTransactionId);
                        return (
                          <Pressable key={c.lastTransactionId} style={styles.remitCard} onPress={() => toggleRemit(c.lastTransactionId)}>
                            <View style={styles.remitLeft}>
                              <View style={styles.remitNameRow}>
                                <Text style={styles.remitName}>{c.sameNameAsUser ? '본인 명의 계좌' : c.counterpartyName}</Text>
                                {c.counterpartyBank ? (
                                  <View style={styles.bankTag}>
                                    <Text style={styles.bankTagText}>{c.counterpartyBank}</Text>
                                  </View>
                                ) : null}
                              </View>
                              <Text style={styles.remitDesc}>
                                {`최근 ${c.monthsSent}개월 송금 · 월 평균 ${fmtNumber(c.avgMonthlyAmount.amount)}원`}
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
                  <Text style={styles.helperText}>마이데이터를 연결하면 송금 이력을 분석해 드려요.</Text>
                )}
                <Pressable style={styles.remitEditBtn} onPress={() => Alert.alert('준비 중', '곧 사용할 수 있어요.')}>
                  <Ionicons name="add-circle-outline" size={15} color={colors.primary} />
                  <Text style={styles.remitEditText}>송금처 추가 / 수정</Text>
                </Pressable>
              </View>
            ) : null}

            {/* 고정 생활비 (항상) */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.goalLabel}>{nextNo()}</Text>
                <Text style={styles.sectionQ}>{'매달 고정 생활비를\n알려주세요'}</Text>
              </View>
              <View style={styles.expenseList}>
                {fixedRows.map((row) => (
                  <View key={row.key} style={styles.expenseRow}>
                    <View style={styles.expenseLeft}>
                      <Text style={styles.expenseLabel}>{row.label}</Text>
                      <Text style={styles.expenseSub}>{row.sub}</Text>
                    </View>
                    <View style={styles.amountBadge}>
                      <TextInput
                        style={styles.amountInput}
                        value={row.value}
                        onChangeText={(t) => setFixedValue(row.key, t)}
                        placeholder="입력"
                        placeholderTextColor={colors.text.sub}
                        keyboardType="numeric"
                        maxLength={6}
                      />
                      <Text style={styles.amountUnit}>만원</Text>
                    </View>
                  </View>
                ))}
              </View>
              <Text style={styles.helperText}>비워 두면 저장하지 않아요.</Text>
              {/* 자동이체 등록 API 없음: 화면 표시만 */}
              <Pressable style={styles.autoTransferBox} onPress={() => setAutoTransfer((v) => !v)}>
                <View style={styles.autoTransferLeft}>
                  <Ionicons name="swap-horizontal-outline" size={18} color={colors.text.inverse} />
                  <View>
                    <Text style={styles.autoTransferTitle}>신한 계좌 자동이체 등록</Text>
                    <Text style={styles.autoTransferSub}>납부일 연체 방지 알림</Text>
                  </View>
                </View>
                <View style={styles.toggleTrack}>
                  <View style={[styles.toggleThumb, autoTransfer && styles.toggleThumbOn]} />
                </View>
              </Pressable>
            </View>

            {/* 변동 지출 (항상) */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.goalLabel}>{nextNo()}</Text>
                <Text style={styles.sectionQ}>{'매달 변동 지출은\n대략 얼마인가요?'}</Text>
              </View>
              <View style={styles.expenseList}>
                <View style={styles.expenseRow}>
                  <View style={styles.expenseLeft}>
                    <Text style={styles.expenseLabel}>변동 지출</Text>
                    <Text style={styles.expenseSub}>식비 · 교통 · 여가 등</Text>
                  </View>
                  <View style={styles.amountBadge}>
                    <TextInput
                      style={styles.amountInput}
                      value={varExpense}
                      onChangeText={(t) => setVarExpense(onlyNumber(t))}
                      placeholder="입력"
                      placeholderTextColor={colors.text.sub}
                      keyboardType="numeric"
                      maxLength={6}
                    />
                    <Text style={styles.amountUnit}>만원</Text>
                  </View>
                </View>
              </View>
              <Text style={styles.helperText}>
                거래 내역이 있으면 지출 범위(최소~최대)를 자동으로 계산해 드려요.
              </Text>
            </View>
          </>
        )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  // Screen 기본 여백(사방 xl, 간격 lg)을 덮어씀: 위쪽 여백 없음, 섹션 간격 xl
  content: { paddingTop: 0, gap: spacing.xl },

  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: spacing.md,
  },
  stepLine: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  stepDot: { width: 10, height: 10, borderRadius: radius.full },
  stepDone: { backgroundColor: colors.primary },
  stepOff:  { backgroundColor: colors.border },
  stepConn: { width: 20, height: 2 },
  connDone: { backgroundColor: colors.primary },
  connOff:  { backgroundColor: colors.border },
  stepCurrent: {
    width: 12,
    height: 12,
    borderRadius: radius.full,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepCurrentInner: {
    width: 6,
    height: 6,
    borderRadius: radius.full,
    backgroundColor: colors.surface,
  },
  stepLabelPill: {
    flexDirection: 'row',
    alignItems: 'baseline',
    backgroundColor: colors.background,
    borderRadius: radius.full,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  stepLabelNum: { ...typography.badge, fontFamily: fonts.bold, color: colors.primary },
  stepLabelTotal: { ...typography.badge, color: colors.text.sub },

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
  },
  userInitial: { ...typography.title, color: colors.text.inverse },
  userInfo: { gap: 4 },
  userNameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  userName: { ...typography.body, fontFamily: fonts.bold, color: colors.text.strong },
  countryTag: {
    backgroundColor: colors.primary,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
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
  chipText: { ...typography.body, fontFamily: fonts.bold, color: colors.text.strong },
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
  },
  remitLeft: { gap: 2 },
  remitNameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  remitName: { ...typography.body, fontFamily: fonts.bold, color: colors.text.strong },
  bankTag: {
    backgroundColor: colors.border,
    paddingHorizontal: 4,
    borderRadius: 4,
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
  },
  expenseLeft: { gap: 4 },
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
  },
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

  autoTransferBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.primary,
    borderRadius: radius.lg,
    padding: 14,
  },
  autoTransferLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  autoTransferTitle: { ...typography.body, fontFamily: fonts.bold, color: colors.text.inverse },
  autoTransferSub: { ...typography.badge, color: colors.onColor.sub },

  toggleTrack: {
    width: 44,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.onColor.fillStrong,
    justifyContent: 'center',
    padding: 2,
  },
  toggleThumb: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.surface,
    alignSelf: 'flex-start' as const,
  },
  toggleThumbOn: { alignSelf: 'flex-end' as const },

  helperText: { ...typography.caption, color: colors.text.sub },

  navError: { ...typography.body, color: colors.errorText, textAlign: 'center', marginBottom: spacing.sm },
});
