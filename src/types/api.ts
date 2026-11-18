// 백엔드 OpenAPI 명세(docs/api/openapi.json, Swagger /v3/api-docs 저장본) 기반 타입.
// 서버 응답/요청 모양을 그대로 옮긴 것이라, 화면·API 파일 모두 여기서 import 한다.

// ── 공통 ───────────────────────────────────────────────
// 금액. amount 는 정수(원 단위), currency 는 ISO 4217 코드
export type Money = { amount: number; currency: string };

// 화면·답변 언어 (명세 enum: en·ko·vi·zh)
export type Language = 'en' | 'ko' | 'vi' | 'zh';

// 거주 목적 (명세 enum). 기존 onboardingStore 소문자값과 다르니 주의
export type ResidencePurpose = 'WORK' | 'STUDY' | 'FAMILY' | 'OTHER';

// 온보딩 6단계 코드 (화면 순서)
export type StepCode =
  | 'LANGUAGE'
  | 'ID_DOCUMENT'
  | 'MYDATA_CONSENT'
  | 'GOALS'
  | 'GOAL_DETAILS'
  | 'SUMMARY_CONFIRM';

// 단계 진행 상태
export type StepStatus = 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED' | 'SKIPPED';

// 사용자 상태
export type UserStatus = 'ACTIVE' | 'SUSPENDED' | 'WITHDRAWN';

// 오류 응답. 서버는 { code, message, details, requestId } 로 주지만
// 화면에서 쓰는 건 code·message 뿐이라 client.ts 에서 이 모양으로 통일한다.
export type ApiError = { code: string; message: string };

// ── Auth (AUTH-01) ─────────────────────────────────────
export type EntryRequest = { entryToken: string };
export type EntryResponse = {
  accessToken: string;
  tokenType: string;
  expiresIn: number;
  user: UserMeResponse;
};

// ── User (USR-01·02) ───────────────────────────────────
export type Onboarding = {
  completed: boolean;
  currentStep: StepCode | null; // 아직 끝나지 않은 첫 단계. completed=true 면 null
};

export type UserMeResponse = {
  id: number;
  displayName: string;
  shortName?: string | null; // 짧은 이름 (예: Mark). 없으면 displayName 사용
  preferredLanguage: Language;
  status: UserStatus;
  onboarding: Onboarding;
};

export type LanguageUpdateRequest = { preferredLanguage: Language };

// ── Onboarding (ONB-01~04) ─────────────────────────────
export type OnboardingProfileRequest = { residencePurpose: ResidencePurpose | null };
export type OnboardingProfileResponse = { residencePurpose: ResidencePurpose | null };

export type OnboardingStepItem = {
  stepCode: StepCode;
  status: StepStatus;
  completedAt: string | null;
};

export type OnboardingResponse = {
  completed: boolean;
  currentStep: StepCode | null;
  steps: OnboardingStepItem[];
  profile: OnboardingProfileResponse;
};

// 단계 완료·건너뛰기 (ONB-03). status 는 COMPLETED 또는 SKIPPED 만
export type StepUpdateRequest = { status: 'COMPLETED' | 'SKIPPED' };
export type StepUpdateResponse = {
  stepCode: StepCode;
  status: StepStatus;
  completedAt: string | null;
  onboardingCompleted: boolean;
  currentStep: StepCode | null; // 다음 이동할 단계
};

// 해외송금 (TR-001). 명세가 아직 없어서 Mock 기준으로 정한 모양. 백엔드와 맞춘 뒤 수정.

export type TransferRecipient = {
  name: string;
  relation: string;     // 관계 (예: 어머니)
  bank: string;
  accountLast4: string;
  country: string;      // 화면 표시용 국가명
  countryCode: string;  // ISO 3166 두 글자 (VN)
};

export type TransferAccount = {
  name: string;
  number: string;
  balance: Money; // 출금가능 잔액
};

export type TransferPurpose = { code: string; label: string };

// 송금 화면 진입 시 한 번 받는 정보
export type TransferContext = {
  recipient: TransferRecipient;
  account: TransferAccount;
  purpose: TransferPurpose;
  quickAmounts: number[]; // 빠른 금액 버튼 (원)
};

// 적용 환율. unit 외화 = rate 원 (예: 100 VND = 5.43 KRW)
export type AppliedRate = {
  currency: string;
  unit: number;
  rate: number;
  sourceLabel: string; // 예: ECB 기준환율 기반 참고값. 문구는 서버가 정함
  asOf: string;        // ECB 기준일 (YYYY-MM-DD)
};

// 보낼 금액을 넣으면 서버가 계산해서 주는 견적
export type TransferQuote = {
  sendAmount: Money;
  receiveAmount: Money; // 수취 예상액 (서버가 반올림까지 끝낸 값)
  appliedRate: AppliedRate;
};

export type TransferRequest = {
  sendAmount: Money;
  purposeCode: string;
};

export type TransferResult = {
  transferId: string;
  sendAmount: Money;
  receiveAmount: Money;
  appliedRate: AppliedRate;
  recipient: TransferRecipient;
  guide: string; // 예: 처리 완료까지 1-2 영업일이 소요돼요.
};

// ── 금융상품 추천 (PRD-02, GET /api/v1/finance/products/recommend) ──────────
// 금리·특징은 상품설명서 원문 값. 근거가 없으면 null
export type ProductKind = 'SAVINGS' | 'DEPOSIT';
export type ProductAbstainReason = 'REQUEST_EXCEEDS_SURPLUS' | 'STAY_TOO_SHORT' | 'NO_MATCHING_PRODUCT';

// 금액 범위(원). max 는 원문이 '제한없음'이면 'no limit'
export type ProductAmountRange = { min: number | null; max: number | 'no limit' | null };

// 계약 기간(개월). 고르는 형은 배열 [6, 12], 범위형은 { min, max }
export type ProductTermMonths = number[] | { min: number; max: number } | null;

export type ProductRate = { ratePct: number; quote: string; page: number };
export type ProductBaseRate = ProductRate & { asOf: string | null };
export type ProductQuote = { quote: string; page: number };
export type ProductEvidence = ProductQuote & { about: string };

export type ProductRecommendItem = {
  productId: string;
  nameKo: string;
  kind: ProductKind;
  termMonths: ProductTermMonths;
  monthlyAmountKrw: ProductAmountRange | null; // 적금만
  depositAmountKrw: ProductAmountRange | null; // 예금만
  accrual: 'FLEXIBLE' | 'FIXED' | null;
  foreignerEligible: 'explicit' | 'inferred' | null;
  notChecked: string[]; // visa / age / remainingStay / spareMoney
  stayFits: boolean | null;
  baseRate: ProductBaseRate | null;
  maxRate: ProductRate | null; // 우대 조건 충족 시 최고 금리
  feature: ProductQuote | null;
  evidence: ProductEvidence[];
};

export type ProductRecommendResponse = {
  asOf: string;
  remainingStayMonths: number | null;
  rankedBy: string;
  abstainReason: ProductAbstainReason | null;
  products: ProductRecommendItem[];
  excludedSummary: { reason: string; count: number }[];
  isMock: boolean;
};

// ── 금융 분석 (FIN-06, GET /api/v1/finance/analyses/latest) ─────────────────
// 화면에서 쓰는 필드만 옮김. spare 는 음수 가능, 꽉 찬 달이 없으면 null
export type FinanceAnalysisResponse = {
  id: number;
  periodFrom: string;
  periodTo: string;
  spare: Money | null;
  isMock: boolean;
};

// ── 온보딩 요약 (GET /api/v1/onboarding/summary) ──
// 지금은 비자 화면(VS-001)이 쓰는 visa 칸만 둔다. user·goals·commitments·balance 는 ON-006 연결 때 추가.
export type SummaryVisa = {
  visaTypeCode: string;
  visaTypeName: string; // 영문 이름
  stayExpiresOn: string; // YYYY-MM-DD
  daysRemaining: number; // 서버 계산값, 지났으면 음수
  monthsRemaining: number | null;
};
export type OnboardingSummaryResponse = { visa: SummaryVisa | null };

// ── 비자 로드맵·E-7-4 사전진단 (VS-001) ──
// roadmap·result 는 명세에 타입이 없어(AI 응답 원본) 2026-11-18 실제 응답 기준으로 적었다.
export type VisaItemStatus = 'MET' | 'NOT_MET' | 'NEEDS_EVIDENCE' | 'NOT_APPLICABLE';

export type VisaMissingInput = { field: string; question: string; ruleCodes?: string[] };

export type VisaRoadmapStay = {
  visaTypeCode: string;
  stayStartedOn: string | null;
  stayExpiresOn: string | null;
  daysToExpiry: number | null; // asOfDate 기준 서버 계산값
  applicableFrom: string | null;
};

export type VisaRoadmapScoreItem = {
  category: string; // BASE_INCOME · BASE_KOREAN · BASE_AGE · BONUS ...
  ruleCode: string;
  status: VisaItemStatus;
  basis: string | null; // DOCUMENT · TOPIK · ARC · null
  value: Record<string, number | string>;
  earnedPoints: number;
  potentialPoints: number;
  requiredForApplication: boolean;
};

export type VisaRoadmapStep = {
  order: number;
  kind: string; // SUBMIT_EVIDENCE · RAISE_LEVEL · APPLY ...
  actor: string; // USER · EMPLOYER · GOVERNMENT
  title: string;
  required: boolean;
  ruleCode: string | null;
  description: string;
  requiredEvidence: string[];
  estimatedAdditionalScore: number | null;
  availableFrom: string | null;
  targetDate: string | null;
};

export type VisaRoadmap = {
  goalVisaCode: string;
  ruleVersion: string;
  ruleStatus: string;
  asOfDate: string;
  isMock: boolean;
  warnings: string[];
  stay: VisaRoadmapStay;
  score: { confirmed: number; potential: number; required: number | null; items: VisaRoadmapScoreItem[] };
  steps: VisaRoadmapStep[];
  projectedScore: { afterRequiredSteps: number; afterAllSteps: number };
  missingInputs: VisaMissingInput[];
  text: { source: string; modelId: string | null; promptVersion: string | null; fallbackReason: string | null };
  assessmentRequestKey: string;
};

// GET /api/v1/visa/roadmaps/latest
export type VisaRoadmapDetailResponse = { roadmapId: number; createdAt: string; roadmap: VisaRoadmap };
// POST /api/v1/visa/roadmaps (201 새로 만듦 / 200 reused)
export type VisaRoadmapResponse = { roadmapId: number; reused: boolean; roadmap: VisaRoadmap };

export type E74Score = { base: number; bonus: number; penalty: number; total: number; required: number | null };

export type E74Item = {
  category: string; // BASE_* · BONUS · PENALTY · REQUIREMENT · EXCLUSION
  ruleCode: string;
  status: VisaItemStatus;
  evidence: Record<string, unknown>;
  earnedPoints: number | null;
  potentialPoints: number | null;
  messageCode: string;
  missingInputs: VisaMissingInput[];
  reviewNote: string | null;
};

export type E74Improvement = {
  kind: string;
  actor: string;
  ruleCode: string;
  blocking: boolean;
  pointsGain: number | null;
  description: string;
  documents: string[];
  availableFrom: string | null;
  target: Record<string, unknown>;
  messageCode: string;
};

export type E74Result = {
  status: string;
  eligibilityConfirmed: boolean;
  ruleStatus: string;
  ruleVersion: string;
  asOfDate: string;
  score: E74Score;
  potentialScore: Omit<E74Score, 'required'> & { complete: boolean };
  scoreGap: { required: number | null; pointsNeeded: number; pointsNeededAfterEvidence: number };
  planToRequired: { ruleCodes: string[]; pointsAdded: number; reachesRequired: boolean };
  items: E74Item[];
  improvements: E74Improvement[];
  missingInputs: VisaMissingInput[];
  needsEvidence: string[];
  reviewNotes: unknown[];
  isScenario: boolean;
  scenario: unknown;
  requestKey: string;
  scoreRequirementMet: boolean | null;
  koreanDeferralApplied: boolean;
};

// GET /api/v1/visa/e74/assessments/latest
export type E74AssessmentDetailResponse = { assessmentId: number; createdAt: string; result: E74Result };

// ── FX 목표 환율 알림 (FX-002) ─────────────────────────
export type FxRateType = 'BASE' | 'SEND'; // BASE 매매기준율 / SEND 송금 보낼 때 환율
export type FxComparator = 'LTE' | 'GTE'; // LTE 목표 이하가 되면 / GTE 목표 이상이 되면
export type FxAlertStatus = 'ACTIVE' | 'TRIGGERED' | 'CANCELLED';

// POST /api/v1/fx/alerts 응답, 목록 항목. 환율 값은 unitAmount 외화당 원화
export type FxAlertResponse = {
  alertId: number;
  currency: string;
  rateType: FxRateType;
  comparator: FxComparator;
  targetRate: number;
  unitAmount: number | null;
  status: FxAlertStatus;
  createdAt: string; // "2026-11-17T14:30:00+09:00"
  triggeredAt: string | null; // TRIGGERED 가 아니면 null
  triggeredRate: number | null; // TRIGGERED 가 아니면 null
};

// GET /api/v1/fx/alerts — ACTIVE·TRIGGERED 만, 최신순
export type FxAlertListResponse = { alerts: FxAlertResponse[] };

// POST /api/v1/fx/alerts 요청. rateType 을 빼면 서버는 SEND 로 처리한다
export type FxAlertCreateRequest = {
  currency: string;
  rateType?: FxRateType | null;
  comparator: FxComparator;
  targetRate: number;
};

// GET /api/v1/fx/rates — 알림 화면이 쓰는 필드만. 나머지는 FX-001 연결 때 추가
export type FxRateResponse = {
  currency: string;
  unit: number;
  rate: number; // 매매기준율
  changeRate: number | null; // 전 영업일 대비(%). 없으면 null
  asOf: string; // "2026-11-17"
  sourceLabel: string;
};

// GET /api/v1/fx/rates/{currency}/history — 알림 화면이 쓰는 필드만
export type FxRateHistoryResponse = {
  currency: string;
  period: string;
  points: { date: string; rate: number }[]; // 날짜 오름차순, 매매기준율
  min: number;
  max: number;
  current: number;
  asOf: string;
};

// ── FX 환율 정보 (FX-001) ──────────────────────────────
// 같은 GET /fx/rates, /fx/rates/{currency}/history 의 전체 응답.
// FX-002 는 위의 일부 필드 타입을 그대로 쓰고, FX-001 은 그 타입을 넓혀서 쓴다.
export type FxPeriod = '1M' | '3M' | '6M' | '1Y';
export type FxDirection = 'LOWER' | 'HIGHER' | 'SAME'; // 현재가 평균보다 낮음 / 높음 / 비슷(±0.10% 이내)
export type FxRateSource = 'KOREAEXIM' | 'MARKET_REF' | 'MOCK';

// 기간 평균 비교 1줄. 데이터가 기간보다 짧으면 avg·diff·diffRate·direction 이 null, reason 은 INSUFFICIENT_DATA
export type FxPeriodAverage = {
  period: FxPeriod;
  avg: number | null; // 소수 4자리
  diff: number | null; // 현재 − 평균
  diffRate: number | null; // (현재 − 평균) ÷ 평균 × 100, 소수 2자리
  direction: FxDirection | null;
  businessDays: number;
  reason: string | null;
};

// GET /api/v1/fx/rates 전체
export type FxRateDetailResponse = FxRateResponse & {
  sendRate: number | null; // 수출입은행 고시만. PHP 는 null
  receiveRate: number | null;
  change: number | null; // 전 영업일 대비(KRW). 없으면 null
  source: FxRateSource;
  isMock: boolean;
  rateAt: string;
  fetchedAt: string;
  stale: boolean; // 오래된 값인지
  notices: string[]; // REFERENCE_RATE_ONLY 등 안내 코드. 문구는 프론트가 만든다
  periodAverages: FxPeriodAverage[]; // 1M·3M·6M·1Y 순
  screenCurrencies: string[]; // 이 사용자의 화면 통화 (예: ["USD", "PHP"])
};

// GET /api/v1/fx/rates/{currency}/history 전체
export type FxRateHistoryDetailResponse = FxRateHistoryResponse & {
  avg: number | null; // 데이터가 기간보다 짧으면 null (reason 참고)
  businessDays: number;
  reason: string | null;
  source: FxRateSource;
  isMock: boolean;
};

// ── 외국인등록증 문서·OCR (DOC-01~04, /api/v1/documents) ─────────────────────
// 흐름: 업로드(UPLOADED) → OCR 결과(PENDING_CONFIRMATION) → 확정(CONFIRMED). 실패하면 FAILED
export type DocumentStatus = 'UPLOADED' | 'PENDING_CONFIRMATION' | 'CONFIRMED' | 'FAILED';

// 항목 키. stayExpiry 는 앞면에 없어 사용자가 입력, registrationNo 는 마스킹값(수정 불가)
export type DocumentFieldKey =
  | 'nameEn'
  | 'nationality' // ISO 3166-1 alpha-3 (예: PHL)
  | 'birthDate' // YYYY-MM-DD
  | 'visaType' // 예: E-9
  | 'stayExpiry' // YYYY-MM-DD
  | 'registrationNo';

export type DocumentField = {
  fieldKey: DocumentFieldKey;
  value: string | null; // 못 읽었거나 확정 후면 null
  confidence: number | null; // 0~1
  needsReview: boolean; // 신뢰도 0.8 미만·못 읽음 → true
  status: 'EXTRACTED' | 'MISSING' | 'CONFIRMED' | 'CORRECTED';
  isMasked: boolean;
};

export type DocumentOcrJob = {
  jobId: number;
  status: 'PENDING' | 'QUEUED' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  publishStatus: 'NOT_PUBLISHED' | 'PUBLISHED' | 'PUBLISH_FAILED';
  errorCode: string | null;
  retryable: boolean; // true 면 POST /ocr-retry 가능 (서버도 1분마다 자동 재시도)
};

export type DocumentResponse = {
  documentId: number;
  documentType: 'ARC' | 'DRIVER_LICENSE' | 'CERTIFICATE' | 'INSURANCE_PDF' | 'OTHER';
  side: 'FRONT' | 'BACK' | 'SINGLE';
  status: DocumentStatus;
  failureCode: string | null;
  ocrJob: DocumentOcrJob | null;
  fields: DocumentField[]; // OCR 결과 전에는 빈 배열
  uploadedAt: string;
  confirmedAt: string | null;
};

// DOC-03 수정 요청. 보낸 항목만 바뀐다(registrationNo 제외)
export type DocumentFieldUpdateItem = {
  fieldKey: Exclude<DocumentFieldKey, 'registrationNo'>;
  value: string;
};
export type DocumentFieldsUpdateRequest = { fields: DocumentFieldUpdateItem[] };
