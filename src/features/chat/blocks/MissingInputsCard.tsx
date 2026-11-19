// MISSING_INPUTS (calculate_e74_score). 판정에 더 필요한 입력을 질문 목록으로 보여 준다. 누르는 동작은 없다.
// - question 은 받은 그대로 보여 준다 (지금은 한국어로 오지만 서버에서 고칠 예정). field 로 문구를 만들지 않는다
// - 3개까지 보여 주고 나머지는 "외 N개"
import { View, Text, StyleSheet } from 'react-native';
import { colors, typography, spacing, radius, fonts } from '../../../constants/theme';
import type { ChatMissingInputsBlock } from '../../../types/api';

const MAX_VISIBLE = 3;

export default function MissingInputsCard({ block }: { block: ChatMissingInputsBlock }) {
  if (block.fields.length === 0) return null;
  const visible = block.fields.slice(0, MAX_VISIBLE);
  const restCount = block.fields.length - visible.length;

  return (
    <View style={s.card}>
      <Text style={s.title}>판정에 더 필요한 정보</Text>
      {visible.map((f) => (
        <View key={f.field} style={s.row}>
          <Text style={s.bullet}>·</Text>
          <Text style={s.question}>{f.question}</Text>
        </View>
      ))}
      {restCount > 0 && <Text style={s.more}>외 {restCount}개</Text>}
    </View>
  );
}

const s = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: spacing.lg,
    gap: spacing.xs,
    marginTop: spacing.sm,
  },
  title: { ...typography.body, fontFamily: fonts.bold, color: colors.text.strong, marginBottom: spacing.xs },
  row: { flexDirection: 'row', gap: spacing.xs },
  bullet: { ...typography.body, color: colors.text.sub },
  question: { ...typography.body, color: colors.text.strong, flex: 1 },
  more: { ...typography.badge, color: colors.text.sub },
});
