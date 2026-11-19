// FX-002 목표 환율 알림에서 폰에 남겨 두는 값 (AsyncStorage).
// - 알린 alertId: 같은 도달 알림을 두 번 띄우지 않으려고. 권한이 없어 못 띄운 것도 알린 것으로 저장한다
// - 확인한 alertId: ☰ 메뉴 점 표시용. /fx/alert 화면에 들어가면 저장한다
// - 권한 요청 여부: "알림 등록"을 처음 누를 때만 권한을 묻는다
// Mock 모드에서는 알린·확인한 alertId 를 메모리에만 둔다. 앱을 켤 때마다 Mock 알림과 메뉴 점이 다시 보이게 하려고.

import AsyncStorage from '@react-native-async-storage/async-storage';
import { USE_MOCK } from '../api/config';

const NOTIFIED_KEY = 'fxAlert.notifiedIds';
const SEEN_KEY = 'fxAlert.seenIds';
const PERMISSION_ASKED_KEY = 'fxAlert.permissionAsked';

let mockNotifiedIds: number[] = [];
let mockSeenIds: number[] = [];

async function readIds(key: string): Promise<number[]> {
  try {
    const raw = await AsyncStorage.getItem(key);
    const value: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(value) ? value.filter((n): n is number => typeof n === 'number') : [];
  } catch {
    return [];
  }
}

async function addIds(key: string, ids: number[]): Promise<void> {
  if (ids.length === 0) return;
  const saved = await readIds(key);
  const next = [...new Set([...saved, ...ids])];
  try {
    await AsyncStorage.setItem(key, JSON.stringify(next));
  } catch {
    // 저장에 실패하면 다음에 한 번 더 알릴 수 있다. 화면 동작은 막지 않는다
  }
}

export async function getNotifiedIds(): Promise<number[]> {
  return USE_MOCK ? mockNotifiedIds : readIds(NOTIFIED_KEY);
}

export async function addNotifiedIds(ids: number[]): Promise<void> {
  if (USE_MOCK) {
    mockNotifiedIds = [...new Set([...mockNotifiedIds, ...ids])];
    return;
  }
  await addIds(NOTIFIED_KEY, ids);
}

export async function addSeenIds(ids: number[]): Promise<void> {
  if (USE_MOCK) {
    mockSeenIds = [...new Set([...mockSeenIds, ...ids])];
    return;
  }
  await addIds(SEEN_KEY, ids);
}

// 도달한 alertId 중 아직 확인 안 한 것이 있는지
export async function hasUnseenIds(triggeredIds: number[]): Promise<boolean> {
  if (triggeredIds.length === 0) return false;
  const seen = USE_MOCK ? mockSeenIds : await readIds(SEEN_KEY);
  return triggeredIds.some((id) => !seen.includes(id));
}

export async function wasPermissionAsked(): Promise<boolean> {
  try {
    return (await AsyncStorage.getItem(PERMISSION_ASKED_KEY)) === 'true';
  } catch {
    return false;
  }
}

export async function setPermissionAsked(): Promise<void> {
  try {
    await AsyncStorage.setItem(PERMISSION_ASKED_KEY, 'true');
  } catch {
    // 저장 실패 시 다음 등록 때 한 번 더 묻는다
  }
}
