import { Pressable, Text, View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, typography, spacing, radius } from '../constants/theme';

type ButtonProps = {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'text'; // 메인 / 보조 / 텍스트
  disabled?: boolean;
  showArrow?: boolean;
  icon?: keyof typeof Ionicons.glyphMap; // 글자 왼쪽 아이콘
  subtitle?: string; // 제목 아래 작은 설명. 있으면 왼쪽 정렬 + 높이 60 (FX-002 등록 버튼)
};

export default function Button({
  title,
  onPress,
  variant = 'primary',
  disabled = false,
  showArrow = false,
  icon,
  subtitle,
}: ButtonProps) {
  const arrowColor = variant === 'primary' ? colors.text.inverse : colors.primary;

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.base,
        styles[variant],
        subtitle != null && styles.withSubtitle,
        disabled && styles.disabled,
        pressed && styles.pressed,
      ]}
    >
      {icon && <Ionicons name={icon} size={18} color={arrowColor} />}
      {subtitle != null ? (
        <View style={styles.texts}>
          <Text style={labelStyles[variant]}>{title}</Text>
          <Text style={[labelStyles[variant], styles.subtitle]}>{subtitle}</Text>
        </View>
      ) : (
        <Text style={labelStyles[variant]}>{title}</Text>
      )}
      {showArrow && <Ionicons name="arrow-forward" size={18} color={arrowColor} />}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    height: 52,
    borderRadius: radius.lg,
    flexDirection: 'row', // flexDirection-글자와 화살표를 가로로 배열
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
  },
  primary: { backgroundColor: colors.primary },
  secondary: { backgroundColor: colors.primaryLight },
  text: { height: 40, backgroundColor: 'transparent' },
  disabled: { backgroundColor: colors.disabled },
  pressed: { opacity: 0.8 }, // 누르는 동안 opacity 0.8
  withSubtitle: { height: 60, justifyContent: 'flex-start', paddingHorizontal: spacing.xl, gap: spacing.md },
  texts: { gap: 2 },
  subtitle: { ...typography.badge, opacity: 0.8 },
});

const labelStyles = StyleSheet.create({
  primary: { ...typography.button, color: colors.text.inverse },
  secondary: { ...typography.button, color: colors.primary },
  text: { ...typography.body, color: colors.text.sub },
});