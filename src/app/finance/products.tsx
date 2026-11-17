// FP-001 금융상품 추천 (목돈 만들기 적금). Figma 정리안 560:9 기준.
// 데이터는 src/api/products.ts 에서만 받고, 여유자금·만기 비교 안내·금리는 서버(Mock) 값을 그대로 보여준다.
import { useEffect, useState } from 'react';
import { View, Text, Pressable, StyleSheet, Alert } from 'react-native';
import { router, type Href } from 'expo-router';
import Screen from '../../components/Screen';
import Button from '../../components/Button';
import { colors, typography, spacing, radius, fonts, shadow } from '../../constants/theme';
import { getProductRecommendation, type ProductRecommendation } from '../../api/products';
import type { ApiError } from '../../types/api';

type Product = ProductRecommendation['products'][number];

function ProductCard({ product }: { product: Product }) {
  return (
    <View style={[s.card, s.productCard]}>
      <View style={s.rowBetween}>
        <View style={s.grayPill}>
          <Text style={s.label}>{product.label}</Text>
        </View>
        <Text style={s.rate}>{product.rateText}</Text>
      </View>
      <Text style={s.productName}>{product.name}</Text>
      <Text style={s.sub}>{product.desc}</Text>
      <Text style={s.label}>{product.meta}</Text>
      <Text style={[s.label, product.noteHighlight && s.noteHighlight]}>{product.note}</Text>
    </View>
  );
}

export default function ProductsScreen() {
  const [data, setData] = useState<ProductRecommendation | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getProductRecommendation()
      .then(setData)
      .catch((e: ApiError) => setError(e.message));
  }, []);

  // CR-001 대안신용 화면이 생기면 /credit 으로 연결
  const goCredit = () => router.push('/credit' as Href);

  return (
    <Screen title="금융상품 추천">
      <View style={s.titleBlock}>
        <View style={s.badge}>
          <Text style={s.badgeText}>금융상품 추천</Text>
        </View>
        <Text style={s.title}>목돈 만들기 적금 추천</Text>
        {data && (
          <Text style={s.sub}>
            {data.userName}님의 여유자금과 체류 기간을 기준으로 신한은행 적금 {data.products.length}개를 골랐어요.
          </Text>
        )}
      </View>

      {!data ? (
        <Text style={s.stateText}>{error ?? '추천 상품을 불러오는 중이에요.'}</Text>
      ) : (
        <>
          {/* 추천 기준 */}
          <View style={[s.card, s.criteriaCard]}>
            <View>
              <Text style={s.sectionTitle}>{data.userName}님 추천 기준</Text>
              <Text style={s.sub}>{data.criteriaBasis}</Text>
            </View>
            <View style={s.rowList}>
              {data.criteria.map((c) => (
                <View key={c.key} style={s.infoRow}>
                  <View style={s.flex}>
                    <Text style={s.rowTitle}>{c.title}</Text>
                    <Text style={s.label}>{c.sub}</Text>
                  </View>
                  <Text style={s.rowValue}>{c.value}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* 추천 적금 */}
          <View style={s.section}>
            <View style={s.rowBetween}>
              <Text style={s.sectionTitle}>추천 적금 {data.products.length}개</Text>
              <Text style={s.label}>{data.rateBasis}</Text>
            </View>
            <View style={s.productList}>
              {data.products.map((p) => (
                <ProductCard key={p.key} product={p} />
              ))}
            </View>
            <Text style={s.label}>{data.disclaimer}</Text>
          </View>

          {/* 대출 안내 */}
          <View style={[s.card, s.loanCard]}>
            <Text style={s.loanTitle}>대출 상품을 찾고 있나요?</Text>
            <Pressable style={s.infoRow} onPress={goCredit} accessibilityRole="button">
              <View style={s.flex}>
                <Text style={s.rowTitle}>대안신용 사전진단 보기</Text>
                <Text style={s.label}>대출은 참고 한도와 함께 따로 보여 드려요</Text>
              </View>
              <Text style={s.rowValue}>바로가기</Text>
            </Pressable>
          </View>

          <View style={s.actions}>
            <Button title="신한걸음에 물어보기" onPress={() => router.push('/(tabs)/chat' as Href)} />
          </View>
        </>
      )}
    </Screen>
  );
}

const s = StyleSheet.create({
  flex: { flex: 1 },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
  stateText: { ...typography.body, color: colors.text.sub, textAlign: 'center', paddingVertical: spacing.xl },
  label: { ...typography.badge, color: colors.text.sub },
  sub: { ...typography.body, color: colors.text.sub },
  sectionTitle: { ...typography.h3, color: colors.text.strong },

  titleBlock: { gap: 3 },
  badge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: spacing.xs,
    borderRadius: radius.full,
    backgroundColor: colors.primarySoft,
  },
  badgeText: { ...typography.badge, fontFamily: fonts.bold, color: colors.primary },
  title: { ...typography.h2, color: colors.text.strong },

  card: { backgroundColor: colors.surface, borderRadius: radius.lg, ...shadow.card },

  criteriaCard: { padding: spacing.xl, gap: 14 },
  rowList: { gap: spacing.sm },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: 10,
    borderRadius: radius.md,
    backgroundColor: colors.background,
  },
  rowTitle: { ...typography.body, color: colors.text.strong },
  rowValue: { ...typography.body, fontFamily: fonts.bold, color: colors.primary },

  section: { gap: spacing.lg },
  productList: { gap: spacing.md },
  productCard: { padding: 14, gap: 6 },
  grayPill: {
    backgroundColor: colors.background,
    borderRadius: radius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  rate: { ...typography.body, fontFamily: fonts.bold, color: colors.primary },
  productName: { ...typography.title, color: colors.text.strong },
  noteHighlight: { color: colors.primary },

  loanCard: { padding: spacing.xl, gap: 10 },
  loanTitle: { ...typography.title, color: colors.text.strong },

  actions: { gap: 10, paddingTop: spacing.xs, alignItems: 'stretch' },
});
