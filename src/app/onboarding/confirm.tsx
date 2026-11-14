import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import Header from '../../components/Header';
import Button from '../../components/Button';
import { useOnboardingStep } from '../../hooks/useOnboardingStep';
import { colors, typography, spacing, radius, fonts } from '../../constants/theme';

const GOALS = [
  {
    label: '목돈 마련 플랜',
    amount: '600만 원',
    amountBlue: true,
    sub: '2027.10 만료 전 달성 · 월 60만 원씩',
  },
  {
    label: '본국 정기 송금',
    amount: '월 70만 원',
    amountBlue: false,
    sub: 'Vietcombank 외 1건',
  },
  {
    label: '고정 생활비',
    amount: '월 52만 원',
    amountBlue: false,
    sub: '월세 40만 · 공과금 7만 · 전기수도 5만',
  },
];

const BALANCE_ROWS = [
  { color: colors.primary, label: '고정 지출',               amount: '520,000원',   amountBlue: false },
  { color: colors.primary,  label: '본국 송금',               amount: '700,000원',   amountBlue: false },
  { color: colors.disabled, label: '변동 지출 (식비·교통 등)',  amount: '약 450,000원', amountBlue: false },
  { color: colors.primary, label: '여유자금 (사용 가능 자금)', amount: '약 680,000원', amountBlue: true },
];

export default function ConfirmScreen() {
  const { goNext, isNavigating, navError } = useOnboardingStep();

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <Header title="신한걸음" showBack />

      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        {/* 단계 진행: 4/4 완료 바 */}
        <View style={styles.progressSection}>
          <View style={styles.progressTop}>
            <View style={styles.progressLeft}>
              <View style={styles.lastBadge}>
                <Text style={styles.lastBadgeText}>마지막 단계</Text>
              </View>
              <Text style={styles.stepCounter}>4 / 4 단계</Text>
            </View>
            <Text style={styles.completeText}>100% 완료</Text>
          </View>
          <View style={styles.barRow}>
            {[0, 1, 2, 3].map((i) => <View key={i} style={styles.barSegment} />)}
          </View>
        </View>

        <View style={styles.titleArea}>
          <Text style={styles.title}>입력하신 정보가 맞나요?</Text>
          <Text style={styles.subtitle}>입력하신 정보로 금융 분석을 시작해요.</Text>
        </View>

        {/* 프로필 카드 */}
        <View style={styles.card}>
          <View style={styles.profileTop}>
            <View style={styles.profileLeft}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>NV</Text>
              </View>
              <View style={styles.profileInfo}>
                <View style={styles.profileNameRow}>
                  <Text style={styles.profileName}>Nguyen Van Minh</Text>
                  <View style={styles.countryTag}>
                    <Text style={styles.countryTagText}>VN</Text>
                  </View>
                </View>
                <Text style={styles.profileNameKo}>응우옌 반 민</Text>
              </View>
            </View>
            <View style={styles.langChip}>
              <Ionicons name="globe-outline" size={12} color={colors.primary} />
              <Text style={styles.langChipText}>한국어</Text>
            </View>
          </View>
          <View style={styles.cardDivider} />
          <View style={styles.infoBoxRow}>
            <View style={styles.infoBox}>
              <Text style={styles.infoBoxLabel}>체류 자격</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <Text style={styles.infoBoxValue}>E-9</Text>
                <Text style={styles.infoBoxValueSub}>비전문취업</Text>
              </View>
            </View>
            <View style={styles.infoBox}>
              <Text style={styles.infoBoxLabel}>체류 유효기간</Text>
              <Text style={[styles.infoBoxValue, { color: colors.primary }]}>잔여 약 10개월</Text>
            </View>
          </View>
        </View>

        {/* 금융 목표 요약 카드 */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>설정한 금융 목표 요약</Text>
          <View style={styles.goalList}>
            {GOALS.map((g) => (
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
        </View>

        {/* 예상 월 금융 밸런스 리포트 */}
        <View style={styles.card}>
          <View style={styles.balanceHeader}>
            <Text style={styles.cardTitle}>예상 월 금융 밸런스 리포트</Text>
            <Text style={styles.balanceNote}>세후 기준</Text>
          </View>
          <View style={styles.incomeBox}>
            <Text style={styles.incomeLabel}>예상 월 수입 (세후)</Text>
            <Text style={styles.incomeAmount}>약 2,350,000원</Text>
          </View>
          <View style={styles.distSection}>
            <View style={styles.distLabelRow}>
              <Text style={styles.distLabel}>자금 배분 비율</Text>
              <Text style={styles.distLabel}>합계 2,350,000원</Text>
            </View>
            <View style={styles.distBar}>
              <View style={[styles.distSeg, { flexGrow: 52, backgroundColor: colors.primary }]} />
              <View style={[styles.distSeg, { flexGrow: 70, backgroundColor: colors.primary }]} />
              <View style={[styles.distSeg, { flexGrow: 45, backgroundColor: colors.disabled }]} />
              <View style={[styles.distSeg, { flexGrow: 68, backgroundColor: colors.primary }]} />
            </View>
          </View>
          <View style={styles.legendList}>
            {BALANCE_ROWS.map((row) => (
              <View key={row.label} style={styles.legendRow}>
                <View style={styles.legendLeft}>
                  <View style={[styles.legendDot, { backgroundColor: row.color }]} />
                  <Text style={styles.legendLabel}>{row.label}</Text>
                </View>
                <Text style={[styles.legendAmount, row.amountBlue && { color: colors.primary }]}>
                  {row.amount}
                </Text>
              </View>
            ))}
            <Text style={styles.balanceFootNote}>
              최근 3개월 평균 저축 230,000원 · 여유자금 안에서 저축 여력이 있어요
            </Text>
          </View>
        </View>

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

  progressSection: { paddingTop: spacing.lg, gap: spacing.sm },
  progressTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  progressLeft: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  lastBadge: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.full,
  },
  lastBadgeText: { ...typography.badge, fontFamily: fonts.medium, color: colors.text.inverse },
  stepCounter: { ...typography.badge, fontFamily: fonts.bold, color: colors.text.sub },
  completeText: { ...typography.badge, fontFamily: fonts.bold, color: colors.primary },
  barRow: { flexDirection: 'row', gap: 6, height: 6 },
  barSegment: { flex: 1, backgroundColor: colors.primary, borderRadius: radius.full },

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

  profileTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  profileLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: radius.full,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { ...typography.h3, color: colors.text.inverse },
  profileInfo: { gap: 4 },
  profileNameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  profileName: { ...typography.subtitle, fontFamily: fonts.bold, color: colors.text.strong },
  countryTag: {
    backgroundColor: colors.background,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: 4,
  },
  countryTagText: { ...typography.badge, color: colors.text.sub },
  profileNameKo: { ...typography.body, color: colors.text.sub },
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

  balanceHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  balanceNote: { ...typography.badge, color: colors.text.sub },
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
  balanceFootNote: { ...typography.caption, fontFamily: fonts.bold, color: colors.text.sub },

  btnBlock: { gap: 12, paddingTop: spacing.sm },
  navError: { ...typography.body, color: colors.errorText, textAlign: 'center' },
});
