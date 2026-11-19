// 금융 목표 API (GOL-01·02). 화면은 이 파일만 부르고 Mock 인지 모른다.
// 저장은 전체 교체라서, 화면이 고른 목표 전체를 보낸다(빠진 목표는 서버에서 CANCELLED).

import { client } from './client';
import { USE_MOCK, mockDelay } from './config';
import { mockGetGoals, mockSaveGoals } from './mock/goals';
import type { GoalListResponse, GoalSaveRequest } from '../types/api';

// GOL-01: 저장된 목표(ACTIVE) 목록. 선택한 적 없으면 빈 배열
export async function getGoals(): Promise<GoalListResponse> {
  if (USE_MOCK) {
    await mockDelay();
    return mockGetGoals();
  }
  const res = await client.get<GoalListResponse>('/api/v1/goals');
  return res.data;
}

// GOL-02: 목표 일괄 저장(전체 교체). goalType 중복 불가
export async function saveGoals(req: GoalSaveRequest): Promise<GoalListResponse> {
  if (USE_MOCK) {
    await mockDelay();
    return mockSaveGoals(req);
  }
  const res = await client.put<GoalListResponse>('/api/v1/goals', req);
  return res.data;
}
