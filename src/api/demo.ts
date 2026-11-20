// 데모 계정 초기화 API. SOL Global 홈(SG-000) 로고를 1.5초 안에 3번 탭하면 부른다(숨은 기능).
// 서버 범위(backend Swagger 기준): 온보딩 진행·등록증 문서·OCR 작업·E-7-4 평가·비자 로드맵을 지우고,
// 목표 환율 알림·금융 목표는 CANCELLED, 매달 나가는 돈은 비활성으로 바꾼다. Reyes 는 체류 정보·서비스 언어(en)를 시드 값으로 되돌린다.
// 입국일·이전 체류 개월·마이데이터·금융 분석은 그대로 둔다.
// 데모 계정이 아니면 403, 서버에서 기능이 꺼져 있으면(DEMO_RESET_ENABLED) 404.

import { client } from './client';
import { ENTRY_TOKEN, USE_MOCK, mockDelay } from './config';
import { mockDemoReset } from './mock/demo';
import type { DemoResetResponse } from '../types/api';

// 데모 진입 토큰(demo- 로 시작)일 때만 숨은 탭을 받는다. 서버도 같은 기준으로 막는다(403)
export const isDemoAccount = ENTRY_TOKEN.startsWith('demo-');

// POST /api/v1/demo/reset (본문 없음)
export async function resetDemo(): Promise<DemoResetResponse> {
  if (USE_MOCK) {
    await mockDelay();
    return mockDemoReset();
  }
  const res = await client.post<DemoResetResponse>('/api/v1/demo/reset');
  return res.data;
}
