// FX-002 목표 환율 도달 알림을 폰 상단에 띄우는 로컬 알림 (expo-notifications).
// - 서버에서 보내는 원격 알림은 쓰지 않는다. 앱이 열려 있을 때 확인해서 앱이 직접 띄운다
// - 예약 알림(시각 지정)은 쓰지 않는다. 받은 자리에서 바로 띄운다
//   Android 는 우리 채널로 보내려고 { channelId } 만 넘긴다(시각 없음, 바로 표시). iOS 는 trigger: null
// - Android 13+ 는 채널이 있어야 권한 팝업이 떠서 채널 생성 → getPermissionsAsync → requestPermissionsAsync 순서

import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';

const CHANNEL_ID = 'fx-alert';
const SCREEN_KEY = 'fx_alert'; // 알림 data 에 넣어서, 누르면 목표 환율 알림 화면으로 간다
const SUPPORTED = Platform.OS === 'android' || Platform.OS === 'ios';

// 앱이 열려 있을 때도 상단 배너로 보이게
if (SUPPORTED) {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: false,
      shouldSetBadge: false,
    }),
  });
}

async function ensureChannel(): Promise<void> {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
    name: '목표 환율 알림',
    importance: Notifications.AndroidImportance.HIGH,
  });
}

// "알림 등록"을 처음 누를 때 부른다. 허용됐으면 true
export async function requestNotificationPermission(): Promise<boolean> {
  if (!SUPPORTED) return false;
  try {
    await ensureChannel();
    const current = await Notifications.getPermissionsAsync();
    if (current.granted) return true;
    if (!current.canAskAgain) return false;
    const next = await Notifications.requestPermissionsAsync();
    return next.granted;
  } catch {
    return false;
  }
}

// 권한을 묻지 않고 지금 상태만 본다
export async function hasNotificationPermission(): Promise<boolean> {
  if (!SUPPORTED) return false;
  try {
    return (await Notifications.getPermissionsAsync()).granted;
  } catch {
    return false;
  }
}

export async function showFxAlertNotification(title: string, body: string): Promise<void> {
  if (!SUPPORTED) return;
  await ensureChannel();
  await Notifications.scheduleNotificationAsync({
    content: { title, body, data: { screen: SCREEN_KEY } },
    trigger: Platform.OS === 'android' ? { channelId: CHANNEL_ID } : null,
  });
}

// 도달 알림을 누르면 onTap. 알림을 눌러 앱이 켜진 경우(마지막 응답)도 한 번 처리한다. 해제 함수를 돌려준다
export function subscribeFxAlertTap(onTap: () => void): () => void {
  if (!SUPPORTED) return () => {};
  const handle = (response: Notifications.NotificationResponse | null) => {
    if (response?.notification.request.content.data?.screen !== SCREEN_KEY) return;
    Notifications.clearLastNotificationResponse();
    onTap();
  };
  handle(Notifications.getLastNotificationResponse());
  const sub = Notifications.addNotificationResponseReceivedListener(handle);
  return () => sub.remove();
}
