import Screen from './Screen';
import Button from './Button';
import OnboardingProgress from './OnboardingProgress';
import StepBadge from './StepBadge';
import ScreenTitle from './ScreenTitle';
import { useOnboardingStep } from '../hooks/useOnboardingStep';

export default function OnboardingPlaceholder() {
  const { step, stage, totalStages, isFirst, isLast, goNext } = useOnboardingStep();

  return (
    <Screen
    showBack={!isFirst}
      footer={<Button title={isLast ? '신한걸음 시작하기' : '다음'} onPress={goNext} showArrow />}
    >
      <OnboardingProgress current={stage} total={totalStages} />
      <StepBadge label={step.badge} />
      <ScreenTitle title={step.title} description={`${step.id} 화면 준비 중`} />
    </Screen>
  );
}