// AI 답변 아래 카드들 (CHT-04 chat.done.blocks). 한 메시지에 여러 장이 올 수 있어 받은 순서대로 모두 그린다.
// 앱이 모르는 카드는 개발 빌드(__DEV__)에서만 "Unsupported card: {type}" 회색 칸으로 보여 주고, 운영 빌드에서는 그리지 않는다.
import { View, Text, StyleSheet } from 'react-native';
import { colors, radius, spacing, typography } from '../../../constants/theme';
import type { ChatAction } from '../../../api/mock/chat';
import type { ChatCardBlock } from '../../../api/chat';
import RemittanceConfirmCard from './RemittanceConfirmCard';
import FxSummaryCard from './FxSummaryCard';
import E74ScoreCard from './E74ScoreCard';
import MissingInputsCard from './MissingInputsCard';
import ProductRecommendCard from './ProductRecommendCard';

type Props = {
  blocks: ChatCardBlock[];
  userName?: string | null; // 상품 추천 카드 헤더 이름 (users/me shortName)
  onAction: (action: ChatAction) => void;
  onOpenTransferPath: (path: string) => void;
};

export default function ChatBlocks({ blocks, userName, onAction, onOpenTransferPath }: Props) {
  if (blocks.length === 0) return null;
  return (
    <View style={s.wrap}>
      {blocks.map((b, i) => {
        const key = `${b.type}-${i}`;
        switch (b.type) {
          case 'REMITTANCE_CONFIRM':
            return <RemittanceConfirmCard key={key} block={b} onOpenTransferPath={onOpenTransferPath} />;
          case 'FX_SUMMARY_CARD':
            return <FxSummaryCard key={key} block={b} onAction={onAction} />;
          case 'E74_SCORE_CARD':
            return <E74ScoreCard key={key} block={b} onAction={onAction} />;
          case 'MISSING_INPUTS':
            return <MissingInputsCard key={key} block={b} />;
          case 'PRODUCT_RECOMMEND_CARD':
            return <ProductRecommendCard key={key} block={b} userName={userName} onAction={onAction} />;
          case 'UNSUPPORTED':
            return __DEV__ ? (
              <View key={key} style={s.unsupported}>
                <Text style={s.unsupportedText}>{`Unsupported card: ${b.originalType}`}</Text>
              </View>
            ) : null;
          default:
            return null;
        }
      })}
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { gap: spacing.xs },
  unsupported: { backgroundColor: colors.tagBg, borderRadius: radius.lg, padding: spacing.md },
  unsupportedText: { ...typography.caption, color: colors.text.sub },
});
