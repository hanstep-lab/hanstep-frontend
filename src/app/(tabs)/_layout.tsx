import { Tabs } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../constants/theme';
import { useFxAlertNotifier } from '../../hooks/useFxAlertNotifier';

export default function TabsLayout() {
  useFxAlertNotifier(); // 처음 켤 때·다시 열 때 목표 환율 도달 확인, 알림 누르면 /fx/alert
  const { t } = useTranslation();
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.text.sub,
      }}
    >
      <Tabs.Screen
        name="chat"
        options={{
          title: t('chat.tabChat'),
          headerShown: false,
          tabBarStyle: { display: 'none' },
          tabBarIcon: ({ focused, color }) => (
            <Ionicons
              name={focused ? 'chatbubble-ellipses' : 'chatbubble-ellipses-outline'}
              size={22}
              color={color as string}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="visa"
        options={{
          title: t('chat.tabVisa'),
          headerShown: false,
          tabBarIcon: ({ focused, color }) => (
            <Ionicons
              name={focused ? 'document-text' : 'document-text-outline'}
              size={22}
              color={color as string}
            />
          ),
        }}
      />
    </Tabs>
  );
}
