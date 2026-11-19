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
// 화면에서 쓰는 것만 client.ts 에서 이 모양으로 통일한다.
// message 는 서버가 사용자 언어(예: vi)로 줄 수 있어 화면 문구로 쓰지 않는다 → utils/errorText.ts 로 code 기준 한국어 문구
// fields: VALIDATION_ERROR 일 때 어느 칸이 왜 틀렸는지 (details.fields). field 는 요청 경로 예: "fields[0].value"
export type ApiFieldError = { field: string; reason: string };
export type ApiError = { code: string; message: string; fields?: ApiFieldError[] };

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

// ── 금융 목표 (GOL-01·02, /api/v1/goals) — ON-004 ─────────────────────────
// 목표 종류: 목돈 마련 · 가족 송금 · 생활비 관리 · 신용 쌓기 · 장기 정착
export type GoalType = 'LUMP_SUM' | 'REMITTANCE' | 'LIVING_COST' | 'CREDIT' | 'SETTLEMENT';

export type GoalResponse = {
  id: number;
  goalType: GoalType;
  targetAmount: Money | null; // LUMP_SUM 만 입력, 나머지는 null
  targetDate: string | null; // YYYY-MM-DD
  status: 'ACTIVE' | 'ACHIEVED' | 'CANCELLED'; // 목록 조회는 ACTIVE 만
  monthlyRequired: Money | null; // 서버 계산값(월 필요 저축액). 금액·목표일이 없거나 지났으면 null
};
export type GoalListResponse = { goals: GoalResponse[] }; // 선택 안 했으면 빈 배열

// 전체 교체 저장. 요청에 없는 기존 목표는 CANCELLED. goalType 중복 불가
export type GoalSaveItem = {
  goalType: GoalType;
  targetAmount?: Money | null; // LUMP_SUM 만. amount > 0
  targetDate?: string | null; // YYYY-MM-DD
};
export type GoalSaveRequest = { goals: GoalSaveItem[] };

// ── 필수 확보액 (CMT-01~03, /api/v1/commitments) — ON-005 ────────────────
export type CommitmentType =
  | 'REMITTANCE'
  | 'RENT'
  | 'UTILITY'
  | 'TELECOM'
  | 'MANDATORY_SAVING'
  | 'LIVING_MINIMUM'
  | 'VARIABLE_EXPENSE'
  | 'OTHER';
export type CommitmentSource = 'USER' | 'DETECTED_CONFIRMED'; // 직접 입력 · 송금 이력(CMT-03)에서 골라 확인

export type CommitmentResponse = {
  id: number;
  commitmentType: CommitmentType; // 같은 유형 여러 행 가능
  label: string | null; // 사용자 표시명 (예: 월세)
  amount: Money; // 월 금액
  source: CommitmentSource;
  detectedFromTxnId: number | null; // DETECTED_CONFIRMED 일 때 근거 거래 ID
};

// 유형별 합계(서버 계산값). MANDATORY_SAVING 은 deductibleTotal 에 포함하지 않음
export type CommitmentTotals = {
  fixedLiving: Money; // RENT·UTILITY·TELECOM·LIVING_MINIMUM·OTHER
  remittance: Money;
  variableExpense: Money;
  mandatorySaving: Money;
  deductibleTotal: Money; // 여유자금 계산 때 빼는 합계
};
export type CommitmentListResponse = { items: CommitmentResponse[]; totals: CommitmentTotals };

// 전체 교체 저장. 요청에 없는 기존 항목은 비활성. 송금 이력에서 고른 항목은 DETECTED_CONFIRMED + detectedFromTxnId
export type CommitmentSaveItem = {
  commitmentType: CommitmentType;
  label?: string | null;
  amount: Money;
  source?: CommitmentSource | null; // 기본 USER
  detectedFromTxnId?: number | null; // CMT-03 의 lastTransactionId
};
export type CommitmentSaveRequest = { items: CommitmentSaveItem[] };

// CMT-03 송금 이력 Top 3 ('이전 송금 이력을 분석했어요'). 마이데이터 미연결이면 빈 배열
export type RemittanceCandidate = {
  rank: number; // 1~3, 월평균 금액 큰 순
  counterpartyName: string;
  counterpartyBank: string | null;
  recipientId: number | null; // 등록된 받는 분과 매칭 안 되면 null
  avgMonthlyAmount: Money;
  monthsSent: number;
  lastSentOn: string; // YYYY-MM-DD
  lastTransactionId: number; // 저장 시 detectedFromTxnId 로 보냄
  sameNameAsUser: boolean; // '본인 명의 계좌' 표시용 (관계 추정 아님)
};
export type RemittanceCandidateListResponse = {
  candidates: RemittanceCandidate[];
  analyzedMonths: number;
  isMock: boolean;
};

// ── 마이데이터 (MYD-01~03) — ON-003A·B ────────────────────────────────────
export type InstitutionType = 'BANK' | 'CARD' | 'TELECOM' | 'BILLER' | 'PUBLIC' | 'OTHER';
export type InstitutionResponse = {
  id: number; // MYD-02 institutionIds 로 보냄
  institutionCode: string; // 예: SHINHAN_BANK
  name: string; // 영문 (예: Shinhan Bank (Mock))
  nameKo: string | null; // 화면 표시명 (예: 신한은행)
  institutionType: InstitutionType;
  isMock: boolean; // MVP 는 모두 Mock 기관
};
export type InstitutionListResponse = { institutions: InstitutionResponse[] };

// 불러올 정보 (명세 enum: 계좌 잔액 · 거래내역 · 카드 이용내역 · 대출)
export type MydataScope = 'ACCOUNT_BALANCE' | 'TRANSACTIONS' | 'CARD_USAGE' | 'LOANS';

// ON-003B '확인하고 연결'. 고른 기관 연결 + Mock 계좌·거래 적재
export type ConnectionCreateRequest = {
  institutionIds: number[];
  scopes: MydataScope[];
  lookbackMonths?: number | null; // 1~60, 생략하면 12
};
export type ConnectionResponse = {
  id: number;
  institutionId: number;
  institutionCode: string;
  institutionName: string; // 화면 표시명
  status: 'PENDING' | 'CONNECTED' | 'EXPIRED' | 'REVOKED' | 'ERROR';
  scopes: MydataScope[];
  lookbackMonths: number;
  lastSyncedAt: string | null;
  accountCount: number;
  transactionCount: number;
  isMock: boolean;
};
// MYD-02 응답도 같은 형식
export type ConnectionListResponse = { connected: boolean; connections: ConnectionResponse[] };

// ── 동의 (CNS-01·02, /api/v1/consents) — ON-003A ──────────────────────────
export type ConsentType =
  | 'TERMS'
  | 'PRIVACY'
  | 'ID_DOCUMENT'
  | 'MYDATA'
  | 'MYDATA_TERMS'
  | 'AI_CHAT'
  | 'CREDIT_EVALUATION'
  | 'MARKETING';
export type ConsentResponse = {
  id: number;
  consentType: ConsentType;
  policyVersion: string; // 예: mydata-2026-11
  status: 'GRANTED' | 'REVOKED';
  grantedAt: string;
  revokedAt: string | null;
  expiresAt: string | null;
};
export type ConsentListResponse = { consents: ConsentResponse[] }; // 한 번도 동의 안 한 종류는 없음

// 마이데이터 연결(ON-003A)에서는 MYDATA·MYDATA_TERMS 가 모두 granted=true 여야 함
export type ConsentSaveItem = {
  consentType: ConsentType;
  policyVersion: string; // 화면에 보여 준 약관 버전
  granted: boolean; // true=동의, false=철회
};
export type ConsentSaveRequest = { consents: ConsentSaveItem[] };

// ── 온보딩 최종 확인 (ONB-04, GET /api/v1/onboarding/summary) — ON-006, VS-001 ──
// 잔여일·합계·여유자금은 모두 서버 계산값 (화면에서 계산하지 않음)
export type SummaryUser = {
  id: number;
  displayName: string; // 영문
  preferredLanguage: Language;
  nationalityCode: string | null; // ISO 3166-1 alpha-3
};

// 등록증을 아직 확정하지 않았으면 visa 전체가 null
export type SummaryVisa = {
  visaTypeCode: string;
  visaTypeName: string; // 영문 이름
  stayExpiresOn: string; // YYYY-MM-DD
  daysRemaining: number; // 서버 계산값, 지났으면 음수
  monthsRemaining: number | null;
};

// 월 수지 요약. spare 는 음수 가능
export type SummaryBalance = {
  avgMonthlyIncome: Money;
  fixedLiving: Money;
  remittance: Money;
  variableExpense: Money;
  variableExpenseSource: 'TRANSACTIONS' | 'USER_INPUT';
  spare: Money;
  isMock: boolean;
};

export type OnboardingSummaryResponse = {
  user: SummaryUser;
  visa: SummaryVisa | null;
  goals: GoalResponse[]; // ACTIVE 목표
  commitments: CommitmentListResponse;
  balance: SummaryBalance | null; // 금융 분석 전이면 null
};

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

// ── AI 채팅 카드 (CHT-04 chat.done.blocks, ChatMessage.blocks) ─────────────────
// 도구가 성공했을 때 서버 코드가 만드는 카드 배열. 없으면 null. 모르는 type 은 앱이 버린다.
// 형식은 Swagger 채팅 스트림 200 예시(송금·환율·E-7-4 카드)와 blocks 설명을 따른다.

// quote_remittance → 송금 확인 카드. 받는 분 필드 이름이 송금 API(TransferRecipient)와 다르다
export type ChatRemittanceRecipient = {
  recipientId: number;
  nameEn: string;
  relationship: string; // 예: MOTHER. 전체 값 목록은 Swagger 에 없음
  bankName: string;
  accountLast4: string;
  countryCode: string;
  currency: string;
};
export type ChatRemittanceConfirmBlock = {
  type: 'REMITTANCE_CONFIRM';
  recipient: ChatRemittanceRecipient;
  sendAmount: Money;
  receiveAmount: Money;
  appliedRate: AppliedRate & { isMock: boolean };
  transferPath: string; // 예: /transfer?recipientId=1&amount=500000
};

// fx_rate_summary → 환율 요약 카드 (프롬프트 v4.4부터). 통화 항목은 FX-001 GET /fx/rates 필드와 같다
export type ChatFxSummaryCurrency = Pick<
  FxRateDetailResponse,
  | 'currency'
  | 'unit'
  | 'rate'
  | 'sendRate'
  | 'receiveRate'
  | 'change'
  | 'changeRate'
  | 'source'
  | 'asOf'
  | 'fetchedAt'
  | 'isMock'
  | 'stale'
> & {
  periodAverages: Omit<FxPeriodAverage, 'reason'>[]; // 카드에는 reason 이 없다. 지금 화면에서는 안 쓴다
};
export type ChatFxSummaryBlock = {
  type: 'FX_SUMMARY_CARD';
  currencies: ChatFxSummaryCurrency[];
  unavailableCurrencies: unknown[]; // 항목 모양이 Swagger 에 없음. 화면에서 안 쓴다
};

// calculate_e74_score → E-7-4 모의 사전진단 카드. 판정은 status 를 그대로 쓴다 (앱에서 점수 비교 금지)
export type ChatE74ScoreBlock = {
  type: 'E74_SCORE_CARD';
  assessmentId: number;
  status: string; // ELIGIBLE·INELIGIBLE·NEEDS_EVIDENCE·NEEDS_REVIEW 등
  total: number;
  potentialTotal: number;
  required: number;
  ruleVersion: string;
  ruleStatus: string; // DRAFT·APPROVED. 화면에 쓰지 않는다
  isScenario: boolean;
};

// calculate_e74_score → 판정에 더 필요한 입력. question 은 받은 그대로 보여 준다
export type ChatMissingInputsBlock = {
  type: 'MISSING_INPUTS';
  fields: { field: string; question: string }[];
};

export type ChatBlock =
  | ChatRemittanceConfirmBlock
  | ChatFxSummaryBlock
  | ChatE74ScoreBlock
  | ChatMissingInputsBlock;

// ── SOL 글로벌론 상품 상세 (CR-002, GET /api/v1/credit/loans/sol-global) ─────────────────
// 문구(title·desc·label·value·notice)는 서버가 완성해서 준다. 앱은 key 로 행을 찾고 글자를 그대로 보여 준다.
// 모의 한도(limitEstimate)는 서버가 계산한 값이며 isMock 은 항상 true.
export type SolGlobalLoanConditionKey = 'salary' | 'visa' | 'nationality' | 'stay' | 'income';
export type SolGlobalLoanCondition = {
  key: SolGlobalLoanConditionKey | (string & {});
  title: string;
  desc: string; // "조건 설명 · 현재 값"
  met: boolean;
};

export type SolGlobalLoanTermKey = 'limit' | 'term' | 'repayment' | 'rate';
export type SolGlobalLoanTermRow = {
  key: SolGlobalLoanTermKey | (string & {});
  label: string;
  value: string;
};

export type SolGlobalLoanLimitReason = 'NOT_ELIGIBLE' | 'TERM_TOO_SHORT';
export type SolGlobalLoanIncomeSource = 'INCOME_RECORD' | 'CONTRACT_SALARY' | 'NONE';
export type SolGlobalLoanLimitEstimate = {
  estimatedLimit: Money | null; // 모의 한도. 조건 미충족·기간 6개월 미만이면 null (사유는 reasonCode)
  reasonCode: SolGlobalLoanLimitReason | null;
  annualIncome: Money | null;
  incomeSource: SolGlobalLoanIncomeSource;
  incomeYear: number | null; // INCOME_RECORD 일 때만
  latestMaturityOn: string | null; // "2027-09-30"
  maxTermMonths: number | null;
  byIncomeRatio: Money | null;
  byRepayment: Money | null;
  cap: Money;
  existingLoans: Money;
  dsrApplied: boolean;
  asOfDate: string;
};

export type SolGlobalLoanResponse = {
  productTag: string;
  name: string;
  summary: string;
  eligibility: {
    title: string;
    source: string;
    resultLabel: string; // "5개 중 5개 충족"
    conditions: SolGlobalLoanCondition[]; // salary·visa·nationality·stay·income 순
  };
  terms: {
    title: string;
    basis: string;
    rows: SolGlobalLoanTermRow[];
  };
  notice: string;
  limitEstimate: SolGlobalLoanLimitEstimate;
  isMock: boolean;
};
