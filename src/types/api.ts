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
