// 작은 사각 라벨 (Figma 522:2 Tag). doc: 준비 서류, required: 필수요건 표시
import { View, Text, StyleSheet } from 'react-native';
import { colors, typography, fonts, spacing, radius } from '../constants/theme';

type TagProps = { label: string; type?: 'doc' | 'required' };

export default function Tag({ label, type = 'doc' }: TagProps) {
  const required = type === 'required';
  return (
    <View style={[s.base, required ? s.required : s.doc]}>
      <Text style={required ? s.requiredText : s.docText}>{label}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  base: { borderRadius: radius.sm },
  doc: { backgroundColor: colors.tagBg, paddingHorizontal: spacing.sm, paddingVertical: spacing.xs },
  required: { backgroundColor: colors.required.strong, paddingHorizontal: 6, paddingVertical: 2 },
  docText: { ...typography.caption, color: colors.text.strong },
  requiredText: { ...typography.badge, fontFamily: fonts.bold, color: colors.text.inverse },
});
