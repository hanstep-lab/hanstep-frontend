// FX-002 목표 환율 알림 설정. 데이터는 src/api/fx.ts 에서만 받는다.
// 프리셋 값·슬라이더 범위·최저/최고는 서버(Mock) 값을 그대로 쓰고, 화면은 사용자가 고른 목표값만 들고 있는다.
// 출처 문구는 서버 sourceLabel 그대로(PHP ECB 참고값, USD 수출입은행 고시, 하루 1번). "실시간", "종가" 표현은 쓰지 않는다.
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View, Text, Pressable, ScrollView, StyleSheet, Alert } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import Screen from '../../components/Screen';
import Button from '../../components/Button';
import RateChart from '../../components/RateChart';
import RangeSlider from '../../components/RangeSlider';
import { colors, typography, spacing, radius, fonts, shadow } from '../../constants/theme';
import { FadeIn, Skeleton, SkeletonGroup } from '../../components/Skeleton';
import {
  getFxAlertSetup,
  getFxAlerts,
  createFxAlert,
  deleteFxAlert,
  comparatorFor,
  createErrorText,
  deleteErrorText,
  ALERT_CURRENCIES,
  comparatorText,
  fxCurrencyName,
  FX_ALERT_LOAD_ERROR,
  type AlertCurrency,
  type FxAlertSetup,
  type FxAlertList,
  type FxAlert,
} from '../../api/fx';
import { fmtRate, fmtPercent, fmtDate } from '../../utils/format';
import { addSeenIds, setPermissionAsked, wasPermissionAsked } from '../../utils/fxAlertStorage';
import { requestNotificationPermission } from '../../utils/fxNotification';
import type { ApiError } from '../../types/api';

const FLAGS: Record<AlertCurrency, number> = {
  PHP: require('../../../assets/flags/ph.svg'),
  USD: require('../../../assets/flags/us.svg'),
};
// 알림 목록용 32px 국기. 서버가 다른 통화를 주면 국기 없이 회색 원만 보인다
const FLAGS_32: Record<string, number> = {
  PHP: require('../../../assets/flags/ph.svg'),
  USD: require('../../../assets/flags/us32.svg'),
};

// 0보다 크면 상승(빨강), 작으면 하락(파랑). FX-001 과 같은 규칙
function trendColor(n: number) {
  if (n > 0) return colors.rise;
  if (n < 0) return colors.fall;
  return colors.text.strong;
}

const decimalsOf = (step: number) => (String(step).split('.')[1] ?? '').length;
const pairText = (unit: number, currency: string) => `${unit} ${currency}`;

export default function FxAlertScreen() {
  const { t } = useTranslation();
  const [currency, setCurrency] = useState<AlertCurrency>('PHP');
  const [setup, setSetup] = useState<FxAlertSetup | null>(null);
  const [setupError, setSetupError] = useState<string | null>(null);
  const [target, setTarget] = useState(0);
  const [presetKey, setPresetKey] = useState<string | null>(null);
  const [alerts, setAlerts] = useState<FxAlertList | null>(null);
  const [alertsError, setAlertsError] = useState(false);
  const [saving, setSaving] = useState(false);

  // 통화 칩이 바뀔 때마다 기준환율·프리셋 다시 받기. 빨리 여러 번 누르면 마지막 것만 반영
  useEffect(() => {
    let cancelled = false;
    setSetup(null);
    setSetupError(null);
    getFxAlertSetup(currency)
      .then((data) => {
        if (cancelled) return;
        const preset = data.presets.find((p) => p.key === data.defaultPresetKey);
        setSetup(data);
        setTarget(preset?.value ?? data.rate);
        setPresetKey(preset?.key ?? null);
      })
      .catch(() => !cancelled && setSetupError(FX_ALERT_LOAD_ERROR.setup));
    return () => {
      cancelled = true;
    };
  }, [currency]);

  const loadAlerts = useCallback(() => {
    getFxAlerts()
      .then((data) => {
        setAlerts(data);
        setAlertsError(false);
        // 이 화면에서 본 도달 알림은 "확인함" → ☰ 메뉴 점이 사라진다
        addSeenIds(data.items.filter((a) => a.status === 'TRIGGERED').map((a) => a.alertId));
      })
      .catch(() => {
        setAlerts(null);
        setAlertsError(true);
      });
  }, []);

  useEffect(loadAlerts, [loadAlerts]);

  // 슬라이더·+/- 로 직접 바꾸면, 값이 프리셋과 같을 때만 그 프리셋을 선택 표시
  const changeTarget = (value: number) => {
    setTarget(value);
    setPresetKey(setup?.presets.find((p) => p.value === value)?.key ?? null);
  };

  const stepTarget = (dir: 1 | -1) => {
    if (!setup) return;
    const { min, max, step } = setup.slider;
    const next = Number((target + dir * step).toFixed(decimalsOf(step)));
    if (next >= min && next <= max) changeTarget(next);
  };

  // 목표가 현재 환율과 같으면 이상/이하를 정할 수 없어서 등록을 막는다
  const sameAsCurrent = !!setup && target === setup.rate;
  const comparator = comparatorFor(target, setup?.rate ?? target);
  const directionText = comparatorText(comparator);
  const unitPair = setup ? pairText(setup.unit, currency) : '';

  const register = async () => {
    if (!setup || sameAsCurrent) return;
    setSaving(true);
    // 처음 등록할 때만 폰 알림 권한을 묻는다. 거절해도 등록은 하고, 도달 시 ☰ 메뉴 점으로만 보인다
    if (!(await wasPermissionAsked())) {
      await requestNotificationPermission();
      await setPermissionAsked();
    }
    try {
      await createFxAlert({ currency, comparator, targetRate: target });
      loadAlerts();
      Alert.alert(
        t('fx.alert.registered'),
        `${t('fx.alert.notifyWhen', { pair: unitPair, rate: fmtRate(target), cmp: directionText })}.`,
      );
    } catch (e) {
      const text = createErrorText(e as ApiError, currency, comparator);
      Alert.alert(text.title, text.message);
    } finally {
      setSaving(false);
    }
  };

  const removeAlert = async (item: FxAlert) => {
    try {
      await deleteFxAlert(item.alertId);
    } catch (e) {
      const text = deleteErrorText(e as ApiError);
      if (text) Alert.alert(text.title, text.message);
    } finally {
      loadAlerts();
    }
  };

  const confirmDelete = (item: FxAlert) => {
    Alert.alert(t('fx.alert.deleteTitle'), t('fx.alert.deleteAsk', { currency: item.currency }), [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('fx.alert.delete'), style: 'destructive', onPress: () => removeAlert(item) },
    ]);
  };

  const footerText = !setup
    ? ' '
    : sameAsCurrent
      ? t('fx.alert.pickOther')
      : t('fx.alert.notifyWhen', { pair: unitPair, rate: fmtRate(target), cmp: directionText });

  return (
    <Screen
      title={t('fx.alert.screenTitle')}
      footer={
        <Button
          title={t('fx.alert.register')}
          icon="checkmark-circle-outline"
          subtitle={footerText}
          disabled={!setup || sameAsCurrent || saving}
          onPress={register}
        />
      }
    >
      {/* 제목 */}
      <View style={s.intro}>
        <Text style={s.eyebrow}>{t('fx.alert.screenTitle')}</Text>
        <Text style={s.title}>{t('fx.alertSetting')}</Text>
        <Text style={s.desc}>{t('fx.alert.desc')}</Text>
      </View>

      {/* 통화 칩 */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={s.chipScroll}
        contentContainerStyle={s.chipList}
      >
        {ALERT_CURRENCIES.map((c) => {
          const selected = c.code === currency;
          return (
            <Pressable
              key={c.code}
              style={[s.chip, selected && s.chipSelected]}
              onPress={() => setCurrency(c.code)}
              accessibilityState={{ selected }}
            >
              <View style={s.flag20}>
                <Image source={FLAGS[c.code]} style={s.flagImg} contentFit="cover" />
              </View>
              <Text style={[s.chipText, selected && s.chipTextSelected]}>
                {fxCurrencyName(c.code)} {c.code}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {/* 목표 환율 카드 */}
      <View style={[s.card, s.targetCard]}>
        {!setup ? (
          setupError ? (
            <Text style={s.stateText}>{setupError}</Text>
          ) : (
            <View style={{ padding: spacing.lg }}>
              <SkeletonGroup gap={spacing.md}>
                <Skeleton width="55%" height={12} />
                <Skeleton width="70%" height={28} />
                <Skeleton height={44} round={radius.md} />
                <Skeleton width="80%" height={12} />
              </SkeletonGroup>
            </View>
          )
        ) : (
          <FadeIn>
            <View style={s.sourceStrip}>
              <View style={s.dot} />
              <Text style={s.sourceText}>
                {setup.sourceLabel} · {t('fx.asOf', { date: fmtDate(setup.asOf) })}
              </Text>
            </View>

            <View style={s.cardBody}>
              <View style={s.rateRow}>
                <View style={s.rateInfo}>
                  <Text style={s.label}>{t('fx.alert.baseRate')}</Text>
                  <Text style={s.rate}>
                    {unitPair} = {fmtRate(setup.rate)} KRW
                  </Text>
                </View>
                {setup.changeRate !== null && (
                  <View style={s.changeRow}>
                    {setup.changeRate !== 0 && (
                      <Ionicons
                        name={setup.changeRate > 0 ? 'caret-up' : 'caret-down'}
                        size={10}
                        color={trendColor(setup.changeRate)}
                      />
                    )}
                    <Text style={[s.changeText, { color: trendColor(setup.changeRate) }]}>
                      {fmtPercent(setup.changeRate)}
                    </Text>
                  </View>
                )}
              </View>

              <View style={s.sparkBox}>
                <RateChart values={setup.sparkline} min={setup.low} max={setup.high} height={24} simple />
              </View>

              <View style={s.targetSection}>
                <Text style={s.sectionTitle}>{t('fx.alert.ask')}</Text>

                <View style={s.stepper}>
                  <Pressable
                    style={s.stepBtn}
                    onPress={() => stepTarget(-1)}
                    accessibilityLabel={t('fx.alert.lower')}
                    hitSlop={4}
                  >
                    <Ionicons name="remove" size={20} color={colors.text.strong} />
                  </Pressable>
                  <View style={s.targetCenter}>
                    <View style={s.targetRow}>
                      <Text style={s.targetValue}>{fmtRate(target)}</Text>
                      <Text style={s.targetUnit}>KRW {directionText}</Text>
                    </View>
                    <Text style={s.label}>{t('fx.alert.pairBase', { pair: unitPair })}</Text>
                  </View>
                  <Pressable
                    style={s.stepBtn}
                    onPress={() => stepTarget(1)}
                    accessibilityLabel={t('fx.alert.higher')}
                    hitSlop={4}
                  >
                    <Ionicons name="add" size={20} color={colors.text.strong} />
                  </Pressable>
                </View>

                <View style={s.sliderBlock}>
                  <RangeSlider
                    value={target}
                    min={setup.slider.min}
                    max={setup.slider.max}
                    step={setup.slider.step}
                    onChange={changeTarget}
                  />
                  <View style={s.rangeLabels}>
                    <Text style={s.label}>{t('fx.low', { value: fmtRate(setup.low) })}</Text>
                    <Text style={s.label}>{t('fx.current', { value: fmtRate(setup.rate) })}</Text>
                    <Text style={s.label}>{t('fx.max', { value: fmtRate(setup.high) })}</Text>
                  </View>
                </View>

                <View style={s.presetRow}>
                  {setup.presets.map((p) => {
                    const selected = p.key === presetKey;
                    return (
                      <Pressable
                        key={p.key}
                        style={[s.preset, selected && s.presetSelected]}
                        onPress={() => {
                          setTarget(p.value);
                          setPresetKey(p.key);
                        }}
                        accessibilityState={{ selected }}
                      >
                        <Text style={[s.presetText, selected && s.presetTextSelected]}>{p.label}</Text>
                        {p.key === 'low' && (
                          <Text style={[s.presetText, selected && s.presetTextSelected]}>{fmtRate(p.value)}</Text>
                        )}
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            </View>
          </FadeIn>
        )}
      </View>

      {/* 등록된 알림 */}
      <View style={[s.card, s.padCard]}>
        <View style={s.rowBetween}>
          <Text style={s.sectionTitle}>{t('fx.alert.listTitle')}</Text>
          {alerts && <Text style={s.activeCount}>{t('fx.alert.waitingCount', { n: alerts.activeCount })}</Text>}
        </View>
        {alertsError && <Text style={s.label}>{FX_ALERT_LOAD_ERROR.list}</Text>}
        {alerts?.items.length === 0 && <Text style={s.label}>{t('fx.alert.empty')}</Text>}
        {alerts?.items.map((item) => {
          const reached = item.status === 'TRIGGERED';
          return (
            <View key={item.alertId} style={s.alertItem}>
              <View style={s.alertLeft}>
                <View style={s.flag32}>
                  {FLAGS_32[item.currency] != null && (
                    <Image source={FLAGS_32[item.currency]} style={s.flagImg} contentFit="cover" />
                  )}
                </View>
                <View style={s.alertTexts}>
                  <View style={s.alertTitleRow}>
                    <Text style={s.optionTitle}>{item.currency}</Text>
                    <View style={[s.statusBadge, reached && s.statusBadgeReached]}>
                      <Text style={[s.statusText, reached && s.statusTextReached]}>
                        {reached ? t('fx.alert.reached') : t('fx.alert.waiting')}
                      </Text>
                    </View>
                  </View>
                  <Text style={s.alertTarget}>{item.targetText}</Text>
                  {item.triggeredText && <Text style={s.alertReached}>{item.triggeredText}</Text>}
                </View>
              </View>
              <Pressable
                style={s.moreBtn}
                onPress={() => confirmDelete(item)}
                accessibilityLabel={t('fx.alert.manage')}
                hitSlop={4}
              >
                <Ionicons name="ellipsis-vertical" size={16} color={colors.text.sub} />
              </Pressable>
            </View>
          );
        })}
      </View>
    </Screen>
  );
}

const s = StyleSheet.create({
  stateText: { ...typography.body, color: colors.text.sub, textAlign: 'center', padding: spacing.lg },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: spacing.sm },

  intro: { gap: 3 },
  eyebrow: { ...typography.badge, fontFamily: fonts.bold, color: colors.primary },
  title: { ...typography.h2, color: colors.text.strong },
  desc: { ...typography.body, color: colors.text.sub },

  chipScroll: { marginHorizontal: -spacing.xl, flexGrow: 0 },
  chipList: { paddingHorizontal: spacing.xl, gap: spacing.sm },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: 14,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    backgroundColor: colors.background,
  },
  chipSelected: { backgroundColor: colors.primary },
  chipText: { ...typography.body, fontFamily: fonts.bold, color: colors.text.sub },
  chipTextSelected: { color: colors.text.inverse },
  flag20: { width: 20, height: 20, borderRadius: radius.full, overflow: 'hidden', backgroundColor: colors.surface },
  flag32: { width: 32, height: 32, borderRadius: radius.full, overflow: 'hidden', backgroundColor: colors.border },
  flagImg: { width: '100%', height: '100%' },

  card: { backgroundColor: colors.surface, borderRadius: radius.lg, ...shadow.card },
  padCard: { padding: spacing.lg, gap: spacing.md },
  targetCard: { overflow: 'hidden' },
  sourceStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.background,
    paddingHorizontal: spacing.lg,
    paddingTop: 14,
    paddingBottom: spacing.md,
  },
  dot: { width: 8, height: 8, borderRadius: radius.full, backgroundColor: colors.primary },
  sourceText: { ...typography.badge, color: colors.text.sub, flexShrink: 1 },
  cardBody: { padding: spacing.lg, gap: spacing.lg },

  rateRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: spacing.sm },
  rateInfo: { gap: 2, flexShrink: 1 },
  label: { ...typography.badge, color: colors.text.sub },
  rate: { ...typography.h2, color: colors.text.strong },
  changeRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  changeText: { ...typography.body, fontFamily: fonts.bold },
  sparkBox: { backgroundColor: colors.background, borderRadius: radius.md, padding: spacing.sm, height: 40 },

  targetSection: { gap: spacing.sm, paddingTop: spacing.sm },
  sectionTitle: { ...typography.h3, color: colors.text.strong, flexShrink: 1 },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    borderRadius: radius.lg,
    backgroundColor: colors.background,
  },
  stepBtn: {
    width: 40,
    height: 40,
    borderRadius: radius.full,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  targetCenter: { alignItems: 'center' },
  targetRow: { flexDirection: 'row', alignItems: 'baseline', gap: spacing.xs },
  targetValue: { ...typography.h2, color: colors.primary },
  targetUnit: { ...typography.body, fontFamily: fonts.bold, color: colors.text.sub },

  sliderBlock: { gap: spacing.xs, paddingTop: spacing.sm },
  rangeLabels: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.sm },

  presetRow: { flexDirection: 'row', gap: 6, paddingTop: 6 },
  preset: {
    flex: 1,
    minHeight: 40,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    borderRadius: radius.md,
    backgroundColor: colors.background,
  },
  presetSelected: { backgroundColor: colors.primarySoft },
  presetText: { ...typography.badge, color: colors.text.sub, textAlign: 'center' },
  presetTextSelected: { fontFamily: fonts.bold, color: colors.text.strong },

  optionTitle: { ...typography.body, fontFamily: fonts.bold, color: colors.text.strong },

  activeCount: { ...typography.badge, fontFamily: fonts.bold, color: colors.primary, flexShrink: 0 },
  alertItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: colors.background,
  },
  alertLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, flexShrink: 1 },
  alertTexts: { flexShrink: 1 },
  alertTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  statusBadge: { backgroundColor: colors.primarySoft, borderRadius: radius.sm, paddingHorizontal: 6 },
  statusText: { ...typography.badge, color: colors.primary },
  statusBadgeReached: { backgroundColor: colors.primary },
  statusTextReached: { color: colors.text.inverse },
  alertTarget: { ...typography.body, color: colors.text.sub },
  alertReached: { ...typography.badge, color: colors.primary },
  moreBtn: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
});
