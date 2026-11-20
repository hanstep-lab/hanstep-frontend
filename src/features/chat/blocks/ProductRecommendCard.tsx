// PRODUCT_RECOMMEND_CARD (recommend_savings_products, 프롬프트 v4.5부터). 화면 기준: Figma 833:9(성공)·833:214(기권).
// 계약: hanstep-AI specs/chat/product_recommend_card_v1.md. 상품 필드는 PRD-02(GET /finance/products/recommend)와 같다.
// - 색·여백·모서리·글꼴은 환율 카드(FxSummaryCard)와 같은 값을 쓴다
// - 숫자(금리·금액·개월)는 받은 값을 표시만 한다. null 인 값은 그 줄만 숨긴다
// - Figma 와 다른 점: 조건 칩·'추천 기준 자세히 보기'·기권 카드의 다시 찾기 버튼·연관 질문 칩은 넣지 않음(판정 근거·동작이 없음)
import { useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Button from '../../../components/Button';
import Tag from '../../../components/Tag';
import { colors, typography, spacing, radius, fonts } from '../../../constants/theme';
import { fmtDate, fmtWon } from '../../../utils/format';
import type { ChatAction } from '../../../api/mock/chat';
import type {
  ChatProductRecommendBlock,
  ProductAmountRange,
  ProductRecommendItem,
  ProductTermMonths,
} from '../../../types/api';
import { productAbstainText, productExcludedText } from './labels';

type Props = {
  block: ChatProductRecommendBlock;
  userName?: string | null; // users/me shortName. 없으면 이름 없이 '맞춤 적금'
  onAction: (action: ChatAction) => void;
};

const VISIBLE_COUNT = 3; // 처음에 보여 주는 상품 수. 나머지는 '더 보기'
const SOURCE_TEXT = '상품설명서 기준';
const FOOTNOTE = '상품설명서 기준 · 모의 추천, 가입 승인 아님';
const STAY_FITS_TEXT = '체류 만료 전에 끝나요';
const KIND_LABEL: Record<string, string> = { SAVINGS: '적금', DEPOSIT: '예금' };

// 헤더·기권 문구의 상품 종류: 모두 적금이면 '적금', 모두 예금이면 '예금', 섞이거나 없으면 '상품'
function kindWord(products: ProductRecommendItem[]): string {
  const kinds = new Set(products.map((p) => p.kind));
  if (kinds.size === 1) return KIND_LABEL[[...kinds][0]] ?? '상품';
  return '상품';
}

// [6, 12] → "6·12개월", {1, 60} → "1~60개월", {6, 6} → "6개월"
function termText(t: ProductTermMonths): string | null {
  if (!t) return null;
  if (Array.isArray(t)) return t.length ? `${t.join('·')}개월` : null;
  return t.min === t.max ? `${t.min}개월` : `${t.min}~${t.max}개월`;
}

// 적금: "월 1,000원~30만 원" / "월 1만 원부터"(max 제한없음) / "월 30만 원까지". 예금은 '월' 없이
function amountText(range: ProductAmountRange | null, monthly: boolean): string | null {
  if (!range) return null;
  const prefix = monthly ? '월 ' : '';
  const { min, max } = range;
  const maxNum = typeof max === 'number' ? max : null;
  if (min != null && maxNum != null) return `${prefix}${fmtWon(min)}~${fmtWon(maxNum)}`;
  if (min != null) return `${prefix}${fmtWon(min)}부터`; // max 가 "no limit" 이거나 null
  if (maxNum != null) return `${prefix}${fmtWon(maxNum)}까지`;
  return null;
}

const pct = (n: number) => `연 ${n.toFixed(2)}%`;

function ProductRow({ p, rank }: { p: ProductRecommendItem; rank: number }) {
  const kind = KIND_LABEL[p.kind] ?? null;
  const meta = [
    termText(p.termMonths),
    amountText(p.kind === 'DEPOSIT' ? p.depositAmountKrw : p.monthlyAmountKrw, p.kind !== 'DEPOSIT'),
  ]
    .filter(Boolean)
    .join(' · ');
  const baseAsOf = p.baseRate?.asOf ? `${fmtDate(p.baseRate.asOf, { short: true })} 기준` : null;

  // 최고금리가 있으면 크게 '최고', 아래에 '우대 조건 충족 시'와 기본금리. 없으면 기본금리를 크게
  let bigRate: string | null = null;
  let rateSub: string | null = null;
  let baseLine: string | null = null;
  if (p.maxRate) {
    bigRate = `최고 ${pct(p.maxRate.ratePct)}`;
    rateSub = '우대 조건 충족 시';
    baseLine = p.baseRate ? [`기본 ${pct(p.baseRate.ratePct)}`, baseAsOf].filter(Boolean).join(' · ') : null;
  } else if (p.baseRate) {
    bigRate = `기본 ${pct(p.baseRate.ratePct)}`;
    rateSub = baseAsOf;
  }
  const stayFits = p.stayFits === true;

  return (
    <View style={s.item}>
      {/* 1줄: 순위 · 상품명+종류 · 큰 금리 */}
      <View style={s.itemTop}>
        <View style={[s.rank, rank === 1 && s.rankFirst]}>
          <Text style={[s.rankText, rank === 1 && s.rankTextFirst]}>{rank}</Text>
        </View>
        <View style={[s.flex, s.nameRow]}>
          <Text style={s.name} numberOfLines={2}>
            {p.nameKo}
          </Text>
          {kind ? <Tag label={kind} /> : null}
        </View>
        {bigRate ? <Text style={s.rate}>{bigRate}</Text> : null}
      </View>
      {/* 2줄: 기간·납입 범위 · 금리 설명 (순위 배지 폭만큼 들여씀) */}
      {meta || rateSub ? (
        <View style={[s.itemRow, s.indent]}>
          <Text style={[s.itemSub, s.flex]}>{meta}</Text>
          {rateSub ? <Text style={s.itemSub}>{rateSub}</Text> : null}
        </View>
      ) : null}
      {/* 3줄: 체류 만료 전 만기 · 기본금리 (글자가 길어 들여쓰지 않고 카드 폭을 다 쓴다) */}
      {stayFits || baseLine ? (
        <View style={s.itemRow}>
          {stayFits ? (
            <View style={s.checkRow}>
              <Ionicons name="checkmark" size={14} color={colors.primary} />
              <Text style={s.checkText}>{STAY_FITS_TEXT}</Text>
            </View>
          ) : (
            <View />
          )}
          {baseLine ? <Text style={s.itemSub}>{baseLine}</Text> : null}
        </View>
      ) : null}
    </View>
  );
}

export default function ProductRecommendCard({ block, userName, onAction }: Props) {
  const [expanded, setExpanded] = useState(false);
  const products = block.products ?? [];
  const word = kindWord(products);
  const title = userName ? `${userName} 님 맞춤 ${word}` : `맞춤 ${word}`;
  const shown = expanded ? products : products.slice(0, VISIBLE_COUNT);
  const hiddenCount = products.length - VISIBLE_COUNT;

  // 기권: 이유 문장 + 이유별 제외 상품 수 (모르는 코드·0개는 숨김)
  const abstain = products.length === 0;
  const reasonText = abstain ? productAbstainText(block.abstainReason) : null;
  const excluded = (block.excludedSummary ?? [])
    .map((e) => ({ label: productExcludedText(e.reason), count: e.count }))
    .filter((e): e is { label: string; count: number } => !!e.label && e.count > 0);

  return (
    <View style={s.wrap}>
      <View style={s.card}>
        <View style={s.header}>
          <View style={s.titleRow}>
            <View style={s.dot} />
            <Text style={s.title}>{title}</Text>
          </View>
          <Text style={s.headerMeta}>{SOURCE_TEXT}</Text>
        </View>

        {abstain ? (
          <>
            <View style={s.abstainBox}>
              <Ionicons name="alert-circle-outline" size={32} color={colors.primary} />
              <Text style={s.abstainTitle}>{`지금 조건에 맞는 ${word}이 없어요`}</Text>
              {reasonText ? <Text style={s.abstainText}>{reasonText}</Text> : null}
            </View>
            {excluded.length > 0 ? (
              <View style={s.excluded}>
                <Text style={s.excludedTitle}>제외된 상품</Text>
                {excluded.map((e) => (
                  <View key={e.label} style={s.excludedRow}>
                    <Text style={[s.excludedLabel, s.flex]}>{e.label}</Text>
                    <Text style={s.excludedCount}>{`${e.count}개`}</Text>
                  </View>
                ))}
              </View>
            ) : null}
          </>
        ) : (
          <View style={s.items}>
            {shown.map((p, i) => (
              <ProductRow key={p.productId} p={p} rank={i + 1} />
            ))}
            {hiddenCount > 0 ? (
              <Pressable style={s.moreBtn} onPress={() => setExpanded((v) => !v)} hitSlop={8}>
                <Text style={s.moreText}>{expanded ? '접기' : `더 보기 (${hiddenCount}개)`}</Text>
                <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={14} color={colors.primary} />
              </Pressable>
            ) : null}
          </View>
        )}

        <View style={s.divider} />
        <Text style={s.footnote}>{FOOTNOTE}</Text>
      </View>

      <Button title="금융상품 추천 화면에서 보기" onPress={() => onAction('products')} />
    </View>
  );
}

// 환율 카드(FxSummaryCard)와 같은 값: card·header·dot·title·headerMeta·item·itemSub·footnote
const s = StyleSheet.create({
  wrap: { gap: spacing.sm, marginTop: spacing.sm },
  flex: { flex: 1 },
  card: { backgroundColor: colors.surface, borderRadius: radius.xl, padding: spacing.xl },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    paddingBottom: spacing.md,
  },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, flexShrink: 1 },
  dot: { width: spacing.sm, height: spacing.sm, borderRadius: radius.full, backgroundColor: colors.primary },
  title: { ...typography.body, fontFamily: fonts.bold, color: colors.text.strong, flexShrink: 1 },
  headerMeta: { ...typography.badge, color: colors.text.sub, textAlign: 'right' },

  items: { gap: spacing.md, paddingBottom: spacing.md },
  item: { gap: spacing.xs, padding: spacing.md, borderRadius: radius.lg, backgroundColor: colors.background },
  itemTop: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  itemRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
  indent: { paddingLeft: 24 + spacing.md }, // 순위 배지(24) + 간격
  rank: {
    width: 24,
    height: 24,
    borderRadius: radius.full,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rankFirst: { backgroundColor: colors.primary },
  rankText: { ...typography.badge, fontFamily: fonts.bold, color: colors.primary },
  rankTextFirst: { color: colors.text.inverse },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, flexWrap: 'wrap' },
  name: { ...typography.title, color: colors.text.strong, flexShrink: 1 },
  itemSub: { ...typography.badge, color: colors.text.sub },
  rate: { ...typography.h3, color: colors.primary },
  checkRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  checkText: { ...typography.badge, color: colors.text.strong },
  moreBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.xs },
  moreText: { ...typography.badge, fontFamily: fonts.bold, color: colors.primary },

  abstainBox: {
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.xl,
    borderRadius: radius.lg,
    backgroundColor: colors.background,
  },
  abstainTitle: { ...typography.title, color: colors.text.strong, textAlign: 'center' },
  abstainText: { ...typography.body, color: colors.text.sub, textAlign: 'center' },
  excluded: { gap: spacing.sm, paddingTop: spacing.md, paddingBottom: spacing.md },
  excludedTitle: { ...typography.badge, fontFamily: fonts.bold, color: colors.text.strong },
  excludedRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  excludedLabel: { ...typography.badge, color: colors.text.sub },
  excludedCount: { ...typography.badge, fontFamily: fonts.bold, color: colors.text.strong },

  divider: { height: 1, backgroundColor: colors.background },
  footnote: { ...typography.badge, color: colors.text.sub, paddingTop: spacing.sm },
});
