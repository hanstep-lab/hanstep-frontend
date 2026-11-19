// CR-002 SOL 글로벌론 상품 상세 Mock. 화면은 이 파일을 직접 import 하지 않고 src/api/credit.ts 를 거친다.
// 모양과 값은 GET /api/v1/credit/loans/sol-global 실제 응답(2026-11-19, 데모 사용자) 기준.
// 날짜·남은 기간·한도는 계산하지 않고 완성된 값으로 둔다.
import type { SolGlobalLoanResponse } from '../../types/api';

export function mockGlobalLoan(): SolGlobalLoanResponse {
  return {
    productTag: '신한은행 대출 상품',
    name: 'SOL 글로벌론',
    summary: '외국인 전용 직장인 신용대출이에요.',

    eligibility: {
      title: '가입 조건 확인',
      source: '마이데이터·외국인등록증·소득 정보로 확인했어요',
      resultLabel: '5개 중 5개 충족',
      conditions: [
        {
          key: 'salary',
          title: '재직·급여이체 조건',
          desc: '재직기간 3개월 이상 · 신한은행 급여이체 최근 1개월 이상 · 현재 급여 입금 6개월 연속, 신한 급여 계좌 있음',
          met: true,
        },
        {
          key: 'visa',
          title: '대상 체류자격',
          desc: 'E-9·E-7·F-2·F-5 중 하나 · 현재 E-9',
          met: true,
        },
        {
          key: 'nationality',
          title: '대상 국적',
          desc: '베트남·인도네시아·캄보디아·카자흐스탄·우즈베키스탄·필리핀·네팔 · 현재 필리핀',
          met: true,
        },
        {
          key: 'stay',
          title: '체류 만료까지 6개월 초과',
          desc: '2027.10.04 만료 · 약 10개월 남음',
          met: true,
        },
        {
          key: 'income',
          title: '연소득 2,000만 원 이상',
          desc: '현재 연 3,210만 원(2025년 소득 확인 기준)',
          met: true,
        },
      ],
    },

    terms: {
      title: '상품 조건',
      basis: '신한은행 상품 안내 기준',
      rows: [
        { key: 'limit', label: '대출 한도', value: '최대 5,000만 원' },
        { key: 'term', label: '대출 기간', value: '6개월 ~ 36개월(만기는 체류 만료일 전월까지)' },
        { key: 'repayment', label: '상환 방식', value: '원금분할상환' },
        { key: 'rate', label: '금리', value: '상품설명서에서 확인' },
      ],
    },

    notice:
      '신한걸음 자체 모의 계산이에요. DSR·타행 대출 심사는 반영하지 않았고, 실제 대출 가능 여부와 금리는 은행 심사에 따라 달라요.',

    limitEstimate: {
      estimatedLimit: { amount: 10_700_000, currency: 'KRW' },
      reasonCode: null,
      annualIncome: { amount: 32_100_000, currency: 'KRW' },
      incomeSource: 'INCOME_RECORD',
      incomeYear: 2025,
      latestMaturityOn: '2027-09-30',
      maxTermMonths: 10,
      byIncomeRatio: { amount: 25_680_000, currency: 'KRW' },
      byRepayment: { amount: 10_700_000, currency: 'KRW' },
      cap: { amount: 50_000_000, currency: 'KRW' },
      existingLoans: { amount: 0, currency: 'KRW' },
      dsrApplied: false,
      asOfDate: '2026-11-19',
    },

    isMock: true,
  };
}
