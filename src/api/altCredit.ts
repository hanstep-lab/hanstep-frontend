// 대안신용 사전진단 API (CR-001). 화면은 이 파일만 부른다.
// Mock 없이 서버 값만 받는다. 등급·문구 변환과 계산은 하지 않고 받은 값을 그대로 돌려준다.
// isMock·mockFields 는 타입에만 두고 화면에는 표시하지 않는다.

import { client } from './client';

// 진단 결과
export type AltCreditDecision = 'ELIGIBLE' | 'NOT_ELIGIBLE' | 'CONDITION_NOT_MET';

// 결과 사유. 해당 없으면 null
export type AltCreditReasonCode =
  | 'NO_INCOME'
  | 'WORK_NOT_PERMITTED'
  | 'SALARY_UNDER_3M'
  | 'EXPIRY_WITHIN_6M'
  | 'RATE_OVER_LEGAL_MAX';

// 최대 한도를 정한 기준. 해당 없으면 null
export type AltCreditLimitBinding =
  | 'PRODUCT_MAX'
  | 'ANNUAL_INCOME_80'
  | 'MONTHLY_PAYMENT_40_TERM'
  | 'SIMPLE_DSR_40';

// 금리 구성. 모두 소수 (0.0383 = 3.83%)
export type AltCreditRateBreakdown = {
  base: number;
  creditPremium: number;
  capitalCost: number;
  otherSpread: number;
  spread: number;
  preferential: number;
  final: number;
};

// 진단에 쓴 입력값. 날짜는 'YYYY-MM-DD' 문자열
export type AltCreditInputs = {
  stayDurationMonths: number;
  monthsToExpiry: number | null;
  workPermitted: boolean;
  monthlyIncome: number;
  salaryMonths: number;
  shinhanPayroll: boolean;
  hasSubscription: boolean;
  isRefinance: boolean;
  telLate6m: number;
  utilLate6m: number;
  remitRatio: number; // 0~1 소수 (예: 0.2979)
  remitMonths6m: number | null;
  asOfDate: string;
  periodFrom: string;
  periodTo: string;
  recentFrom: string;
};

export type AltCreditAssessment = {
  modelVersion: string;
  isMock: boolean;
  pd: number; // 0~1 소수 (예: 0.0109)
  score: number;
  rateBreakdown: AltCreditRateBreakdown | null; // 소득 없으면 null
  rateBaseDate: string; // 'YYYY-MM-DD'
  loanTermMonths: number;
  minLimit: number; // 원 단위 정수
  maxLimit: number; // 원 단위 정수
  maxLimitBinding: AltCreditLimitBinding | null;
  decision: AltCreditDecision;
  reasonCode: AltCreditReasonCode | null;
  inputWarnings: string[];
  disclaimer: string;
  inputs: AltCreditInputs;
  mockFields: string[];
};

// 화면에서 오류별로 나눌 때 쓰는 코드. 401 은 서버가 code 를 안 주면 'HTTP_401' 로 온다.
// 422 의 details.reason 은 client.ts 가 code·message 만 남기므로 받을 수 없다.
export type AltCreditErrorCode = 'CONSENT_REQUIRED' | 'INSUFFICIENT_DATA' | 'AI_UPSTREAM_ERROR';

// GET /api/v1/credit/alt-assessment
export async function getAltAssessment(isRefinance = false): Promise<AltCreditAssessment> {
  const res = await client.get<AltCreditAssessment>('/api/v1/credit/alt-assessment', {
    params: { isRefinance },
  });
  return res.data;
}
