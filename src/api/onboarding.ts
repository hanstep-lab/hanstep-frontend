// Onboarding API (ONB-01~03). 진행 상태 조회 + 프로필 저장 + 단계 완료/건너뛰기.

import { client } from './client';
import { USE_MOCK, mockDelay } from './config';
import type {
  OnboardingProfileResponse,
  OnboardingResponse,
  ResidencePurpose,
  StepCode,
  StepUpdateRequest,
  StepUpdateResponse,
} from '../types/api';

// 온보딩 6단계 화면 순서. 서버 stepCode 기준(명세 enum 과 동일).
export const STEP_ORDER: StepCode[] = [
  'LANGUAGE',
  'ID_DOCUMENT',
  'MYDATA_CONSENT',
  'GOALS',
  'GOAL_DETAILS',
  'SUMMARY_CONFIRM',
];

// GET /api/v1/onboarding — 진행 바·이어하기용. (P0 에서는 당장 안 쓰지만 명세대로 넣어둠)
export async function getOnboarding(): Promise<OnboardingResponse> {
  if (USE_MOCK) {
    await mockDelay();
    return {
      completed: false,
      currentStep: 'LANGUAGE',
      steps: STEP_ORDER.map((stepCode) => ({ stepCode, status: 'NOT_STARTED', completedAt: null })),
      profile: { residencePurpose: null },
    };
  }
  const res = await client.get<OnboardingResponse>('/api/v1/onboarding');
  return res.data;
}

// PUT /api/v1/onboarding/profile — 거주 목적 저장(residencePurpose 만 사용)
export async function saveProfile(
  residencePurpose: ResidencePurpose,
): Promise<OnboardingProfileResponse> {
  if (USE_MOCK) {
    await mockDelay();
    return { residencePurpose };
  }
  const res = await client.put<OnboardingProfileResponse>('/api/v1/onboarding/profile', {
    residencePurpose,
  });
  return res.data;
}

// POST /api/v1/onboarding/steps/{stepCode} — 각 화면 '다음' 버튼.
// Mock 은 명세와 같은 모양으로, 다음 단계(currentStep)를 계산해 돌려준다.
// 덕분에 백엔드 없이도 온보딩 흐름이 실제로 진행된다.
export async function updateStep(
  stepCode: StepCode,
  status: StepUpdateRequest['status'] = 'COMPLETED',
): Promise<StepUpdateResponse> {
  if (USE_MOCK) {
    await mockDelay();
    const nextIndex = STEP_ORDER.indexOf(stepCode) + 1;
    const currentStep = nextIndex < STEP_ORDER.length ? STEP_ORDER[nextIndex] : null;
    return {
      stepCode,
      status,
      completedAt: '2026-11-08T10:00:00+09:00',
      onboardingCompleted: currentStep === null,
      currentStep,
    };
  }
  const body: StepUpdateRequest = { status };
  const res = await client.post<StepUpdateResponse>(
    `/api/v1/onboarding/steps/${stepCode}`,
    body,
  );
  return res.data;
}
