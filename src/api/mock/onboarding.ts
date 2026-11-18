// 온보딩 요약 Mock (GET /api/v1/onboarding/summary).
// 2026-11-18 서버 응답(demo-e9-ph-reyes)의 visa 칸을 그대로 옮겼다. daysRemaining 은 서버 계산값이라 고정값으로 둔다.
// 화면은 이 파일을 직접 import 하지 않고 src/api/onboarding.ts 를 거친다.
import type { OnboardingSummaryResponse } from '../../types/api';

export function mockOnboardingSummary(): OnboardingSummaryResponse {
  return {
    visa: {
      visaTypeCode: 'E-9',
      visaTypeName: 'Non-professional Employment',
      stayExpiresOn: '2027-10-04',
      daysRemaining: 320,
      monthsRemaining: 10,
    },
  };
}
