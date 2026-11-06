import { View, Text, Button } from 'react-native';
import { router } from 'expo-router';
import { useOnboardingStore } from '../../store/onboardingStore'; // 임시: 저장소 테스트

export default function HomeScreen() {
  // ① 값 준비: 저장소에서 꺼내기
  const language = useOnboardingStore((state) => state.language);
  const setLanguage = useOnboardingStore((state) => state.setLanguage);
  const reset = useOnboardingStore((state) => state.reset); //reset 함수

  return (
    // ② 화면 모양
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 }}>
      <Text>홈</Text>
      <Text>저장된 언어: {language ?? '없음'}</Text>

      <Button
        title="베트남어로 저장"
        onPress={() =>setLanguage('vi')}   // 누르면 저장
      />

      <Button
        title="온보딩 다시 보기"
        onPress={() => {
         reset();                                  // 저장소 비우고
          router.replace('/onboarding/language'); // 온보딩으로 이동
        }}
      />
    </View>
  );
}