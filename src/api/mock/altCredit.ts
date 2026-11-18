// CR-001 대안신용 사전진단 Mock.
// 2026-11-18 서버 응답(demo-e9-ph-reyes, 로그인 후 GET /credit/alt-assessment?isRefinance=false 1회)을 그대로 옮겼다.
// 서버 모드와 화면이 같게 하려고 값·모양을 바꾸지 않는다. 화면은 이 파일을 직접 import 하지 않고 src/api/altCredit.ts 를 거친다.
import type { AltCreditAssessment, AltCreditEligibilityCheck } from '../altCredit';

// 가입 조건 "확인 불가" 화면을 Mock 으로 보려면 true 로 바꾼다.
// 켜면 eligibilityChecks 의 EXPIRY_OVER_6M 만 value·met 이 null 이 된다 (다른 값은 그대로).
const MOCK_EXPIRY_UNKNOWN = false;

const ELIGIBILITY_CHECKS: AltCreditEligibilityCheck[] = [
  { key: 'WORK_PERMITTED', met: true, value: true },
  { key: 'SALARY_3M', met: true, value: 6 },
  { key: 'EXPIRY_OVER_6M', met: true, value: 10 },
];

const ALT_ASSESSMENT: AltCreditAssessment = {
  modelVersion: 'alt-credit-v9',
  isMock: true,
  pd: 0.010967608614541385,
  score: 814,
  rateBreakdown: {
    base: 0.0383,
    creditPremium: 0.004935423876543624,
    capitalCost: 0.0038057419439715603,
    otherSpread: 0.073547,
    spread: 0.08228816582051518,
    preferential: 0.01,
    final: 0.11058816582051519,
  },
  rateBaseDate: '2026-11-11',
  loanTermMonths: 9,
  minLimit: 6200000,
  maxLimit: 7800000,
  maxLimitBinding: 'SIMPLE_DSR_40',
  decision: 'ELIGIBLE',
  reasonCode: null,
  inputWarnings: [],
  // 서버 원문 그대로. 금지 표현("승인"·"신용점수")이 들어 있어 화면에 쓰지 않는다.
  disclaimer: '모의 사전진단이며 실제 대출 승인이나 신용점수가 아닙니다',
  inputs: {
    stayDurationMonths: 47,
    monthsToExpiry: 10,
    workPermitted: true,
    monthlyIncome: 2350000,
    salaryMonths: 6,
    shinhanPayroll: true,
    hasSubscription: false,
    isRefinance: false,
    telLate6m: 0,
    utilLate6m: 0,
    remitRatio: 0.2979,
    remitMonths6m: 6,
    asOfDate: '2026-11-18',
    periodFrom: '2026-05-01',
    periodTo: '2026-10-31',
    recentFrom: '2026-05-01',
  },
  mockFields: [
    'monthlyIncome',
    'salaryMonths',
    'shinhanPayroll',
    'hasSubscription',
    'telLate6m',
    'utilLate6m',
    'remitRatio',
    'remitMonths6m',
  ],
  scoreBand: { index: 5, min: 801, max: 1000 },
  factors: [
    { key: 'TEL_LATE', level: 'GOOD', value: 0 },
    { key: 'UTIL_LATE', level: 'GOOD', value: 0 },
    { key: 'REMIT_REGULARITY', level: 'GOOD', value: 6 },
    { key: 'REMIT_RATIO', level: 'GOOD', value: 0.2979 },
    { key: 'STAY_DURATION', level: 'GOOD', value: 47 },
  ],
  eligibilityChecks: ELIGIBILITY_CHECKS,
};

// isRefinance=false 응답만 옮겨 두어 인자와 상관없이 같은 값을 돌려준다.
export function mockAltAssessment(): AltCreditAssessment {
  if (!MOCK_EXPIRY_UNKNOWN) return ALT_ASSESSMENT;
  return {
    ...ALT_ASSESSMENT,
    eligibilityChecks: ELIGIBILITY_CHECKS.map((c) =>
      c.key === 'EXPIRY_OVER_6M' ? { ...c, met: null, value: null } : c,
    ),
  };
}
