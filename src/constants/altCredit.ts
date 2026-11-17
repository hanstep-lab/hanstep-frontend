// CR-001 대안신용 사전진단 문구·색 표. 화면(src/app/credit/index.tsx)은 서버 코드를 이 표로 문구와 색으로만 바꾼다.
// 점수 구간·등급의 경계값은 두지 않는다 (판단은 서버가 함). 문구를 바꿀 때는 이 파일만 고친다.
import { colors } from './theme';
import type {
  AltCreditCheckKey,
  AltCreditFactorKey,
  AltCreditLevel,
  AltCreditInputs,
  AltCreditReasonCode,
  AltCreditErrorCode,
} from '../api/altCredit';

// ── 고정 문구 ───────────────────────────────────────────
export const ALT_CREDIT_TEXT = {
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
  tipsTitle: '점수를 높이는 방법',
  notice: '신한걸음 사전진단 결과예요. 실제 대출 가능 여부와 금리는 은행 심사에 따라 달라요.',
  loading: '대안신용 사전진단을 불러오는 중이에요.',
};

// ── 배지 색 ─────────────────────────────────────────────
export type BadgeTone = { color: string; bg: string; border?: string };

// 진단 근거 수준(level) → 라벨·색
export const LEVEL_BADGE: Record<AltCreditLevel, BadgeTone & { label: string }> = {
  GOOD: { label: '양호', color: colors.primary, bg: colors.primarySoft },
  FAIR: { label: '보통', color: colors.text.sub, bg: colors.tagBg },
  NEEDS_IMPROVEMENT: { label: '보완 필요', color: colors.required.text, bg: colors.required.pillBg },
  NO_RECORD: { label: '기록 없음', color: colors.text.muted, bg: colors.surface, border: colors.border },
};

// 가입 조건 충족 / 미충족 배지
export const ELIGIBILITY_BADGE = {
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

export const FACTOR_NAME: Record<AltCreditFactorKey, string> = {
  TEL_LATE: '통신비 납부',
  REMIT_REGULARITY: '송금 규칙성',
  REMIT_RATIO: '해외송금 비율',
  STAY_DURATION: '누적 체류 기간',
  UTIL_LATE: '건보·공과금 납부',
};

// 항목 × 등급 → 설명 한 줄. 표에 없는 조합은 설명 줄 없이 배지만 보여 준다.
export const FACTOR_DESC: Record<AltCreditFactorKey, Partial<Record<AltCreditLevel, string>>> = {
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

export const CHECK_TITLE: Record<AltCreditCheckKey, string> = {
  WORK_PERMITTED: '근로 가능한 체류자격',
  SALARY_3M: '급여 입금 3개월 이상',
  EXPIRY_OVER_6M: '체류 만료까지 6개월 초과',
};

// 조건 옆에 붙는 값. 서버 inputs 값을 글자로만 붙인다. 없으면 null
export function checkValue(key: AltCreditCheckKey, inputs: AltCreditInputs): string | null {
  switch (key) {
    case 'SALARY_3M':
      return `연속 ${inputs.salaryMonths}개월 입금`;
    case 'EXPIRY_OVER_6M':
      return inputs.monthsToExpiry == null ? '만료일 정보 없음' : `${inputs.monthsToExpiry}개월 남음`;
    default:
      return null;
  }
}

// ── 미충족 사유 ─────────────────────────────────────────
export const REASON_TEXT: Record<AltCreditReasonCode, string> = {
  NO_INCOME: '소득 입금 기록이 확인되지 않았어요',
  WORK_NOT_PERMITTED: '근로 가능한 체류자격이 확인되지 않았어요',
  SALARY_UNDER_3M: '급여 입금 기간이 3개월이 안 됐어요',
  EXPIRY_WITHIN_6M: '체류 만료까지 6개월이 남지 않았어요',
  RATE_OVER_LEGAL_MAX: '산출 금리가 법정 최고금리를 넘어 이용이 어려워요',
};
export const REASON_FALLBACK = '가입 조건을 확인하지 못했어요';

// ── 점수를 높이는 방법 ──────────────────────────────────
export type TipCard = { title: string; desc: string; button?: string };

// 카드 대상 항목과 순서 (STAY_DURATION 은 카드 없음)
export type TipFactorKey = Exclude<AltCreditFactorKey, 'STAY_DURATION'>;
export const TIP_ORDER: TipFactorKey[] = ['TEL_LATE', 'UTIL_LATE', 'REMIT_REGULARITY', 'REMIT_RATIO'];
// 카드가 되는 등급
export const TIP_LEVELS: AltCreditLevel[] = ['FAIR', 'NEEDS_IMPROVEMENT'];
export const TIP_MAX = 2;

export const TIPS: Record<TipFactorKey, TipCard> = {
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

export const DEFAULT_TIP: TipCard = {
  title: '지금처럼 납부·송금 기록 이어가기',
  desc: '기록이 꾸준할수록 지금 결과를 유지하기 좋아요',
};

// ── 오류 문구 ───────────────────────────────────────────
export const ERROR_TEXT: Record<AltCreditErrorCode, string> = {
  CONSENT_REQUIRED: '대안신용 사전진단을 보려면 신용평가 동의가 필요해요',
  INSUFFICIENT_DATA: '진단에 필요한 정보가 아직 부족해요. 마이데이터 연결을 확인해 주세요',
  AI_UPSTREAM_ERROR: '진단 계산이 잠시 지연되고 있어요. 잠시 후 다시 시도해 주세요',
};
export const ERROR_FALLBACK = '대안신용 사전진단을 불러오지 못했어요. 잠시 후 다시 시도해 주세요';
