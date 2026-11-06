import { Tabs } from 'expo-router';

export default function TabsLayout() {
  return (
    <Tabs>
      <Tabs.Screen name="home" options={{ title: '홈' }} />
      <Tabs.Screen name="chat" options={{ title: '챗봇' }} />
      <Tabs.Screen name="visa" options={{ title: '비자' }} />
    </Tabs>
  );
}