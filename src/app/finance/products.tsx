// FP-001 금융상품 추천 (예금·적금). Figma 정리안 560:9 기준.
// 데이터는 src/api/products.ts 에서만 받고, 여유자금·남은 체류·금리·한도는 서버(Mock) 값을 그대로 보여준다.
import { useEffect, useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { router, type Href } from 'expo-router';
import Screen from '../../components/Screen';
import Button from '../../components/Button';
import { colors, typography, spacing, radius, fonts, shadow } from '../../constants/theme';
import { FadeIn, SkeletonCard, SkeletonGroup } from '../../components/Skeleton';
import { getProductsScreen, type ProductsScreenData, type ProductView } from '../../api/products';
import type { ApiError } from '../../types/api';

function ProductCard({ product }: { product: ProductView }) {
  return (
    <View style={[s.card, s.productCard]}>
      <View style={s.rowBetween}>
        <View style={s.grayPill}>
          <Text style={s.label}>{product.label}</Text>
        </View>
        {product.rateText && (
          <View style={s.rateBlock}>
            <Text style={s.rate}>{product.rateText}</Text>
            <Text style={s.label}>{product.rateAsOf}</Text>
          </View>
        )}
      </View>
      <Text style={s.productName}>{product.name}</Text>
      {product.desc && <Text style={s.sub}>{product.desc}</Text>}
      {product.meta && <Text style={s.label}>{product.meta}</Text>}
      <Text style={[s.label, product.noteHighlight && s.noteHighlight]}>{product.note}</Text>
    </View>
  );
}

export default function ProductsScreen() {
  const [data, setData] = useState<ProductsScreenData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getProductsScreen()
      .then(setData)
      .catch((e: ApiError) => setError(e.message));
  }, []);

  // 추천 기준 줄: 값이 없는 줄은 숨김 (둘 다 없으면 카드째 숨김)
  const criteria = data
    ? [
        { key: 'spare', title: '월 여유자금', sub: '소득 − 고정지출 − 송금 − 변동지출 평균', value: data.spareText },
        { key: 'stay', title: '체류 만료까지', sub: '남은 체류 기간', value: data.stayText },
      ].filter((c) => c.value)
    : [];
  const namePrefix = data?.shortName ? `${data.shortName}님` : null;

  // CR-001 대안신용 화면이 생기면 /credit 으로 연결
  const goCredit = () => router.push('/credit' as Href);

  return (
    <Screen title="금융상품 추천">
      <View style={s.titleBlock}>
        <View style={s.badge}>
          <Text style={s.badgeText}>금융상품 추천</Text>
        </View>
        <Text style={s.title}>
          {namePrefix ? `${namePrefix}께 딱 맞는\nSOLSOL한 금융상품` : '딱 맞는\nSOLSOL한 금융상품'}
        </Text>
        {data && !data.abstainText && (
          <Text style={s.sub}>
            {namePrefix ? `${namePrefix}의 ` : ''}여유자금과 체류 기간을 기준으로 신한은행 예금·적금{' '}
            {data.products.length}개를 골랐어요.
          </Text>
        )}
      </View>

      {!data ? (
        error ? (
          <Text style={s.stateText}>{error}</Text>
        ) : (
          <SkeletonGroup>
            <SkeletonCard lines={3} />
            <SkeletonCard lines={2} />
            <SkeletonCard lines={2} />
            <SkeletonCard lines={2} />
          </SkeletonGroup>
        )
      ) : (
        <FadeIn style={{ gap: spacing.lg }}>
          {/* 추천 기준 */}
          {criteria.length > 0 && (
            <View style={[s.card, s.criteriaCard]}>
              <View>
                <Text style={s.sectionTitle}>{namePrefix ? `${namePrefix} 추천 기준` : '추천 기준'}</Text>
                <Text style={s.sub}>마이데이터 분석 기준</Text>
              </View>
              <View style={s.rowList}>
                {criteria.map((c) => (
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
          )}

          {/* 추천 상품 */}
          <View style={s.section}>
            {data.abstainText ? (
              <View style={[s.card, s.productCard]}>
                <Text style={s.rowTitle}>{data.abstainText}</Text>
              </View>
            ) : (
              <>
                <View style={s.rowBetween}>
                  <Text style={s.sectionTitle}>추천 상품 {data.products.length}개</Text>
                  <Text style={s.label}>세전 · 상품설명서 기준</Text>
                </View>
                <View style={s.productList}>
                  {data.products.map((p) => (
                    <ProductCard key={p.key} product={p} />
                  ))}
                </View>
              </>
            )}
            <Text style={s.label}>
              금리는 각 상품설명서의 세전 금리예요. 실제 금리와 가입 조건은 가입할 때 신한 SOL에서 확인해 주세요.
            </Text>
            {data.visaNote && <Text style={s.label}>비자 조건은 가입할 때 확인해 주세요</Text>}
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
        </FadeIn>
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
  rateBlock: { alignItems: 'flex-end' },
  rate: { ...typography.body, fontFamily: fonts.bold, color: colors.primary },
  productName: { ...typography.title, color: colors.text.strong },
  noteHighlight: { color: colors.primary },

  loanCard: { padding: spacing.xl, gap: 10 },
  loanTitle: { ...typography.title, color: colors.text.strong },

  actions: { gap: 10, paddingTop: spacing.xs, alignItems: 'stretch' },
});
