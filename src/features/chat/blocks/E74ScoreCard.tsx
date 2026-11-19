// E74_SCORE_CARD (calculate_e74_score). "모의 사전진단"으로만 보여 준다.
// - 판정은 서버 status 를 문구로 옮길 뿐, 앱에서 total·required 를 비교하지 않는다 (실서버: 235점 ≥ 200점인데 INELIGIBLE)
// - ruleStatus(DRAFT·APPROVED)·ruleVersion 은 화면에 쓰지 않는다
import { View, Text, StyleSheet } from 'react-native';
import Button from '../../../components/Button';
import Tag from '../../../components/Tag';
import { colors, typography, spacing, radius, fonts } from '../../../constants/theme';
import type { ChatAction } from '../../../api/mock/chat';
import type { ChatE74ScoreBlock } from '../../../types/api';
import { e74StatusText } from './labels';

type Props = {
  block: ChatE74ScoreBlock;
  onAction: (action: ChatAction) => void;
};

export default function E74ScoreCard({ block, onAction }: Props) {
  const statusText = e74StatusText(block.status); // 모르는 status 면 null → 판정 줄 숨김
  // 증빙 시 점수는 서버 potentialTotal 이 지금 점수와 다를 때만 (비자 탭 "증빙 시 285점"과 같은 표현)
  const showPotential = block.potentialTotal !== block.total;

  return (
    <View style={s.wrap}>
      <View style={s.card}>
        <View style={s.head}>
          <Text style={s.title}>E-7-4 모의 사전진단</Text>
          {block.isScenario && <Tag label="가정 시나리오" />}
        </View>

        <View style={s.scoreRow}>
          <Text style={s.score}>{block.total}점</Text>
          <Text style={s.sub}>기준 점수 {block.required}점</Text>
        </View>
        {showPotential && <Text style={s.sub}>증빙 시 {block.potentialTotal}점</Text>}
        {statusText && (
          <View style={s.statusBox}>
            <Text style={s.statusText}>{statusText}</Text>
          </View>
        )}
        <Text style={s.note}>입력한 정보로 계산한 참고용 모의 진단이에요. 실제 심사 결과와 다를 수 있어요.</Text>
      </View>
      <Button title="비자 탭에서 자세히 보기" variant="secondary" onPress={() => onAction('visa_tab')} />
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { gap: spacing.sm, marginTop: spacing.sm },
  card: { backgroundColor: colors.surface, borderRadius: radius.xl, padding: spacing.lg, gap: spacing.sm },
  head: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  title: { ...typography.body, fontFamily: fonts.bold, color: colors.text.strong },
  scoreRow: { flexDirection: 'row', alignItems: 'baseline', gap: spacing.sm },
  score: { ...typography.h2, color: colors.primary },
  sub: { ...typography.badge, color: colors.text.sub },
  statusBox: {
    alignSelf: 'flex-start',
    backgroundColor: colors.background,
    borderRadius: radius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  statusText: { ...typography.caption, fontFamily: fonts.bold, color: colors.text.strong },
  note: { ...typography.badge, color: colors.text.sub },
});
