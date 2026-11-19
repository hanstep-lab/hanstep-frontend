// 데모 계정 초기화 Mock. 명세(DemoResetResponse) example 숫자를 그대로 돌려준다.
// 화면은 이 파일을 직접 import 하지 않고 src/api/demo.ts 를 거친다.

import type { DemoResetResponse } from '../../types/api';

export function mockDemoReset(): DemoResetResponse {
  return {
    deletedDocuments: 1,
    deletedDocumentFields: 6,
    deletedOcrJobs: 1,
    deletedOnboardingSteps: 6,
    deletedOriginals: 1,
    failedOriginals: 0,
  };
}
