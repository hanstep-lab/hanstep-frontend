// 환율 API (FX-001). 화면은 이 파일만 부르고 Mock 인지 모른다.
// 앱은 Frankfurter·ECB 를 직접 부르지 않고 항상 우리 백엔드만 부른다.
// TODO: FX-01, FX-02 명세가 오면 경로·필드를 맞출 것. 지금 경로는 가정값.
// 타입은 명세 전까지 따로 만들지 않고 Mock 이 돌려주는 모양을 그대로 쓴다.

import { client } from './client';
import { USE_MOCK, mockDelay } from './config';
import { mockFxRate, mockFxHistory, MOCK_FX_PERIODS, type MockFxPeriod } from './mock/fx';

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
