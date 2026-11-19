// SOL 글로벌론 상품 상세 API (CR-002). 화면은 이 파일만 부르고 Mock 인지 모른다.
// Mock 과 서버 모두 SolGlobalLoanResponse 모양을 돌려준다. 문구·한도는 서버(Mock) 값을 그대로 쓴다.
import { client } from './client';
import { USE_MOCK, mockDelay } from './config';
import { mockGlobalLoan } from './mock/credit';
import type { SolGlobalLoanCondition, SolGlobalLoanResponse, SolGlobalLoanTermRow } from '../types/api';

export type GlobalLoan = SolGlobalLoanResponse;
export type LoanCondition = SolGlobalLoanCondition;
export type LoanTermRow = SolGlobalLoanTermRow;

// GET /api/v1/credit/loans/sol-global — 상품 조건, 가입 조건 5개, 모의 한도. 422 INSUFFICIENT_DATA 는 그대로 던진다
export async function getGlobalLoan(): Promise<GlobalLoan> {
  if (USE_MOCK) {
    await mockDelay();
    return mockGlobalLoan();
  }
  const res = await client.get<GlobalLoan>('/api/v1/credit/loans/sol-global');
  return res.data;
}
