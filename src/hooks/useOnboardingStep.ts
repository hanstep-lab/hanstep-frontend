

//라우터, constants/onboardingStep import
import { router,usePathname, Href} from 'expo-router';
import { ONBOARDING_STEPS} from '../constants/onboardingSteps';


export function useOnboardingStep(){

  const pathname = usePathname(); // 현재 주소. 예: '/onboarding/language'
  const index = ONBOARDING_STEPS.findIndex((s) => s.route === pathname);
  const isLast = index === ONBOARDING_STEPS.length -1;

  const goNext = () => {
    if (isLast) {
      router.replace('/home'); // replac-뒤로가기로 온보딩에 못 돌아오게 설정한다.
    } else {
      router.push(ONBOARDING_STEPS[index + 1].route as Href); // push-위에 쌓아 뒤로 돌아올 수 있다.
    }
  };

  return {
    step: ONBOARDING_STEPS[index],
    current: index + 1,
    total: ONBOARDING_STEPS.length,
    goNext,
  };
}