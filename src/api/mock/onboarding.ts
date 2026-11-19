// 온보딩 요약 Mock (GET /api/v1/onboarding/summary).
// 2026-11-19 서버 응답(demo-e9-ph-reyes)을 그대로 옮겼다. daysRemaining·합계·spare 는 서버 계산값이라 고정값으로 둔다.
// 화면은 이 파일을 직접 import 하지 않고 src/api/onboarding.ts 를 거친다.
import type { OnboardingSummaryResponse } from '../../types/api';
import { mockGetGoals } from './goals';
import { mockGetCommitments } from './commitments';

const krw = (amount: number) => ({ amount, currency: 'KRW' });

export function mockOnboardingSummary(): OnboardingSummaryResponse {
  return {
    user: {
      id: 1,
      displayName: 'MARK ANTHONY REYES',
      preferredLanguage: 'vi',
      nationalityCode: 'PHL',
    },
    visa: {
      visaTypeCode: 'E-9',
      visaTypeName: 'Non-professional Employment',
      stayExpiresOn: '2027-10-04',
      daysRemaining: 319,
      monthsRemaining: 10,
    },
    // ON-004·005 에서 저장한 값이 요약에도 보이도록 목표·필수 확보액 Mock 의 현재 값을 그대로 쓴다
    goals: mockGetGoals().goals,
    commitments: mockGetCommitments(),
    balance: {
      avgMonthlyIncome: krw(2350000),
      fixedLiving: krw(520000),
      remittance: krw(700000),
      variableExpense: krw(454683),
      variableExpenseSource: 'TRANSACTIONS',
      spare: krw(675317),
      isMock: true,
    },
  };
}
