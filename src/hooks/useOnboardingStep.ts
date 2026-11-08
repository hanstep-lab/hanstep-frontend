// 온보딩 각 화면에서 사용하는 훅. 현재 단계 정보 + "다음" 이동 로직.
// goNext 가 POST /onboarding/steps/{code} 를 호출한 뒤 응답의 currentStep 으로 이동한다.
// 화면은 goNext 와 isNavigating 만 받으면 되고, API·라우팅 세부사항은 여기에 숨겨진다.

import { useState } from 'react';
import { router, usePathname, Href } from 'expo-router';
import { ONBOARDING_STEPS, TOTAL_STAGES, getRouteFromStepCode } from '../constants/onboardingSteps';
import { updateStep } from '../api/onboarding';

export function useOnboardingStep() {
  const [isNavigating, setIsNavigating] = useState(false);
  const [navError, setNavError] = useState<string | null>(null);

  const pathname = usePathname();
  const index = ONBOARDING_STEPS.findIndex((s) => s.route === pathname);
  const isFirst = index === 0;
  const isLast = index === ONBOARDING_STEPS.length - 1;
  const step = ONBOARDING_STEPS[index];

  // beforeComplete: 단계 완료 API 전에 실행할 비동기 작업(예: 언어 변경, 프로필 저장).
  // 여기서 throw 하면 updateStep 은 호출되지 않고 navError 로 처리된다.
  const goNext = async (beforeComplete?: () => Promise<void>) => {
    if (!step || isNavigating) return;
    setNavError(null);
    setIsNavigating(true);
    try {
      if (beforeComplete) await beforeComplete();
      const res = await updateStep(step.stepCode);

      if (res.onboardingCompleted) {
        router.replace('/home');
      } else if (res.currentStep) {
        const nextRoute = getRouteFromStepCode(res.currentStep);
        if (isLast) {
          router.replace(nextRoute as Href);
        } else {
          router.push(nextRoute as Href);
        }
      } else {
        router.replace('/home');
      }
    } catch (e: any) {
      setNavError(e?.message ?? '다음 단계로 이동할 수 없어요. 다시 시도해 주세요.');
    } finally {
      setIsNavigating(false);
    }
  };

  return {
    step,
    stage: step?.stage ?? 1,
    totalStages: TOTAL_STAGES,
    isFirst,
    isLast,
    goNext,
    isNavigating,
    navError,
  };
}
