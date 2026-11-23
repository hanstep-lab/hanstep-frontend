import { useTranslation } from 'react-i18next';
import Screen from './Screen';
import Button from './Button';
import OnboardingProgress from './OnboardingProgress';
import StepBadge from './StepBadge';
import ScreenTitle from './ScreenTitle';
import { useOnboardingStep } from '../hooks/useOnboardingStep';

export default function OnboardingPlaceholder() {
  const { step, stage, totalStages, isFirst, isLast, goNext } = useOnboardingStep();
  const { t } = useTranslation();

  return (
    <Screen
    showBack={!isFirst}
      footer={<Button title={isLast ? t('onboarding.placeholder.start') : t('onboarding.placeholder.next')} onPress={goNext} showArrow />}
    >
      <OnboardingProgress current={stage} total={totalStages} />
      <StepBadge label={t(`onboarding.steps.${step.stepCode}.badge`)} />
      <ScreenTitle
        title={t(`onboarding.steps.${step.stepCode}.title`)}
        description={t('onboarding.placeholder.preparing', { id: step.id })}
      />
    </Screen>
  );
}