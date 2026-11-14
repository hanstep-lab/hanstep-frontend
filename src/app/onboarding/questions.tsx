import { useState } from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Header from '../../components/Header';
import Button from '../../components/Button';
import { useOnboardingStep } from '../../hooks/useOnboardingStep';
import { colors, typography, spacing, radius, fonts } from '../../constants/theme';

const AMOUNT_OPTIONS = [
  { key: '200', label: '200만원' },
  { key: '400', label: '400만원' },
  { key: '600', label: '600만원' },
  { key: 'custom', label: '직접 입력' },
];

const REMITTANCES = [
  { name: 'Nguyen Thi Mai',  bank: 'Vietcombank', desc: '매월 송금 · 월 평균 500,000원' },
  { name: '본인 명의 계좌',  bank: 'Techcombank', desc: '매월 송금 · 월 평균 200,000원' },
];

const EXPENSES = [
  { label: '월세',       sub: '원룸 자동이체 연결',       amount: '40' },
  { label: '공과금',     sub: '도시가스, 건물 관리비 등',  amount: '7' },
  { label: '전기 / 수도세', sub: '계절별 평균 지출액',    amount: '5' },
];

export default function QuestionsScreen() {
  const { goNext, isNavigating, navError } = useOnboardingStep();

  const [savingsTarget, setSavingsTarget] = useState<string | null>(null);
  const [remitChecks, setRemitChecks] = useState([true, true]);
  const [autoTransfer, setAutoTransfer] = useState(true);
  const [varExpense, setVarExpense] = useState('');

  const toggleRemit = (i: number) =>
    setRemitChecks((prev) => prev.map((v, j) => (j === i ? !v : v)));

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <Header title="신한걸음" showBack />

      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
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
          <Text style={styles.subtitle}>{'Nguyen님의 상황에 맞춰\n지출·저축 루틴을 제안해 드릴게요.'}</Text>
        </View>

        {/* 사용자 정보 미니 배너 */}
        <View style={styles.userBanner}>
          <View style={styles.userAvatar}>
            <Text style={styles.userInitial}>NV</Text>
          </View>
          <View style={styles.userInfo}>
            <View style={styles.userNameRow}>
              <Text style={styles.userName}>Nguyen Van Minh 님</Text>
              <View style={styles.countryTag}>
                <Text style={styles.countryTagText}>베트남</Text>
              </View>
            </View>
            <Text style={styles.userSub}>체류 만료 2027.10.04 · 약 10개월 남음 (E-9)</Text>
          </View>
        </View>

        {/* 섹션 1: 목돈 마련 */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.goalLabel}>목표 01</Text>
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
        </View>

        {/* 섹션 2: 본국 송금 */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.goalLabel}>목표 02</Text>
            <Text style={styles.sectionQ}>{'이전 송금 이력을 분석했어요.\n이 지출이 맞나요?'}</Text>
          </View>
          <View style={styles.mydataBadge}>
            <Text style={styles.mydataBadgeText}>마이데이터 신한 해외송금 Top 3</Text>
          </View>
          <View style={styles.remitList}>
            {REMITTANCES.map((r, i) => (
              <Pressable key={i} style={styles.remitCard} onPress={() => toggleRemit(i)}>
                <View style={styles.remitLeft}>
                  <View style={styles.remitNameRow}>
                    <Text style={styles.remitName}>{r.name}</Text>
                    <View style={styles.bankTag}>
                      <Text style={styles.bankTagText}>{r.bank}</Text>
                    </View>
                  </View>
                  <Text style={styles.remitDesc}>{r.desc}</Text>
                </View>
                <Ionicons
                  name={remitChecks[i] ? 'checkbox' : 'square-outline'}
                  size={20}
                  color={remitChecks[i] ? colors.primary : colors.border}
                />
              </Pressable>
            ))}
          </View>
          <Pressable style={styles.remitEditBtn}>
            <Ionicons name="add-circle-outline" size={15} color={colors.primary} />
            <Text style={styles.remitEditText}>송금처 추가 / 수정</Text>
          </Pressable>
        </View>

        {/* 섹션 3: 고정 생활비 */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.goalLabel}>목표 03</Text>
            <Text style={styles.sectionQ}>{'매달 고정 생활비를\n알려주세요'}</Text>
          </View>
          <View style={styles.expenseList}>
            {EXPENSES.map((exp) => (
              <View key={exp.label} style={styles.expenseRow}>
                <View style={styles.expenseLeft}>
                  <Text style={styles.expenseLabel}>{exp.label}</Text>
                  <Text style={styles.expenseSub}>{exp.sub}</Text>
                </View>
                <View style={styles.amountBadge}>
                  <Text style={styles.amountNum}>{exp.amount}</Text>
                  <Text style={styles.amountUnit}>만원</Text>
                </View>
              </View>
            ))}
          </View>
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

        {/* 섹션 4: 변동 지출 */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.goalLabel}>목표 04</Text>
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
                  onChangeText={setVarExpense}
                  placeholder="입력"
                  placeholderTextColor={colors.text.sub}
                  keyboardType="numeric"
                  maxLength={4}
                />
                <Text style={styles.amountUnit}>만원</Text>
              </View>
            </View>
          </View>
          <Text style={styles.helperText}>
            거래 내역이 있으면 지출 범위(최소~최대)를 자동으로 계산해 드려요.
          </Text>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        {navError ? <Text style={styles.navError}>{navError}</Text> : null}
        <Button
          title={isNavigating ? '처리 중...' : '세부 설정 완료하고 요약 확인하기'}
          showArrow={!isNavigating}
          onPress={() => goNext()}
          disabled={isNavigating}
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

  footer: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    backgroundColor: colors.background,
  },
  navError: { ...typography.body, color: colors.errorText, textAlign: 'center', marginBottom: spacing.sm },
});
