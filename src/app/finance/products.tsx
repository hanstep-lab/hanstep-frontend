// FP-001 금융상품 추천 (예금·적금). Figma 정리안 560:9 기준.
// 데이터는 src/api/products.ts 에서만 받고, 여유자금·남은 체류·금리·한도는 서버(Mock) 값을 그대로 보여준다.
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
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
  const { t } = useTranslation();
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
        { key: 'spare', title: t('products.spareTitle'), sub: t('products.spareSub'), value: data.spareText },
        { key: 'stay', title: t('products.stayTitle'), sub: t('products.staySub'), value: data.stayText },
      ].filter((c) => c.value)
    : [];
  const name = data?.shortName ?? null;

  // CR-001 대안신용 화면이 생기면 /credit 으로 연결
  const goCredit = () => router.push('/credit' as Href);

  return (
    <Screen title={t('products.title')}>
      <View style={s.titleBlock}>
        <View style={s.badge}>
          <Text style={s.badgeText}>{t('products.title')}</Text>
        </View>
        <Text style={s.title}>
          {name ? t('products.headingNamed', { name }) : t('products.heading')}
        </Text>
        {data && !data.abstainText && (
          <Text style={s.sub}>
            {name
              ? t('products.subNamed', { name, n: data.products.length })
              : t('products.sub', { n: data.products.length })}
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
                <Text style={s.sectionTitle}>
                  {name ? t('products.criteriaTitleNamed', { name }) : t('products.criteriaTitle')}
                </Text>
                <Text style={s.sub}>{t('products.criteriaBasis')}</Text>
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
                  <Text style={s.sectionTitle}>{t('products.listTitle', { n: data.products.length })}</Text>
                  <Text style={s.label}>{t('products.listNote')}</Text>
                </View>
                <View style={s.productList}>
                  {data.products.map((p) => (
                    <ProductCard key={p.key} product={p} />
                  ))}
                </View>
              </>
            )}
            <Text style={s.label}>{t('products.rateNote')}</Text>
            {data.visaNote && <Text style={s.label}>{t('products.visaNote')}</Text>}
          </View>

          {/* 대출 안내 */}
          <View style={[s.card, s.loanCard]}>
            <Text style={s.loanTitle}>{t('products.loanTitle')}</Text>
            <Pressable style={s.infoRow} onPress={goCredit} accessibilityRole="button">
              <View style={s.flex}>
                <Text style={s.rowTitle}>{t('products.loanRow')}</Text>
                <Text style={s.label}>{t('products.loanRowSub')}</Text>
              </View>
              <Text style={s.rowValue}>{t('products.go')}</Text>
            </Pressable>
          </View>

          <View style={s.actions}>
            {/* 기존 챗봇으로 돌아간다 (push 로 새로 열면 대화·세션이 처음부터 시작됨) */}
            <Button title={t('products.ask')} onPress={() => router.dismissTo('/(tabs)/chat' as Href)} />
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
  label: { ...typography.badge, color: colors.text.sub, flexShrink: 1 },
  sub: { ...typography.body, color: colors.text.sub },
  sectionTitle: { ...typography.h3, color: colors.text.strong, flexShrink: 1 },

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
  rowValue: { ...typography.body, fontFamily: fonts.bold, color: colors.primary, flexShrink: 0 },

  section: { gap: spacing.lg },
  productList: { gap: spacing.md },
  productCard: { padding: 14, gap: 6 },
  grayPill: {
    backgroundColor: colors.background,
    borderRadius: radius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    flexShrink: 1,
  },
  rateBlock: { alignItems: 'flex-end', flexShrink: 0 },
  rate: { ...typography.body, fontFamily: fonts.bold, color: colors.primary },
  productName: { ...typography.title, color: colors.text.strong },
  noteHighlight: { color: colors.primary },

  loanCard: { padding: spacing.xl, gap: 10 },
  loanTitle: { ...typography.title, color: colors.text.strong },

  actions: { gap: 10, paddingTop: spacing.xs, alignItems: 'stretch' },
});
