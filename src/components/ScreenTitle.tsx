import { View, Text, StyleSheet } from 'react-native';
import { colors, typography, spacing } from '../constants/theme';

type ScreenTitleProps = { title: string; description?: string };

export default function ScreenTitle({ title, description }: ScreenTitleProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>
      {description && <Text style={styles.description}>{description}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: spacing.sm },
  title: { ...typography.h2, color: colors.text.strong },
  description: { ...typography.body, color: colors.text.default },
});