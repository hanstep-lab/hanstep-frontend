import { View, Text, ScrollView, Pressable, StyleSheet, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { colors, typography, spacing, radius, fonts } from '../../constants/theme';
import {
  VISA_STATUS,
  SCORE_SUMMARY,
  SCORE_ITEMS,
  ROADMAP_STEPS,
  getDday,
  type ScoreItem,
  type RoadmapStep,
} from '../../api/mock/visa';

function preparingAlert() {
  Alert.alert('준비 중', '곧 사용할 수 있어요.');
}

function StatusCard() {
  const dday = getDday();
  return (
    <View style={s.card}>
      <View style={s.statusTopRow}>
        <Text style={s.sectionLabel}>체류 자격 현황</Text>
        <View style={s.durationBadge}>
          <Text style={s.durationBadgeText}>체류 {VISA_STATUS.stayDuration}차</Text>
        </View>
      </View>

      <View style={s.currentRow}>
        <Text style={s.currentVisa}>현재: {VISA_STATUS.current}</Text>
        <Text style={s.currentLabel}>  {VISA_STATUS.currentLabel}</Text>
      </View>

      <View style={s.divider} />

      <Text style={s.targetSubLabel}>다음 목표</Text>
      <View style={s.targetRow}>
        <Text style={s.targetVisa} numberOfLines={1}>
          {VISA_STATUS.target} ({VISA_STATUS.targetLabel}) 전환
        </Text>
        <Text style={s.ddayText}>체류 만료까지 D-{dday}</Text>
      </View>

      <Text style={s.applicationNote}>신청 가능 시점: {VISA_STATUS.applicationNote}</Text>
    </View>
  );
}

function ScoreItemRow({ item }: { item: ScoreItem }) {
  return (
    <View style={s.scoreItem}>
      <View style={s.scoreItemLeft}>
        <Text style={s.scoreItemLabel}>{item.label}</Text>
        <Text style={s.scoreItemSub}>{item.sub}</Text>
      </View>
      <View style={s.scoreRight}>
        {item.unconfirmedText ? (
          <>
            <Text style={s.scoreValueGray}>{item.scoreText}</Text>
            <Text style={s.unconfirmedText}>{item.unconfirmedText}</Text>
          </>
        ) : (
          <Text style={item.isBonus ? s.scoreBonusValue : s.scoreValue}>
            {item.scoreText}
          </Text>
        )}
      </View>
    </View>
  );
}

function ScoreCard() {
  return (
    <View style={s.card}>
      <View style={s.scoreHeader}>
        <View style={{ flex: 1 }}>
          <Text style={s.cardTitle}>E-7-4 점수 사전진단</Text>
          <Text style={s.draftLabel}>DRAFT 점수표 기준</Text>
        </View>
        <View style={s.totalBox}>
          <Text style={s.totalNum}>{SCORE_SUMMARY.total}</Text>
          <Text style={s.totalUnit}> 점</Text>
        </View>
      </View>

      <View style={s.scoreSubRow}>
        <Text style={s.scoreBase}>
          기본 {SCORE_SUMMARY.base}점 + 가점 {SCORE_SUMMARY.bonus}점
        </Text>
        <Text style={s.scoreNote}>기준 점수: 공식 확인 후 표시</Text>
      </View>

      <View style={s.divider} />

      <Text style={s.scoreDetailTitle}>점수 세부 현황</Text>

      {SCORE_ITEMS.map((item, i) => (
        <ScoreItemRow key={i} item={item} />
      ))}
    </View>
  );
}

function RoadmapStepRow({ step, isLast }: { step: RoadmapStep; isLast: boolean }) {
  const isActive = step.status === 'active';
  return (
    <View style={s.roadmapRow}>
      <View style={s.timelineCol}>
        <View style={[s.dot, isActive && s.dotActive]} />
        {!isLast && <View style={[s.line, isActive && s.lineActive]} />}
      </View>
      <Pressable
        style={[s.roadmapCard, isActive && s.roadmapCardActive, !isLast && s.roadmapCardSpaced]}
        onPress={preparingAlert}
      >
        <View style={s.roadmapTopRow}>
          <View style={[s.stepBadge, isActive && s.stepBadgeActive]}>
            <Text style={[s.stepBadgeText, isActive && s.stepBadgeTextActive]}>
              STEP {step.step} · {step.statusLabel}
            </Text>
          </View>
          <Text style={[s.roadmapTag, isActive && s.roadmapTagActive]}>{step.tag}</Text>
        </View>
        <Text style={[s.roadmapTitle, isActive && s.roadmapTitleActive]}>{step.title}</Text>
        <Text style={s.roadmapDesc}>{step.description}</Text>
      </Pressable>
    </View>
  );
}

function RoadmapSection() {
  return (
    <View>
      <View style={s.roadmapHeader}>
        <Text style={s.sectionTitle}>단계별 로드맵 타임라인</Text>
        <Text style={s.roadmapTotal}>전체 4단계</Text>
      </View>
      {ROADMAP_STEPS.map((step, i) => (
        <RoadmapStepRow key={step.step} step={step} isLast={i === ROADMAP_STEPS.length - 1} />
      ))}
    </View>
  );
}

export default function VisaScreen() {
  return (
    <SafeAreaView style={s.safe} edges={['top', 'bottom']}>
      <View style={s.header}>
        <Pressable style={s.headerTitle} onPress={preparingAlert}>
          <Text style={s.headerTitleText}>신한걸음</Text>
          <Ionicons name="chevron-down" size={16} color={colors.text.strong} />
        </Pressable>
        <View style={s.headerRight}>
          <Pressable onPress={preparingAlert} style={s.headerBtn} hitSlop={8}>
            <Ionicons name="share-outline" size={22} color={colors.text.strong} />
          </Pressable>
          <Pressable onPress={preparingAlert} style={s.headerBtn} hitSlop={8}>
            <Ionicons name="time-outline" size={22} color={colors.text.strong} />
          </Pressable>
          <View style={s.avatar}>
            <Ionicons name="person" size={14} color={colors.text.inverse} />
          </View>
        </View>
      </View>

      <ScrollView
        style={s.scroll}
        contentContainerStyle={s.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={s.pageTitleBlock}>
          <View style={s.guideBadge}>
            <Text style={s.guideBadgeText}>성장 가이드</Text>
          </View>
          <Text style={s.mainTitle}>체류자격 전환 로드맵</Text>
          <Text style={s.mainDesc}>
            마이데이터와 외국인등록증 정보로 계산한 E-7-4(숙련기능인력) 전환 준비 경로입니다.
          </Text>
        </View>

        <StatusCard />
        <ScoreCard />
        <RoadmapSection />
      </ScrollView>

      <View style={s.footer}>
        <Pressable
          style={s.chatBtn}
          onPress={() => router.push('/(tabs)/chat' as any)}
        >
          <Ionicons name="chatbubble-ellipses-outline" size={18} color={colors.text.inverse} />
          <Text style={s.chatBtnText}>신한걸음에 물어보기</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xl,
    paddingVertical: 10,
    backgroundColor: colors.surface,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  headerTitle: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  headerTitleText: { ...typography.h3, color: colors.text.strong },
  headerBtn: { padding: 4 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: radius.full,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },

  scroll: { flex: 1 },
  content: { padding: spacing.xl, gap: spacing.lg, paddingBottom: spacing.xxl },

  pageTitleBlock: { gap: spacing.sm },
  guideBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.md,
    paddingVertical: 4,
    borderRadius: radius.full,
    backgroundColor: colors.primarySoft,
  },
  guideBadgeText: { ...typography.badge, fontFamily: fonts.bold, color: colors.primary },
  mainTitle: { ...typography.h2, color: colors.text.strong },
  mainDesc: { ...typography.body, color: colors.text.sub },

  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.xl,
    gap: spacing.md,
  },

  // 체류 현황
  statusTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionLabel: { ...typography.badge, color: colors.text.sub },
  durationBadge: {
    paddingHorizontal: spacing.md,
    paddingVertical: 4,
    borderRadius: radius.full,
    backgroundColor: colors.primary,
  },
  durationBadgeText: { ...typography.badge, fontFamily: fonts.bold, color: colors.text.inverse },
  currentRow: { flexDirection: 'row', alignItems: 'baseline' },
  currentVisa: { fontSize: 22, fontFamily: fonts.bold, color: colors.text.strong, letterSpacing: -0.44 },
  currentLabel: { ...typography.body, color: colors.text.sub },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: colors.border },
  targetSubLabel: { ...typography.badge, color: colors.text.sub },
  targetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  targetVisa: { ...typography.subtitle, fontFamily: fonts.bold, color: colors.primary, flex: 1 },
  ddayText: { ...typography.subtitle, fontFamily: fonts.bold, color: colors.text.strong },
  applicationNote: { ...typography.badge, color: colors.text.sub, textAlign: 'right' },

  // 점수
  scoreHeader: { flexDirection: 'row', alignItems: 'flex-start' },
  cardTitle: { ...typography.subtitle, fontFamily: fonts.bold, color: colors.text.strong },
  draftLabel: { ...typography.badge, color: colors.text.sub },
  totalBox: { flexDirection: 'row', alignItems: 'baseline' },
  totalNum: { fontSize: 28, fontFamily: fonts.bold, color: colors.primary, letterSpacing: -0.56 },
  totalUnit: { ...typography.subtitle, fontFamily: fonts.bold, color: colors.primary },
  scoreSubRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  scoreBase: { ...typography.badge, color: colors.text.sub },
  scoreNote: { ...typography.badge, color: colors.text.sub },
  scoreDetailTitle: { ...typography.body, fontFamily: fonts.bold, color: colors.text.strong },
  scoreItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingTop: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    gap: spacing.md,
  },
  scoreItemLeft: { flex: 1, gap: 2 },
  scoreItemLabel: { ...typography.body, fontFamily: fonts.bold, color: colors.text.strong },
  scoreItemSub: { ...typography.badge, color: colors.text.sub },
  scoreRight: { alignItems: 'flex-end', gap: 2 },
  scoreValue: { ...typography.body, fontFamily: fonts.bold, color: colors.primary },
  scoreBonusValue: { ...typography.body, fontFamily: fonts.bold, color: colors.primary },
  scoreValueGray: { ...typography.body, color: colors.text.sub },
  unconfirmedText: { ...typography.badge, fontFamily: fonts.bold, color: colors.error },

  // 로드맵
  roadmapHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  sectionTitle: { ...typography.h3, color: colors.text.strong },
  roadmapTotal: { ...typography.badge, color: colors.text.sub },
  roadmapRow: { flexDirection: 'row', gap: spacing.md },
  timelineCol: { alignItems: 'center', width: 16, paddingTop: spacing.lg },
  dot: {
    width: 12,
    height: 12,
    borderRadius: radius.full,
    backgroundColor: colors.border,
    borderWidth: 2,
    borderColor: colors.border,
  },
  dotActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  line: { flex: 1, width: 2, backgroundColor: colors.border, marginTop: 4 },
  lineActive: { backgroundColor: colors.primary },
  roadmapCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  roadmapCardActive: { backgroundColor: colors.primaryLight },
  roadmapCardSpaced: { marginBottom: spacing.md },
  roadmapTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  stepBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.sm,
    backgroundColor: colors.border,
  },
  stepBadgeActive: { backgroundColor: colors.primary },
  stepBadgeText: { ...typography.badge, fontFamily: fonts.bold, color: colors.text.sub },
  stepBadgeTextActive: { color: colors.text.inverse },
  roadmapTag: { ...typography.badge, color: colors.text.sub },
  roadmapTagActive: { ...typography.badge, fontFamily: fonts.bold, color: colors.primary },
  roadmapTitle: { ...typography.title, color: colors.text.strong },
  roadmapTitleActive: { color: colors.primary },
  roadmapDesc: { ...typography.body, color: colors.text.sub },

  footer: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    backgroundColor: colors.background,
  },
  chatBtn: {
    flexDirection: 'row',
    backgroundColor: colors.primary,
    borderRadius: radius.lg,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  chatBtnText: { ...typography.button, color: colors.text.inverse },
});
