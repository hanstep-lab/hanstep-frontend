import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useOnboardingStep } from '../hooks/useOnboardingStep';

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

//스타일시트
const styles = StyleSheet.create({
      container: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 16 },
  progress: { fontSize: 14, color: '#888' },
  title: { fontSize: 20, fontWeight: 'bold' },
  button: { backgroundColor: '#0046FF', paddingVertical: 12, paddingHorizontal: 32, borderRadius: 8 },
  buttonText: { color: '#fff', fontSize: 16 },
})