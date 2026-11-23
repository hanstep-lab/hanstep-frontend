// FX-001 환율 정보. 데이터·문구는 src/api/fx.ts 에서만 받고, 평균·대비·최저/최고·방향은 서버(Mock) 값을 그대로 쓴다.
// 출처 문구는 서버 sourceLabel 그대로(USD 수출입은행 고시, PHP ECB 참고값, 하루 1번).
import { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  StyleSheet,
  PanResponder,
  type LayoutChangeEvent,
} from 'react-native';
import Svg, { Line, Circle } from 'react-native-svg';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { router, type Href } from 'expo-router';
import Screen from '../../components/Screen';
import Button from '../../components/Button';
import RateChart from '../../components/RateChart';
import { colors, typography, spacing, radius, fonts, shadow } from '../../constants/theme';
import { FadeIn, Skeleton, SkeletonCard, SkeletonGroup } from '../../components/Skeleton';
import {
  getFxRate,
  getFxHistory,
  FX_PERIODS,
  FX_FIRST_CURRENCY,
  FX_LOAD_ERROR,
  AVG_DECIMALS,
  type FxRate,
  type FxHistory,
  type FxPeriod,
  type FxTrend,
  type FxCurrencyChip,
} from '../../api/fx';
import { useTransferStore } from '../../store/transferStore';
import { fmtRate, fmtPercent, fmtDate } from '../../utils/format';

// 칩 국기. 서버가 다른 통화를 주면 국기 없이 빈 원만 보인다
const FLAGS: Record<string, number> = {
  PHP: require('../../../assets/flags/ph.svg'),
  USD: require('../../../assets/flags/us.svg'),
};

// 방향은 src/api/fx.ts 가 정해 준다. UP 빨강 / DOWN 파랑 / FLAT·없음 기본 글자색
function trendColor(t: FxTrend | null) {
  if (t === 'UP') return colors.rise;
  if (t === 'DOWN') return colors.fall;
  return colors.text.strong;
}

function trendSoft(t: FxTrend | null) {
  if (t === 'UP') return colors.riseSoft;
  if (t === 'DOWN') return colors.fallSoft;
  return colors.background;
}

// RateChart와 맞춰야 함: src/components/RateChart.tsx 의 기본 높이(height=144)·PAD_Y·PAD_RIGHT 와 같은 값.
// RateChart 가 점 좌표를 밖으로 주지 않아서, 안내선·점 위치를 같은 식으로 다시 맞춘다. 저쪽이 바뀌면 여기도 바꿔야 한다.
const CHART_H = 144;
const CHART_PAD_Y = 12;
const CHART_PAD_RIGHT = 10;

type TrendChartProps = {
  points: FxHistory['points'];
  min: number;
  max: number;
  digits: number; // 통화별 환율 자릿수 (AVG_DECIMALS)
};

// 환율 추이 차트 + 누르고 끄는 동안 그 지점 날짜·환율 말풍선. 손을 떼면 사라진다.
// 날짜·환율은 points 값을 그대로 보여 주고, 여기서 하는 계산은 손가락 위치 ↔ 점 순번 변환뿐.
function TrendChart({ points, min, max, digits }: TrendChartProps) {
  const [width, setWidth] = useState(0);
  const [tipW, setTipW] = useState(0);
  const [active, setActive] = useState<number | null>(null);

  // PanResponder 는 한 번만 만들기 때문에 최신 값은 ref 로 읽는다
  const latest = useRef({ width, count: points.length });
  latest.current = { width, count: points.length };

  const pick = (x: number) => {
    const { width: w, count } = latest.current;
    const plotW = w - CHART_PAD_RIGHT;
    if (plotW <= 0 || count < 2) return;
    const ratio = Math.min(Math.max(x / plotW, 0), 1);
    setActive(Math.round(ratio * (count - 1)));
  };

  const responder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true, // 만지는 순간 바로 잡기
      onMoveShouldSetPanResponder: () => true,
      onPanResponderTerminationRequest: () => false, // 끄는 동안 화면 스크롤이 손가락을 가져가지 않게
      onPanResponderGrant: (e) => pick(e.nativeEvent.locationX),
      onPanResponderMove: (e) => pick(e.nativeEvent.locationX),
      onPanResponderRelease: () => setActive(null),
      onPanResponderTerminate: () => setActive(null),
    }),
  ).current;

  const onLayout = (e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width);
  const onTipLayout = (e: LayoutChangeEvent) => setTipW(e.nativeEvent.layout.width);

  const point = active !== null && points.length > 1 ? points[active] : undefined;
  const plotW = width - CHART_PAD_RIGHT;
  const range = max - min || 1;
  const px = point ? (active! / (points.length - 1)) * plotW : 0;
  const py = point ? CHART_PAD_Y + ((max - point.rate) / range) * (CHART_H - CHART_PAD_Y * 2) : 0;
  // 말풍선은 손가락을 가운데로 따라가되 차트 너비 밖으로 나가지 않게
  const tipLeft = Math.min(Math.max(px - tipW / 2, 0), Math.max(width - tipW, 0));

  return (
    <View onLayout={onLayout}>
      <RateChart values={points.map((pt) => pt.rate)} min={min} max={max} height={CHART_H} />

      {point && width > 0 && (
        <Svg width={width} height={CHART_H} style={StyleSheet.absoluteFill} pointerEvents="none">
          <Line
            x1={px}
            x2={px}
            y1={0}
            y2={CHART_H}
            stroke={colors.border}
            strokeWidth={1}
            strokeDasharray="4 4"
          />
          <Circle cx={px} cy={py} r={9} fill={colors.primarySoft} />
          <Circle cx={px} cy={py} r={5} fill={colors.primary} />
        </Svg>
      )}

      {/* 터치 받는 투명 층. 자식이 없어야 locationX 가 이 층 기준이 된다 */}
      <View style={StyleSheet.absoluteFill} {...responder.panHandlers} />

      {point ? (
        <View
          style={[s.floatBadge, { left: tipLeft, opacity: tipW > 0 ? 1 : 0 }]}
          onLayout={onTipLayout}
          pointerEvents="none"
        >
          <View style={s.maxDot} />
          <Text style={s.maxText} numberOfLines={1}>
            {fmtDate(point.date)} · {fmtRate(point.rate, { digits })} KRW
          </Text>
        </View>
      ) : (
        <View style={[s.floatBadge, s.maxRight]} pointerEvents="none">
          <View style={s.maxDot} />
          <Text style={s.maxText}>최고 {fmtRate(max, { digits })}</Text>
        </View>
      )}
    </View>
  );
}

export default function FxScreen() {
  const [currency, setCurrency] = useState<string>(FX_FIRST_CURRENCY);
  const [chips, setChips] = useState<FxCurrencyChip[]>([]);
  const [rate, setRate] = useState<FxRate | null>(null);
  const [rateError, setRateError] = useState<string | null>(null);
  const [period, setPeriod] = useState<FxPeriod>('1M');
  const [history, setHistory] = useState<FxHistory | null>(null);
  const [historyError, setHistoryError] = useState<string | null>(null);

  // 통화가 바뀔 때마다 기준환율 다시 받기. 칩 목록은 서버 screenCurrencies 를 PHP, USD 순서로 맞춘 것
  useEffect(() => {
    let cancelled = false;
    setRate(null);
    setRateError(null);
    getFxRate(currency)
      .then((r) => {
        if (cancelled) return;
        setRate(r);
        setChips(r.screenCurrencies);
      })
      .catch(() => !cancelled && setRateError(FX_LOAD_ERROR));
    return () => {
      cancelled = true;
    };
  }, [currency]);

  // 통화·기간 탭이 바뀔 때마다 차트 다시 받기. 빨리 여러 번 누르면 마지막 것만 반영.
  useEffect(() => {
    let cancelled = false;
    setHistoryError(null);
    getFxHistory(currency, period)
      .then((h) => !cancelled && setHistory(h))
      .catch(() => !cancelled && setHistoryError(FX_LOAD_ERROR));
    return () => {
      cancelled = true;
    };
  }, [currency, period]);

  const goTransfer = () => {
    useTransferStore.getState().setInitialAmount(null);
    router.push('/transfer' as Href);
  };

  const goAlert = () => router.push('/fx/alert' as Href);

  // 첫 응답 전에는 칩 목록도 없어서 안내 문구만
  if (chips.length === 0) {
    return (
      <Screen title="환율 정보" loading={!rateError}>
        {rateError ? (
          <Text style={s.stateText}>{rateError}</Text>
        ) : (
          <SkeletonGroup>
            <View style={{ flexDirection: 'row', gap: spacing.sm }}>
              <Skeleton width={96} height={36} round={radius.full} />
              <Skeleton width={96} height={36} round={radius.full} />
              <Skeleton width={96} height={36} round={radius.full} />
            </View>
            <SkeletonCard lines={2} block={40} />
            <SkeletonCard lines={1} block={180} />
          </SkeletonGroup>
        )}
      </Screen>
    );
  }

  const chipList = (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={s.chipScroll}
      contentContainerStyle={s.chipList}
    >
      {chips.map((c) => {
        const selected = c.code === currency;
        return (
          <Pressable
            key={c.code}
            style={[s.chip, selected && s.chipSelected]}
            onPress={() => setCurrency(c.code)}
            accessibilityState={{ selected }}
          >
            <View style={s.flag20}>
              {FLAGS[c.code] != null && (
                <Image source={FLAGS[c.code]} style={s.flagImg} contentFit="cover" />
              )}
            </View>
            <Text style={[s.chipText, selected && s.chipTextSelected]}>
              {c.name ? `${c.name} ${c.code}` : c.code}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );

  // 통화를 바꾼 직후 새 응답이 오기 전
  if (!rate) {
    return (
      <Screen
        title="환율 정보"
        loading={!rateError}
        footer={<Button title="해외송금하기" showArrow onPress={goTransfer} />}
      >
        {chipList}
        {rateError ? (
          <Text style={s.stateText}>{rateError}</Text>
        ) : (
          <SkeletonGroup>
            <SkeletonCard lines={2} block={40} />
            <SkeletonCard lines={1} block={180} />
          </SkeletonGroup>
        )}
      </Screen>
    );
  }

  const periodLabel = FX_PERIODS.find((p) => p.key === period)?.label ?? '';
  const hasBankRates = rate.sendRate != null && rate.receiveRate != null;
  // 통화를 바꾼 직후 이전 통화 차트가 보이지 않게
  const chart = history && history.currency === rate.currency ? history : null;
  const digits = chart ? (AVG_DECIMALS[chart.currency] ?? 2) : 2;

  return (
    <Screen
      title="환율 정보"
      footer={<Button title="해외송금하기" showArrow onPress={goTransfer} />}
    >
      {chipList}

      {/* 기준환율 카드 */}
      <View style={[s.card, s.heroCard]}>
        <View style={s.heroBody}>
          <View style={s.row}>
            <View style={s.pairRow}>
              <View style={s.codeCircle}>
                <Text style={s.codeText}>{rate.currency}</Text>
              </View>
              <Text style={s.pairText} numberOfLines={1}>
                {rate.pairText}
              </Text>
            </View>
          </View>
          <View style={s.sourceBadge}>
            <Text style={s.sourceBadgeText}>{rate.sourceLabel}</Text>
          </View>

          <View style={s.priceRow}>
            <Text style={s.price}>{fmtRate(rate.rate)}</Text>
            <Text style={s.priceUnit}>KRW</Text>
          </View>

          {/* 전 영업일 값이 없으면(change null) 전일 대비 줄을 숨긴다 */}
          {rate.change !== null ? (
            <View style={s.changeRow}>
              {(rate.changeTrend === 'UP' || rate.changeTrend === 'DOWN') && (
                <Ionicons
                  name={rate.changeTrend === 'UP' ? 'caret-up' : 'caret-down'}
                  size={10}
                  color={trendColor(rate.changeTrend)}
                />
              )}
              <Text style={[s.changeText, { color: trendColor(rate.changeTrend) }]}>
                전일 대비 {fmtRate(rate.change, { sign: true })} KRW
              </Text>
              {rate.changeRate !== null && (
                <View style={[s.changeBadge, { backgroundColor: trendSoft(rate.changeTrend) }]}>
                  <Text style={[s.changeBadgeText, { color: trendColor(rate.changeTrend) }]}>
                    ({fmtPercent(rate.changeRate)})
                  </Text>
                </View>
              )}
            </View>
          ) : (
            <View style={s.changeRow} />
          )}
        </View>

        <View style={s.asOfStrip}>
          <View style={s.dot} />
          <Text style={s.asOfText}>{fmtDate(rate.asOf)} 기준</Text>
        </View>

        {/* 은행 송금 환율은 서버가 줄 때만 표시 (ECB 에는 없음) */}
        {hasBankRates && (
          <View style={s.bankRates}>
            <Text style={s.bankRateText}>송금 보낼 때 {fmtRate(rate.sendRate!)}</Text>
            <Text style={s.bankRateText}>송금 받을 때 {fmtRate(rate.receiveRate!)}</Text>
          </View>
        )}

        {/* 안내: 참고 환율만 있음(REFERENCE_RATE_ONLY), 오래된 값(stale) */}
        {rate.notices.length > 0 && (
          <View style={s.notices}>
            {rate.notices.map((n) => (
              <View key={n} style={s.noticeRow}>
                <Ionicons name="information-circle-outline" size={14} color={colors.text.sub} />
                <Text style={s.noticeText}>{n}</Text>
              </View>
            ))}
          </View>
        )}
      </View>

      {/* 환율 추이 차트 */}
      <View style={[s.card, s.chartCard]}>
        <View style={s.row}>
          <Text style={s.sectionTitle}>환율 추이 차트</Text>
          <View style={s.tabList}>
            {FX_PERIODS.map((p) => {
              const selected = p.key === period;
              return (
                <Pressable
                  key={p.key}
                  style={[s.tab, selected && s.tabSelected]}
                  onPress={() => setPeriod(p.key)}
                >
                  <Text style={[s.tabText, selected && s.tabTextSelected]}>{p.label}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {chart ? (
          <FadeIn style={{ gap: spacing.sm }}>
            {/* 통화·기간이 바뀌면 새로 그려서 이전 선택(말풍선)이 남지 않게 */}
            <TrendChart
              key={`${chart.currency}-${chart.period}`}
              points={chart.points}
              min={chart.min}
              max={chart.max}
              digits={digits}
            />
            <View style={s.row}>
              <Text style={s.statText}>
                {periodLabel} 최저 {fmtRate(chart.min, { digits })}
              </Text>
              <Text style={s.statText}>
                {periodLabel} 평균 {chart.avgText}
              </Text>
              <Text style={[s.statText, s.statCurrent]}>현재 {fmtRate(chart.current, { digits })}</Text>
            </View>
          </FadeIn>
        ) : historyError ? (
          <Text style={s.stateText}>{historyError}</Text>
        ) : (
          <SkeletonGroup gap={spacing.sm}>
            <Skeleton height={180} round={radius.md} />
            <Skeleton width="70%" height={12} />
          </SkeletonGroup>
        )}
      </View>

      {/* 기간별 평균 비교 */}
      <View style={s.avgSection}>
        <Text style={s.sectionTitle}>기간별 평균 비교</Text>
        <Text style={s.summary}>{rate.summaryText}</Text>

        <View>
          <View style={s.tableRow}>
            <Text style={[s.tableHead, s.cell]}>구간</Text>
            <Text style={[s.tableHead, s.cell, s.right]}>기간 평균</Text>
            <Text style={[s.tableHead, s.cell, s.right]}>현재 대비</Text>
          </View>
          {rate.periodAverages.map((row) => (
            <View key={row.period} style={[s.tableRow, s.tableDivider]}>
              <Text style={[s.tableCell, s.cell]}>{row.label}</Text>
              <Text style={[s.tableCell, s.cell, s.right]}>{row.avgText}</Text>
              <Text style={[s.tableDiff, s.cell, s.right, { color: trendColor(row.trend) }]}>
                {row.diffRateText}
              </Text>
            </View>
          ))}
          <Text style={[s.note, s.tableDivider]}>{rate.averageNote}</Text>
        </View>

        <Pressable style={s.alertBtn} onPress={goAlert}>
          <Ionicons name="notifications-outline" size={14} color={colors.primary} />
          <Text style={s.alertBtnText}>목표 환율 알림 설정</Text>
        </Pressable>
      </View>
    </Screen>
  );
}

const s = StyleSheet.create({
  stateText: { ...typography.body, color: colors.text.sub, textAlign: 'center' },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },

  // 통화 칩: FX-002 알림 화면(alert.tsx) 칩과 같은 모양
  chipScroll: { marginHorizontal: -spacing.xl, flexGrow: 0 },
  chipList: { paddingHorizontal: spacing.xl, gap: spacing.sm },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    backgroundColor: colors.background,
  },
  chipSelected: { backgroundColor: colors.primary },
  chipText: { ...typography.body, fontFamily: fonts.bold, color: colors.text.sub },
  chipTextSelected: { color: colors.text.inverse },
  flag20: { width: 20, height: 20, borderRadius: radius.full, overflow: 'hidden', backgroundColor: colors.surface },
  flagImg: { width: '100%', height: '100%' },

  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    ...shadow.card,
  },

  heroCard: { overflow: 'hidden' },
  heroBody: { paddingTop: spacing.xl, paddingHorizontal: spacing.xl, gap: spacing.sm },
  pairRow: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  codeCircle: {
    height: 28,
    minWidth: 28,
    paddingHorizontal: spacing.xs,
    borderRadius: radius.full,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  codeText: { ...typography.badge, fontFamily: fonts.bold, color: colors.primary },
  pairText: { ...typography.title, color: colors.text.strong, flexShrink: 1 },
  sourceBadge: {
    alignSelf: 'flex-start',
    backgroundColor: colors.background,
    borderRadius: radius.full,
    paddingHorizontal: spacing.sm,
  },
  sourceBadgeText: { ...typography.badge, color: colors.primary },
  priceRow: { flexDirection: 'row', alignItems: 'baseline', gap: spacing.sm },
  price: { ...typography.h2, color: colors.text.strong },
  priceUnit: { ...typography.subtitle, color: colors.text.sub },
  changeRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, paddingBottom: spacing.md },
  changeText: { ...typography.body },
  changeBadge: { borderRadius: radius.full, paddingHorizontal: spacing.xs },
  changeBadgeText: { ...typography.badge },

  asOfStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.background,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
  },
  dot: { width: 8, height: 8, borderRadius: radius.full, backgroundColor: colors.primary },
  asOfText: { ...typography.badge, color: colors.text.sub },
  bankRates: { flexDirection: 'row', gap: spacing.md, paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
  bankRateText: { ...typography.body, color: colors.text.strong },
  notices: { gap: spacing.xs, paddingHorizontal: spacing.xl, paddingVertical: spacing.md },
  noticeRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.xs },
  noticeText: { ...typography.badge, color: colors.text.sub, flex: 1 },

  chartCard: { padding: spacing.lg, gap: spacing.sm },
  sectionTitle: { ...typography.h3, color: colors.text.strong },
  tabList: {
    flexDirection: 'row',
    gap: spacing.xs,
    padding: spacing.xs,
    borderRadius: radius.full,
    backgroundColor: colors.background,
  },
  tab: { paddingHorizontal: spacing.sm, borderRadius: radius.full },
  tabSelected: { backgroundColor: colors.surface },
  tabText: { ...typography.badge, color: colors.text.sub },
  tabTextSelected: { fontFamily: fonts.bold, color: colors.primary },
  // 차트 위 배지 (최고 배지와 누르는 동안 말풍선이 같은 모양)
  floatBadge: {
    position: 'absolute',
    top: -spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.background,
    borderRadius: radius.full,
    paddingHorizontal: spacing.sm,
  },
  maxRight: { right: 0 },
  maxDot: { width: 6, height: 6, borderRadius: radius.full, backgroundColor: colors.primary },
  maxText: { ...typography.badge, color: colors.primary },
  statText: { ...typography.badge, color: colors.text.sub },
  statCurrent: { color: colors.primary },

  avgSection: { gap: spacing.sm, paddingTop: spacing.sm },
  summary: { ...typography.body, color: colors.text.sub },
  tableRow: { flexDirection: 'row', gap: spacing.xs, paddingVertical: spacing.xs },
  tableDivider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
  cell: { flex: 1 },
  right: { textAlign: 'right' },
  tableHead: { ...typography.badge, color: colors.text.sub },
  tableCell: { ...typography.body, fontFamily: fonts.light, color: colors.text.strong },
  tableDiff: { ...typography.body },
  note: { ...typography.badge, fontFamily: fonts.light, color: colors.text.sub, paddingTop: spacing.xs },
  alertBtn: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.surface,
    borderRadius: radius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginTop: spacing.xs,
  },
  alertBtnText: { ...typography.badge, fontFamily: fonts.bold, color: colors.primary },
});
