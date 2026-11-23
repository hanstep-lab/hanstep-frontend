// ON-002 사진 없이 체류 정보 직접 입력. 등록증 촬영 화면의 "직접 정보 입력하기"에서 온다.
// 저장하기: 칸별 검사 → PUT /api/v1/visa/profile → GET /onboarding 의 currentStep 화면 (보통 ON-003A 마이데이터)
// 서버가 저장하면서 온보딩 ID_DOCUMENT 단계를 COMPLETED 로 기록하므로 updateStep(ONB-03)은 부르지 않는다.
// 응답의 daysRemaining(D-day)은 이 화면에서 쓰지 않는다.

import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View, Text, StyleSheet, TextInput } from 'react-native';
import { router, type Href } from 'expo-router';
import Screen from '../../components/Screen';
import Button from '../../components/Button';
import { saveVisaProfile } from '../../api/visa';
import { getOnboarding } from '../../api/onboarding';
import { TOTAL_STAGES, getRouteFromStepCode, stageOf } from '../../constants/onboardingSteps';
import OnboardingProgress from '../../components/OnboardingProgress';
import { colors, typography, spacing, radius, shadow } from '../../constants/theme';
import { errorText } from '../../utils/errorText';
import {
  EMPTY_VISA_PROFILE,
  VISA_PROFILE_KEYS,
  SUPPORTED_VISA_TYPES,
  formatDateInput,
  normalizeVisaProfile,
  validateVisaProfile,
  visaFieldErrorsFromApi,
  type VisaProfileErrors,
  type VisaProfileValues,
} from '../../utils/visaFields';
import type { VisaProfileFieldKey } from '../../types/api';

// 칸 설정. 순서 = 화면 순서
const FIELDS: {
  key: VisaProfileFieldKey;
  placeholder: string;
  hint?: 'nationalityHint' | 'visaTypeHint'; // i18n onboarding.idManual.<hint>
  isDate?: boolean; // 숫자 키패드 + 하이픈 자동 입력
  maxLength?: number;
}[] = [
  {
    key: 'nationality',
    placeholder: 'ABC',
    hint: 'nationalityHint',
    maxLength: 3,
  },
  { key: 'birthDate', placeholder: '1995-03-12', isDate: true },
  {
    key: 'visaType',
    placeholder: 'E-9',
    hint: 'visaTypeHint',
    maxLength: 10,
  },
  { key: 'stayExpiry', placeholder: 'YYYY-MM-DD', isDate: true },
];

export default function IdManualScreen() {
  const { t } = useTranslation();
  const [values, setValues] = useState<VisaProfileValues>(EMPTY_VISA_PROFILE);
  const [errors, setErrors] = useState<VisaProfileErrors>({});
  const [navError, setNavError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const savingRef = useRef(false); // 빠르게 두 번 눌러도 요청이 한 번만 가도록 바로 잠근다

  const allFilled = VISA_PROFILE_KEYS.every((k) => values[k].trim() !== '');
  const canSave = allFilled && !isSaving;

  // 고친 칸은 오류 문구를 지운다
  const setValue = (key: VisaProfileFieldKey, isDate?: boolean) => (text: string) => {
    const next = isDate ? formatDateInput(text) : text.toUpperCase();
    setValues((v) => ({ ...v, [key]: next }));
    setErrors((e) => (e[key] ? { ...e, [key]: undefined } : e));
  };

  const handleSave = async () => {
    if (savingRef.current) return;
    setNavError(null);

    // 정리한 값을 화면에도 반영해서, 사용자가 보는 값 = 서버에 보내는 값
    const clean = normalizeVisaProfile(values);
    setValues(clean);
    const localErrors = validateVisaProfile(clean);
    setErrors(localErrors);
    if (Object.keys(localErrors).length > 0) return;

    savingRef.current = true;
    setIsSaving(true);
    try {
      await saveVisaProfile(VISA_PROFILE_KEYS.map((k) => ({ fieldKey: k, value: clean[k] })));
      // 단계 완료는 서버가 이미 기록했으므로 다음 단계만 물어본다 (보통 ON-003A 마이데이터)
      const ob = await getOnboarding();
      if (ob.completed || !ob.currentStep) {
        router.replace('/chat');
      } else {
        router.push(getRouteFromStepCode(ob.currentStep) as Href);
      }
    } catch (e) {
      const fieldErrors = visaFieldErrorsFromApi(e);
      if (fieldErrors) setErrors(fieldErrors);
      else setNavError(errorText(e, t('onboarding.idManual.saveError')));
    } finally {
      savingRef.current = false;
      setIsSaving(false);
    }
  };

  const footer = (
    <View style={styles.footerInner}>
      {navError ? <Text style={styles.navError}>{navError}</Text> : null}
      <Button
        title={isSaving ? t('onboarding.idManual.saving') : t('onboarding.idManual.saveNext')}
        onPress={handleSave}
        disabled={!canSave}
        showArrow={!isSaving}
      />
    </View>
  );

  return (
    <Screen title={t('onboarding.idManual.screenTitle')} footer={footer}>
      {/* 촬영·확인을 대신하는 화면이라 세부 위치는 '등록증 확인' */}
      <OnboardingProgress current={stageOf('ID_DOCUMENT')} total={TOTAL_STAGES} sub="idConfirm" />
      <Text style={styles.subtitle}>{t('onboarding.idManual.subtitle')}</Text>

      <View style={styles.card}>
        {FIELDS.map((f, i) => {
          const error = errors[f.key];
          return (
            <View key={f.key} style={[styles.field, i > 0 && styles.fieldDivider]}>
              <Text style={styles.label}>{t(`onboarding.visaLabel.${f.key}`)}</Text>
              <TextInput
                style={[styles.input, error != null && styles.inputError]}
                value={values[f.key]}
                onChangeText={setValue(f.key, f.isDate)}
                keyboardType={f.isDate ? 'number-pad' : 'default'}
                maxLength={f.isDate ? 10 : f.maxLength}
                placeholder={f.placeholder}
                placeholderTextColor={colors.text.sub}
                autoCapitalize={f.isDate ? 'none' : 'characters'}
                autoCorrect={false}
                editable={!isSaving}
              />
              {error != null ? (
                <Text style={styles.errorText}>{error}</Text>
              ) : f.hint ? (
                <Text style={styles.hint}>
                  {t(`onboarding.idManual.${f.hint}`, { types: SUPPORTED_VISA_TYPES.join(', ') })}
                </Text>
              ) : null}
            </View>
          );
        })}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  subtitle: { ...typography.subtitle, color: colors.text.sub },

  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.sm,
    ...shadow.card,
  },
  field: { gap: spacing.xs, paddingVertical: spacing.md },
  fieldDivider: { borderTopWidth: 1, borderTopColor: colors.border },
  label: { ...typography.badge, color: colors.text.sub },
  input: {
    ...typography.h3,
    color: colors.text.strong,
    borderBottomWidth: 1.5,
    borderBottomColor: colors.primary,
    paddingVertical: 2,
  },
  inputError: { borderBottomColor: colors.errorText },
  hint: { ...typography.badge, color: colors.text.sub },
  errorText: { ...typography.badge, color: colors.errorText },

  footerInner: { gap: spacing.sm },
  navError: { ...typography.body, color: colors.errorText, textAlign: 'center' },
});
