import { View, Text, Pressable, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import Header from '../../components/Header';
import { colors, typography, spacing, radius, fonts } from '../../constants/theme';

function CornerGuide({ pos }: { pos: 'tl' | 'tr' | 'bl' | 'br' }) {
  const isLeft = pos === 'tl' || pos === 'bl';
  const isTop  = pos === 'tl' || pos === 'tr';

  return (
    <View
      style={[
        styles.corner,
        isTop  ? { top: 8 }  : { bottom: 8 },
        isLeft ? { left: 8 } : { right: 8 },
        !isLeft && { alignItems: 'flex-end' },
      ]}
    >
      {isTop  && <View style={styles.cornerH} />}
      <View style={styles.cornerV} />
      {!isTop && <View style={styles.cornerH} />}
    </View>
  );
}

export default function IdCardScreen() {
  const goToConfirm = () => router.push('/onboarding/id-confirm' as any);

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <Header title="외국인등록증 촬영" showBack />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.row}>
          <Pressable style={styles.chip}>
            <Ionicons name="flash-off" size={16} color={colors.text.strong} />
            <Text style={styles.chipText}>플래시 꺼짐</Text>
          </Pressable>
        </View>

        <View style={styles.px}>
          <View style={styles.infoCard}>
            <View style={styles.infoCardTop}>
              <Text style={styles.infoCardTitle}>외국인등록증 앞면 인식</Text>
              <View style={styles.progressBadge}>
                <Text style={styles.progressBadgeText}>진행중 1/3</Text>
              </View>
            </View>
            <Text style={styles.infoCardDesc}>
              {'빛 반사에 유의하여 카드를 어두운 배경에 올려놓고\n사각형 가이드라인에 맞춰주세요.'}
            </Text>
          </View>
        </View>

        <View style={styles.viewfinderWrap}>
          <View style={styles.viewfinder}>
            <CornerGuide pos="tl" />
            <CornerGuide pos="tr" />
            <CornerGuide pos="bl" />
            <CornerGuide pos="br" />

            <View style={styles.mockCard}>
              <View style={styles.mockCardHeader}>
                <View>
                  <Text style={styles.mockCountry}>REPUBLIC OF KOREA</Text>
                  <Text style={styles.mockCardName}>외국인등록증 (ALIEN REGISTRATION CARD)</Text>
                </View>
              </View>
              <View style={styles.mockCardBody}>
                <View style={styles.mockPhoto}>
                  <Ionicons name="person-outline" size={20} color={colors.text.sub} />
                  <Text style={styles.mockPhotoLabel}>사진 영역</Text>
                </View>
                <View style={styles.mockFields}>
                  {[
                    { label: '등록번호', value: '●●●●●● - ●●●●●●●' },
                    { label: '체류자격', value: 'E-9 / 비전문취업' },
                    { label: '발급일자', value: 'YYYY.MM.DD' },
                  ].map((f) => (
                    <View key={f.label} style={styles.mockField}>
                      <Text style={styles.mockFieldLabel}>{f.label}</Text>
                      <Text style={styles.mockFieldValue}>{f.value}</Text>
                    </View>
                  ))}
                </View>
              </View>
              <Text style={styles.mockMrz}>{'KO<<ARC<<950815<<<<<<<<<<'}</Text>
            </View>
          </View>
        </View>

        <View style={[styles.row, { justifyContent: 'center' }]}>
          <View style={styles.hintChip}>
            <Text style={styles.hintChipText}>가이드라인에 맞춘 뒤 촬영 버튼을 눌러 주세요</Text>
          </View>
        </View>

        <View style={[styles.px, styles.tipRow]}>
          {[
            { title: '조명 조절', sub: '빛 반사 피하기' },
            { title: '수평 유지', sub: '프레임 채우기' },
          ].map((t) => (
            <View key={t.title} style={styles.tipCard}>
              <Text style={styles.tipTitle}>{t.title}</Text>
              <Text style={styles.tipSub}>{t.sub}</Text>
            </View>
          ))}
        </View>

        <View style={styles.captureSection}>
          <Pressable onPress={goToConfirm} style={styles.captureBtn}>
            <View style={styles.captureOuter}>
              <View style={styles.captureInner}>
                <View style={styles.captureCenter}>
                  <Ionicons name="camera" size={24} color={colors.primary} />
                </View>
              </View>
            </View>
          </Pressable>

          <View style={styles.manualWrap}>
            <Text style={styles.manualHint}>인식이 잘 되지 않나요?</Text>
            <Pressable style={styles.manualBtn} onPress={goToConfirm}>
              <Text style={styles.manualBtnText}>직접 정보 입력하기</Text>
              <Ionicons name="chevron-forward" size={12} color={colors.primary} />
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const cardShadow = {
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 1 },
  shadowOpacity: 0.05,
  shadowRadius: 2,
  elevation: 1,
} as const;

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  content: { paddingBottom: spacing.xl, gap: spacing.sm },
  px: { paddingHorizontal: spacing.xl },
  row: { flexDirection: 'row', paddingHorizontal: spacing.xl, paddingVertical: spacing.sm },

  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.background,
    paddingHorizontal: 14,
    paddingVertical: spacing.xs,
    borderRadius: radius.full,
  },
  chipText: { ...typography.body, fontFamily: fonts.bold, color: colors.text.strong },

  infoCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: 14,
    gap: spacing.xs,
    ...cardShadow,
  },
  infoCardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  infoCardTitle: { ...typography.h3, color: colors.text.strong },
  progressBadge: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.full,
  },
  progressBadgeText: { ...typography.badge, color: colors.text.inverse },
  infoCardDesc: { ...typography.body, color: colors.text.sub },

  viewfinderWrap: { paddingHorizontal: spacing.xl, alignItems: 'center' },
  viewfinder: {
    width: '100%',
    maxWidth: 340,
    aspectRatio: 340 / 215,
    backgroundColor: '#2a313c',
    borderRadius: radius.lg,
    overflow: 'hidden',
  },
  corner: { position: 'absolute' },
  cornerH: { width: 24, height: 4, backgroundColor: colors.primary, borderRadius: radius.full },
  cornerV: { width: 4, height: 20, backgroundColor: colors.primary, borderRadius: radius.full },

  mockCard: { flex: 1, padding: 12, justifyContent: 'space-between' },
  mockCardHeader: { flexDirection: 'row', justifyContent: 'space-between' },
  mockCountry: { fontSize: 10, fontFamily: fonts.bold, color: '#fff', letterSpacing: 0.5 },
  mockCardName: { fontSize: 9, fontFamily: fonts.medium, color: 'rgba(255,255,255,0.85)' },
  mockCardBody: { flexDirection: 'row', gap: 12, alignItems: 'center' },
  mockPhoto: {
    width: 64, height: 80,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  mockPhotoLabel: { fontSize: 9, fontFamily: fonts.medium, color: colors.text.sub },
  mockFields: { flex: 1, gap: 4 },
  mockField: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  mockFieldLabel: { fontSize: 9, fontFamily: fonts.medium, color: colors.text.sub },
  mockFieldValue: { fontSize: 9, fontFamily: fonts.bold, color: '#fff' },
  mockMrz: { fontSize: 8, fontFamily: fonts.light, color: 'rgba(220,220,220,0.5)', letterSpacing: 0.9 },

  hintChip: {
    backgroundColor: colors.background,
    paddingHorizontal: 14,
    paddingVertical: spacing.xs,
    borderRadius: radius.full,
  },
  hintChipText: { ...typography.body, fontFamily: fonts.bold, color: colors.text.strong },

  tipRow: { flexDirection: 'row', gap: spacing.sm },
  tipCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.sm,
    gap: 2,
    ...cardShadow,
  },
  tipTitle: { ...typography.badge, fontFamily: fonts.bold, color: colors.text.strong },
  tipSub: { ...typography.badge, color: colors.text.sub },

  captureSection: { alignItems: 'center', gap: 14, paddingTop: spacing.sm },
  captureBtn: { width: 80, height: 80 },
  captureOuter: {
    flex: 1,
    padding: 4,
    backgroundColor: colors.background,
    borderRadius: radius.full,
  },
  captureInner: {
    flex: 1,
    backgroundColor: colors.primary,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  captureCenter: {
    width: 56,
    height: 56,
    backgroundColor: colors.surface,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },

  manualWrap: { alignItems: 'center', gap: spacing.xs },
  manualHint: { ...typography.badge, color: colors.text.sub },
  manualBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.background,
    paddingHorizontal: 14,
    paddingVertical: spacing.xs,
    borderRadius: radius.full,
  },
  manualBtnText: { ...typography.body, fontFamily: fonts.bold, color: colors.primary },
});
