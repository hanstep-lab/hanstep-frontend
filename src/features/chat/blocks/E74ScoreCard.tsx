// E74_SCORE_CARD (calculate_e74_score). "모의 사전진단"으로만 보여 준다.
// - 판정은 서버 status 를 문구로 옮길 뿐, 앱에서 total·required 를 비교하지 않는다 (실서버: 235점 ≥ 200점인데 INELIGIBLE)
// - ruleStatus(DRAFT·APPROVED)·ruleVersion 은 화면에 쓰지 않는다
import { useTranslation } from 'react-i18next';
import { View, Text, StyleSheet } from 'react-native';
import Button from '../../../components/Button';
import Tag from '../../../components/Tag';
import { colors, typography, spacing, radius, fonts } from '../../../constants/theme';
import type { ChatAction } from '../../../api/mock/chat';
import type { ChatE74ScoreBlock } from '../../../types/api';
import { e74StatusText } from './labels';

type Props = {
  block: ChatE74ScoreBlock;
  onAction: (action: ChatAction) => void;
};

export default function E74ScoreCard({ block, onAction }: Props) {
  const { t } = useTranslation();
  const statusText = e74StatusText(block.status); // 모르는 status 면 null → 판정 줄 숨김
  // 증빙 시 점수는 서버 potentialTotal 이 지금 점수와 다를 때만 (비자 탭 "증빙 시 285점"과 같은 표현)
  const showPotential = block.potentialTotal !== block.total;

  return (
    <View style={s.wrap}>
      <View style={s.card}>
        <View style={s.head}>
          <Text style={s.title}>{t('cards.e74.title')}</Text>
          {block.isScenario && <Tag label={t('cards.e74.scenario')} />}
        </View>

        <View style={s.scoreRow}>
          <Text style={s.score}>{t('cards.e74.score', { n: block.total })}</Text>
          <Text style={s.sub}>{t('cards.e74.required', { n: block.required })}</Text>
        </View>
        {showPotential && <Text style={s.sub}>{t('cards.e74.potential', { n: block.potentialTotal })}</Text>}
        {statusText && (
          <View style={s.statusBox}>
            <Text style={s.statusText}>{statusText}</Text>
          </View>
        )}
        <Text style={s.note}>{t('cards.e74.note')}</Text>
      </View>
      {/* 모양은 송금 카드의 [송금하기](RemittanceConfirmCard)와 같다 */}
      <Button title={t('cards.e74.visaTab')} showArrow onPress={() => onAction('visa_tab')} />
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { gap: spacing.sm, marginTop: spacing.sm },
  card: { backgroundColor: colors.surface, borderRadius: radius.xl, padding: spacing.lg, gap: spacing.sm },
  head: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  title: { ...typography.body, fontFamily: fonts.bold, color: colors.text.strong, flexShrink: 1 },
  scoreRow: { flexDirection: 'row', alignItems: 'baseline', gap: spacing.sm },
  score: { ...typography.h2, color: colors.primary, flexShrink: 0 },
  sub: { ...typography.badge, color: colors.text.sub, flexShrink: 1 },
  statusBox: {
    alignSelf: 'flex-start',
    backgroundColor: colors.background,
    borderRadius: radius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  statusText: { ...typography.caption, fontFamily: fonts.bold, color: colors.text.strong },
  note: { ...typography.badge, color: colors.text.sub },
});
