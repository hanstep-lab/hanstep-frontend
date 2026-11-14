// FX-001 환율 정보. 데이터는 src/api/fx.ts 에서만 받고, 평균·대비·최저/최고는 서버(Mock) 값을 그대로 쓴다.
// 출처는 ECB 기준환율. "실시간", "종가" 표현은 쓰지 않는다.
import { useEffect, useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, type Href } from 'expo-router';
import Screen from '../../components/Screen';
import Button from '../../components/Button';
import RateChart from '../../components/RateChart';
import { colors, typography, spacing, radius, fonts, shadow } from '../../constants/theme';
import { getFxRate, getFxHistory, FX_PERIODS, type FxRate, type FxHistory, type FxPeriod } from '../../api/fx';
import { useTransferStore } from '../../store/transferStore';
import { fmtRate, fmtPercent, fmtDate } from '../../utils/format';
import type { ApiError } from '../../types/api';

// 지금은 필리핀 사용자 기준 한 통화만. 통화 선택은 FX-002 칩과 같이 정리.
const CURRENCY = 'PHP';

// 0보다 크면 상승(빨강), 작으면 하락(파랑), 0이면 기본 글자색
function trendColor(n: number) {
  if (n > 0) return colors.rise;
  if (n < 0) return colors.fall;
  return colors.text.strong;
}

export default function FxScreen() {
  const [rate, setRate] = useState<FxRate | null>(null);
  const [rateError, setRateError] = useState<string | null>(null);
  const [period, setPeriod] = useState<FxPeriod>('1M');
  const [history, setHistory] = useState<FxHistory | null>(null);
  const [historyError, setHistoryError] = useState<string | null>(null);

  useEffect(() => {
    getFxRate(CURRENCY)
      .then(setRate)
      .catch((e: ApiError) => setRateError(e.message));
  }, []);

  // 기간 탭이 바뀔 때마다 차트 다시 받기. 빨리 여러 번 누르면 마지막 것만 반영.
  useEffect(() => {
    let cancelled = false;
    setHistoryError(null);
    getFxHistory(CURRENCY, period)
      .then((h) => !cancelled && setHistory(h))
      .catch((e: ApiError) => !cancelled && setHistoryError(e.message));
    return () => {
      cancelled = true;
    };
  }, [period]);

  if (!rate) {
    return (
      <Screen title="환율 정보">
        <Text style={s.stateText}>{rateError ?? '환율 정보를 불러오는 중이에요.'}</Text>
      </Screen>
    );
  }

  const periodLabel = FX_PERIODS.find((p) => p.key === period)?.label ?? '';
  const hasBankRates = rate.sendRate != null && rate.receiveRate != null;

  const goTransfer = () => {
    useTransferStore.getState().setInitialAmount(null);
    router.push('/transfer' as Href);
  };

  const goAlert = () => router.push('/fx/alert' as Href);

  return (
    <Screen
      title="환율 정보"
      footer={<Button title="해외송금하기" showArrow onPress={goTransfer} />}
    >
      {/* 기준환율 카드 */}
      <View style={[s.card, s.heroCard]}>
        <View style={s.heroBody}>
          <View style={s.row}>
            <View style={s.pairRow}>
              <View style={s.codeCircle}>
                <Text style={s.codeText}>{rate.currency}</Text>
              </View>
              <Text style={s.pairText} numberOfLines={1}>
                {rate.baseName} / {rate.quoteName}
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

          <View style={s.changeRow}>
            {rate.change !== 0 && (
              <Ionicons
                name={rate.change > 0 ? 'caret-up' : 'caret-down'}
                size={10}
                color={trendColor(rate.change)}
              />
            )}
            <Text style={[s.changeText, { color: trendColor(rate.change) }]}>
              전일 대비 {fmtRate(rate.change, { sign: true })} KRW
            </Text>
            <View
              style={[
                s.changeBadge,
                { backgroundColor: rate.changeRate >= 0 ? colors.riseSoft : colors.fallSoft },
              ]}
            >
              <Text style={[s.changeBadgeText, { color: trendColor(rate.changeRate) }]}>
                ({fmtPercent(rate.changeRate)})
              </Text>
            </View>
          </View>
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

        {history ? (
          <>
            <View>
              <RateChart
                values={history.points.map((pt) => pt.rate)}
                min={history.min}
                max={history.max}
              />
              <View style={s.maxBadge}>
                <View style={s.maxDot} />
                <Text style={s.maxText}>최고 {fmtRate(history.max)}</Text>
              </View>
            </View>
            <View style={s.row}>
              <Text style={s.statText}>
                {periodLabel} 최저 {fmtRate(history.min)}
              </Text>
              <Text style={s.statText}>
                {periodLabel} 평균 {fmtRate(history.avg)}
              </Text>
              <Text style={[s.statText, s.statCurrent]}>현재 {fmtRate(history.current)}</Text>
            </View>
          </>
        ) : (
          <Text style={s.stateText}>{historyError ?? '차트를 불러오는 중이에요.'}</Text>
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
              <Text style={[s.tableCell, s.cell, s.right]}>{fmtRate(row.avg)}</Text>
              <Text style={[s.tableDiff, s.cell, s.right, { color: trendColor(row.diffRate) }]}>
                {fmtPercent(row.diffRate)}
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
  maxBadge: {
    position: 'absolute',
    right: 0,
    top: -spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.background,
    borderRadius: radius.full,
    paddingHorizontal: spacing.sm,
  },
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
