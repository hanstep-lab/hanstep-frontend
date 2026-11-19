// ON-002 사진 없이 체류 정보 직접 입력. 등록증 촬영 화면의 "직접 정보 입력하기"에서 온다.
// 저장하기: 칸별 검사 → PUT /api/v1/visa/profile → ON-003A 마이데이터
// 서버가 저장하면서 온보딩 ID_DOCUMENT 단계를 COMPLETED 로 기록하므로 updateStep(ONB-03)은 부르지 않는다.
// 응답의 daysRemaining(D-day)은 이 화면에서 쓰지 않는다.

import { useRef, useState } from 'react';
import { View, Text, StyleSheet, TextInput } from 'react-native';
import { router, type Href } from 'expo-router';
import Screen from '../../components/Screen';
import Button from '../../components/Button';
import { saveVisaProfile } from '../../api/visa';
import { colors, typography, spacing, radius, shadow } from '../../constants/theme';
import { errorText } from '../../utils/errorText';
import {
  EMPTY_VISA_PROFILE,
  VISA_PROFILE_KEYS,
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
  label: string;
  placeholder: string;
  hint?: string;
  isDate?: boolean; // 숫자 키패드 + 하이픈 자동 입력
  maxLength?: number;
}[] = [
  {
    key: 'nationality',
    label: '국적 (Nationality)',
    placeholder: 'PHL',
    hint: '여권에 적힌 영문 3자리 국가 코드 (예: PHL, VNM, CHN)',
    maxLength: 3,
  },
  { key: 'birthDate', label: '생년월일 (Birth)', placeholder: '1995-03-12', isDate: true },
  { key: 'visaType', label: '체류자격 (Visa Status)', placeholder: 'E-9', maxLength: 10 },
  { key: 'stayExpiry', label: '체류 만료일 (Expiry Date)', placeholder: '2027-10-04', isDate: true },
];

export default function IdManualScreen() {
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
      router.push('/onboarding/mydata' as Href);
    } catch (e) {
      const fieldErrors = visaFieldErrorsFromApi(e);
      if (fieldErrors) setErrors(fieldErrors);
      else setNavError(errorText(e, '저장하지 못했어요. 다시 시도해 주세요.'));
    } finally {
      savingRef.current = false;
      setIsSaving(false);
    }
  };

  const footer = (
    <View style={styles.footerInner}>
      {navError ? <Text style={styles.navError}>{navError}</Text> : null}
      <Button
        title={isSaving ? '저장 중...' : '저장하고 다음으로'}
        onPress={handleSave}
        disabled={!canSave}
        showArrow={!isSaving}
      />
    </View>
  );

  return (
    <Screen title="사진 없이 직접 입력할게요" footer={footer}>
      <Text style={styles.subtitle}>외국인등록증에 적힌 내용을 그대로 입력해 주세요.</Text>

      <View style={styles.card}>
        {FIELDS.map((f, i) => {
          const error = errors[f.key];
          return (
            <View key={f.key} style={[styles.field, i > 0 && styles.fieldDivider]}>
              <Text style={styles.label}>{f.label}</Text>
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
                <Text style={styles.hint}>{f.hint}</Text>
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
