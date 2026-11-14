// 점수 항목 한 줄 (Figma 522:2 Score Row). 점수 문자열은 서버(Mock) 값을 그대로 받는다.
// default: 확정 점수(파랑) / pending: 증빙 대기(회색 + 주황 안내) / required: 필수요건 미충족(빨강)
import { View, Text, StyleSheet } from 'react-native';
import Tag from './Tag';
import { colors, typography, fonts, spacing, radius } from '../constants/theme';

export type ScoreRowState = 'default' | 'pending' | 'required';

type ScoreRowProps = {
  title: string;
  sub: string;
  score: string;
  scoreSub?: string;
  state?: ScoreRowState;
};

export default function ScoreRow({ title, sub, score, scoreSub, state = 'default' }: ScoreRowProps) {
  return (
    <View style={[s.row, state === 'required' && s.rowRequired]}>
      <View style={s.left}>
        <View style={s.titleRow}>
          <Text style={s.title}>{title}</Text>
          {state === 'required' && <Tag label="필수요건" type="required" />}
        </View>
        <Text style={s.sub}>{sub}</Text>
      </View>
      <View style={s.right}>
        <Text style={scoreStyles[state]}>{score}</Text>
        {scoreSub != null && (
          <Text style={[s.scoreSub, state === 'pending' && s.scoreSubPending]}>{scoreSub}</Text>
        )}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: 14,
    borderRadius: radius.lg,
    backgroundColor: colors.box,
  },
  rowRequired: { backgroundColor: colors.required.bg, borderWidth: 1, borderColor: colors.required.border },
  left: { flex: 1, gap: 3 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  title: { ...typography.subtitle, color: colors.text.strong },
  sub: { ...typography.caption, color: colors.text.sub },
  right: { alignItems: 'flex-end', gap: 3 },
  scoreSub: { ...typography.caption, fontFamily: fonts.bold, color: colors.text.sub },
  scoreSubPending: { color: colors.pending },
});

const scoreValue = { fontFamily: fonts.bold, fontSize: 16, lineHeight: 22 };
const scoreStyles = StyleSheet.create({
  default: { ...scoreValue, color: colors.primary },
  pending: { ...scoreValue, color: colors.text.sub },
  required: { ...typography.bodyLg, fontFamily: fonts.bold, color: colors.required.text },
});
