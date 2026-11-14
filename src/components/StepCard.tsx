// 로드맵 단계 카드 (Figma 522:2 Step Card). 왼쪽 번호 원 + 오른쪽 카드.
// required: 빨간 번호·테두리 (필수 요건), default: 회색 테두리 번호
import { View, Text, StyleSheet } from 'react-native';
import Pill from './Pill';
import Tag from './Tag';
import { colors, typography, fonts, spacing, radius } from '../constants/theme';

type StepCardProps = {
  number: number;
  label: string; // "STEP 1 · 필수"
  meta: string; // 오른쪽 위 작은 글자 ("사업주 요청", "+50점 확정")
  title: string;
  desc: string;
  docs?: string[]; // 준비 서류 태그
  type?: 'required' | 'default';
};

export const STEP_NUMBER_SIZE = 26;
export const STEP_NUMBER_TOP = 18; // 카드 위에서 번호 원까지 (세로선 위치 맞출 때 사용)

export default function StepCard({ number, label, meta, title, desc, docs = [], type = 'default' }: StepCardProps) {
  const required = type === 'required';
  return (
    <View style={s.wrap}>
      <View style={s.numberWrap}>
        <View style={[s.number, required ? s.numberRequired : s.numberDefault]}>
          <Text style={[s.numberText, required && s.numberTextRequired]}>{number}</Text>
        </View>
      </View>

      <View style={[s.card, required && s.cardRequired]}>
        <View style={s.top}>
          <Pill label={label} type={required ? 'stepRequired' : 'step'} />
          <Text style={s.meta}>{meta}</Text>
        </View>
        <Text style={s.title}>{title}</Text>
        <Text style={s.desc}>{desc}</Text>
        {docs.length > 0 && (
          <View style={s.tags}>
            {docs.map((d) => (
              <Tag key={d} label={d} />
            ))}
          </View>
        )}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  numberWrap: { paddingTop: STEP_NUMBER_TOP },
  number: {
    width: STEP_NUMBER_SIZE,
    height: STEP_NUMBER_SIZE,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  numberDefault: { backgroundColor: colors.surface, borderWidth: 2, borderColor: colors.stepBorder },
  numberRequired: { backgroundColor: colors.required.strong },
  numberText: { ...typography.body, fontFamily: fonts.bold, color: colors.text.sub },
  numberTextRequired: { color: colors.text.inverse },
  card: {
    flex: 1,
    gap: 10,
    padding: 18,
    borderRadius: radius.xl,
    backgroundColor: colors.surface,
  },
  cardRequired: { borderWidth: 1.5, borderColor: colors.required.border },
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
  meta: { ...typography.body, color: colors.text.sub },
  title: { ...typography.titleLg, color: colors.text.strong },
  desc: { ...typography.bodyLg, color: colors.text.sub },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
});
