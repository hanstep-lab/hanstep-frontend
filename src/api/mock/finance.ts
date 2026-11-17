// Mock 월 수입·지출 데이터 (금융상품 추천 products.ts 에서 사용). 실제 API 연결 시 이 파일만 교체.
// 금액은 만 원 단위. chat.ts budget 응답(235만 − 52만 − 70만 − 45만 = 68만)과 맞춤.

export const MONTHLY_FLOW = {
  income: 235,         // 월 소득
  fixedExpense: 52,    // 고정 생활비
  remittance: 70,      // 송금
  variableExpense: 45, // 변동 지출
  salaryCount12m: 12,  // 최근 12개월 급여 입금 횟수
  loanCount: 0,        // 보유 대출 수
};

// 여유자금 = 소득 − 고정 생활비 − 송금 − 변동 지출
export function calcSpareMoney(f = MONTHLY_FLOW): number {
  return f.income - f.fixedExpense - f.remittance - f.variableExpense;
}
