// VS-001 체류자격 전환 로드맵. 내용·구성은 Figma 정리안(550:98), 카드 모양은 로드맵 컴포넌트(522:2) 기준.
// 데이터는 src/api/visa.ts 에서만 받고, 점수·D-day·신청 가능일은 서버(Mock) 값을 그대로 보여준다.
// 화면은 GET 만 한다. 저장된 로드맵이 없으면(404) 안내와 [로드맵 만들기] 버튼 → POST → GET 다시.
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router, type Href } from 'expo-router';
import Button from '../../components/Button';
import Header from '../../components/Header';
import Pill from '../../components/Pill';
import ScoreRow from '../../components/ScoreRow';
import StepCard, { STEP_NUMBER_SIZE, STEP_NUMBER_TOP } from '../../components/StepCard';
import { colors, typography, spacing, radius, fonts, shadow } from '../../constants/theme';
import { FadeIn, SkeletonCard, SkeletonGroup } from '../../components/Skeleton';
import { createRoadmap, getVisaScreen, type VisaScreenData, type VisaScreenView } from '../../api/visa';
import type { ApiError } from '../../types/api';

function StatusCard({ status }: { status: VisaScreenView['status'] }) {
  const { t } = useTranslation();
  return (
    <View style={s.statusCard}>
      <View style={s.statusTop}>
        <View style={s.statusLeft}>
          <Text style={s.label}>{t('visa.statusTitle')}</Text>
          <View style={s.currentRow}>
            <Text style={s.currentVisa}>{t('visa.current', { visa: status.current })}</Text>
            {status.currentLabel != null ? (
              <View style={s.grayPill}>
                <Text style={s.label}>{status.currentLabel}</Text>
              </View>
            ) : null}
          </View>
        </View>
        {status.stayText != null ? <Pill label={status.stayText} /> : null}
      </View>

      <View style={s.targetBox}>
        <View>
          <Text style={s.label}>{t('visa.nextGoal')}</Text>
          <Text style={s.targetVisa}>
            {t('visa.targetChange', {
              target: status.target,
              label: status.targetLabel ? ` (${status.targetLabel})` : '',
            })}
          </Text>
        </View>
        {status.expiryText != null && status.ddayText != null ? (
          <View style={s.ddayRow}>
            <Text style={s.label}>{t('visa.untilExpiry', { date: status.expiryText })}</Text>
            <View style={s.ddayBox}>
              <Text style={s.ddayText}>{status.ddayText}</Text>
            </View>
          </View>
        ) : null}
      </View>

      {status.applyText != null ? (
        <Text style={[s.label, s.right]}>{t('visa.applyAt', { text: status.applyText })}</Text>
      ) : null}
    </View>
  );
}

function ScoreCard({ score }: { score: VisaScreenView['score'] }) {
  const { t } = useTranslation();
  return (
    <View style={[s.card, s.scoreCard]}>
      <View style={s.rowBetween}>
        <View style={s.flex}>
          <Text style={s.sectionTitle}>{t('visa.scoreTitle')}</Text>
          <Text style={s.sub}>{score.basis}</Text>
        </View>
        <View style={s.totalCol}>
          <View style={s.totalRow}>
            <Text style={s.totalNum}>{score.totalText}</Text>
            <Text style={s.totalUnit}>{t('visa.pointUnit')}</Text>
          </View>
          {score.proofText != null ? <Text style={s.proofText}>{score.proofText}</Text> : null}
        </View>
      </View>

      {score.breakdownText != null || score.thresholdText != null ? (
        <View style={s.rowBetween}>
          <Text style={s.label}>{score.breakdownText ?? ''}</Text>
          <Text style={s.label}>{score.thresholdText ?? ''}</Text>
        </View>
      ) : null}

      <View style={s.scoreList}>
        <Text style={s.listTitle}>{t('visa.detailTitle')}</Text>
        {score.items.map((item) => (
          <ScoreRow
            key={item.key}
            title={item.title}
            sub={item.sub}
            score={item.score}
            scoreSub={item.scoreSub}
            state={item.state}
          />
        ))}
      </View>
    </View>
  );
}

function RoadmapSection({ steps }: { steps: VisaScreenView['steps'] }) {
  // 세로선은 첫 번호 원 가운데에서 마지막 번호 원 가운데까지. 마지막 단계의 위치를 재서 길이를 정한다.
  const { t } = useTranslation();
  const [lastTop, setLastTop] = useState(0);
  return (
    <View style={s.roadmap}>
      <View style={s.rowBetween}>
        <Text style={s.sectionTitle}>{t('visa.roadmapTitle')}</Text>
        <Text style={s.totalSteps}>{t('visa.totalSteps', { n: steps.length })}</Text>
      </View>
      <View style={s.stepList}>
        {/* 번호 원들을 잇는 세로선 */}
        {lastTop > 0 && <View style={[s.timelineLine, { height: lastTop }]} />}
        {steps.map((st, i) => (
          <View
            key={st.key}
            onLayout={i === steps.length - 1 ? (e) => setLastTop(e.nativeEvent.layout.y) : undefined}
          >
            <StepCard
              number={st.number}
              label={st.label}
              meta={st.meta}
              title={st.title}
              desc={st.desc}
              docs={st.docs}
              type={st.required ? 'required' : 'default'}
            />
          </View>
        ))}
      </View>
    </View>
  );
}

function SummaryCard({ summary }: { summary: VisaScreenView['summary'] }) {
  const { t } = useTranslation();
  return (
    <View style={[s.card, s.summaryCard]}>
      <Text style={s.summaryTitle}>{t('visa.summaryTitle')}</Text>
      {summary.rows.map((row) => (
        <View key={row.key} style={s.summaryRow}>
          <View style={s.flex}>
            <Text style={s.summaryRowTitle}>{row.title}</Text>
            {row.sub != null ? <Text style={s.label}>{row.sub}</Text> : null}
          </View>
          <Text style={s.summaryScore}>{row.score}</Text>
        </View>
      ))}
      <Text style={s.note}>{summary.note}</Text>
    </View>
  );
}

// 저장된 로드맵이 없을 때(404). 버튼을 누르면 POST 1번 → 화면 데이터 다시 불러오기
function EmptyCard({ creating, error, onCreate }: { creating: boolean; error: string | null; onCreate: () => void }) {
  const { t } = useTranslation();
  return (
    <View style={[s.card, s.emptyCard]}>
      <Text style={s.sectionTitle}>{t('visa.emptyTitle')}</Text>
      <Text style={s.sub}>{t('visa.emptySub')}</Text>
      <Button title={creating ? t('visa.creating') : t('visa.create')} onPress={onCreate} disabled={creating} />
      {error != null ? <Text style={s.errorText}>{error}</Text> : null}
    </View>
  );
}

export default function VisaScreen() {
  const { t } = useTranslation();
  const [data, setData] = useState<VisaScreenData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const load = useCallback(
    () =>
      getVisaScreen()
        .then((d) => {
          setData(d);
          setError(null);
        })
        .catch((e: ApiError) => setError(e.message)),
    [],
  );

  useEffect(() => {
    load();
  }, [load]);

  const onCreate = () => {
    if (creating) return;
    setCreating(true);
    setCreateError(null);
    createRoadmap()
      .then(load)
      .catch((e: ApiError) => setCreateError(e.message))
      .finally(() => setCreating(false));
  };

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <Header title={t('common.appName')} />

      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        <View style={s.titleBlock}>
          <View style={s.guideBadge}>
            <Text style={s.guideBadgeText}>{t('visa.guideBadge')}</Text>
          </View>
          <Text style={s.mainTitle}>{t('visa.mainTitle')}</Text>
          <Text style={s.sub}>{t('visa.mainSub')}</Text>
        </View>

        {!data ? (
          error ? (
            <Text style={s.stateText}>{error}</Text>
          ) : (
            <SkeletonGroup gap={spacing.xl}>
              <SkeletonCard lines={2} block={44} />
              <SkeletonCard lines={3} block={72} />
              <SkeletonCard lines={3} />
            </SkeletonGroup>
          )
        ) : data.kind === 'empty' ? (
          <EmptyCard creating={creating} error={createError ?? error} onCreate={onCreate} />
        ) : (
          <FadeIn style={{ gap: spacing.xl }}>
            <StatusCard status={data.view.status} />
            <View style={s.scoreBlock}>
              <ScoreCard score={data.view.score} />
              {data.view.score.penaltyNote != null ? (
                <Text style={s.note}>{data.view.score.penaltyNote}</Text>
              ) : null}
              {data.view.score.warnings.map((w) =>
                // strong(STAY_EXPIRES_FIRST)은 필수요건과 같은 required 색 상자로 강조
                w.strong ? (
                  <View key={w.key} style={s.warnBox}>
                    <Ionicons name="warning-outline" size={16} color={colors.required.text} />
                    <Text style={s.warnText}>{w.text}</Text>
                  </View>
                ) : (
                  <Text key={w.key} style={s.note}>
                    {w.text}
                  </Text>
                ),
              )}
            </View>
            <RoadmapSection steps={data.view.steps} />
            <SummaryCard summary={data.view.summary} />
            {/* 같은 탭 묶음의 챗봇 탭으로 옮긴다 (push 로 새로 열면 대화·세션이 처음부터 시작됨) */}
            <Button title={t('products.ask')} onPress={() => router.navigate('/(tabs)/chat' as Href)} />
          </FadeIn>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  flex: { flex: 1 },
  right: { textAlign: 'right' },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
  stateText: { ...typography.body, color: colors.text.sub, textAlign: 'center', paddingVertical: spacing.xl },

  content: { paddingHorizontal: spacing.xl, paddingTop: spacing.xs, paddingBottom: spacing.xxl, gap: spacing.xl },

  titleBlock: { gap: 3 },
  guideBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: spacing.xs,
    borderRadius: radius.full,
    backgroundColor: colors.primarySoft,
  },
  guideBadgeText: { ...typography.badge, fontFamily: fonts.bold, color: colors.primary },
  mainTitle: { ...typography.h2, color: colors.text.strong },
  sub: { ...typography.body, color: colors.text.sub },
  label: { ...typography.badge, color: colors.text.sub, flexShrink: 1 },
  sectionTitle: { ...typography.h3, color: colors.text.strong, flexShrink: 1 },

  card: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.xl, ...shadow.card },

  // 체류 현황 (바탕색 위에 흰 목표 상자)
  statusCard: { gap: spacing.sm },
  statusTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  statusLeft: { gap: 7, paddingTop: 6, flexShrink: 1 },
  currentRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flexWrap: 'wrap' },
  currentVisa: { ...typography.amount, color: colors.text.strong },
  grayPill: { backgroundColor: colors.tagBg, borderRadius: radius.full, paddingHorizontal: spacing.sm, paddingVertical: 2 },
  targetBox: {
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.xl,
    paddingBottom: spacing.md,
  },
  targetVisa: { ...typography.title, color: colors.primary },
  ddayRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 6 },
  ddayBox: { backgroundColor: colors.background, borderRadius: radius.sm, paddingHorizontal: spacing.sm, paddingVertical: 2, flexShrink: 0 },
  ddayText: { ...typography.title, color: colors.text.strong },

  // 점수 (카드 + 아래 감점 안내 한 줄)
  scoreBlock: { gap: spacing.sm },
  warnBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.required.border,
    backgroundColor: colors.required.bg,
  },
  warnText: { ...typography.badge, flex: 1, lineHeight: 16, fontFamily: fonts.bold, color: colors.required.text },
  scoreCard: { gap: 14 },
  totalCol: { alignItems: 'flex-end', gap: 2, flexShrink: 0 },
  totalRow: { flexDirection: 'row', alignItems: 'baseline', gap: 2 },
  totalNum: { ...typography.h2, color: colors.primary },
  totalUnit: { ...typography.body, fontFamily: fonts.bold, color: colors.text.sub },
  proofText: { ...typography.badge, color: colors.primary },
  scoreList: { gap: spacing.sm, paddingTop: spacing.sm },
  listTitle: { ...typography.body, fontFamily: fonts.bold, color: colors.text.strong },

  // 로드맵
  roadmap: { gap: spacing.lg },
  totalSteps: { ...typography.badge, color: colors.primary, flexShrink: 0 },
  stepList: { gap: spacing.lg },
  timelineLine: {
    position: 'absolute',
    left: STEP_NUMBER_SIZE / 2 - 1,
    top: STEP_NUMBER_TOP + STEP_NUMBER_SIZE / 2,
    width: 2,
    backgroundColor: colors.border,
  },

  // 단계를 마치면
  summaryCard: { gap: 10 },
  summaryTitle: { ...typography.title, color: colors.text.strong },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: 10,
    borderRadius: radius.md,
    backgroundColor: colors.background,
  },
  summaryRowTitle: { ...typography.body, color: colors.text.strong },
  summaryScore: { ...typography.body, fontFamily: fonts.bold, color: colors.primary, flexShrink: 0 },
  note: { ...typography.badge, lineHeight: 16, color: colors.text.sub },

  // 로드맵 없음(404)
  emptyCard: { gap: spacing.md },
  errorText: { ...typography.badge, lineHeight: 16, color: colors.errorText },
});
