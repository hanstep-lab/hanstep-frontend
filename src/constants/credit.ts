// CR-002 SOL 글로벌론 상세(src/app/credit/loan.tsx) 문구 표. 상품·조건 문구는 서버가 주고, 여기에는 앱이 만드는 글자만 둔다.
// 모의 한도는 "모의"로만 부르고 실제 한도처럼 쓰지 않는다. 문구를 바꿀 때는 이 파일만 고친다.
import type { SolGlobalLoanIncomeSource, SolGlobalLoanLimitReason } from '../types/api';
import { localized } from '../i18n';

// 표마다 한국어(_KO)와 영어(_EN) 두 벌. 화면은 파일 맨 아래의 localized 표를 쓴다
const LOAN_TEXT_KO = {
  loading: '상품 정보를 불러오는 중이에요.',
  askButton: '신한걸음에 물어보기',

  // 모의 한도 구역 (Figma 447:62 "진단과 비교" 자리)
  limitTitle: '신한걸음 모의 한도',
  limitDesc: 'DSR·타행 대출 심사를 반영하지 않은 모의 계산이에요',
  mockPill: '모의',
  capLabel: '상품 최대 한도',
  estimateLabel: '모의 한도',
  limitReasonFallback: '모의 한도를 계산하지 못했어요', // estimatedLimit 가 null 인데 사유 코드를 모를 때
  errorFallback: '상품 정보를 불러오지 못했어요. 잠시 후 다시 시도해 주세요', // 표에 없는 오류 코드
} as const;

// estimatedLimit 가 null 일 때 금액 대신 보여 줄 문구
const LIMIT_REASON_TEXT_KO: Record<SolGlobalLoanLimitReason, string> = {
  NOT_ELIGIBLE: '가입 조건을 모두 충족하지 않아 모의 한도를 계산하지 않았어요',
  TERM_TOO_SHORT: '체류 만료까지 대출 가능 기간이 6개월보다 짧아 모의 한도를 계산하지 않았어요',
};

// 기준 한 줄의 소득 부분. INCOME_RECORD 는 귀속 연도와 함께 쓴다 ("2025년 소득")
const INCOME_SOURCE_TEXT_KO: Record<Exclude<SolGlobalLoanIncomeSource, 'INCOME_RECORD' | 'NONE'>, string> = {
  CONTRACT_SALARY: '고용계약 연봉',
};

// 상세 화면 오류 코드 → 안내 문구. 표에 없는 코드는 기본 문구 (서버 메시지는 보여 주지 않는다)
const LOAN_ERROR_TEXT_KO: Record<string, string> = {
  INSUFFICIENT_DATA: '가입 조건을 확인할 정보가 아직 부족해요. 마이데이터 연결을 확인해 주세요',
  UNAUTHORIZED: '로그인이 만료됐어요. 앱을 다시 열어 주세요',
  HTTP_401: '로그인이 만료됐어요. 앱을 다시 열어 주세요',
  NETWORK: '인터넷 연결을 확인한 뒤 다시 시도해 주세요',
};
// ── 영어 표 ──────────────────────────────────────────
const LOAN_TEXT_EN = {
  loading: 'Loading product information.',
  askButton: 'Ask Shinhan Step',
  limitTitle: 'Shinhan Step mock limit',
  limitDesc: 'A mock calculation that does not reflect DSR or other bank loan reviews',
  mockPill: 'Mock',
  capLabel: 'Product max limit',
  estimateLabel: 'Mock limit',
  limitReasonFallback: "We couldn't calculate a mock limit",
  errorFallback: "We couldn't load the product information. Please try again in a moment",
};

const LIMIT_REASON_TEXT_EN: Record<SolGlobalLoanLimitReason, string> = {
  NOT_ELIGIBLE: "You don't meet all requirements, so we didn't calculate a mock limit",
  TERM_TOO_SHORT: "The possible loan term before your stay expires is under 6 months, so we didn't calculate a mock limit",
};

const INCOME_SOURCE_TEXT_EN: Record<Exclude<SolGlobalLoanIncomeSource, 'INCOME_RECORD' | 'NONE'>, string> = {
  CONTRACT_SALARY: 'contract salary',
};

const LOAN_ERROR_TEXT_EN: Record<string, string> = {
  INSUFFICIENT_DATA: "There isn't enough information to check the requirements yet. Please check your MyData connection",
  UNAUTHORIZED: 'Your session has expired. Please reopen the app',
  HTTP_401: 'Your session has expired. Please reopen the app',
  NETWORK: 'Check your internet connection and try again',
};

// ── 화면이 쓰는 표 (지금 화면 언어 쪽) ──────────────────
export const LOAN_TEXT = localized(LOAN_TEXT_KO, LOAN_TEXT_EN);
export const LIMIT_REASON_TEXT = localized(LIMIT_REASON_TEXT_KO, LIMIT_REASON_TEXT_EN);
export const INCOME_SOURCE_TEXT = localized(INCOME_SOURCE_TEXT_KO, INCOME_SOURCE_TEXT_EN);
export const LOAN_ERROR_TEXT = localized(LOAN_ERROR_TEXT_KO, LOAN_ERROR_TEXT_EN);
