// FX-002 목표 환율 도달 확인. (tabs)/_layout.tsx 에서 한 번 부른다(로그인·온보딩 뒤라 토큰이 있다).
// - 앱을 처음 켤 때 + 백그라운드에서 다시 열 때(AppState active) GET /fx/alerts 로 TRIGGERED 를 찾는다
//   (정해진 간격으로 계속 조회하지 않는다)
// - 아직 알리지 않은 것만 모아 알림 1개로 띄우고(여러 건이면 묶음), alertId 를 "알린 것"으로 저장한다
//   권한이 없어서 못 띄운 것도 저장한다(나중에 허용해도 지난 것이 몰려 뜨지 않게)
// - 알림을 누르면 /fx/alert 로 이동

import { useEffect, useRef } from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import { router, type Href } from 'expo-router';
import { getTriggeredFxAlerts, toFxAlertNotice } from '../api/fx';
import { addNotifiedIds, getNotifiedIds } from '../utils/fxAlertStorage';
import {
  hasNotificationPermission,
  showFxAlertNotification,
  subscribeFxAlertTap,
} from '../utils/fxNotification';

export function useFxAlertNotifier() {
  const checking = useRef(false);

  useEffect(() => {
    const check = async () => {
      if (checking.current) return; // 앞 확인이 끝나기 전에 또 불리면 건너뛴다
      checking.current = true;
      try {
        const [triggered, notified] = await Promise.all([getTriggeredFxAlerts(), getNotifiedIds()]);
        const fresh = triggered.filter((a) => !notified.includes(a.alertId));
        if (fresh.length === 0) return;
        await addNotifiedIds(fresh.map((a) => a.alertId));
        if (await hasNotificationPermission()) {
          const notice = toFxAlertNotice(fresh);
          await showFxAlertNotification(notice.title, notice.body);
        }
      } catch {
        // 조회·알림 실패는 조용히 넘긴다. 다음에 앱을 다시 열 때 또 확인한다
      } finally {
        checking.current = false;
      }
    };

    check();

    let prev = AppState.currentState;
    const sub = AppState.addEventListener('change', (next: AppStateStatus) => {
      if (prev !== 'active' && next === 'active') check();
      prev = next;
    });
    return () => sub.remove();
  }, []);

  useEffect(() => subscribeFxAlertTap(() => router.navigate('/fx/alert' as Href)), []);
}
