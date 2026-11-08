import { useState } from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import Header from '../../components/Header';
import { updateStep } from '../../api/onboarding';
import { getRouteFromStepCode } from '../../constants/onboardingSteps';
import { colors, typography, spacing, radius, fonts } from '../../constants/theme';

const MOCK = {
  nameEn: 'NGUYEN VAN MINH',
  nameKo: '응우옌 반 민',
  arcNo: '950815 - 5*******',
  visaCode: 'E-9',
  visaName: '비전문취업 (Non-professional)',
  issueDate: '2023.04.12',
  authority: '서울출입국·외국인관서',
  expiryDate: '2027.10.04',
  daysLeft: 311,
};

export default function IdConfirmScreen() {
  const [isNavigating, setIsNavigating] = useState(false);
  const [navError, setNavError] = useState<string | null>(null);

  const handleConfirm = async () => {
    setNavError(null);
    setIsNavigating(true);
    try {
      const res = await updateStep('ID_DOCUMENT');
      if (res.onboardingCompleted) {
        router.replace('/home');
      } else if (res.currentStep) {
        router.push(getRouteFromStepCode(res.currentStep) as any);
      } else {
        router.replace('/home');
      }
    } catch (e: any) {
      setNavError(e?.message ?? '다음 단계로 이동할 수 없어요. 다시 시도해 주세요.');
    } finally {
      setIsNavigating(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <Header title="체류 정보 확인" showBack />

      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
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
          <View style={styles.ocrPill}>
            <Text style={styles.ocrPillText}>OCR 자동 인식 완료</Text>
          </View>
        </View>

        <View style={styles.px}>
          <View style={styles.infoCard}>
            <View style={styles.cardHead}>
              <Text style={styles.cardHeadTitle}>외국인등록증 (ARC)</Text>
              <View style={styles.okBadge}>
                <Text style={styles.okBadgeText}>정상 인식</Text>
              </View>
            </View>

            <View style={styles.cardBody}>
              <View style={styles.field}>
                <Text style={styles.fieldLabel}>성명 (Full Name)</Text>
                <View style={styles.nameRow}>
                  <Text style={styles.valueMain}>{MOCK.nameEn}</Text>
                  <Text style={styles.valueSub}>{MOCK.nameKo}</Text>
                </View>
              </View>

              <View style={styles.divider} />

              <View style={styles.fieldBetween}>
                <View style={[styles.field, { flex: 1 }]}>
                  <Text style={styles.fieldLabel}>외국인등록번호 (ARC No.)</Text>
                  <View style={styles.arcRow}>
                    <Text style={styles.valueMain}>{MOCK.arcNo}</Text>
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
                <View style={styles.visaRow}>
                  <Text style={styles.valueMain}>{MOCK.visaCode}</Text>
                  <Text style={styles.valueSub}>{MOCK.visaName}</Text>
                </View>
              </View>

              <View style={styles.divider} />

              <View style={styles.twoColRow}>
                <View style={styles.twoColCell}>
                  <Text style={styles.fieldLabel}>발급일자 (Issue Date)</Text>
                  <Text style={styles.valueMd}>{MOCK.issueDate}</Text>
                </View>
                <View style={styles.twoColCell}>
                  <Text style={styles.fieldLabel}>발급기관 (Authority)</Text>
                  <Text style={styles.valueMd} numberOfLines={1}>{MOCK.authority}</Text>
                </View>
              </View>

              <View style={styles.divider} />

              <View style={styles.expiryBox}>
                <View style={styles.expiryRow}>
                  <Text style={styles.fieldLabel}>체류 만료일 (Expiry Date)</Text>
                  <View style={styles.dBadge}>
                    <Text style={styles.dBadgeText}>D-{MOCK.daysLeft}일 남음</Text>
                  </View>
                </View>
                <View style={styles.expiryRow}>
                  <Text style={styles.valueMain}>{MOCK.expiryDate}</Text>
                  <Text style={styles.validText}>체류기간 유효</Text>
                </View>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>

      <View style={styles.footer}>
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
            style={[styles.btn, styles.btnBlue, isNavigating && { opacity: 0.7 }]}
            onPress={handleConfirm}
            disabled={isNavigating}
          >
            <Text style={styles.btnBlueText}>
              {isNavigating ? '처리 중...' : '네, 맞아요'}
            </Text>
            {!isNavigating && (
              <Ionicons name="arrow-forward" size={16} color={colors.text.inverse} />
            )}
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}

const cardShadow = {
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.06,
  shadowRadius: 4,
  elevation: 2,
} as const;

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  scroll: { flex: 1 },
  content: { paddingBottom: spacing.xl, gap: spacing.md },
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
    backgroundColor: '#2a313c',
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
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
    ...cardShadow,
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

  cardBody: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.lg,
    gap: spacing.md,
  },

  field: { gap: 2 },
  fieldBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  fieldLabel: { ...typography.badge, color: colors.text.sub },
  nameRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  arcRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  visaRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  twoColRow: { flexDirection: 'row', gap: spacing.md },
  twoColCell: { flex: 1, gap: 2 },
  divider: { height: 1, backgroundColor: colors.border },

  valueMain: { ...typography.h3, color: colors.text.strong },
  valueSub: { ...typography.body, color: colors.text.sub },
  valueMd: { ...typography.subtitle, color: colors.text.strong },

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
  validText: { ...typography.badge, color: colors.primary },

  footer: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    gap: spacing.sm,
    backgroundColor: colors.background,
  },
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
  navError: { ...typography.body, color: '#D32F2F', textAlign: 'center' },
});
