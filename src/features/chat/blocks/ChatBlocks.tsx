// AI 답변 아래 카드들 (CHT-04 chat.done.blocks). 한 메시지에 여러 장이 올 수 있어 받은 순서대로 모두 그린다.
// chat.ts 가 아는 type 만 남기지만, 여기서도 모르는 type 은 그리지 않는다.
import { View, StyleSheet } from 'react-native';
import { spacing } from '../../../constants/theme';
import type { ChatAction } from '../../../api/mock/chat';
import type { ChatBlock } from '../../../types/api';
import RemittanceConfirmCard from './RemittanceConfirmCard';
import FxSummaryCard from './FxSummaryCard';
import E74ScoreCard from './E74ScoreCard';
import MissingInputsCard from './MissingInputsCard';
import ProductRecommendCard from './ProductRecommendCard';

type Props = {
  blocks: ChatBlock[];
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
          default:
            return null;
        }
      })}
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { gap: spacing.xs },
});
