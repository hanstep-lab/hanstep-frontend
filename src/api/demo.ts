// 데모 계정 초기화 API. 홈(SG-000)의 '온보딩 다시 보기' 버튼에서만 부른다.
// 서버는 온보딩 진행·등록증 문서·OCR 작업을 지운다. 체류 정보·목표·마이데이터·금융 분석은 그대로 둔다.
// 데모 계정이 아니면 403, 서버에서 기능이 꺼져 있으면 404.

import { client } from './client';
import { ENTRY_TOKEN, USE_MOCK, mockDelay } from './config';
import { mockDemoReset } from './mock/demo';
import type { DemoResetResponse } from '../types/api';

// 데모 진입 토큰(demo- 로 시작)일 때만 버튼을 보여 준다. 서버도 같은 기준으로 막는다(403)
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
