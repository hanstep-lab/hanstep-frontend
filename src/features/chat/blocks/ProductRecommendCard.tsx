// PRODUCT_RECOMMEND_CARD (recommend_savings_products, 프롬프트 v4.5부터). 화면 기준: Figma 833:9(성공)·833:214(기권).
// 계약: hanstep-AI specs/chat/product_recommend_card_v1.md. 상품 필드는 PRD-02(GET /finance/products/recommend)와 같다.
// - 색·여백·모서리·글꼴은 환율 카드(FxSummaryCard)와 같은 값을 쓴다
// - 숫자(금리·금액·개월)는 받은 값을 표시만 한다. null 인 값은 그 줄만 숨긴다
// - 상품마다 기간·금리·금액 줄(#60). 문구 규칙은 productLines.ts
// - 카드 글자는 사용자 언어로: ko → 한국어, 그 밖(en·vi·zh) → 영어 (language prop, productLines.ts cardLanguage)
// - Figma 와 다른 점: 조건 칩·'추천 기준 자세히 보기'·기권 카드의 다시 찾기 버튼·연관 질문 칩은 넣지 않음(판정 근거·동작이 없음)
import { useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Button from '../../../components/Button';
import Tag from '../../../components/Tag';
import { colors, typography, spacing, radius, fonts } from '../../../constants/theme';
import type { ChatAction } from '../../../api/mock/chat';
import type { ChatProductRecommendBlock, ProductKind, ProductRecommendItem } from '../../../types/api';
import { productAbstainText, productExcludedText } from './labels';
import { productAmountLine, productRateLine, productTermLine, type CardLanguage } from './productLines';

type Props = {
  block: ChatProductRecommendBlock;
  userName?: string | null; // users/me shortName. 없으면 이름 없이 '맞춤 적금'
  language?: CardLanguage; // 카드 글자 언어. 기본 한국어
  onAction: (action: ChatAction) => void;
};

const VISIBLE_COUNT = 3; // 처음에 보여 주는 상품 수. 나머지는 '더 보기'

type CardText = {
  // 상품 종류 이름: 태그(kind), 헤더(header), 기권 제목(abstain). 섞이거나 없으면 mixed
  kind: Record<ProductKind, string>;
  header: Record<ProductKind | 'mixed', string>;
  abstain: Record<ProductKind | 'mixed', string>;
  title: (word: string, name: string | null) => string;
  source: string;
  footnote: string;
  stayFits: string;
  abstainTitle: (word: string) => string;
  excludedTitle: string;
  count: (n: number) => string;
  more: (n: number) => string;
  less: string;
  button: string;
};

const TEXT: Record<CardLanguage, CardText> = {
  ko: {
    kind: { SAVINGS: '적금', DEPOSIT: '예금' },
    header: { SAVINGS: '적금', DEPOSIT: '예금', mixed: '상품' },
    abstain: { SAVINGS: '적금', DEPOSIT: '예금', mixed: '상품' },
    title: (word, name) => (name ? `${name} 님 맞춤 ${word}` : `맞춤 ${word}`),
    source: '상품설명서 기준',
    footnote: '상품설명서 기준 · 모의 추천, 가입 승인 아님',
    stayFits: '체류 만료 전에 끝나요',
    abstainTitle: (word) => `지금 조건에 맞는 ${word}이 없어요`,
    excludedTitle: '제외된 상품',
    count: (n) => `${n}개`,
    more: (n) => `더 보기 (${n}개)`,
    less: '접기',
    button: '금융상품 추천 화면에서 보기',
  },
  en: {
    kind: { SAVINGS: 'Savings', DEPOSIT: 'Deposit' },
    header: { SAVINGS: 'savings', DEPOSIT: 'deposits', mixed: 'products' },
    abstain: { SAVINGS: 'savings products', DEPOSIT: 'deposit products', mixed: 'products' },
    title: (word, name) => (name ? `Recommended ${word} for ${name}` : `Recommended ${word}`),
    source: 'Based on product descriptions',
    footnote: 'Based on product descriptions · Mock recommendation, not an approval',
    stayFits: 'Ends before your stay expires',
    abstainTitle: (word) => `No ${word} fit your conditions right now`,
    excludedTitle: 'Excluded products',
    count: (n) => `${n}`,
    more: (n) => `Show more (${n})`,
    less: 'Show less',
    button: 'Open product recommendations',
  },
};

// 헤더·기권 문구의 상품 종류: 모두 적금이면 적금, 모두 예금이면 예금, 섞이거나 없으면 mixed
function kindKey(products: ProductRecommendItem[]): ProductKind | 'mixed' {
  const kinds = new Set(products.map((p) => p.kind));
  return kinds.size === 1 ? [...kinds][0] : 'mixed';
}

function ProductRow({ p, rank, lang }: { p: ProductRecommendItem; rank: number; lang: CardLanguage }) {
  const t = TEXT[lang];
  const kind = t.kind[p.kind] ?? null;
  const term = productTermLine(p.termMonths, lang);
  const rate = productRateLine(p.baseRate, p.maxRate, lang);
  const amount = productAmountLine(p.kind, p.monthlyAmountKrw, p.depositAmountKrw, lang);
  const stayFits = p.stayFits === true;

  return (
    <View style={s.item}>
      {/* 1줄: 순위 · 상품명+종류 */}
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
      </View>
      {/* 기간 · 금리 · 금액. 순위 배지 폭만큼 들여쓰고, null 인 줄은 숨김 */}
      {term || rate || amount ? (
        <View style={[s.lines, s.indent]}>
          {term ? <Text style={s.line}>{term}</Text> : null}
          {rate ? <Text style={s.rateLine}>{rate}</Text> : null}
          {amount ? <Text style={s.line}>{amount}</Text> : null}
        </View>
      ) : null}
      {/* 체류 만료 전 만기 */}
      {stayFits ? (
        <View style={[s.checkRow, s.indent]}>
          <Ionicons name="checkmark" size={14} color={colors.primary} />
          <Text style={s.checkText}>{t.stayFits}</Text>
        </View>
      ) : null}
    </View>
  );
}

export default function ProductRecommendCard({ block, userName, language = 'ko', onAction }: Props) {
  const [expanded, setExpanded] = useState(false);
  const t = TEXT[language];
  const products = block.products ?? [];
  const kinds = kindKey(products);
  const title = t.title(t.header[kinds], userName ?? null);
  const shown = expanded ? products : products.slice(0, VISIBLE_COUNT);
  const hiddenCount = products.length - VISIBLE_COUNT;

  // 기권: 이유 문장 + 이유별 제외 상품 수 (모르는 코드·0개는 숨김)
  const abstain = products.length === 0;
  const reasonText = abstain ? productAbstainText(block.abstainReason, language) : null;
  const excluded = (block.excludedSummary ?? [])
    .map((e) => ({ label: productExcludedText(e.reason, language), count: e.count }))
    .filter((e): e is { label: string; count: number } => !!e.label && e.count > 0);

  return (
    <View style={s.wrap}>
      <View style={s.card}>
        <View style={s.header}>
          <View style={s.titleRow}>
            <View style={s.dot} />
            <Text style={s.title}>{title}</Text>
          </View>
          <Text style={s.headerMeta}>{t.source}</Text>
        </View>

        {abstain ? (
          <>
            <View style={s.abstainBox}>
              <Ionicons name="alert-circle-outline" size={32} color={colors.primary} />
              <Text style={s.abstainTitle}>{t.abstainTitle(t.abstain[kinds])}</Text>
              {reasonText ? <Text style={s.abstainText}>{reasonText}</Text> : null}
            </View>
            {excluded.length > 0 ? (
              <View style={s.excluded}>
                <Text style={s.excludedTitle}>{t.excludedTitle}</Text>
                {excluded.map((e) => (
                  <View key={e.label} style={s.excludedRow}>
                    <Text style={[s.excludedLabel, s.flex]}>{e.label}</Text>
                    <Text style={s.excludedCount}>{t.count(e.count)}</Text>
                  </View>
                ))}
              </View>
            ) : null}
          </>
        ) : (
          <View style={s.items}>
            {shown.map((p, i) => (
              <ProductRow key={p.productId} p={p} rank={i + 1} lang={language} />
            ))}
            {hiddenCount > 0 ? (
              <Pressable style={s.moreBtn} onPress={() => setExpanded((v) => !v)} hitSlop={8}>
                <Text style={s.moreText}>{expanded ? t.less : t.more(hiddenCount)}</Text>
                <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={14} color={colors.primary} />
              </Pressable>
            ) : null}
          </View>
        )}

        <View style={s.divider} />
        <Text style={s.footnote}>{t.footnote}</Text>
      </View>

      <Button title={t.button} onPress={() => onAction('products')} />
    </View>
  );
}

// 환율 카드(FxSummaryCard)와 같은 값: card·header·dot·title·headerMeta·item·footnote
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
  indent: { paddingLeft: 24 + spacing.md }, // 순위 배지(24) + 간격
  lines: { gap: spacing.xs },
  line: { ...typography.caption, color: colors.text.strong },
  rateLine: { ...typography.caption, fontFamily: fonts.bold, color: colors.primary },
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
