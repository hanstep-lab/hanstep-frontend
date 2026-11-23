// VISA_ROADMAP_LINK (get_visa_roadmap, 프롬프트 v4.7부터). 계약: hanstep-AI specs/chat/chat_blocks_v1.md 3.4절
// - 챗봇이 만든 로드맵은 그 사용자의 최신 로드맵이라, 버튼은 비자 탭(GET /visa/roadmaps/latest)으로 보낸다
// - 단계 내용은 카드에 없다. 단계 수·신청 가능일만 서버 값 그대로 보여 준다
// - ruleStatus(DRAFT·APPROVED)는 E-7-4 카드처럼 화면에 쓰지 않는다
import { useTranslation } from 'react-i18next';
import { View, Text, StyleSheet } from 'react-native';
import Button from '../../../components/Button';
import { colors, typography, spacing, radius, fonts } from '../../../constants/theme';
import type { ChatAction } from '../../../api/mock/chat';
import type { ChatVisaRoadmapLinkBlock } from '../../../types/api';
import { fmtDate } from '../../../utils/format';

type Props = {
  block: ChatVisaRoadmapLinkBlock;
  onAction: (action: ChatAction) => void;
};

export default function VisaRoadmapLinkCard({ block, onAction }: Props) {
  const { t } = useTranslation();
  const applicable = block.applicableFrom
    ? t('cards.roadmap.applicableFrom', { date: fmtDate(block.applicableFrom) })
    : t('cards.roadmap.applicableUnknown');

  return (
    <View style={s.wrap}>
      <View style={s.card}>
        <Text style={s.title}>{t('cards.roadmap.title')}</Text>
        <Text style={s.applicable}>{applicable}</Text>
        <Text style={s.sub}>{t('cards.roadmap.steps', { n: block.stepCount })}</Text>
        <Text style={s.note}>{t('cards.roadmap.note')}</Text>
      </View>
      <Button title={t('cards.roadmap.visaTab')} variant="secondary" onPress={() => onAction('visa_tab')} />
    </View>
  );
}

// E-7-4 카드(E74ScoreCard)와 같은 값: wrap·card·title·sub·note
const s = StyleSheet.create({
  wrap: { gap: spacing.sm, marginTop: spacing.sm },
  card: { backgroundColor: colors.surface, borderRadius: radius.xl, padding: spacing.lg, gap: spacing.sm },
  title: { ...typography.body, fontFamily: fonts.bold, color: colors.text.strong, flexShrink: 1 },
  applicable: { ...typography.title, color: colors.primary, flexShrink: 1 },
  sub: { ...typography.badge, color: colors.text.sub, flexShrink: 1 },
  note: { ...typography.badge, color: colors.text.sub },
});
