import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useOnboardingStep } from '../hooks/useOnboardingStep';
import {colors, typography, spacing, radius} from '../constants/theme'

//임시 화면 
export default function OnboardingPlaceholder(){
      const { step, current, total, goNext } = useOnboardingStep();


      
  return (
    <View style={styles.container}>
      <Text style={styles.progress}>{current} / {total}</Text>
      <Text style={styles.title}>{step.id} {step.title}</Text>
      <Pressable style={styles.button} onPress={goNext}>
        <Text style={styles.buttonText}>다음</Text>
      </Pressable>
    </View>
  );
}

//스타일시트-> 디자인 토큰을 import후 인자를 토큰으로 교체함.
const styles = StyleSheet.create({
    container: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: spacing.lg },
    progress: { ...typography.caption, color: colors.text.muted },
    title: { fontSize: 20, fontWeight: 'bold' },
    button: { backgroundColor: colors.primary, 
        paddingVertical: spacing.md, 
        paddingHorizontal: spacing.xxl, 
        borderRadius: radius.xl },
    buttonText: { ...typography.button, color: colors.text.inverse },
});