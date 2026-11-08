import { useState } from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Header from '../../components/Header';
import { useOnboardingStep } from '../../hooks/useOnboardingStep';
import { colors, typography, spacing, radius, fonts } from '../../constants/theme';

const INSTITUTIONS = [
  { name: '신한은행', tag: '주거래', desc: '입출금·적금 계좌, 거래내역', selected: true },
  { name: '신한카드', tag: '카드',   desc: '카드 이용내역, 결제 예정 금액', selected: true },
];

const CONSENTS = [
  { label: '[필수] 개인신용정보 전송요구 및 수집·이용 동의', required: true },
  { label: '[필수] 마이데이터 서비스 이용약관',              required: true },
  { label: '[선택] 금융 진단 활용 동의',                    required: false },
];

export default function MydataScreen() {
  const { goNext, isNavigating, navError } = useOnboardingStep();
  const [checks, setChecks] = useState([false, false, false]);

  const allChecked  = checks.every(Boolean);
  const requiredOk  = checks[0] && checks[1];

  const toggleAll = () => { const v = !allChecked; setChecks([v, v, v]); };
  const toggle    = (i: number) => setChecks((prev) => prev.map((c, j) => (j === i ? !c : c)));

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <Header title="신한걸음" showBack />

      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* 단계 진행 도트 */}
        <View style={styles.progressRow}>
          <View style={styles.dots}>
            <View style={[styles.dot, styles.dotOff]} />
            <View style={[styles.dot, styles.dotOn]} />
            <View style={[styles.dot, styles.dotOff]} />
            <View style={[styles.dot, styles.dotOff]} />
          </View>
          <Text style={styles.stepText}>단계 2 / 2</Text>
        </View>

        {/* 배지 + 제목 */}
        <View style={styles.titleArea}>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>마이데이터 연결</Text>
          </View>
          <Text style={styles.title}>{'금융 데이터를\n연결할까요?'}</Text>
          <Text style={styles.subtitle}>
            계좌·거래내역을 불러와 소득·지출 분석과 비자 소득 점수 추정에 사용해요.
          </Text>
        </View>

        {/* 금융기관 카드 */}
        <View style={styles.cardList}>
          {INSTITUTIONS.map((inst) => (
            <View key={inst.name} style={styles.instCardSelected}>
              <View style={styles.instCardLeft}>
                <View style={styles.instCardTitle}>
                  <Text style={styles.instName}>{inst.name}</Text>
                  <View style={styles.instTag}>
                    <Text style={styles.instTagText}>{inst.tag}</Text>
                  </View>
                </View>
                <Text style={styles.instDesc}>{inst.desc}</Text>
              </View>
              <View style={styles.instCheck}>
                <Ionicons name="checkmark" size={14} color={colors.text.inverse} />
              </View>
            </View>
          ))}

          <View style={styles.instCardDefault}>
            <View style={styles.instCardLeft}>
              <Text style={styles.instNameDark}>다른 금융기관</Text>
              <Text style={styles.instDescDark}>연결 후 설정에서 추가할 수 있어요</Text>
            </View>
            <View style={styles.instAdd}>
              <Ionicons name="add" size={16} color={colors.text.sub} />
            </View>
          </View>
        </View>

        {/* 약관 동의 */}
        <View style={styles.consentSection}>
          <Pressable style={styles.agreeAllRow} onPress={toggleAll}>
            <View style={[styles.checkCircle, allChecked && styles.checkCircleOn]}>
              {allChecked && <Ionicons name="checkmark" size={14} color={colors.text.inverse} />}
            </View>
            <Text style={styles.agreeAllText}>약관 전체 동의</Text>
          </Pressable>

          {CONSENTS.map((item, i) => (
            <Pressable key={i} style={styles.consentRow} onPress={() => toggle(i)}>
              <View style={[styles.checkCircleSm, checks[i] && styles.checkCircleSmOn]}>
                {checks[i] && <Ionicons name="checkmark" size={12} color={colors.text.inverse} />}
              </View>
              <Text style={styles.consentLabel}>{item.label}</Text>
              <Ionicons name="chevron-forward" size={16} color={colors.text.sub} />
            </Pressable>
          ))}
        </View>
      </ScrollView>

      <View style={styles.footer}>
        {navError ? <Text style={styles.navError}>{navError}</Text> : null}
        <Pressable
          style={[styles.btn, (!requiredOk || isNavigating) && styles.btnDisabled]}
          onPress={() => goNext()}
          disabled={!requiredOk || isNavigating}
        >
          <Text style={styles.btnText}>
            {isNavigating ? '처리 중...' : '동의하고 연결하기'}
          </Text>
          {!isNavigating && <Ionicons name="arrow-forward" size={16} color={colors.text.inverse} />}
        </Pressable>
        <Pressable onPress={() => goNext()} disabled={isNavigating}>
          <Text style={styles.skipText}>나중에 연결할게요</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  scroll: { flex: 1 },
  content: { paddingHorizontal: spacing.xl, paddingBottom: spacing.xl, gap: spacing.xl },

  progressRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: spacing.md,
  },
  dots: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dot: { height: 10, borderRadius: radius.full },
  dotOn:  { width: 24, backgroundColor: colors.primary },
  dotOff: { width: 10, backgroundColor: colors.border },
  stepText: { ...typography.badge, fontFamily: fonts.bold, color: colors.primary },

  titleArea: { gap: 6 },
  badge: {
    alignSelf: 'flex-start',
    backgroundColor: colors.primary,
    paddingHorizontal: 10,
    paddingVertical: spacing.xs,
    borderRadius: radius.full,
  },
  badgeText: { ...typography.badge, color: colors.text.inverse },
  title: { ...typography.h2, color: colors.text.strong },
  subtitle: { ...typography.body, color: colors.text.sub },

  cardList: { gap: spacing.md },

  instCardSelected: {
    backgroundColor: colors.primary,
    borderRadius: radius.xl,
    padding: spacing.lg,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  instCardDefault: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: spacing.lg,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  instCardLeft: { gap: 2 },
  instCardTitle: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  instName: { ...typography.h3, color: colors.text.inverse },
  instNameDark: { ...typography.h3, color: colors.text.strong },
  instTag: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.full,
  },
  instTagText: { ...typography.badge, color: colors.text.inverse },
  instDesc: { ...typography.body, color: 'rgba(255,255,255,0.85)' },
  instDescDark: { ...typography.body, color: colors.text.sub },
  instCheck: {
    width: 28,
    height: 28,
    borderRadius: radius.full,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  instAdd: {
    width: 28,
    height: 28,
    borderRadius: radius.full,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },

  consentSection: { gap: spacing.xs },
  agreeAllRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.background,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.lg,
    paddingVertical: 14,
  },
  consentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: spacing.lg,
    paddingVertical: 6,
  },
  checkCircle: {
    width: 22,
    height: 22,
    borderRadius: radius.full,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkCircleOn: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  checkCircleSm: {
    width: 22,
    height: 22,
    borderRadius: radius.full,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkCircleSmOn: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  agreeAllText: { ...typography.title, color: colors.text.strong },
  consentLabel: { ...typography.body, color: colors.text.sub, flex: 1 },

  footer: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    gap: spacing.md,
    backgroundColor: colors.background,
  },
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.primary,
    borderRadius: radius.lg,
    paddingVertical: 14,
  },
  btnDisabled: { backgroundColor: colors.disabled },
  btnText: { ...typography.button, color: colors.text.inverse },
  skipText: { ...typography.body, color: colors.text.sub, textAlign: 'center' },
  navError: { ...typography.body, color: '#D32F2F', textAlign: 'center' },
});
