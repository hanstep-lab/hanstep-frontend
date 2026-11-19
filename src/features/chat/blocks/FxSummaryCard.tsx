// FX_SUMMARY_CARD (fx_rate_summary, 프롬프트 v4.4부터). 화면 기준: Figma 277:1852 (AI-004 안의 카드).
// - 통화 항목은 FX-001 GET /fx/rates 와 같은 필드. 기준환율·송금 환율은 환율 정보 화면과 같은 통화별 자릿수(fmtFxRateByCurrency)로 보여 준다
// - 날짜·출처 문구는 고정하지 않고 서버 asOf·source 로 만든다. 시각(fetchedAt)과 "실시간"은 쓰지 않는다
// - Figma 와 다른 점: 제목 "주요 통화 환율"(PHP 는 고시가 아님), 통화마다 출처·기준일이 달라 박스·각주에 나눠 적음,
//   "원"·화살표는 그림 대신 글자·Ionicons(기존 FX 화면과 같음), 하락 색은 theme colors.fall
// - periodAverages·unavailableCurrencies 는 지금 보여 주지 않는다
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Button from '../../../components/Button';
import Tag from '../../../components/Tag';
import { colors, typography, spacing, radius, fonts } from '../../../constants/theme';
import { fmtDate, fmtPercent, fmtRate } from '../../../utils/format';
import { changeTrend, fmtFxRateByCurrency, FX_STALE_TEXT, type FxTrend } from '../../../api/fx';
import type { ChatAction } from '../../../api/mock/chat';
import type { ChatFxSummaryBlock, ChatFxSummaryCurrency } from '../../../types/api';
import { currencySymbol, currencyWithName, fxSourceText } from './labels';

type Props = {
  block: ChatFxSummaryBlock;
  onAction: (action: ChatAction) => void;
};

const TITLE = '주요 통화 환율';
const SEND_RATE_FALLBACK = '시장 환율 참고값'; // sendRate·receiveRate 가 null 인 통화(PHP)

const trendColor = (t: FxTrend | null) =>
  t === 'UP' ? colors.rise : t === 'DOWN' ? colors.fall : colors.text.sub;

// "수출입은행 고시 · 11.06 기준". 모르는 출처면 날짜만
function sourceDateText(c: ChatFxSummaryCurrency): string {
  const src = fxSourceText(c.source);
  const date = `${fmtDate(c.asOf, { short: true })} 기준`;
  return src ? `${src} · ${date}` : date;
}

// 헤더 오른쪽: 카드에 나온 출처를 서버 순서대로 한 번씩. 기준일이 모두 같으면 날짜를 앞에 붙인다
function headerMetaText(currencies: ChatFxSummaryCurrency[]): string {
  const sources = [...new Set(currencies.map((c) => fxSourceText(c.source)).filter((t): t is string => !!t))];
  const dates = new Set(currencies.map((c) => c.asOf));
  const date = dates.size === 1 ? `${fmtDate(currencies[0].asOf)} ` : '';
  return `${date}${sources.join(' · ')}`.trim();
}

// 각주: "기준: USD 수출입은행 고시(11.06) · PHP 시장 환율 참고값(11.17)"
function footnoteText(currencies: ChatFxSummaryCurrency[]): string {
  const parts = currencies.map((c) => {
    const src = fxSourceText(c.source);
    const date = fmtDate(c.asOf, { short: true });
    return src ? `${c.currency} ${src}(${date})` : `${c.currency}(${date})`;
  });
  return `기준: ${parts.join(' · ')}`;
}

export default function FxSummaryCard({ block, onAction }: Props) {
  const { currencies } = block;
  if (currencies.length === 0) return null;
  const headerMeta = headerMetaText(currencies);

  return (
    <View style={s.wrap}>
      <View style={s.card}>
        {/* 헤더: 점 + 제목, 오른쪽에 서버 asOf·source 로 만든 기준 */}
        <View style={s.header}>
          <View style={s.titleRow}>
            <View style={s.dot} />
            <Text style={s.title}>{TITLE}</Text>
          </View>
          {headerMeta ? (
            <Text style={s.headerMeta} numberOfLines={2}>
              {headerMeta}
            </Text>
          ) : null}
        </View>

        {/* 통화 박스 */}
        <View style={s.items}>
          {currencies.map((c) => {
            const trend = changeTrend(c.change);
            return (
              <View key={c.currency} style={s.item}>
                <View style={s.itemLeft}>
                  <View style={s.symbolBox}>
                    <Text style={s.symbol}>{currencySymbol(c.currency)}</Text>
                  </View>
                  <View style={s.flex}>
                    <View style={s.nameRow}>
                      <Text style={s.name}>{currencyWithName(c.currency)}</Text>
                      {c.isMock && <Tag label="데모" />}
                    </View>
                    <Text style={s.itemSub}>
                      {c.unit} {c.currency} 매매기준율
                    </Text>
                    {/* stale 이면 기준일을 강조하고 안내를 붙인다 */}
                    <Text style={[s.itemSub, c.stale && s.staleText]}>{sourceDateText(c)}</Text>
                    {c.stale && <Text style={[s.itemSub, s.staleText]}>{FX_STALE_TEXT}</Text>}
                  </View>
                </View>
                <View style={s.itemRight}>
                  <View style={s.priceRow}>
                    <Text style={s.price}>{fmtFxRateByCurrency(c.rate, c.currency)}</Text>
                    <Text style={s.priceUnit}>원</Text>
                  </View>
                  {/* 전 영업일 값이 없으면(change null) 전일 대비 줄을 숨긴다 */}
                  {c.change !== null && (
                    <View style={s.changeRow}>
                      {(trend === 'UP' || trend === 'DOWN') && (
                        <Ionicons
                          name={trend === 'UP' ? 'caret-up' : 'caret-down'}
                          size={10}
                          color={trendColor(trend)}
                        />
                      )}
                      <Text style={[s.changeText, { color: trendColor(trend) }]}>
                        {fmtRate(c.change, { sign: true })}
                        {c.changeRate !== null ? ` (${fmtPercent(c.changeRate)})` : ''}
                      </Text>
                    </View>
                  )}
                </View>
              </View>
            );
          })}
        </View>

        {/* 표: 통화 / 매매기준율 / 송금 보낼 때 / 송금 받을 때 */}
        <View style={s.table}>
          <View style={s.tableRow}>
            <Text style={[s.th, s.cell]}>통화</Text>
            <Text style={[s.th, s.cell, s.right]}>매매기준율</Text>
            <Text style={[s.th, s.cell, s.right]}>송금 보낼 때</Text>
            <Text style={[s.th, s.cell, s.right]}>송금 받을 때</Text>
          </View>
          {currencies.map((c) => (
            <View key={c.currency}>
              <View style={s.tableDivider} />
              <View style={s.tableRow}>
                <Text style={[s.tdHead, s.cell]}>{c.currency}</Text>
                <Text style={[s.td, s.cell, s.right]}>{fmtFxRateByCurrency(c.rate, c.currency)}</Text>
                {c.sendRate === null || c.receiveRate === null ? (
                  // 송금 환율이 없는 통화는 두 칸을 합쳐 안내 (Figma PHP 행)
                  <Text style={[s.td, s.cellWide, s.right]}>{SEND_RATE_FALLBACK}</Text>
                ) : (
                  <>
                    <Text style={[s.td, s.cell, s.right]}>{fmtFxRateByCurrency(c.sendRate, c.currency)}</Text>
                    <Text style={[s.td, s.cell, s.right]}>{fmtFxRateByCurrency(c.receiveRate, c.currency)}</Text>
                  </>
                )}
              </View>
            </View>
          ))}
          <View style={s.tableDivider} />
          <Text style={s.footnote}>{footnoteText(currencies)}</Text>
        </View>
      </View>

      {/* 버튼은 앱 고정 3개 (Figma 의 다른 통화 보기 버튼은 넣지 않음) */}
      <View style={s.btnRow}>
        <View style={s.flex}>
          <Button title="환율 상세 보기" variant="secondary" onPress={() => onAction('fx')} />
        </View>
        <View style={s.flex}>
          <Button title="환율 알림 받기" variant="secondary" onPress={() => onAction('fx_alert')} />
        </View>
      </View>
      <Button title="이 환율로 바로 송금하기" onPress={() => onAction('transfer')} />
    </View>
  );
}

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
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  dot: { width: spacing.sm, height: spacing.sm, borderRadius: radius.full, backgroundColor: colors.primary },
  title: { ...typography.body, fontFamily: fonts.bold, color: colors.text.strong },
  headerMeta: { ...typography.badge, color: colors.text.sub, flexShrink: 1, textAlign: 'right' },

  items: { gap: spacing.md, paddingBottom: spacing.md },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: colors.background,
  },
  itemLeft: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  symbolBox: {
    width: 36,
    height: 36,
    borderRadius: radius.full,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  symbol: { ...typography.title, color: colors.primary },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  name: { ...typography.title, color: colors.text.strong },
  itemSub: { ...typography.badge, color: colors.text.sub },
  staleText: { fontFamily: fonts.bold, color: colors.errorText },
  itemRight: { alignItems: 'flex-end' },
  priceRow: { flexDirection: 'row', alignItems: 'baseline', gap: spacing.xs },
  price: { ...typography.h3, color: colors.text.strong },
  priceUnit: { ...typography.badge, color: colors.text.sub },
  changeRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  changeText: { ...typography.badge },

  table: { paddingTop: spacing.md, paddingBottom: spacing.xs },
  tableRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, paddingVertical: spacing.sm },
  cell: { flex: 1 },
  cellWide: { flex: 2 },
  right: { textAlign: 'right' },
  th: { ...typography.badge, color: colors.text.sub },
  tdHead: { ...typography.caption, color: colors.text.strong },
  td: { ...typography.caption, color: colors.text.strong },
  tableDivider: { height: 1, backgroundColor: colors.background },
  footnote: { ...typography.badge, color: colors.text.sub, paddingTop: spacing.sm },

  btnRow: { flexDirection: 'row', gap: spacing.sm },
});
