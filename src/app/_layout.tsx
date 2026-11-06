import { Stack } from 'expo-router';
import { useFonts } from 'expo-font';

export default function RootLayout() {
  // 앱 시작 시 한 번 폰트 등록함. theme.ts의 fonts 값을 사용한다.
  const [fontsLoaded] = useFonts({
    'OneShinhan-Light': require('../../assets/fonts/OneShinhanLight.ttf'),
    'OneShinhan-Medium': require('../../assets/fonts/OneShinhanMedium.ttf'),
    'OneShinhan-Bold': require('../../assets/fonts/OneShinhanBold.ttf'),
  });

  // 폰트 준비 전에는 아무것도 하지 않는다.
  if (!fontsLoaded) {
    return null;
  }

  return <Stack screenOptions={{ headerShown: false }} />;
}