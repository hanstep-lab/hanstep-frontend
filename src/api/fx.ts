// 환율 API (FX-001, FX-002). 화면은 이 파일만 부르고 Mock 인지 모른다.
// 앱은 Frankfurter·ECB 를 직접 부르지 않고 항상 우리 백엔드만 부른다.
// TODO: FX-01, FX-02 명세가 오면 경로·필드를 맞출 것. 지금 경로는 가정값.
// 타입은 명세 전까지 따로 만들지 않고 Mock 이 돌려주는 모양을 그대로 쓴다.

import { client } from './client';
import { USE_MOCK, mockDelay } from './config';
import {
  mockFxRate,
  mockFxHistory,
  MOCK_FX_PERIODS,
  type MockFxPeriod,
  mockFxAlertSetup,
  mockFxAlerts,
  mockCreateFxAlert,
  mockDeleteFxAlert,
  MOCK_ALERT_CURRENCIES,
  type MockAlertCurrency,
} from './mock/fx';

export type FxRate = ReturnType<typeof mockFxRate>;
export type FxHistory = ReturnType<typeof mockFxHistory>;
export type FxPeriod = MockFxPeriod;

export const FX_PERIODS = MOCK_FX_PERIODS;

// FX-01: 기준환율, 전일 대비, 기간별 평균 비교
export async function getFxRate(currency: string): Promise<FxRate> {
  if (USE_MOCK) {
    await mockDelay();
    return mockFxRate(currency);
  }
  const res = await client.get<FxRate>('/api/v1/fx/rates', { params: { currency } });
  return res.data;
}

// FX-02: 기간별 차트 점과 최저·평균·최고·현재
export async function getFxHistory(currency: string, period: FxPeriod): Promise<FxHistory> {
  if (USE_MOCK) {
    await mockDelay(250);
    return mockFxHistory(currency, period);
  }
  const res = await client.get<FxHistory>(`/api/v1/fx/rates/${currency}/history`, {
    params: { period },
  });
  return res.data;
}

// ---------------------------------------------------------------------------
// FX-002 목표 환율 알림. TODO: 명세가 오면 경로·필드 맞추기 (지금 경로는 가정값)
// ---------------------------------------------------------------------------
export type AlertCurrency = MockAlertCurrency;
export type FxAlertSetup = ReturnType<typeof mockFxAlertSetup>;
export type FxAlertList = ReturnType<typeof mockFxAlerts>;
export type FxAlert = FxAlertList['items'][number];

export const ALERT_CURRENCIES = MOCK_ALERT_CURRENCIES;

// 알림 설정 화면용: 기준환율, 최근 흐름, 슬라이더 범위, 프리셋
export async function getFxAlertSetup(currency: AlertCurrency): Promise<FxAlertSetup> {
  if (USE_MOCK) {
    await mockDelay(250);
    return mockFxAlertSetup(currency);
  }
  const res = await client.get<FxAlertSetup>('/api/v1/fx/alerts/setup', { params: { currency } });
  return res.data;
}

export async function getFxAlerts(): Promise<FxAlertList> {
  if (USE_MOCK) {
    await mockDelay(200);
    return mockFxAlerts();
  }
  const res = await client.get<FxAlertList>('/api/v1/fx/alerts');
  return res.data;
}

export async function createFxAlert(input: {
  currency: AlertCurrency;
  target: number;
  push: boolean;
}): Promise<FxAlert> {
  if (USE_MOCK) {
    await mockDelay();
    return mockCreateFxAlert(input);
  }
  const res = await client.post<FxAlert>('/api/v1/fx/alerts', input);
  return res.data;
}

export async function deleteFxAlert(id: string): Promise<void> {
  if (USE_MOCK) {
    await mockDelay(200);
    mockDeleteFxAlert(id);
    return;
  }
  await client.delete(`/api/v1/fx/alerts/${id}`);
}
