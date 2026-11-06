import { Stack } from 'expo-router';
import { useFonts } from 'expo-font';

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    'OneShinhan-Light': require('../../assets/fonts/OneShinhanLight.ttf'),
    'OneShinhan-Medium': require('../../assets/fonts/OneShinhanMedium.ttf'),
    'OneShinhan-Bold': require('../../assets/fonts/OneShinhanBold.ttf'),
  });

  // 로딩 중일 때만 기다림. 실패하면 기본 폰트로라도 화면 표시
  if (!fontsLoaded && !fontError) {
    return null;
  }

  return <Stack screenOptions={{ headerShown: false }} />;
}