// 온보딩 요약 Mock (GET /api/v1/onboarding/summary).
// 2026-11-19 서버 응답(demo-e9-ph-reyes)을 그대로 옮겼다. daysRemaining·합계·spare 는 서버 계산값이라 고정값으로 둔다.
// 화면은 이 파일을 직접 import 하지 않고 src/api/onboarding.ts 를 거친다.
import type { OnboardingSummaryResponse } from '../../types/api';
import { mockGetGoals } from './goals';

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
    // ON-004 에서 저장한 목표가 요약에도 보이도록 목표 Mock 의 현재 값을 그대로 쓴다
    goals: mockGetGoals().goals,
    commitments: {
      items: [
        { id: 1, commitmentType: 'LIVING_MINIMUM', label: '고정생활비', amount: krw(520000), source: 'USER', detectedFromTxnId: null },
        { id: 2, commitmentType: 'REMITTANCE', label: '가족 송금', amount: krw(700000), source: 'USER', detectedFromTxnId: null },
        { id: 3, commitmentType: 'VARIABLE_EXPENSE', label: '변동지출', amount: krw(450000), source: 'USER', detectedFromTxnId: null },
      ],
      totals: {
        fixedLiving: krw(520000),
        remittance: krw(700000),
        variableExpense: krw(450000),
        mandatorySaving: krw(0),
        deductibleTotal: krw(1670000),
      },
    },
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
