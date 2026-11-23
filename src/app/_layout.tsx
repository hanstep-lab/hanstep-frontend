import { Stack } from 'expo-router';
import { useFonts } from 'expo-font';
import ToastHost from '../components/Toast';
import '../i18n'; // 화면 문구 번역 준비 (언어는 users/me 를 받은 뒤 정한다)

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

  // 토스트는 화면을 옮겨도 보이도록 모든 화면 위에 하나만 둔다
  return (
    <>
      <Stack screenOptions={{ headerShown: false }} />
      <ToastHost />
    </>
  );
}
