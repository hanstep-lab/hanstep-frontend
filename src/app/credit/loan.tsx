// CR-002 SOL 글로벌론 상품 상세 (Figma 447:2). 데이터는 src/api/credit.ts 에서만 받고 글자를 그대로 보여준다.
// 입력 없이 보여주기만 하는 화면. 메뉴에 연결하지 않고 /credit/loan 주소로만 연다.
// 진단과 비교 구역은 CR-001 대안신용 진단이 생긴 뒤 추가.
import { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Screen from '../../components/Screen';
import Button from '../../components/Button';
import Pill from '../../components/Pill';
import { colors, typography, spacing, radius, fonts, shadow } from '../../constants/theme';
import { getGlobalLoan, type GlobalLoan } from '../../api/credit';
import type { ApiError } from '../../types/api';

// 버튼 연결은 나중에. 지금은 눌러도 아무 동작 없음.
const noop = () => {};

export default function GlobalLoanScreen() {
  const [loan, setLoan] = useState<GlobalLoan | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getGlobalLoan()
      .then(setLoan)
      .catch((e: ApiError) => setError(e.message));
  }, []);

  if (!loan) {
    return (
      <Screen>
        <Text style={s.stateText}>{error ?? '상품 정보를 불러오는 중이에요.'}</Text>
      </Screen>
    );
  }

  const { eligibility, terms } = loan;

  return (
    <Screen
      footer={
        <View style={s.footer}>
          <Button title="신한 SOL에서 신청하기" showArrow onPress={noop} />
          <Button title="신한걸음에 물어보기" variant="text" onPress={noop} />
        </View>
      }
    >
      {/* 상품 소개 */}
      <View style={s.intro}>
        <Pill label={loan.productTag} type="step" />
        <View style={s.headingGroup}>
          <Text style={s.name}>{loan.name}</Text>
          <Text style={s.summary}>{loan.summary}</Text>
        </View>
      </View>

      {/* 가입 조건 확인 */}
      <View style={s.section}>
        <View style={s.sectionHeader}>
          <View style={s.titles}>
            <Text style={s.sectionTitle}>{eligibility.title}</Text>
            <Text style={s.sectionSub}>{eligibility.source}</Text>
          </View>
          <Pill label={eligibility.resultLabel} type="step" />
        </View>

        <View style={[s.card, s.conditionCard]}>
          {eligibility.conditions.map((c) => (
            <View key={c.key} style={s.condition}>
              <Ionicons
                name={c.met ? 'checkmark-circle' : 'ellipse-outline'}
                size={20}
                color={c.met ? colors.primary : colors.disabled}
              />
              <View style={s.conditionTexts}>
                <Text style={s.conditionTitle}>{c.title}</Text>
                <Text style={s.conditionDesc}>{c.desc}</Text>
              </View>
            </View>
          ))}
        </View>
      </View>

      {/* 상품 조건 */}
      <View style={s.section}>
        <View style={s.titles}>
          <Text style={s.sectionTitle}>{terms.title}</Text>
          <Text style={s.sectionSub}>{terms.basis}</Text>
        </View>

        <View style={[s.card, s.termsCard]}>
          {terms.rows.map((row, i) => (
            <View key={row.label} style={[s.termRow, i > 0 && s.termDivider]}>
              <Text style={s.termLabel}>{row.label}</Text>
              <Text style={s.termValue}>{row.value}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* 참고 안내 한 줄 */}
      <View style={s.notice}>
        <Ionicons name="information-circle-outline" size={14} color={colors.text.sub} />
        <Text style={s.noticeText}>{loan.notice}</Text>
      </View>
    </Screen>
  );
}

const s = StyleSheet.create({
  stateText: { ...typography.body, color: colors.text.sub, textAlign: 'center' },
  footer: { gap: spacing.sm },

  intro: { gap: spacing.md },
  headingGroup: { gap: spacing.xs },
  name: { ...typography.h2, color: colors.text.strong },
  summary: { ...typography.body, color: colors.text.sub },

  section: { gap: spacing.md, paddingTop: spacing.sm },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: spacing.md },
  titles: { flexShrink: 1, gap: 2 },
  sectionTitle: { ...typography.h3, color: colors.text.strong },
  sectionSub: { ...typography.caption, color: colors.text.sub },

  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    ...shadow.card,
  },

  conditionCard: { padding: spacing.xl, gap: spacing.lg },
  condition: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },
  conditionTexts: { flex: 1, gap: 2 },
  conditionTitle: { ...typography.title, color: colors.text.strong },
  conditionDesc: { ...typography.caption, color: colors.text.sub },

  termsCard: { paddingHorizontal: spacing.xl, paddingVertical: spacing.xs },
  termRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
  },
  termDivider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
  termLabel: { ...typography.body, color: colors.text.sub },
  termValue: { ...typography.body, fontFamily: fonts.bold, color: colors.text.strong, flexShrink: 1, textAlign: 'right' },

  notice: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.xs },
  noticeText: { ...typography.caption, color: colors.text.sub, flex: 1 },
});
