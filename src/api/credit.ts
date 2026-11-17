// 대출 상품 API (CR-002). 서버 API가 생기기 전까지 USE_MOCK과 상관없이 항상 Mock을 쓴다.
// 서버 연결 시 경로(가정값): GET /api/v1/credit/loans/sol-global — client.get 으로 되돌리고 명세에 맞춰 경로·필드를 맞출 것.
// 타입은 명세 전까지 따로 만들지 않고 Mock 이 돌려주는 모양을 그대로 쓴다.

import { mockDelay } from './config';
import { mockGlobalLoan } from './mock/credit';

export type GlobalLoan = ReturnType<typeof mockGlobalLoan>;
export type LoanCondition = GlobalLoan['eligibility']['conditions'][number];
export type LoanTermRow = GlobalLoan['terms']['rows'][number];

// SOL 글로벌론 상품 상세: 가입 조건 확인, 상품 조건, 안내 문구
export async function getGlobalLoan(): Promise<GlobalLoan> {
  await mockDelay();
  return mockGlobalLoan();
}
