// CR-001 대안신용 사전진단 문구·색 표. 화면(src/app/credit/index.tsx)은 서버 코드를 이 표로 문구와 색으로만 바꾼다.
// 점수 구간·등급의 경계값은 두지 않는다 (판단은 서버가 함). 문구를 바꿀 때는 이 파일만 고친다.
import { colors } from './theme';
import { isKoreanUi, localized } from '../i18n';
import type {
  AltCreditCheckKey,
  AltCreditFactorKey,
  AltCreditLevel,
  AltCreditInputs,
  AltCreditReasonCode,
  AltCreditErrorCode,
} from '../api/altCredit';

// ── 고정 문구 ───────────────────────────────────────────
// 표마다 한국어(_KO)와 영어(_EN, 파일 아래) 두 벌. 화면은 맨 아래의 localized 표를 쓴다
const ALT_CREDIT_TEXT_KO = {
  badge: '대안신용 사전진단',
  description: '통신비·송금·체류·건강보험 납부 기록으로 계산했어요',
  scoreMax: '1,000점',
  bandNotice: '점수 구간은 이해를 돕기 위한 표시로, 한도·금리와는 관계없어요.',
  factorsTitle: '진단 근거',
  factorsBasis: '마이데이터 최근 6개월 · 체류 정보 기준',
  productsTitle: '추천 대출 상품',
  productsDesc: '진단 결과와 상품 가입 조건을 비교했어요',
  solGlobalTag: '신한은행 · 외국인 근로자 전용 신용대출',
  hanstepLoanTag: '신한걸음 · 대안신용평가 기반 외국인 신용대출',
  hanstepLoanName: '신한걸음 글로벌론',
  limitLabel: '예상 한도',
  termLabel: '대출 기간',
  detailButton: '상품 자세히 보기',
  askButton: '신한걸음에 물어보기', // 화면 아래 고정 버튼 → 기존 챗봇으로 돌아간다
  checkUnknown: '확인 불가', // 가입 조건 met 이 null 일 때 옆 값 대신
  tipsTitle: '점수를 높이는 방법',
  notice: '신한걸음 사전진단 결과예요. 실제 대출 가능 여부와 금리는 은행 심사에 따라 달라요.',
  loading: '대안신용 사전진단을 불러오는 중이에요.',
  reasonFallback: '가입 조건을 확인하지 못했어요', // 미충족 사유 코드를 모를 때
  errorFallback: '대안신용 사전진단을 불러오지 못했어요. 잠시 후 다시 시도해 주세요', // 표에 없는 오류 코드
};

// ── 배지 색 ─────────────────────────────────────────────
export type BadgeTone = { color: string; bg: string; border?: string };

// 진단 근거 수준(level) → 라벨·색
const LEVEL_BADGE_KO: Record<AltCreditLevel, BadgeTone & { label: string }> = {
  GOOD: { label: '양호', color: colors.primary, bg: colors.primarySoft },
  FAIR: { label: '보통', color: colors.text.sub, bg: colors.tagBg },
  NEEDS_IMPROVEMENT: { label: '보완 필요', color: colors.required.text, bg: colors.required.pillBg },
  NO_RECORD: { label: '기록 없음', color: colors.text.muted, bg: colors.surface, border: colors.border },
};

// 가입 조건 충족 / 미충족 배지
const ELIGIBILITY_BADGE_KO = {
  met: { label: '가입 조건 충족', color: colors.primary, bg: colors.primarySoft },
  unmet: { label: '가입 조건 미충족', color: colors.required.text, bg: colors.required.pillBg },
} satisfies Record<string, BadgeTone & { label: string }>;

// ── 점수 구간 막대 ──────────────────────────────────────
// 전체 칸 수. 칠할 칸 수는 서버 scoreBand.index 를 그대로 쓴다.
export const BAND_SEGMENTS = 5;

// ── 진단 근거 ───────────────────────────────────────────
// 화면에 보여 줄 순서 (서버 순서와 상관없음)
export const FACTOR_ORDER: AltCreditFactorKey[] = [
  'TEL_LATE',
  'REMIT_REGULARITY',
  'REMIT_RATIO',
  'STAY_DURATION',
  'UTIL_LATE',
];

const FACTOR_NAME_KO: Record<AltCreditFactorKey, string> = {
  TEL_LATE: '통신비 납부',
  REMIT_REGULARITY: '송금 규칙성',
  REMIT_RATIO: '해외송금 비율',
  STAY_DURATION: '누적 체류 기간',
  UTIL_LATE: '건보·공과금 납부',
};

// 항목 × 등급 → 설명 한 줄. 표에 없는 조합은 설명 줄 없이 배지만 보여 준다.
const FACTOR_DESC_KO: Record<AltCreditFactorKey, Partial<Record<AltCreditLevel, string>>> = {
  TEL_LATE: {
    GOOD: '최근 6개월 동안 통신비를 늦지 않고 냈어요',
    FAIR: '최근 6개월 중 통신비를 늦게 낸 달이 조금 있어요',
    NEEDS_IMPROVEMENT: '최근 6개월 중 통신비를 늦게 낸 달이 여러 번 있어요',
  },
  REMIT_REGULARITY: {
    GOOD: '최근 6개월 동안 거의 매달 해외송금을 했어요',
    FAIR: '최근 6개월 중 절반 정도의 달에 해외송금을 했어요',
    NEEDS_IMPROVEMENT: '최근 6개월 중 해외송금한 달이 적어요',
    NO_RECORD: '최근 6개월 동안 해외송금 기록이 없어요',
  },
  REMIT_RATIO: {
    GOOD: '소득에 비해 해외송금 비중이 낮은 편이에요',
    FAIR: '소득의 절반 정도를 해외로 보내고 있어요',
    NEEDS_IMPROVEMENT: '소득에 비해 해외송금 비중이 높은 편이에요',
    NO_RECORD: '소득 기록이 없어 송금 비중을 확인할 수 없어요',
  },
  STAY_DURATION: {
    GOOD: '한국에서 3년 이상 머물렀어요',
    FAIR: '한국에서 2년 이상 머물렀어요',
    NEEDS_IMPROVEMENT: '한국에 머문 기간이 2년이 안 됐어요',
  },
  UTIL_LATE: {
    GOOD: '최근 6개월 동안 건강보험료·공과금을 연체 없이 냈어요',
    FAIR: '최근 6개월 중 건강보험료·공과금을 늦게 낸 달이 조금 있어요',
    NEEDS_IMPROVEMENT: '최근 6개월 중 건강보험료·공과금을 늦게 낸 달이 여러 번 있어요',
  },
};

// ── 신한걸음 글로벌론 가입 조건 ─────────────────────────
export const CHECK_ORDER: AltCreditCheckKey[] = ['WORK_PERMITTED', 'SALARY_3M', 'EXPIRY_OVER_6M'];

const CHECK_TITLE_KO: Record<AltCreditCheckKey, string> = {
  WORK_PERMITTED: '근로 가능한 체류자격',
  SALARY_3M: '급여 입금 3개월 이상',
  EXPIRY_OVER_6M: '체류 만료까지 6개월 초과',
};

// 조건 옆에 붙는 값. 서버 inputs 값을 글자로만 붙인다. 없으면 null
export function checkValue(key: AltCreditCheckKey, inputs: AltCreditInputs): string | null {
  switch (key) {
    case 'SALARY_3M':
      return isKoreanUi() ? `연속 ${inputs.salaryMonths}개월 입금` : `${inputs.salaryMonths} months in a row`;
    case 'EXPIRY_OVER_6M':
      if (inputs.monthsToExpiry == null) return isKoreanUi() ? '만료일 정보 없음' : 'No expiry date';
      return isKoreanUi() ? `${inputs.monthsToExpiry}개월 남음` : `${inputs.monthsToExpiry} months left`;
    default:
      return null;
  }
}

// ── 미충족 사유 ─────────────────────────────────────────
const REASON_TEXT_KO: Record<AltCreditReasonCode, string> = {
  NO_INCOME: '소득 입금 기록이 확인되지 않았어요',
  WORK_NOT_PERMITTED: '근로 가능한 체류자격이 확인되지 않았어요',
  SALARY_UNDER_3M: '급여 입금 기간이 3개월이 안 됐어요',
  EXPIRY_WITHIN_6M: '체류 만료까지 6개월이 남지 않았어요',
  RATE_OVER_LEGAL_MAX: '산출 금리가 법정 최고금리를 넘어 이용이 어려워요',
};

// ── 점수를 높이는 방법 ──────────────────────────────────
export type TipCard = { title: string; desc: string; button?: string };

// 카드 대상 항목과 순서 (STAY_DURATION 은 카드 없음)
export type TipFactorKey = Exclude<AltCreditFactorKey, 'STAY_DURATION'>;
export const TIP_ORDER: TipFactorKey[] = ['TEL_LATE', 'UTIL_LATE', 'REMIT_REGULARITY', 'REMIT_RATIO'];
// 카드가 되는 등급
export const TIP_LEVELS: AltCreditLevel[] = ['FAIR', 'NEEDS_IMPROVEMENT'];
export const TIP_MAX = 2;

const TIPS_KO: Record<TipFactorKey, TipCard> = {
  TEL_LATE: {
    title: '통신비 자동이체 설정하기',
    desc: '납부일을 놓치지 않으면 납부 기록이 좋아져요',
    button: '자동이체 설정하기',
  },
  UTIL_LATE: {
    title: '건강보험료·공과금 자동이체 설정하기',
    desc: '연체 없이 내면 납부 기록이 좋아져요',
    button: '자동이체 설정하기',
  },
  REMIT_REGULARITY: {
    title: '해외송금 꾸준히 이어가기',
    desc: '매달 비슷한 시기에 보내면 송금 기록이 쌓여요',
  },
  REMIT_RATIO: {
    title: '소득에 맞게 송금 금액 조절하기',
    desc: '생활비를 남겨 두고 보내면 송금 비중이 안정돼요',
  },
};

const DEFAULT_TIP_KO: TipCard = {
  title: '지금처럼 납부·송금 기록 이어가기',
  desc: '기록이 꾸준할수록 지금 결과를 유지하기 좋아요',
};

// ── 오류 문구 ───────────────────────────────────────────
const ERROR_TEXT_KO: Record<AltCreditErrorCode, string> = {
  CONSENT_REQUIRED: '대안신용 사전진단을 보려면 신용평가 동의가 필요해요',
  INSUFFICIENT_DATA: '진단에 필요한 정보가 아직 부족해요. 마이데이터 연결을 확인해 주세요',
  AI_UPSTREAM_ERROR: '진단 계산이 잠시 지연되고 있어요. 잠시 후 다시 시도해 주세요',
};
// ── 영어 표 (위 한국어 표와 같은 모양). 화면 언어가 한국어가 아니면 이쪽 값을 쓴다 ──────
const ALT_CREDIT_TEXT_EN = {
  badge: 'Alternative credit check',
  description: 'Calculated from your phone bill, remittance, stay and health insurance payment records',
  scoreMax: '1,000 pts',
  bandNotice: 'Score ranges are only a guide and are not related to limits or rates.',
  factorsTitle: 'Basis',
  factorsBasis: 'MyData last 6 months · stay information',
  productsTitle: 'Recommended loans',
  productsDesc: "We compared your result with each product's requirements",
  solGlobalTag: 'Shinhan Bank · Credit loan for foreign workers',
  hanstepLoanTag: 'Shinhan Step · Foreigner credit loan based on alternative credit',
  hanstepLoanName: 'Shinhan Step Global Loan',
  limitLabel: 'Estimated limit',
  termLabel: 'Loan term',
  detailButton: 'View product details',
  askButton: 'Ask Shinhan Step',
  checkUnknown: 'Unknown',
  tipsTitle: 'How to raise your score',
  notice: "This is a Shinhan Step pre-check. Actual loan approval and rates depend on the bank's review.",
  loading: 'Loading your alternative credit check.',
  reasonFallback: "We couldn't check the requirements",
  errorFallback: "We couldn't load your alternative credit check. Please try again in a moment",
};

const LEVEL_BADGE_EN: Record<AltCreditLevel, BadgeTone & { label: string }> = {
  GOOD: { ...LEVEL_BADGE_KO.GOOD, label: 'Good' },
  FAIR: { ...LEVEL_BADGE_KO.FAIR, label: 'Fair' },
  NEEDS_IMPROVEMENT: { ...LEVEL_BADGE_KO.NEEDS_IMPROVEMENT, label: 'Needs work' },
  NO_RECORD: { ...LEVEL_BADGE_KO.NO_RECORD, label: 'No record' },
};

const ELIGIBILITY_BADGE_EN = {
  met: { ...ELIGIBILITY_BADGE_KO.met, label: 'Meets requirements' },
  unmet: { ...ELIGIBILITY_BADGE_KO.unmet, label: "Doesn't meet requirements" },
};

const FACTOR_NAME_EN: Record<AltCreditFactorKey, string> = {
  TEL_LATE: 'Phone bill payments',
  REMIT_REGULARITY: 'Remittance regularity',
  REMIT_RATIO: 'Remittance share',
  STAY_DURATION: 'Total stay in Korea',
  UTIL_LATE: 'Health insurance · utility payments',
};

const FACTOR_DESC_EN: Record<AltCreditFactorKey, Partial<Record<AltCreditLevel, string>>> = {
  TEL_LATE: {
    GOOD: 'You paid your phone bill on time for the last 6 months',
    FAIR: 'You paid your phone bill late a few times in the last 6 months',
    NEEDS_IMPROVEMENT: 'You paid your phone bill late several times in the last 6 months',
  },
  REMIT_REGULARITY: {
    GOOD: 'You sent money abroad almost every month for the last 6 months',
    FAIR: 'You sent money abroad in about half of the last 6 months',
    NEEDS_IMPROVEMENT: 'You sent money abroad in only a few of the last 6 months',
    NO_RECORD: 'No overseas transfers in the last 6 months',
  },
  REMIT_RATIO: {
    GOOD: 'You send a small share of your income abroad',
    FAIR: 'You send about half of your income abroad',
    NEEDS_IMPROVEMENT: 'You send a large share of your income abroad',
    NO_RECORD: "No income record, so we couldn't check your remittance share",
  },
  STAY_DURATION: {
    GOOD: "You've stayed in Korea for 3 years or more",
    FAIR: "You've stayed in Korea for 2 years or more",
    NEEDS_IMPROVEMENT: "You've stayed in Korea for less than 2 years",
  },
  UTIL_LATE: {
    GOOD: 'You paid health insurance and utilities on time for the last 6 months',
    FAIR: 'You paid health insurance or utilities late a few times in the last 6 months',
    NEEDS_IMPROVEMENT: 'You paid health insurance or utilities late several times in the last 6 months',
  },
};

const CHECK_TITLE_EN: Record<AltCreditCheckKey, string> = {
  WORK_PERMITTED: 'Visa status allows work',
  SALARY_3M: 'Salary deposits for 3+ months',
  EXPIRY_OVER_6M: 'More than 6 months until stay expiry',
};

const REASON_TEXT_EN: Record<AltCreditReasonCode, string> = {
  NO_INCOME: "We couldn't find any income deposits",
  WORK_NOT_PERMITTED: "We couldn't confirm a visa status that allows work",
  SALARY_UNDER_3M: 'Salary deposits are less than 3 months',
  EXPIRY_WITHIN_6M: 'Less than 6 months until your stay expires',
  RATE_OVER_LEGAL_MAX: 'The calculated rate is above the legal maximum, so the loan is not available',
};

const TIPS_EN: Record<TipFactorKey, TipCard> = {
  TEL_LATE: {
    title: 'Set up auto-pay for your phone bill',
    desc: "Never missing a due date improves your payment record",
    button: 'Set up auto-pay',
  },
  UTIL_LATE: {
    title: 'Set up auto-pay for health insurance and utilities',
    desc: 'Paying on time improves your payment record',
    button: 'Set up auto-pay',
  },
  REMIT_REGULARITY: {
    title: 'Keep sending money regularly',
    desc: 'Sending around the same time each month builds your remittance record',
  },
  REMIT_RATIO: {
    title: 'Match your transfers to your income',
    desc: 'Keeping enough for living costs steadies your remittance share',
  },
};

const DEFAULT_TIP_EN: TipCard = {
  title: 'Keep up your payment and remittance records',
  desc: 'The more consistent your records, the easier it is to keep this result',
};

const ERROR_TEXT_EN: Record<AltCreditErrorCode, string> = {
  CONSENT_REQUIRED: 'Consent to credit evaluation is needed to see your alternative credit check',
  INSUFFICIENT_DATA: "There isn't enough information yet. Please check your MyData connection",
  AI_UPSTREAM_ERROR: 'The calculation is delayed. Please try again in a moment',
};

// ── 화면이 쓰는 표 (지금 화면 언어 쪽) ──────────────────────
export const ALT_CREDIT_TEXT = localized(ALT_CREDIT_TEXT_KO, ALT_CREDIT_TEXT_EN);
export const LEVEL_BADGE = localized(LEVEL_BADGE_KO, LEVEL_BADGE_EN);
export const ELIGIBILITY_BADGE = localized(ELIGIBILITY_BADGE_KO, ELIGIBILITY_BADGE_EN);
export const FACTOR_NAME = localized(FACTOR_NAME_KO, FACTOR_NAME_EN);
export const FACTOR_DESC = localized(FACTOR_DESC_KO, FACTOR_DESC_EN);
export const CHECK_TITLE = localized(CHECK_TITLE_KO, CHECK_TITLE_EN);
export const REASON_TEXT = localized(REASON_TEXT_KO, REASON_TEXT_EN);
export const TIPS = localized(TIPS_KO, TIPS_EN);
export const DEFAULT_TIP = localized(DEFAULT_TIP_KO, DEFAULT_TIP_EN);
export const ERROR_TEXT = localized(ERROR_TEXT_KO, ERROR_TEXT_EN);
