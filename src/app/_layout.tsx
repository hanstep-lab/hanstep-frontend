import { Stack } from "expo-router";  //Stack - 화면을 카드처럼 위에 쌓는 방식

export default function OnboardingLayout() { //OnboardingLayout -> RootLayout
  return <Stack screenOptions={{headerShown:false}}/>; //온보딩 헤더만 남기기 위해 해당 틀의 상단 헤더를 false 처리
}
