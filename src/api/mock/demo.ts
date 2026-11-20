// 데모 계정 초기화 Mock. 명세(DemoResetResponse) example 숫자를 돌려주고,
// 온보딩을 다시 돌 수 있게 서버와 같은 범위의 Mock 상태(온보딩 진행·등록증·목표·매달 나가는 돈)를 되돌린다.
// 화면은 이 파일을 직접 import 하지 않고 src/api/demo.ts 를 거친다.

import type { DemoResetResponse } from '../../types/api';
import { mockResetOnboarding } from './onboarding';
import { mockDeleteDocument } from './document';
import { mockCancelGoals } from './goals';
import { mockDeactivateCommitments } from './commitments';

export function mockDemoReset(): DemoResetResponse {
  mockResetOnboarding();
  mockDeleteDocument();
  mockCancelGoals();
  mockDeactivateCommitments();
  return {
    deletedDocuments: 1,
    deletedDocumentFields: 6,
    deletedOcrJobs: 1,
    deletedOnboardingSteps: 6,
    deletedOriginals: 1,
    failedOriginals: 0,
    alertsCancelled: 1,
    profileRestored: true,
    e74AssessmentsDeleted: 3,
    roadmapsDeleted: 1,
    languageRestored: true,
    goalsCancelled: 2,
    commitmentsDeactivated: 3,
  };
}
