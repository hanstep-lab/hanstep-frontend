// ON-003A 마이데이터 기관 선택·약관 동의, ON-003B 연결 확인 모달.
// 기관 목록은 서버(MYD-01) 값, 동의 저장(CNS-02)·연결(MYD-02)은 src/api 에서만 부른다.
// 확인하고 연결: POST consents → POST mydata/connections → 단계 COMPLETED / 나중에 연결할게요: 단계 SKIPPED
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View, Text, Pressable, ScrollView, StyleSheet, Modal } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Header from '../../components/Header';
import Button from '../../components/Button';
import { useOnboardingStep } from '../../hooks/useOnboardingStep';
import OnboardingProgress from '../../components/OnboardingProgress';
import {
  getInstitutionViews,
  connectInstitutions,
  scopesOf,
  scopeText,
  connectErrorText,
  LOOKBACK_MONTHS,
  mydataLoadError,
  type InstitutionView,
} from '../../api/mydata';
import { saveConsents, MYDATA_CONSENTS } from '../../api/consents';
import type { ApiError } from '../../types/api';
import { colors, typography, spacing, radius, fonts } from '../../constants/theme';
import { FadeIn, Skeleton, SkeletonGroup } from '../../components/Skeleton';

// 필수 두 건은 MYDATA·MYDATA_TERMS 로 저장한다(consents.ts MYDATA_CONSENTS).
// 선택 동의는 맞는 consentType 이 정해지지 않아 서버에 보내지 않는다.
// 문구는 i18n onboarding.mydata.<label>
const CONSENTS = [
  { label: 'consentRequired1', required: true },
  { label: 'consentRequired2', required: true },
  { label: 'consentOptional',  required: false },
] as const;

export default function MydataScreen() {
  const { goNext, skip, isNavigating, navError, stage, totalStages } = useOnboardingStep();
  const { t } = useTranslation();
  // Modal 은 별도 창이라 화면의 SafeAreaView 하단 여백이 안 먹는다. 시트에 시스템 내비게이션 바 높이를 더한다
  const insets = useSafeAreaInsets();
  const [checks, setChecks] = useState([false, false, false]);
  const [showModal, setShowModal] = useState(false);
  const [institutions, setInstitutions] = useState<InstitutionView[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);

  useEffect(() => {
    getInstitutionViews()
      .then((list) => {
        setInstitutions(list);
        setSelectedIds(list.map((inst) => inst.id)); // 처음에는 모두 선택
      })
      .catch(() => setLoadError(mydataLoadError()));
  }, []);

  const allChecked  = checks.every(Boolean);
  const requiredOk  = checks[0] && checks[1];

  const selected   = (institutions ?? []).filter((inst) => selectedIds.includes(inst.id));
  const scopes     = scopesOf(selected);
  const canConnect = requiredOk && selected.length > 0 && scopes.length > 0;

  const toggleAll = () => { const v = !allChecked; setChecks([v, v, v]); };
  const toggle    = (i: number) => setChecks((prev) => prev.map((c, j) => (j === i ? !c : c)));
  const toggleInstitution = (id: number) =>
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const connect = () => {
    setShowModal(false);
    goNext(async () => {
      try {
        await saveConsents(MYDATA_CONSENTS);
        await connectInstitutions(selected.map((inst) => inst.id), scopes);
      } catch (e) {
        // Error 로 던져야 goNext(errorText)가 이 마이데이터 전용 문구를 그대로 보여 줌 (일반 객체면 code 로 다시 고름)
        throw new Error(connectErrorText(e as ApiError));
      }
    });
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <Header title={t('common.appName')} showBack />

      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.progressWrap}>
          <OnboardingProgress current={stage} total={totalStages} sub="mydata" />
        </View>

        {/* 배지 + 제목 */}
        <View style={styles.titleArea}>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{t('onboarding.mydata.badge')}</Text>
          </View>
          <Text style={styles.title}>{t('onboarding.mydata.title')}</Text>
          <Text style={styles.subtitle}>{t('onboarding.mydata.subtitle')}</Text>
        </View>

        {/* 금융기관 카드 */}
        <View style={styles.cardList}>
          {!institutions ? (
            loadError ? (
              <Text style={styles.stateText}>{loadError}</Text>
            ) : (
              <SkeletonGroup gap={spacing.md}>
                <Skeleton height={76} round={radius.lg} />
                <Skeleton height={76} round={radius.lg} />
                <Skeleton height={76} round={radius.lg} />
              </SkeletonGroup>
            )
          ) : (
            <FadeIn style={{ gap: spacing.md }}>
            {institutions.map((inst) => {
              const on = selectedIds.includes(inst.id);
              return (
                <Pressable
                  key={inst.id}
                  style={on ? styles.instCardSelected : styles.instCardDefault}
                  onPress={() => toggleInstitution(inst.id)}
                  disabled={isNavigating}
                >
                  <View style={styles.instCardLeft}>
                    <View style={styles.instCardTitle}>
                      <Text style={on ? styles.instName : styles.instNameDark}>{inst.name}</Text>
                      {inst.tag ? (
                        <View style={on ? styles.instTag : styles.instTagDark}>
                          <Text style={on ? styles.instTagText : styles.instTagTextDark}>{inst.tag}</Text>
                        </View>
                      ) : null}
                    </View>
                    {inst.desc ? <Text style={on ? styles.instDesc : styles.instDescDark}>{inst.desc}</Text> : null}
                  </View>
                  {on ? (
                    <View style={styles.instCheck}>
                      <Ionicons name="checkmark" size={14} color={colors.text.inverse} />
                    </View>
                  ) : (
                    <View style={styles.instAdd}>
                      <Ionicons name="add" size={16} color={colors.text.sub} />
                    </View>
                  )}
                </Pressable>
              );
            })}
            </FadeIn>
          )}

          <View style={styles.instCardDefault}>
            <View style={styles.instCardLeft}>
              <Text style={styles.instNameDark}>{t('onboarding.mydata.otherInstitution')}</Text>
              <Text style={styles.instDescDark}>{t('onboarding.mydata.otherInstitutionDesc')}</Text>
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
            <Text style={styles.agreeAllText}>{t('onboarding.mydata.agreeAll')}</Text>
          </Pressable>

          {CONSENTS.map((item, i) => (
            <Pressable key={i} style={styles.consentRow} onPress={() => toggle(i)}>
              <View style={[styles.checkCircleSm, checks[i] && styles.checkCircleSmOn]}>
                {checks[i] && <Ionicons name="checkmark" size={12} color={colors.text.inverse} />}
              </View>
              <Text style={styles.consentLabel}>{t(`onboarding.mydata.${item.label}`)}</Text>
              <Ionicons name="chevron-forward" size={16} color={colors.text.sub} />
            </Pressable>
          ))}
        </View>
      </ScrollView>

      <View style={styles.footer}>
        {navError ? <Text style={styles.navError}>{navError}</Text> : null}
        <Button
          title={isNavigating ? t('common.processing') : t('onboarding.mydata.agreeConnect')}
          showArrow={!isNavigating}
          onPress={() => setShowModal(true)}
          disabled={!canConnect || isNavigating}
        />
        <Pressable onPress={() => skip()} disabled={isNavigating}>
          <Text style={styles.skipText}>{t('onboarding.mydata.later')}</Text>
        </Pressable>
      </View>
      <Modal visible={showModal} transparent animationType="slide" onRequestClose={() => setShowModal(false)}>
        <View style={styles.modalWrap}>
          <Pressable style={styles.dim} onPress={() => setShowModal(false)} />
          <View style={[styles.sheet, { paddingBottom: spacing.xxl + insets.bottom }]}>
            <View style={styles.handle} />

            <View style={styles.sheetTitleArea}>
              <Text style={styles.sheetTitle}>{t('onboarding.mydata.sheetTitle')}</Text>
              <Text style={styles.sheetSubtitle}>{t('onboarding.mydata.sheetSubtitle')}</Text>
            </View>

            <View style={styles.summaryBox}>
              {[
                { label: t('onboarding.mydata.rowInstitutions'), value: selected.map((inst) => inst.name).join(', ') },
                { label: t('onboarding.mydata.rowScopes'), value: scopeText(scopes) },
                { label: t('onboarding.mydata.rowPeriod'), value: t('onboarding.mydata.period', { months: LOOKBACK_MONTHS }) },
                { label: t('onboarding.mydata.rowPurpose'), value: t('onboarding.mydata.purpose') },
              ].map((row) => (
                <View key={row.label} style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>{row.label}</Text>
                  <Text style={styles.summaryValue}>{row.value}</Text>
                </View>
              ))}
            </View>

            <View style={styles.sheetActions}>
              <Pressable style={styles.cancelBtn} onPress={() => setShowModal(false)}>
                <Text style={styles.cancelText}>{t('common.cancel')}</Text>
              </Pressable>
              <Pressable
                style={[styles.confirmBtn, isNavigating && { opacity: 0.7 }]}
                onPress={connect}
                disabled={isNavigating}
              >
                <Text style={styles.confirmText}>
                  {isNavigating ? t('common.processing') : t('onboarding.mydata.confirmConnect')}
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

  progressWrap: { paddingTop: spacing.md },

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
    gap: spacing.md,
  },
  instCardDefault: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: spacing.lg,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.md,
  },
  instCardLeft: { flex: 1, gap: 2 }, // 영어 설명이 길어도 오른쪽 체크·추가 원을 밀어내지 않게
  instCardTitle: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  instName: { ...typography.h3, color: colors.text.inverse, flexShrink: 1 },
  instNameDark: { ...typography.h3, color: colors.text.strong, flexShrink: 1 },
  instTag: {
    backgroundColor: colors.onColor.fill,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.full,
    flexShrink: 0,
  },
  instTagText: { ...typography.badge, color: colors.text.inverse },
  instTagDark: {
    backgroundColor: colors.background,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.full,
    flexShrink: 0,
  },
  instTagTextDark: { ...typography.badge, color: colors.text.sub },
  stateText: { ...typography.body, color: colors.text.sub, textAlign: 'center', paddingVertical: spacing.lg },
  instDesc: { ...typography.body, color: colors.onColor.sub },
  instDescDark: { ...typography.body, color: colors.text.sub },
  instCheck: {
    width: 28,
    height: 28,
    borderRadius: radius.full,
    backgroundColor: colors.onColor.fill,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  instAdd: {
    width: 28,
    height: 28,
    borderRadius: radius.full,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
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
    flexShrink: 0,
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
    flexShrink: 0,
  },
  checkCircleSmOn: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  agreeAllText: { ...typography.title, color: colors.text.strong, flexShrink: 1 },
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
