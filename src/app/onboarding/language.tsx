// ON-001 언어·거주목적 화면.
// 언어(2×2)와 거주목적(3개) 모두 선택해야 다음 버튼 활성화.
// 다음: PATCH /users/me(언어) → PUT /onboarding/profile(거주목적) → POST /steps/LANGUAGE

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Screen from '../../components/Screen';
import OnboardingProgress from '../../components/OnboardingProgress';
import StepBadge from '../../components/StepBadge';
import ScreenTitle from '../../components/ScreenTitle';
import Button from '../../components/Button';
import { useOnboardingStep } from '../../hooks/useOnboardingStep';
import { useOnboardingStore } from '../../store/onboardingStore';
import { changeLanguage } from '../../api/user';
import { saveProfile } from '../../api/onboarding';
import { colors, typography, spacing, radius, fonts, shadow } from '../../constants/theme';
import { LANGUAGES } from '../../constants/languages';
import { setAppLanguage } from '../../i18n';
import type { Language, ResidencePurpose } from '../../types/api';

// ── 데이터 ──────────────────────────────────────────────────────────────
// 언어 목록은 constants/languages.ts (최종 확인 화면 언어 칩과 공유)

// 문구는 i18n onboarding.language.purposes.<code>
const PURPOSES = ['WORK', 'STUDY', 'FAMILY'] as const satisfies readonly ResidencePurpose[];

// ── 서브 컴포넌트 ────────────────────────────────────────────────────────
function LangCard({
  name, sub, flag, selected, onPress,
}: { name: string; sub: string; flag: string; selected: boolean; onPress: () => void }) {
  return (
    <Pressable style={[styles.langCard, selected && styles.langCardSelected]} onPress={onPress}>
      <View style={styles.langCardTop}>
        <Text style={styles.flagText}>{flag}</Text>
        {selected && (
          <View style={styles.checkLg}>
            <Ionicons name="checkmark" size={14} color={colors.text.inverse} />
          </View>
        )}
      </View>
      <Text style={styles.langName}>{name}</Text>
      <Text style={styles.langSub}>{sub}</Text>
    </Pressable>
  );
}

function PurposeCard({
  label, sub, selected, onPress,
}: { label: string; sub: string; selected: boolean; onPress: () => void }) {
  return (
    <Pressable style={styles.purposeCard} onPress={onPress}>
      <View style={styles.purposeText}>
        <Text style={styles.purposeLabel}>{label}</Text>
        <Text style={styles.purposeSub}>{sub}</Text>
      </View>
      <View style={[styles.checkSm, selected && styles.checkSmActive]}>
        {selected && <Ionicons name="checkmark" size={12} color={colors.text.inverse} />}
      </View>
    </Pressable>
  );
}

// ── 화면 ─────────────────────────────────────────────────────────────────
export default function LanguageScreen() {
  const { step, stage, totalStages, isFirst, goNext, isNavigating, navError } = useOnboardingStep();
  const { t } = useTranslation();
  const storeLanguage = useOnboardingStore((s) => s.language);
  const storePurpose  = useOnboardingStore((s) => s.purpose);
  const setStoreLang  = useOnboardingStore((s) => s.setLanguage);
  const setStorePurpose = useOnboardingStore((s) => s.setPurpose);

  const [lang, setLang]       = useState<Language | null>(storeLanguage);
  const [purpose, setPurpose] = useState<ResidencePurpose | null>(storePurpose);

  // 언어를 고르면 화면 문구도 바로 그 언어로 바뀐다
  const selectLang = (code: Language) => { setLang(code); setStoreLang(code); setAppLanguage(code); };
  const selectPurpose = (code: ResidencePurpose) => { setPurpose(code); setStorePurpose(code); };

  const canProceed = !!lang && !!purpose && !isNavigating;

  const handleNext = () => {
    if (!lang || !purpose) return;
    goNext(async () => {
      await changeLanguage(lang);
      await saveProfile(purpose);
    });
  };

  return (
    <Screen
      showBack={!isFirst}
      footer={
        <View style={styles.footerInner}>
          {navError ? <Text style={styles.navError}>{navError}</Text> : null}
          <Button title={t('onboarding.language.next')} showArrow onPress={handleNext} disabled={!canProceed} />
        </View>
      }
    >
      {/* 진행 표시 */}
      <OnboardingProgress current={stage} total={totalStages} sub="language" />

      {/* 배지 + 제목 */}
      <View style={styles.heading}>
        <StepBadge label={step ? t(`onboarding.steps.${step.stepCode}.badge`) : ''} />
        <ScreenTitle
          title={step ? t(`onboarding.steps.${step.stepCode}.title`) : ''}
          description={t('onboarding.language.description')}
        />
      </View>

      {/* 언어 2×2 그리드 */}
      <View style={styles.langGrid}>
        {([LANGUAGES.slice(0, 2), LANGUAGES.slice(2, 4)] as const).map((row, ri) => (
          <View key={ri} style={styles.langRow}>
            {row.map((l) => (
              <LangCard
                key={l.code}
                name={l.name}
                sub={l.sub}
                flag={l.flag}
                selected={lang === l.code}
                onPress={() => selectLang(l.code)}
              />
            ))}
          </View>
        ))}
      </View>

      {/* 거주 목적 섹션 */}
      <View style={styles.purposeSection}>
        <View style={styles.purposeHeader}>
          <Text style={styles.sectionTitle}>{t('onboarding.language.purposeTitle')}</Text>
          <Text style={styles.sectionSub}>{t('onboarding.language.purposeSub')}</Text>
        </View>
        <View style={styles.purposeList}>
          {PURPOSES.map((p) => (
            <PurposeCard
              key={p}
              label={t(`onboarding.language.purposes.${p}.label`)}
              sub={t(`onboarding.language.purposes.${p}.sub`)}
              selected={purpose === p}
              onPress={() => selectPurpose(p)}
            />
          ))}
        </View>
      </View>
    </Screen>
  );
}

// ── 스타일 ────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  // 배지 + 제목 묶음 (gap 6px — Figma 277:21)
  heading: { gap: 6 },

  // 언어 그리드
  langGrid: { gap: spacing.md },
  langRow: { flexDirection: 'row', gap: spacing.md },
  langCard: {
    flex: 1,
    minHeight: 116,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: 2,
    ...shadow.card,
  },
  langCardSelected: {
    borderWidth: 1.5,
    borderColor: colors.primary,
  },
  langCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  flagText: { fontSize: 28, lineHeight: 32 },
  checkLg: {
    width: 24,
    height: 24,
    borderRadius: radius.full,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  langName: { ...typography.h3, color: colors.text.strong },
  langSub:  { ...typography.badge, color: colors.text.sub },

  // 거주 목적 섹션
  purposeSection: { gap: spacing.md },
  purposeHeader:  { gap: 2 },
  sectionTitle: { ...typography.h3, color: colors.text.strong },
  sectionSub:   { ...typography.body, color: colors.text.sub },
  purposeList:  { gap: 10 },
  purposeCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    ...shadow.card,
  },
  purposeText:  { flex: 1, gap: 2 },
  purposeLabel: { ...typography.title, color: colors.text.strong },
  purposeSub:   { ...typography.body, color: colors.text.sub },
  checkSm: {
    flexShrink: 0,
    width: 20,
    height: 20,
    borderRadius: radius.full,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkSmActive: { backgroundColor: colors.primary },

  // 푸터
  footerInner: { gap: spacing.sm },
  navError: { ...typography.body, color: colors.errorText, textAlign: 'center' },
});
