// ON-001 언어·거주목적 화면.
// 언어(2×2)와 거주목적(3개) 모두 선택해야 다음 버튼 활성화.
// 다음: PATCH /users/me(언어) → PUT /onboarding/profile(거주목적) → POST /steps/LANGUAGE

import { useState } from 'react';
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
import type { Language, ResidencePurpose } from '../../types/api';

// ── 데이터 ──────────────────────────────────────────────────────────────
const LANGUAGES: { code: Language; name: string; sub: string; flag: string }[] = [
  { code: 'ko', name: '한국어',      sub: 'Korean',     flag: '🇰🇷' },
  { code: 'vi', name: 'Tiếng Việt', sub: 'Vietnamese', flag: '🇻🇳' },
  { code: 'en', name: 'English',    sub: 'English',    flag: '🇺🇸' },
  { code: 'zh', name: '中文',        sub: 'Chinese',    flag: '🇨🇳' },
];

const PURPOSES: { code: ResidencePurpose; label: string; sub: string }[] = [
  { code: 'WORK',   label: '취업 및 비즈니스',     sub: 'E-9, E-7, D-8 등 전문·비전문 취업' },
  { code: 'STUDY',  label: '유학 및 어학연수',     sub: 'D-2 학위과정, D-4 일반연수' },
  { code: 'FAMILY', label: '가족 동반 및 영주·거주', sub: 'F-2 거주, F-5 영주, F-6 결혼이민' },
];

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
  const storeLanguage = useOnboardingStore((s) => s.language);
  const storePurpose  = useOnboardingStore((s) => s.purpose);
  const setStoreLang  = useOnboardingStore((s) => s.setLanguage);
  const setStorePurpose = useOnboardingStore((s) => s.setPurpose);

  const [lang, setLang]       = useState<Language | null>(storeLanguage);
  const [purpose, setPurpose] = useState<ResidencePurpose | null>(storePurpose);

  const selectLang = (code: Language) => { setLang(code); setStoreLang(code); };
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
          <Button title="다음 단계로" showArrow onPress={handleNext} disabled={!canProceed} />
        </View>
      }
    >
      {/* 진행 표시 */}
      <OnboardingProgress current={stage} total={totalStages} />

      {/* 배지 + 제목 */}
      <View style={styles.heading}>
        <StepBadge label={step?.badge ?? ''} />
        <ScreenTitle
          title={step?.title ?? ''}
          description="화면과 답변 모두 선택한 언어로 제공돼요."
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
          <Text style={styles.sectionTitle}>현재 체류 목적을 알려주세요</Text>
          <Text style={styles.sectionSub}>{'비자 종류에 맞춰 전용 외환 & 계좌 한도를 안내해요'}</Text>
        </View>
        <View style={styles.purposeList}>
          {PURPOSES.map((p) => (
            <PurposeCard
              key={p.code}
              label={p.label}
              sub={p.sub}
              selected={purpose === p.code}
              onPress={() => selectPurpose(p.code)}
            />
          ))}
        </View>
      </View>

      {/* 안내 문구 */}
      <View style={styles.infoBox}>
        <Ionicons name="information-circle-outline" size={16} color={colors.text.sub} />
        <Text style={styles.infoText}>
          {'언어와 체류 유형은 언제든지\n\'내 정보 수정\'에서 바꿀 수 있어요.'}
        </Text>
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
    ...shadow.card,
  },
  purposeText:  { flex: 1, gap: 2 },
  purposeLabel: { ...typography.title, color: colors.text.strong },
  purposeSub:   { ...typography.body, color: colors.text.sub },
  checkSm: {
    width: 20,
    height: 20,
    borderRadius: radius.full,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkSmActive: { backgroundColor: colors.primary },

  // 안내 문구 박스
  infoBox: {
    flexDirection: 'row',
    gap: 10,
    backgroundColor: colors.background,
    borderRadius: radius.lg,
    padding: 14,
    alignItems: 'flex-start',
  },
  infoText: { ...typography.body, color: colors.text.sub, flex: 1 },

  // 푸터
  footerInner: { gap: spacing.sm },
  navError: { ...typography.body, color: colors.errorText, textAlign: 'center' },
});
