// 온보딩 각 화면에서 사용하는 훅. 현재 단계 정보 + "다음" 이동 로직.
// goNext 가 POST /onboarding/steps/{code} 를 호출한 뒤 응답의 currentStep 으로 이동한다.
// 화면은 goNext 와 isNavigating 만 받으면 되고, API·라우팅 세부사항은 여기에 숨겨진다.

import { useState } from 'react';
import { router, usePathname, Href } from 'expo-router';
import { ONBOARDING_STEPS, TOTAL_STAGES, getRouteFromStepCode } from '../constants/onboardingSteps';
import { updateStep } from '../api/onboarding';
import { errorText } from '../utils/errorText';
import i18n from '../i18n';

type GoNextOptions = {
  onCompleted?: () => Href | undefined;
};

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
  // options.onCompleted: 온보딩이 끝났을 때(서버 응답 기준) 실행. 경로를 돌려주면 /chat 대신 그곳으로 간다
  //   (예: ON-006 → 필리핀 사용자는 환영 화면). 넘기지 않으면 지금처럼 /chat
  const goNext = async (beforeComplete?: () => Promise<void>, options?: GoNextOptions) => {
    if (!step || isNavigating) return;
    setNavError(null);
    setIsNavigating(true);
    const finish = () => router.replace(options?.onCompleted?.() ?? '/chat');
    try {
      if (beforeComplete) await beforeComplete();
      const res = await updateStep(step.stepCode);

      if (res.onboardingCompleted) {
        finish();
      } else if (res.currentStep) {
        const nextRoute = getRouteFromStepCode(res.currentStep);
        if (isLast) {
          router.replace(nextRoute as Href);
        } else {
          router.push(nextRoute as Href);
        }
      } else {
        finish(); // 다음 단계가 없으면 끝난 것으로 본다
      }
    } catch (e: any) {
      setNavError(errorText(e, i18n.t('common.navError')));
    } finally {
      setIsNavigating(false);
    }
  };

  // 건너뛰기: 현재 단계를 SKIPPED 로 저장한 뒤 응답의 currentStep 으로 이동한다(예: ON-003A '나중에 연결할게요').
  // isNavigating·navError 는 goNext 와 함께 쓴다.
  const skip = async () => {
    if (!step || isNavigating) return;
    setNavError(null);
    setIsNavigating(true);
    try {
      const res = await updateStep(step.stepCode, 'SKIPPED');

      if (res.onboardingCompleted) {
        router.replace('/chat');
      } else if (res.currentStep) {
        const nextRoute = getRouteFromStepCode(res.currentStep);
        if (isLast) {
          router.replace(nextRoute as Href);
        } else {
          router.push(nextRoute as Href);
        }
      } else {
        router.replace('/chat');
      }
    } catch (e: any) {
      setNavError(errorText(e, i18n.t('common.navError')));
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
    skip,
    isNavigating,
    navError,
  };
}
