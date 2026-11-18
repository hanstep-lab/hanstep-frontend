// 체류자격 전환 로드맵 API (VS-001). 화면은 이 파일만 부르고 Mock 인지 모른다.
// Mock 과 서버 모두 같은 모양(VisaRoadmapDetailResponse · E74AssessmentDetailResponse · OnboardingSummaryResponse)을 돌려주고,
// 화면용 문구는 아래 getVisaScreen 한 곳에서 만든다.
// 점수·D-day·날짜·개월 수는 서버(Mock) 값을 그대로 쓰고 표시 형식만 바꾼다 (더하기·빼기 계산 없음).
import { client } from './client';
import { USE_MOCK, mockDelay } from './config';
import { mockCreateRoadmap, mockLatestE74, mockLatestRoadmap } from './mock/visa';
import { getOnboardingSummary } from './onboarding';
import { fmtDate, fmtNumber } from '../utils/format';
import type {
  ApiError,
  E74AssessmentDetailResponse,
  E74Improvement,
  SummaryVisa,
  VisaRoadmapDetailResponse,
  VisaRoadmapResponse,
  VisaRoadmapScoreItem,
  VisaRoadmapStep,
} from '../types/api';

// POST 는 AI 를 부를 수 있어 기본(10초)보다 길게. 2026-11-18 실측 0.9초(TEMPLATE 문장, LLM 미호출)
const ROADMAP_POST_TIMEOUT_MS = 30_000;

const isNotFound = (e: ApiError) => e.code === 'RESOURCE_NOT_FOUND' || e.code === 'HTTP_404';

// ── 서버 호출 ─────────────────────────────────────────

// GET /api/v1/visa/roadmaps/latest — 저장된 로드맵이 없으면(404) null
export async function getLatestRoadmap(): Promise<VisaRoadmapDetailResponse | null> {
  if (USE_MOCK) {
    await mockDelay();
    return mockLatestRoadmap();
  }
  try {
    const res = await client.get<VisaRoadmapDetailResponse>('/api/v1/visa/roadmaps/latest');
    return res.data;
  } catch (e) {
    if (isNotFound(e as ApiError)) return null;
    throw e;
  }
}

// GET /api/v1/visa/e74/assessments/latest?scenario=false — 저장된 평가가 없으면(404) null
export async function getLatestE74(): Promise<E74AssessmentDetailResponse | null> {
  if (USE_MOCK) {
    await mockDelay();
    return mockLatestE74();
  }
  try {
    const res = await client.get<E74AssessmentDetailResponse>('/api/v1/visa/e74/assessments/latest', {
      params: { scenario: false },
    });
    return res.data;
  } catch (e) {
    if (isNotFound(e as ApiError)) return null;
    throw e;
  }
}

type ServerErrorBody = { code?: string; message?: string; details?: { reason?: string } };

const CREATE_ERROR_TEXT = {
  NO_VISA_PROFILE: '체류 정보가 없어 로드맵을 만들 수 없어요. 외국인등록증 정보를 먼저 확인해 주세요.',
  NO_STAY_EXPIRY: '체류 만료일 정보가 없어 로드맵을 만들 수 없어요. 외국인등록증의 체류 만료일을 확인해 주세요.',
  STAY_EXPIRED: '체류 만료일이 이미 지나 로드맵을 만들 수 없어요. 가까운 출입국·외국인관서에 문의해 주세요.',
  PROFILE_REJECTED: '저장된 정보 중 다시 확인이 필요한 값이 있어 로드맵을 만들지 못했어요. 잠시 후 다시 시도해 주세요.',
  INVALID_STATE: '지금은 적용할 점수표 기준이 준비되지 않았어요. 잠시 후 다시 시도해 주세요.',
  AI_UPSTREAM_ERROR: '로드맵을 만드는 중 문제가 생겼어요. 잠시 후 다시 시도해 주세요.',
  DEFAULT: '로드맵을 만들지 못했어요. 다시 시도해 주세요.',
} as const;

function createErrorText(status: number, body: ServerErrorBody | undefined): string {
  if (status === 422) {
    const reason = body?.details?.reason;
    if (reason && reason in CREATE_ERROR_TEXT) return CREATE_ERROR_TEXT[reason as keyof typeof CREATE_ERROR_TEXT];
    return CREATE_ERROR_TEXT.DEFAULT;
  }
  if (status === 409) return CREATE_ERROR_TEXT.INVALID_STATE;
  if (status === 502) return CREATE_ERROR_TEXT.AI_UPSTREAM_ERROR;
  return CREATE_ERROR_TEXT.DEFAULT;
}

// POST /api/v1/visa/roadmaps (본문 {}) — 서버 DB 에 저장되고 AI 가 불린다. [로드맵 만들기] 버튼에서만 부른다.
// 422 의 details.reason 을 읽어야 해서 이 호출만 validateStatus 로 응답을 직접 본다 (client.ts 는 details 를 버림).
// 실패하면 화면에 보여줄 문구를 message 에 담아 reject.
export async function createRoadmap(): Promise<VisaRoadmapResponse> {
  if (USE_MOCK) {
    await mockDelay();
    return mockCreateRoadmap();
  }
  let res;
  try {
    res = await client.post<VisaRoadmapResponse | ServerErrorBody>(
      '/api/v1/visa/roadmaps',
      {},
      { timeout: ROADMAP_POST_TIMEOUT_MS, validateStatus: () => true },
    );
  } catch (e) {
    // 네트워크 끊김·시간 초과
    const err: ApiError = { code: (e as ApiError).code ?? 'NETWORK', message: CREATE_ERROR_TEXT.DEFAULT };
    throw err;
  }
  if (res.status === 200 || res.status === 201) return res.data as VisaRoadmapResponse;
  const body = res.data as ServerErrorBody | undefined;
  const err: ApiError = { code: body?.code ?? `HTTP_${res.status}`, message: createErrorText(res.status, body) };
  throw err;
}

// ── 화면용 문구 ─────────────────────────────────────────

export type VisaScoreState = 'default' | 'pending' | 'required';

export type VisaScreenView = {
  status: {
    current: string; // "E-9"
    currentLabel: string | null; // "비전문취업" (표에 없으면 null → 숨김)
    stayText: string | null; // "체류 3년 11개월"
    target: string; // "E-7-4"
    targetLabel: string | null; // "숙련기능인력"
    expiryText: string | null; // "2027.10.04" (만료일·D-day 둘 다 있을 때만, 아니면 둘 다 null)
    ddayText: string | null; // "D-320"
    applyText: string | null; // "2026.12.05부터 (체류 4년 충족)"
  };
  score: {
    totalText: string; // "235"
    proofText: string | null; // "증빙 시 285점"
    basis: string;
    breakdownText: string | null; // "기본 205점 + 가점 30점"
    thresholdText: string | null; // "기준 점수 200점"
    items: { key: string; title: string; sub: string; score: string; scoreSub?: string; state: VisaScoreState }[];
    penaltyNote: string | null;
    // roadmap.warnings 중 아는 코드만. strong 은 눈에 띄게 강조할 안내
    warnings: { key: string; text: string; strong: boolean }[];
  };
  steps: {
    key: string;
    number: number;
    label: string;
    meta: string;
    title: string;
    desc: string;
    docs: string[];
    required: boolean;
  }[];
  summary: {
    rows: { key: string; title: string; sub: string | null; score: string }[];
    note: string; // 카드 맨 아래 안내 한 줄
  };
};

export type VisaScreenData = { kind: 'empty' } | { kind: 'ready'; view: VisaScreenView };

// 비자 코드 → 한글 이름. 서버는 영문 이름만 줘서 프론트에 둔다.
const VISA_LABEL: Record<string, string> = {
  'E-9': '비전문취업',
  'E-7-4': '숙련기능인력',
};

const SCORE_BASIS = 'E-7-4 점수표 기준 · 사전진단';
const PENALTY_NOTE = '감점 항목(벌금·체납 등)은 아직 반영되지 않았어요';
// 서버 isMock 값과 관계없이 항상 보여준다 (isMock 자체는 화면에 쓰지 않음).
// 기준 변경 안내는 RULES_EXPIRE 경고가 맡아서 여기서는 쓰지 않는다.
const SUMMARY_NOTE = '사전진단 결과이며 실제 심사 결과가 아니에요';

// roadmap.warnings 코드 → 안내. 여기 없는 코드는 표시하지 않는다.
const WARNING_TEXT: Record<string, { text: string; strong: boolean }> = {
  STAY_EXPIRES_FIRST: { text: '신청 가능일 전에 체류기간이 끝나요. 연장 여부를 먼저 확인하세요', strong: true },
  RULES_EXPIRE: { text: '2027년부터 선발 기준이 바뀌면 점수가 달라질 수 있어요', strong: false },
  DRAFT_RULES: { text: '점수표가 공식 확정 전 기준이에요', strong: false },
};
const LOAD_ERROR_TEXT = '로드맵을 불러오지 못했어요.';

// 점수 항목 제목 (ruleCode 기준, 없으면 category 기준)
const ITEM_TITLE: Record<string, string> = {
  TENURE_3Y: '근속 가점 (3년 이상)',
  DRIVER_LICENSE: '운전면허 가점',
  REC_EMPLOYER: '고용기업 추천',
  REC_CENTRAL: '중앙부처 추천',
  REC_REGIONAL: '광역지자체 추천',
  QUALIFICATION: '자격증·학위 가점',
  REGION_3Y: '지역 근속 가점',
};

// 점수 항목 근거 (basis)
const BASIS_TEXT: Record<string, string> = {
  DOCUMENT: '제출 서류 기준',
  TOPIK: 'TOPIK 성적 기준',
  ARC: '외국인등록증 생년월일 기준',
};

const num = (v: unknown): number | null => (typeof v === 'number' ? v : null);

// 47 → "3년 11개월" (표시 형식만 바꿈)
function fmtMonths(months: number): string {
  const y = Math.floor(months / 12);
  const m = months % 12;
  if (y === 0) return `${m}개월`;
  return m === 0 ? `${y}년` : `${y}년 ${m}개월`;
}

// 31250000 → "3,125만 원", 1만 원 단위가 아니면 "31,250,500원"
function fmtWon(n: number): string {
  return n % 10_000 === 0 ? `${fmtNumber(n / 10_000)}만 원` : `${fmtNumber(n)}원`;
}

function fmtDday(days: number): string {
  return days < 0 ? `D+${-days}` : `D-${days}`;
}

function itemTitle(item: VisaRoadmapScoreItem): string {
  const v = item.value;
  switch (item.category) {
    case 'BASE_INCOME': {
      const income = num(v.averageIncome);
      return income === null ? '연소득' : `연소득 (평균 ${fmtWon(income)})`;
    }
    case 'BASE_KOREAN': {
      const level = num(v.level);
      return level !== null && item.basis === 'TOPIK' ? `한국어능력 (TOPIK ${level}급)` : '한국어능력';
    }
    case 'BASE_AGE': {
      const age = num(v.age);
      return age === null ? '나이' : `나이 (만 ${age}세)`;
    }
  }
  return ITEM_TITLE[item.ruleCode] ?? (item.category === 'BONUS' ? '가점 항목' : '점수 항목');
}

function itemState(item: VisaRoadmapScoreItem): VisaScoreState {
  if (item.requiredForApplication && item.status !== 'MET') return 'required';
  if (item.status === 'NEEDS_EVIDENCE') return 'pending';
  return 'default';
}

function itemSub(item: VisaRoadmapScoreItem, state: VisaScoreState): string {
  const tenure = num(item.value.tenureMonths);
  if (tenure !== null) return `근속 ${fmtMonths(tenure)}`;
  if (state === 'required') return '없으면 신청할 수 없어요';
  if (state === 'pending') return '증빙 서류 필요';
  return (item.basis ? BASIS_TEXT[item.basis] : undefined) ?? '등록된 서류 기준';
}

function toScoreItem(
  item: VisaRoadmapScoreItem,
  gainOf: (ruleCode: string) => number | null,
): VisaScreenView['score']['items'][number] {
  const state = itemState(item);
  const gain = item.status === 'MET' ? null : gainOf(item.ruleCode);
  let score: string;
  if (state === 'required') score = '미확보';
  else if (item.category === 'BONUS' && item.earnedPoints > 0) score = `+${item.earnedPoints}점`;
  else score = `${item.earnedPoints}점`;
  let scoreSub: string | undefined;
  if (gain !== null) scoreSub = state === 'pending' ? `증빙 시 +${gain}점` : `+${gain}점 가능`;
  return { key: item.ruleCode, title: itemTitle(item), sub: itemSub(item, state), score, scoreSub, state };
}

function stepLabel(st: VisaRoadmapStep): string {
  if (st.kind === 'APPLY') return `STEP ${st.order} · 신청`;
  return `STEP ${st.order} · ${st.required ? '필수' : '선택'}`;
}

function stepMeta(st: VisaRoadmapStep): string {
  if (st.estimatedAdditionalScore !== null) return `+${st.estimatedAdditionalScore}점`;
  if (st.availableFrom) return `${fmtDate(st.availableFrom)}부터`;
  if (st.actor === 'EMPLOYER') return '사업주 요청';
  return '';
}

const scoreParts = (steps: VisaRoadmapStep[]) =>
  steps
    .filter((st) => st.estimatedAdditionalScore !== null)
    .map((st) => `${st.title} +${st.estimatedAdditionalScore}`)
    .join(' · ') || null;

function toView(
  detail: VisaRoadmapDetailResponse,
  e74: E74AssessmentDetailResponse | null,
  summaryVisa: SummaryVisa | null,
): VisaScreenView {
  const { roadmap } = detail;
  const result = e74?.result ?? null;
  const improvements: E74Improvement[] = result?.improvements ?? [];

  // 현재 비자·만료일·D-day: onboarding/summary 우선, 실패하면 로드맵 stay 값
  const current = summaryVisa?.visaTypeCode ?? roadmap.stay.visaTypeCode;
  const expiry = summaryVisa
    ? { date: summaryVisa.stayExpiresOn, days: summaryVisa.daysRemaining }
    : { date: roadmap.stay.stayExpiresOn, days: roadmap.stay.daysToExpiry };
  const hasExpiry = expiry.date !== null && expiry.days !== null;

  // 체류 개월 수·신청 가능 시점 메모: E-7-4 평가의 체류 4년 요건(REQ_STAY_PERIOD)
  const stayEvidence = result?.items.find((it) => it.ruleCode === 'REQ_STAY_PERIOD')?.evidence;
  const stayMonths = num(stayEvidence?.totalMonths);
  const stayWait = improvements.find((imp) => imp.ruleCode === 'REQ_STAY_PERIOD');
  const requiredMonths = num(stayWait?.target.requiredMonths);
  const applyFrom = roadmap.stay.applicableFrom;
  const applyNote = requiredMonths !== null ? `체류 ${fmtMonths(requiredMonths)} 충족` : null;

  // 항목별 "+n점": E-7-4 평가 improvements 우선, 없으면 로드맵 단계의 예상 점수
  const gainOf = (ruleCode: string): number | null =>
    improvements.find((imp) => imp.ruleCode === ruleCode)?.pointsGain ??
    roadmap.steps.find((st) => st.ruleCode === ruleCode)?.estimatedAdditionalScore ??
    null;

  const total = result?.score.total ?? roadmap.score.confirmed;
  const potential = result?.potentialScore.total ?? roadmap.score.potential;
  const required = result?.score.required ?? roadmap.score.required;
  const breakdown = result
    ? `기본 ${result.score.base}점 + 가점 ${result.score.bonus}점` +
      (result.score.penalty !== 0 ? ` · 감점 ${result.score.penalty}점` : '')
    : null;
  const penaltyNotDeclared = roadmap.missingInputs.some((m) => m.field.startsWith('legalDeclaration.'));

  const { afterRequiredSteps, afterAllSteps } = roadmap.projectedScore;
  const rows: VisaScreenView['summary']['rows'] = [
    {
      key: 'required',
      title: '필수 단계를 마치면',
      sub: scoreParts(roadmap.steps.filter((st) => st.required)),
      score: `${afterRequiredSteps}점`,
    },
  ];
  if (afterAllSteps !== afterRequiredSteps) {
    rows.push({
      key: 'all',
      title: '모든 단계를 마치면',
      sub: scoreParts(roadmap.steps.filter((st) => !st.required)),
      score: `${afterAllSteps}점`,
    });
  }

  return {
    status: {
      current,
      currentLabel: VISA_LABEL[current] ?? null,
      stayText: stayMonths !== null ? `체류 ${fmtMonths(stayMonths)}` : null,
      target: roadmap.goalVisaCode,
      targetLabel: VISA_LABEL[roadmap.goalVisaCode] ?? null,
      expiryText: hasExpiry ? fmtDate(expiry.date!) : null,
      ddayText: hasExpiry ? fmtDday(expiry.days!) : null,
      applyText: applyFrom ? `${fmtDate(applyFrom)}부터${applyNote ? ` (${applyNote})` : ''}` : null,
    },
    score: {
      totalText: String(total),
      proofText: potential !== total ? `증빙 시 ${potential}점` : null,
      basis: SCORE_BASIS,
      breakdownText: breakdown,
      thresholdText: required !== null ? `기준 점수 ${required}점` : null,
      items: roadmap.score.items.map((it) => toScoreItem(it, gainOf)),
      penaltyNote: penaltyNotDeclared ? PENALTY_NOTE : null,
      warnings: [...new Set(roadmap.warnings ?? [])]
        .filter((code) => code in WARNING_TEXT)
        .map((code) => ({ key: code, ...WARNING_TEXT[code] })),
    },
    steps: roadmap.steps.map((st) => ({
      key: `${st.order}`,
      number: st.order,
      label: stepLabel(st),
      meta: stepMeta(st),
      title: st.title,
      desc: st.description,
      docs: st.requiredEvidence,
      // 신청 단계는 서버에서 required 지만 빨간 필수 카드로 보이지 않게 한다
      required: st.required && st.kind !== 'APPLY',
    })),
    summary: { rows, note: SUMMARY_NOTE },
  };
}

// VS-001 화면 데이터. 로드맵이 없으면(404) empty, 로드맵 조회가 실패하면 reject.
// E-7-4 평가·온보딩 요약은 실패해도 null 로 두고 로드맵 값으로 계속 보여준다.
export async function getVisaScreen(): Promise<VisaScreenData> {
  const [detail, e74, summaryVisa] = await Promise.all([
    getLatestRoadmap().catch((e: ApiError) => {
      const err: ApiError = { code: e.code, message: LOAD_ERROR_TEXT };
      throw err;
    }),
    getLatestE74().catch(() => null),
    getOnboardingSummary()
      .then((s) => s.visa)
      .catch(() => null),
  ]);
  if (!detail) return { kind: 'empty' };
  return { kind: 'ready', view: toView(detail, e74, summaryVisa) };
}
