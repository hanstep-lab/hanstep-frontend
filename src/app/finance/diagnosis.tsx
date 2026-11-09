import { View, Text, Pressable, StyleSheet, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import Screen from '../../components/Screen';
import Button from '../../components/Button';
import SemiGauge from '../../components/SemiGauge';
import { colors, typography, spacing, radius, fonts, shadow } from '../../constants/theme';
import { useTransferStore } from '../../store/transferStore';
import {
  getFinanceDiagnosis,
  type Indicator,
  type IndicatorTone,
  type Mission,
} from '../../api/mock/finance';

const LIVE_BLUE = '#005DF9';
const LIVE_BLUE_SOFT = 'rgba(0, 93, 249, 0.1)';

const TONE: Record<IndicatorTone, { text: string; bg: string }> = {
  primary: { text: colors.primary, bg: colors.primarySoft },
  live: { text: LIVE_BLUE, bg: LIVE_BLUE_SOFT },
  neutral: { text: colors.text.strong, bg: colors.background },
};

function preparingAlert() {
  Alert.alert('준비 중', '곧 사용할 수 있어요.');
}

function handleMission(key: Mission['key']) {
  if (key === 'remitFee') {
    useTransferStore.getState().setInitialAmount(null);
    router.push('/transfer' as any);
    return;
  }
  preparingAlert();
}

function ScoreCard({ total, max, grade }: { total: number; max: number; grade: string }) {
  return (
    <View style={s.card}>
      <Text style={s.cardCaption}>금융 건전성 지표</Text>
      <View style={s.scoreRow}>
        <Text style={s.scoreBig}>{total}</Text>
        <Text style={s.scoreMax}> / {max}</Text>
        <View style={s.gradeBadge}>
          <Text style={s.gradeBadgeText}>{grade}</Text>
        </View>
      </View>

      <View style={s.gaugeWrap}>
        <SemiGauge value={total} max={max} />
        <View style={s.gaugeLabels}>
          <Text style={s.gaugeEdge}>0 (주의)</Text>
          <Text style={s.gaugeCurrent}>{grade}</Text>
          <Text style={s.gaugeEdge}>{max} (안정)</Text>
        </View>
      </View>
    </View>
  );
}

function IndicatorCard({ item }: { item: Indicator }) {
  const tone = TONE[item.tone];
  return (
    <View style={s.card}>
      <View style={s.rowBetween}>
        <Text style={s.cardTitle}>{item.label}</Text>
        <View style={s.indicatorRight}>
          <Text style={[s.indicatorScore, { color: tone.text }]}>{item.score}점</Text>
          <View style={[s.pill, { backgroundColor: tone.bg }]}>
            <Text style={[s.pillText, { color: tone.text }]}>{item.grade}</Text>
          </View>
        </View>
      </View>
      <Text style={s.cardDesc}>{item.detail}</Text>
    </View>
  );
}

function MissionCard({ item }: { item: Mission }) {
  const tone = TONE[item.tone];
  return (
    <View style={s.card}>
      <View>
        <Text style={s.cardTitle}>{item.title}</Text>
        <Text style={[s.cardDesc, s.missionDesc]}>{item.desc}</Text>
      </View>
      <Pressable
        style={({ pressed }) => [s.missionBtn, pressed && s.pressed]}
        onPress={() => handleMission(item.key)}
      >
        <Text style={[s.missionBtnText, { color: tone.text }]}>{item.cta}</Text>
        <Ionicons name={item.icon} size={12} color={tone.text} />
      </Pressable>
    </View>
  );
}

export default function FinanceDiagnosisScreen() {
  const d = getFinanceDiagnosis();

  const footer = (
    <View style={s.footer}>
      <Button title="신한걸음에 물어보기" showArrow onPress={() => router.navigate('/chat')} />
      <Pressable
        style={({ pressed }) => [s.subBtn, pressed && s.pressed]}
        onPress={() => router.navigate('/visa')}
      >
        <Ionicons name="headset-outline" size={15} color={colors.text.sub} />
        <Text style={s.subBtnText}>비자 전환 로드맵 보기</Text>
      </Pressable>
    </View>
  );

  return (
    <Screen footer={footer}>
      <View style={s.intro}>
        <View style={s.topBadge}>
          <Text style={s.topBadgeText}>금융 생활 진단</Text>
        </View>
        <Text style={s.headline}>
          {d.userName}님의 금융 생활은{'\n'}
          {d.headline}
        </Text>
        <Text style={s.introSub}>마이데이터 거래내역(급여 입금·지출·저축·대출)으로 계산했어요.</Text>
      </View>

      <ScoreCard total={d.totalScore} max={d.maxScore} grade={d.grade} />

      <View style={[s.rowBetween, s.sectionHead]}>
        <View>
          <Text style={s.sectionTitle}>진단 4대 지표</Text>
          <Text style={s.sectionSub}>마이데이터 최근 12개월 거래 기준</Text>
        </View>
        <Pressable style={s.linkBtn} onPress={preparingAlert} hitSlop={8}>
          <Text style={s.linkBtnText}>산출 기준</Text>
          <Ionicons name="chevron-forward" size={10} color={colors.primary} />
        </Pressable>
      </View>

      <View style={s.list}>
        {d.indicators.map(item => (
          <IndicatorCard key={item.key} item={item} />
        ))}
      </View>

      <View style={s.sectionHead}>
        <Text style={s.sectionTitle}>금융 생활 개선 미션</Text>
        <Text style={s.sectionSub}>지표를 높이는 데 도움이 되는 금융 행동 3가지예요.</Text>
      </View>

      <View style={s.list}>
        {d.missions.map(item => (
          <MissionCard key={item.key} item={item} />
        ))}
      </View>
    </Screen>
  );
}

const s = StyleSheet.create({
  intro: { gap: spacing.md },
  topBadge: {
    alignSelf: 'flex-start',
    backgroundColor: colors.primarySoft,
    borderRadius: radius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
  },
  topBadgeText: { ...typography.badge, color: colors.primary },
  headline: { ...typography.h2, lineHeight: 27.5, color: colors.text.strong, marginTop: spacing.sm },
  introSub: { ...typography.body, lineHeight: 21, color: colors.text.sub },

  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: spacing.lg,
    gap: spacing.sm,
    ...shadow.card,
  },
  cardCaption: { ...typography.badge, color: colors.text.sub },
  cardTitle: { ...typography.title, color: colors.text.strong },
  cardDesc: { ...typography.body, color: colors.text.sub },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  pressed: { opacity: 0.8 },

  scoreRow: { flexDirection: 'row', alignItems: 'baseline' },
  scoreBig: { ...typography.display, color: colors.primary },
  scoreMax: { ...typography.body, fontFamily: fonts.bold, color: colors.text.sub },
  gradeBadge: {
    marginLeft: spacing.sm,
    backgroundColor: colors.primary,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    alignSelf: 'center',
  },
  gradeBadgeText: { ...typography.badge, color: colors.text.inverse },
  gaugeWrap: { alignItems: 'center', paddingTop: spacing.xs },
  gaugeLabels: {
    alignSelf: 'stretch',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.xs,
  },
  gaugeEdge: { ...typography.body, fontSize: 12, fontFamily: fonts.bold, color: colors.text.sub },
  gaugeCurrent: { ...typography.body, fontFamily: fonts.bold, color: colors.primary },

  sectionHead: { marginTop: spacing.sm, gap: 2 },
  sectionTitle: { ...typography.h3, color: colors.text.strong },
  sectionSub: { ...typography.body, color: colors.text.sub },
  linkBtn: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  linkBtnText: { ...typography.badge, fontFamily: fonts.bold, color: colors.primary },

  list: { gap: spacing.md },
  indicatorRight: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  indicatorScore: { ...typography.body, fontFamily: fonts.bold },
  pill: { borderRadius: radius.full, paddingHorizontal: spacing.sm, paddingVertical: 2 },
  pillText: { ...typography.badge },

  missionDesc: { marginTop: 2 },
  missionBtn: {
    alignSelf: 'flex-end',
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.background,
    borderRadius: radius.lg,
    paddingHorizontal: 14,
    paddingVertical: 6,
    marginTop: spacing.xs,
  },
  missionBtnText: { ...typography.body, fontFamily: fonts.bold },

  footer: { gap: spacing.sm },
  subBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: 10,
  },
  subBtnText: { ...typography.body, fontFamily: fonts.bold, color: colors.text.sub },
});
