// 대출 상품 API (CR-002). 화면은 이 파일만 부르고 Mock 인지 모른다.
// TODO: CR-002 명세가 오면 경로·필드를 맞출 것. 지금 경로는 가정값.
// 타입은 명세 전까지 따로 만들지 않고 Mock 이 돌려주는 모양을 그대로 쓴다.

import { client } from './client';
import { USE_MOCK, mockDelay } from './config';
import { mockGlobalLoan } from './mock/credit';

export type GlobalLoan = ReturnType<typeof mockGlobalLoan>;
export type LoanCondition = GlobalLoan['eligibility']['conditions'][number];
export type LoanTermRow = GlobalLoan['terms']['rows'][number];

// SOL 글로벌론 상품 상세: 가입 조건 확인, 상품 조건, 안내 문구
export async function getGlobalLoan(): Promise<GlobalLoan> {
  if (USE_MOCK) {
    await mockDelay();
    return mockGlobalLoan();
  }
  const res = await client.get<GlobalLoan>('/api/v1/credit/loans/sol-global');
  return res.data;
}
