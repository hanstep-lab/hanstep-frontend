// ON-002 등록증 정보 확인. 업로드한 문서의 OCR 결과를 기다렸다가(useIdDocument) 보여준다.
// 확인이 필요한 항목(needsReview·빈 값)과 체류 만료일(앞면에 없음)은 사용자가 직접 입력한다.
// 네, 맞아요: PATCH fields → POST confirm → 온보딩 단계 완료

import { useEffect, useState, type ReactNode } from 'react';
import { View, Text, Pressable, StyleSheet, TextInput, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { router, type Href } from 'expo-router';
import Screen from '../../components/Screen';
import { updateStep } from '../../api/onboarding';
import { confirmDocument, updateDocumentFields } from '../../api/document';
import { useIdDocument } from '../../hooks/useIdDocument';
import { useOnboardingStore } from '../../store/onboardingStore';
import { getRouteFromStepCode } from '../../constants/onboardingSteps';
import { colors, typography, spacing, radius, fonts, shadow } from '../../constants/theme';
import type { DocumentField, DocumentFieldUpdateItem } from '../../types/api';

type EditableKey = DocumentFieldUpdateItem['fieldKey'];
type Values = Record<EditableKey, string>;
const EDITABLE_KEYS: EditableKey[] = ['nameEn', 'nationality', 'birthDate', 'visaType', 'stayExpiry'];
const REQUIRED_KEYS: EditableKey[] = ['nationality', 'birthDate', 'visaType', 'stayExpiry'];

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

// 형식(YYYY-MM-DD)과 실제 있는 날짜(13월·2월 30일 같은 값 제외)를 함께 본다
function isValidDate(s: string): boolean {
  if (!DATE_RE.test(s)) return false;
  const [y, m, d] = s.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  return date.getFullYear() === y && date.getMonth() === m - 1 && date.getDate() === d;
}

// 확정 전 검사. 서버도 같은 검사를 하지만(422) 미리 막아서 바로 안내한다
function validate(v: Values): string | null {
  if (!/^[A-Z]{3}$/.test(v.nationality)) return '국적은 영문 3자리 코드로 입력해 주세요. (예: PHL)';
  if (!isValidDate(v.birthDate)) return '생년월일을 숫자 8자리로 정확히 입력해 주세요. (예: 19950312)';
  if (!v.visaType) return '체류자격을 입력해 주세요. (예: E-9)';
  if (!isValidDate(v.stayExpiry)) return '체류 만료일을 숫자 8자리로 정확히 입력해 주세요. (예: 20271004)';
  return null;
}

// 숫자만 받아 YYYY-MM-DD 로 하이픈을 자동으로 넣는다. "20271004" → "2027-10-04"
function formatDateInput(text: string): string {
  const d = text.replace(/\D/g, '').slice(0, 8);
  if (d.length <= 4) return d;
  if (d.length <= 6) return `${d.slice(0, 4)}-${d.slice(4)}`;
  return `${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6)}`;
}

// 오늘부터 만료일까지 남은 날 수. 형식이 틀리면 null
function daysUntil(date: string): number | null {
  if (!isValidDate(date)) return null;
  const [y, m, d] = date.split('-').map(Number);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((new Date(y, m - 1, d).getTime() - today.getTime()) / 86400000);
}

// 값 한 줄. OCR 은 어느 칸이든 틀릴 수 있으므로 모든 칸을 입력칸으로 둔다.
// "확인 필요"는 서버가 needsReview(신뢰도 0.8 미만·못 읽음)로 준 칸에만 붙이는 눈길 끌기 표시
function FieldValue({
  field,
  value,
  onChange,
  placeholder,
  autoCapitalize = 'none',
  isDate = false,
}: {
  field?: DocumentField;
  value: string;
  onChange: (text: string) => void;
  placeholder: string;
  autoCapitalize?: 'none' | 'characters';
  isDate?: boolean; // 숫자 키패드 + 하이픈 자동 입력
}) {
  const needsCheck = field?.needsReview === true;
  return (
    <View style={styles.inputWrap}>
      <TextInput
        style={[styles.input, needsCheck && styles.inputWarn]}
        value={value}
        onChangeText={isDate ? (t) => onChange(formatDateInput(t)) : onChange}
        keyboardType={isDate ? 'number-pad' : 'default'}
        maxLength={isDate ? 10 : undefined}
        placeholder={placeholder}
        placeholderTextColor={colors.text.sub}
        autoCapitalize={autoCapitalize}
        autoCorrect={false}
      />
      {needsCheck ? <Text style={styles.reviewText}>확인 필요</Text> : null}
    </View>
  );
}

export default function IdConfirmScreen() {
  const [isNavigating, setIsNavigating] = useState(false);
  const [navError, setNavError] = useState<string | null>(null);
  const idCardFrontUri = useOnboardingStore((s) => s.idCardFrontUri);
  const documentId = useOnboardingStore((s) => s.idDocumentId);

  const { doc, phase, error, retry } = useIdDocument(documentId);

  // 화면에서 고치는 값. OCR 결과가 처음 오면 그 값으로 채운다
  const [values, setValues] = useState<Values | null>(null);
  useEffect(() => {
    if (phase !== 'ready' || !doc || values) return;
    const init = {} as Values;
    EDITABLE_KEYS.forEach((k) => {
      init[k] = doc.fields.find((f) => f.fieldKey === k)?.value ?? '';
    });
    setValues(init);
  }, [phase, doc, values]);

  const fieldOf = (key: string) => doc?.fields.find((f) => f.fieldKey === key);
  const setValue = (key: EditableKey) => (text: string) =>
    setValues((v) => (v ? { ...v, [key]: text } : v));

  const isConfirmed = doc?.status === 'CONFIRMED';
  const needsReviewCount = doc?.fields.filter((f) => f.needsReview).length ?? 0;
  const daysLeft = values ? daysUntil(values.stayExpiry) : null;
  // 확정 필수 4칸(서버 confirm 조건)이 모두 채워져야 버튼이 눌린다. 형식 검사는 누를 때(validate)
  const requiredFilled =
    values != null &&
    REQUIRED_KEYS.every((k) => values[k].trim() !== '');
  const canConfirm = phase === 'ready' && (isConfirmed || requiredFilled) && !isNavigating;

  const goNextStep = async () => {
    const res = await updateStep('ID_DOCUMENT');
    if (res.onboardingCompleted || !res.currentStep) {
      router.replace('/home');
    } else {
      router.push(getRouteFromStepCode(res.currentStep) as Href);
    }
  };

  const handleConfirm = async () => {
    if (!doc) return;
    setNavError(null);

    if (!isConfirmed && values) {
      const message = validate(values);
      if (message) {
        setNavError(message);
        return;
      }
    }

    setIsNavigating(true);
    try {
      if (!isConfirmed && values) {
        // 화면 값을 모두 보낸다. 서버가 OCR 값과 같으면 CONFIRMED, 다르면 CORRECTED 로 기록
        const items = EDITABLE_KEYS.filter((k) => values[k] !== '').map((k) => ({
          fieldKey: k,
          value: values[k],
        }));
        await updateDocumentFields(doc.documentId, items);
        await confirmDocument(doc.documentId);
      }
      await goNextStep();
    } catch (e: any) {
      setNavError(e?.message ?? '다음 단계로 이동할 수 없어요. 다시 시도해 주세요.');
    } finally {
      setIsNavigating(false);
    }
  };

  // 카드 본문: 상태별로 다르게
  let body: ReactNode = null;
  if (documentId == null) {
    body = <Text style={styles.stateText}>등록증을 먼저 촬영해 주세요.</Text>;
  } else if (phase === 'waiting') {
    body = (
      <View style={styles.stateBox}>
        <ActivityIndicator color={colors.primary} />
        <Text style={styles.stateText}>등록증 정보를 읽고 있어요. 잠시만 기다려 주세요.</Text>
      </View>
    );
  } else if (phase === 'timeout') {
    body = (
      <View style={styles.stateBox}>
        <Text style={styles.stateText}>인식이 평소보다 오래 걸리고 있어요.</Text>
        <Pressable style={styles.stateBtn} onPress={retry}>
          <Text style={styles.stateBtnText}>다시 확인하기</Text>
        </Pressable>
      </View>
    );
  } else if (phase === 'failed') {
    body = (
      <Text style={styles.stateText}>
        {error ?? '등록증을 읽지 못했어요. 밝은 곳에서 빛 반사 없이 다시 촬영해 주세요.'}
      </Text>
    );
  } else if (isConfirmed) {
    body = <Text style={styles.stateText}>이미 확인을 마친 등록증이에요.</Text>;
  } else if (values) {
    body = (
      <>
        <View style={styles.field}>
          <Text style={styles.fieldLabel}>성명 (Full Name)</Text>
          <FieldValue
            field={fieldOf('nameEn')}
            value={values.nameEn}
            onChange={setValue('nameEn')}
            placeholder="MARK ANTHONY REYES"
            autoCapitalize="characters"
          />
        </View>

        <View style={styles.divider} />

        <View style={styles.fieldBetween}>
          <View style={[styles.field, { flex: 1 }]}>
            <Text style={styles.fieldLabel}>외국인등록번호 (ARC No.)</Text>
            <View style={styles.arcRow}>
              <Text style={styles.valueMain}>{fieldOf('registrationNo')?.value ?? '-'}</Text>
              <Ionicons name="eye-off-outline" size={14} color={colors.text.sub} />
            </View>
          </View>
          <View style={styles.maskBadge}>
            <Text style={styles.maskBadgeText}>마스킹 완료</Text>
          </View>
        </View>

        <View style={styles.divider} />

        <View style={styles.field}>
          <Text style={styles.fieldLabel}>체류자격 (Visa Status)</Text>
          <FieldValue
            field={fieldOf('visaType')}
            value={values.visaType}
            onChange={setValue('visaType')}
            placeholder="E-9"
            autoCapitalize="characters"
          />
        </View>

        <View style={styles.divider} />

        <View style={styles.twoColRow}>
          <View style={styles.twoColCell}>
            <Text style={styles.fieldLabel}>국적 (Nationality)</Text>
            <FieldValue
              field={fieldOf('nationality')}
              value={values.nationality}
              onChange={(t) => setValue('nationality')(t.toUpperCase())}
              placeholder="PHL"
              autoCapitalize="characters"
            />
          </View>
          <View style={styles.twoColCell}>
            <Text style={styles.fieldLabel}>생년월일 (Birth)</Text>
            <FieldValue
              field={fieldOf('birthDate')}
              value={values.birthDate}
              onChange={setValue('birthDate')}
              placeholder="1995-03-12"
              isDate
            />
          </View>
        </View>

        <View style={styles.divider} />

        <View style={styles.expiryBox}>
          <View style={styles.expiryRow}>
            <Text style={styles.fieldLabel}>체류 만료일 (Expiry Date)</Text>
            {daysLeft != null && daysLeft >= 0 ? (
              <View style={styles.dBadge}>
                <Text style={styles.dBadgeText}>D-{daysLeft}일 남음</Text>
              </View>
            ) : null}
          </View>
          {/* 앞면에 없는 항목이라 OCR 은 항상 빈 값 → 사용자가 직접 입력 */}
          <FieldValue
            field={fieldOf('stayExpiry')}
            value={values.stayExpiry}
            onChange={setValue('stayExpiry')}
            placeholder="2027-10-04"
            isDate
          />
          {values.stayExpiry.trim() === '' ? (
            <Text style={styles.hintText}>뒷면에 적힌 체류 만료일을 입력해 주세요.</Text>
          ) : null}
        </View>
      </>
    );
  }

  const bannerText =
    phase === 'ready' ? 'OCR 자동 인식 완료' : phase === 'waiting' ? '자동 인식 중...' : '자동 인식 실패';

  const footer = (
    <View style={styles.footerInner}>
      {navError ? <Text style={styles.navError}>{navError}</Text> : null}
      <View style={styles.btnRow}>
        <Pressable
          style={[styles.btn, styles.btnGray]}
          onPress={() => router.back()}
          disabled={isNavigating}
        >
          <Ionicons name="refresh-outline" size={16} color={colors.text.strong} />
          <Text style={styles.btnGrayText}>다시 촬영</Text>
        </Pressable>
        <Pressable
          style={[styles.btn, styles.btnBlue, !canConfirm && { opacity: 0.5 }]}
          onPress={handleConfirm}
          disabled={!canConfirm}
        >
          <Text style={styles.btnBlueText}>{isNavigating ? '처리 중...' : '네, 맞아요'}</Text>
          {!isNavigating && <Ionicons name="arrow-forward" size={16} color={colors.text.inverse} />}
        </Pressable>
      </View>
    </View>
  );

  // Screen 이 키보드 회피(KeyboardAvoidingView)·스크롤·하단 footer 를 공통으로 처리한다
  return (
    <Screen title="체류 정보 확인" footer={footer} contentStyle={styles.content}>
        <View style={styles.subProgress}>
          <View style={styles.subLeft}>
            <View style={styles.subBadge}>
              <Text style={styles.subBadgeText}>등록증 정보 확인</Text>
            </View>
            <Text style={styles.subStepText}>단계 1 / 2</Text>
          </View>
          <View style={styles.subDots}>
            <View style={[styles.dot, styles.dotOn]} />
            <View style={[styles.dot, styles.dotOff]} />
          </View>
        </View>

        <View style={styles.titleArea}>
          <Text style={styles.title}>인식된 정보가 맞나요?</Text>
          <Text style={styles.subtitle}>
            {'외국인등록증에서 추출한 정보입니다.\n실제 정보와 일치하는지 꼼꼼히 확인해 주세요.'}
          </Text>
        </View>

        <View style={styles.ocrBanner}>
          {idCardFrontUri ? (
            <Image source={{ uri: idCardFrontUri }} style={StyleSheet.absoluteFill} contentFit="cover" />
          ) : null}
          <View style={styles.ocrPill}>
            <Text style={styles.ocrPillText}>{bannerText}</Text>
          </View>
        </View>

        <View style={styles.px}>
          <View style={styles.infoCard}>
            <View style={styles.cardHead}>
              <Text style={styles.cardHeadTitle}>외국인등록증 (ARC)</Text>
              {phase === 'ready' && !isConfirmed ? (
                <View style={[styles.okBadge, needsReviewCount > 0 && styles.warnBadge]}>
                  <Text style={[styles.okBadgeText, needsReviewCount > 0 && styles.warnBadgeText]}>
                    {needsReviewCount > 0 ? `확인 필요 ${needsReviewCount}개` : '정상 인식'}
                  </Text>
                </View>
              ) : null}
            </View>

            <View style={styles.cardBody}>{body}</View>
          </View>
        </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  // Screen 기본 여백(사방 xl)을 덮어씀: 이 화면은 블록마다 좌우 여백을 따로 준다
  content: { paddingHorizontal: 0, paddingTop: 0, paddingBottom: spacing.xl, gap: spacing.md },
  px: { paddingHorizontal: spacing.xl },

  subProgress: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.sm,
  },
  subLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  subBadge: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.full,
  },
  subBadgeText: { ...typography.badge, fontFamily: fonts.bold, color: colors.text.inverse },
  subStepText: { ...typography.badge, color: colors.text.sub },
  subDots: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  dot: { height: 6, borderRadius: radius.full },
  dotOn: { width: 24, backgroundColor: colors.primary },
  dotOff: { width: 10, backgroundColor: colors.border },

  titleArea: { paddingHorizontal: spacing.xl, gap: 6 },
  title: { ...typography.h2, color: colors.text.strong },
  subtitle: { ...typography.subtitle, color: colors.text.sub },

  ocrBanner: {
    marginHorizontal: spacing.xl,
    height: 144,
    backgroundColor: colors.idCard.bg,
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  ocrPill: {
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.full,
  },
  ocrPillText: { ...typography.body, fontFamily: fonts.bold, color: colors.text.strong },

  infoCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    overflow: 'hidden',
    ...shadow.card,
  },
  cardHead: {
    backgroundColor: colors.background,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
  },
  cardHeadTitle: { ...typography.h3, color: colors.text.strong },
  okBadge: {
    backgroundColor: colors.primarySoft,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.full,
  },
  okBadgeText: { ...typography.badge, fontFamily: fonts.bold, color: colors.primary },
  warnBadge: { backgroundColor: colors.surface },
  warnBadgeText: { color: colors.errorText },

  cardBody: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.lg,
    gap: spacing.md,
  },

  field: { gap: 2 },
  fieldBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  fieldLabel: { ...typography.badge, color: colors.text.sub },
  arcRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  twoColRow: { flexDirection: 'row', gap: spacing.md },
  twoColCell: { flex: 1, gap: 2 },
  divider: { height: 1, backgroundColor: colors.border },

  valueMain: { ...typography.h3, color: colors.text.strong },

  inputWrap: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  input: {
    flex: 1,
    ...typography.h3,
    color: colors.text.strong,
    borderBottomWidth: 1.5,
    borderBottomColor: colors.primary,
    paddingVertical: 2,
  },
  inputWarn: { borderBottomColor: colors.errorText },
  reviewText: { ...typography.badge, fontFamily: fonts.bold, color: colors.errorText },
  hintText: { ...typography.badge, color: colors.text.sub },

  maskBadge: {
    backgroundColor: colors.background,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.sm,
  },
  maskBadgeText: { ...typography.badge, color: colors.text.sub },

  expiryBox: {
    backgroundColor: colors.background,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: 6,
  },
  expiryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  dBadge: {
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.sm,
  },
  dBadgeText: { ...typography.badge, fontFamily: fonts.bold, color: colors.primary },

  stateBox: { alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.md },
  stateText: { ...typography.body, color: colors.text.sub, textAlign: 'center' },
  stateBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
  },
  stateBtnText: { ...typography.body, fontFamily: fonts.bold, color: colors.text.inverse },

  footerInner: { gap: spacing.sm },
  btnRow: { flexDirection: 'row', gap: spacing.sm },
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.md,
    borderRadius: radius.lg,
  },
  btnGray: { flex: 2, backgroundColor: colors.border },
  btnBlue: { flex: 3, backgroundColor: colors.primary },
  btnGrayText: { ...typography.title, color: colors.text.strong },
  btnBlueText: { ...typography.title, color: colors.text.inverse },
  navError: { ...typography.body, color: colors.errorText, textAlign: 'center' },
});
