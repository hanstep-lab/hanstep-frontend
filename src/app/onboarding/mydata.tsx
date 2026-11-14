import { useState } from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Header from '../../components/Header';
import Button from '../../components/Button';
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
  const [showModal, setShowModal] = useState(false);

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
        <Button
          title={isNavigating ? '처리 중...' : '동의하고 연결하기'}
          showArrow={!isNavigating}
          onPress={() => setShowModal(true)}
          disabled={!requiredOk || isNavigating}
        />
        <Pressable onPress={() => goNext()} disabled={isNavigating}>
          <Text style={styles.skipText}>나중에 연결할게요</Text>
        </Pressable>
      </View>
      <Modal visible={showModal} transparent animationType="slide" onRequestClose={() => setShowModal(false)}>
        <View style={styles.modalWrap}>
          <Pressable style={styles.dim} onPress={() => setShowModal(false)} />
          <View style={styles.sheet}>
            <View style={styles.handle} />

            <View style={styles.sheetTitleArea}>
              <Text style={styles.sheetTitle}>금융 데이터를 연결할게요</Text>
              <Text style={styles.sheetSubtitle}>아래 내용으로 마이데이터 연결을 진행해요.</Text>
            </View>

            <View style={styles.summaryBox}>
              {[
                { label: '연결 기관',  value: '신한은행, 신한카드' },
                { label: '불러올 정보', value: '계좌 잔액 · 거래내역 · 카드 이용내역' },
                { label: '조회 기간',  value: '최근 12개월' },
                { label: '이용 목적',  value: '소득·지출 분석, 금융 진단' },
              ].map((row) => (
                <View key={row.label} style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>{row.label}</Text>
                  <Text style={styles.summaryValue}>{row.value}</Text>
                </View>
              ))}
            </View>

            <View style={styles.sheetActions}>
              <Pressable style={styles.cancelBtn} onPress={() => setShowModal(false)}>
                <Text style={styles.cancelText}>취소</Text>
              </Pressable>
              <Pressable
                style={[styles.confirmBtn, isNavigating && { opacity: 0.7 }]}
                onPress={() => { setShowModal(false); goNext(); }}
                disabled={isNavigating}
              >
                <Text style={styles.confirmText}>
                  {isNavigating ? '처리 중...' : '확인하고 연결'}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
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
    backgroundColor: colors.onColor.fill,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.full,
  },
  instTagText: { ...typography.badge, color: colors.text.inverse },
  instDesc: { ...typography.body, color: colors.onColor.sub },
  instDescDark: { ...typography.body, color: colors.text.sub },
  instCheck: {
    width: 28,
    height: 28,
    borderRadius: radius.full,
    backgroundColor: colors.onColor.fill,
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
  skipText: { ...typography.body, color: colors.text.sub, textAlign: 'center' },
  navError: { ...typography.body, color: colors.errorText, textAlign: 'center' },

  modalWrap: { flex: 1, justifyContent: 'flex-end' },
  dim: { ...StyleSheet.absoluteFill, backgroundColor: colors.dim },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: spacing.xxl,
    borderTopRightRadius: spacing.xxl,
    paddingHorizontal: spacing.xxl,
    paddingTop: spacing.md,
    paddingBottom: spacing.xxl,
    gap: spacing.lg,
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: colors.border,
    borderRadius: 2,
    alignSelf: 'center',
  },
  sheetTitleArea: { gap: 6 },
  sheetTitle: { ...typography.h2, color: colors.text.strong },
  sheetSubtitle: { ...typography.body, color: colors.text.sub },
  summaryBox: {
    backgroundColor: colors.background,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.md,
  },
  summaryRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },
  summaryLabel: { ...typography.body, color: colors.text.sub, width: 76 },
  summaryValue: { ...typography.body, fontFamily: fonts.bold, color: colors.text.strong, flex: 1 },
  sheetActions: { flexDirection: 'row', gap: spacing.sm },
  cancelBtn: {
    width: 104,
    backgroundColor: colors.background,
    borderRadius: radius.lg,
    paddingVertical: 15,
    alignItems: 'center',
  },
  cancelText: { ...typography.title, color: colors.primary },
  confirmBtn: {
    flex: 1,
    backgroundColor: colors.primary,
    borderRadius: radius.lg,
    paddingVertical: 15,
    alignItems: 'center',
  },
  confirmText: { ...typography.title, color: colors.text.inverse },
});
