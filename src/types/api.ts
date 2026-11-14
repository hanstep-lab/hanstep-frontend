// 온보딩 OpenAPI 명세(docs/api/onboarding-openapi.json) 기반 타입.
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
