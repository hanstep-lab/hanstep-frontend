// 둥근 라벨 (Figma 522:2 Pill). blue: 체류 기간 등 강조, step: 단계 표시, stepRequired: 필수 단계
import { View, Text, StyleSheet } from 'react-native';
import { colors, typography, fonts, spacing, radius } from '../constants/theme';

type PillProps = { label: string; type?: 'blue' | 'step' | 'stepRequired' };

export default function Pill({ label, type = 'blue' }: PillProps) {
  return (
    <View style={[s.base, s[type]]}>
      <Text style={[s.text, textStyles[type]]}>{label}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  base: { alignSelf: 'flex-start', borderRadius: radius.full, paddingHorizontal: 10, paddingVertical: spacing.xs },
  blue: { backgroundColor: colors.primary, paddingHorizontal: 14, paddingVertical: 6 },
  step: { backgroundColor: colors.tagBg },
  stepRequired: { backgroundColor: colors.required.pillBg },
  text: { ...typography.caption, fontFamily: fonts.bold },
});

const textStyles = StyleSheet.create({
  blue: { ...typography.body, fontFamily: fonts.bold, color: colors.text.inverse },
  step: { color: colors.text.strong },
  stepRequired: { color: colors.required.text },
});
