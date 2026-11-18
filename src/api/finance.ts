// 금융 분석 API (FIN-06). 화면은 이 파일만 부르고 Mock 인지 모른다.
import { client } from './client';
import { USE_MOCK, mockDelay } from './config';
import type { FinanceAnalysisResponse } from '../types/api';

// Mock: 여유자금 68만 원 (mock/finance.ts · chat.ts budget 응답과 같은 값)
const MOCK_LATEST: FinanceAnalysisResponse = {
  id: 1,
  periodFrom: '2025-11-01',
  periodTo: '2026-10-31',
  spare: { amount: 680000, currency: 'KRW' },
  isMock: true,
};

// GET /api/v1/finance/analyses/latest — 완료된 분석이 없으면 404
export async function getLatestAnalysis(): Promise<FinanceAnalysisResponse> {
  if (USE_MOCK) {
    await mockDelay();
    return MOCK_LATEST;
  }
  const res = await client.get<FinanceAnalysisResponse>('/api/v1/finance/analyses/latest');
  return res.data;
}
