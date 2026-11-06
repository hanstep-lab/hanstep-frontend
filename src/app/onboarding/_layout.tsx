import { Stack } from 'expo-router';

export default function OnboardingLayout() {
  return <Stack screenOptions={{ headerShown: false }} />; //기본 헤더를 끄고 figma헤더를 사용
}