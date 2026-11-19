// CR-002 SOL 글로벌론 상세(src/app/credit/loan.tsx) 문구 표. 상품·조건 문구는 서버가 주고, 여기에는 앱이 만드는 글자만 둔다.
// 모의 한도는 "모의"로만 부르고 실제 한도처럼 쓰지 않는다. 문구를 바꿀 때는 이 파일만 고친다.
import type { SolGlobalLoanIncomeSource, SolGlobalLoanLimitReason } from '../types/api';

export const LOAN_TEXT = {
  loading: '상품 정보를 불러오는 중이에요.',
  applyButton: '신한 SOL에서 신청하기',
  askButton: '신한걸음에 물어보기',
  preparingTitle: '준비 중',
  preparingBody: '곧 사용할 수 있어요.',

  // 모의 한도 구역 (Figma 447:62 "진단과 비교" 자리)
  limitTitle: '신한걸음 모의 한도',
  limitDesc: 'DSR·타행 대출 심사를 반영하지 않은 모의 계산이에요',
  mockPill: '모의',
  capLabel: '상품 최대 한도',
  estimateLabel: '모의 한도',
} as const;

// estimatedLimit 가 null 일 때 금액 대신 보여 줄 문구
export const LIMIT_REASON_TEXT: Record<SolGlobalLoanLimitReason, string> = {
  NOT_ELIGIBLE: '가입 조건을 모두 충족하지 않아 모의 한도를 계산하지 않았어요',
  TERM_TOO_SHORT: '체류 만료까지 대출 가능 기간이 6개월보다 짧아 모의 한도를 계산하지 않았어요',
};
export const LIMIT_REASON_FALLBACK = '모의 한도를 계산하지 못했어요';

// 기준 한 줄의 소득 부분. INCOME_RECORD 는 귀속 연도와 함께 쓴다 ("2025년 소득")
export const INCOME_SOURCE_TEXT: Record<Exclude<SolGlobalLoanIncomeSource, 'INCOME_RECORD' | 'NONE'>, string> = {
  CONTRACT_SALARY: '고용계약 연봉',
};

// 상세 화면 오류 코드 → 안내 문구. 표에 없는 코드는 기본 문구 (서버 메시지는 보여 주지 않는다)
export const LOAN_ERROR_TEXT: Record<string, string> = {
  INSUFFICIENT_DATA: '가입 조건을 확인할 정보가 아직 부족해요. 마이데이터 연결을 확인해 주세요',
  UNAUTHORIZED: '로그인이 만료됐어요. 앱을 다시 열어 주세요',
  HTTP_401: '로그인이 만료됐어요. 앱을 다시 열어 주세요',
  NETWORK: '인터넷 연결을 확인한 뒤 다시 시도해 주세요',
};
export const LOAN_ERROR_FALLBACK = '상품 정보를 불러오지 못했어요. 잠시 후 다시 시도해 주세요';
