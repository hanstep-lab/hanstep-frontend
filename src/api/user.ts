// User API (USR-01·02). 내 정보 조회 + 언어 변경.

import { client } from './client';
import { USE_MOCK, mockDelay } from './config';
import type { Language, UserMeResponse } from '../types/api';

// Mock: 명세 example 기준. 온보딩 미완료 상태라 currentStep 이 LANGUAGE.
const MOCK_ME: UserMeResponse = {
  id: 1,
  displayName: 'NGUYEN VAN MINH',
  preferredLanguage: 'en',
  status: 'ACTIVE',
  onboarding: { completed: false, currentStep: 'LANGUAGE' },
};

// GET /api/v1/users/me — 앱 시작 시 호출
export async function getMe(): Promise<UserMeResponse> {
  if (USE_MOCK) {
    await mockDelay();
    return MOCK_ME;
  }
  const res = await client.get<UserMeResponse>('/api/v1/users/me');
  return res.data;
}

// PATCH /api/v1/users/me — ON-001 언어 변경. 바뀐 내 정보를 돌려준다.
export async function changeLanguage(preferredLanguage: Language): Promise<UserMeResponse> {
  if (USE_MOCK) {
    await mockDelay();
    return { ...MOCK_ME, preferredLanguage };
  }
  const res = await client.patch<UserMeResponse>('/api/v1/users/me', { preferredLanguage });
  return res.data;
}
