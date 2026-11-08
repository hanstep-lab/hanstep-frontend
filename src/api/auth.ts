// Auth API (AUTH-01). SOL 진입 토큰을 JWT 로 교환한다.
// USE_MOCK=true 면 명세 example 을 그대로 돌려주고, 실제 서버는 건드리지 않는다.

import { client } from './client';
import { USE_MOCK, mockDelay } from './config';
import type { EntryRequest, EntryResponse } from '../types/api';

// Mock: 명세 example 기준. 새 사용자라 온보딩 첫 단계(LANGUAGE)부터 시작.
const MOCK_ENTRY: EntryResponse = {
  accessToken: 'mock-access-token',
  tokenType: 'Bearer',
  expiresIn: 3600,
  user: {
    id: 1,
    displayName: 'NGUYEN VAN MINH',
    preferredLanguage: 'en',
    status: 'ACTIVE',
    onboarding: { completed: false, currentStep: 'LANGUAGE' },
  },
};

// POST /api/v1/auth/entry
export async function entry(entryToken: string): Promise<EntryResponse> {
  if (USE_MOCK) {
    await mockDelay();
    return MOCK_ENTRY;
  }
  const body: EntryRequest = { entryToken };
  const res = await client.post<EntryResponse>('/api/v1/auth/entry', body);
  return res.data;
}
