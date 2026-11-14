// FX-002 목표 환율 알림 설정. 데이터는 src/api/fx.ts 에서만 받는다.
// 프리셋 값·슬라이더 범위·최저/최고는 서버(Mock) 값을 그대로 쓰고, 화면은 사용자가 고른 목표값만 들고 있는다.
// 출처는 ECB 기준환율(하루 1번). "실시간", "종가" 표현은 쓰지 않는다.
// TODO(B): "도달하는 즉시" 문구(ECB 는 하루 1번 갱신), VND 칩, 목표가 현재보다 높을 때 처리, 프리셋 의미, 알림 개수·삭제 확인
import { useCallback, useEffect, useState } from 'react';
import { View, Text, Pressable, ScrollView, Switch, StyleSheet, Alert } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import Screen from '../../components/Screen';
import Button from '../../components/Button';
import RateChart from '../../components/RateChart';
import RangeSlider from '../../components/RangeSlider';
import { colors, typography, spacing, radius, fonts, shadow } from '../../constants/theme';
import {
  getFxAlertSetup,
  getFxAlerts,
  createFxAlert,
  deleteFxAlert,
  ALERT_CURRENCIES,
  type AlertCurrency,
  type FxAlertSetup,
  type FxAlertList,
  type FxAlert,
} from '../../api/fx';
import { fmtRate, fmtPercent, fmtDate } from '../../utils/format';
import type { ApiError } from '../../types/api';

const FLAGS: Record<AlertCurrency, number> = {
  PHP: require('../../../assets/flags/ph.svg'),
  USD: require('../../../assets/flags/us.svg'),
  VND: require('../../../assets/flags/vn.svg'),
  IDR: require('../../../assets/flags/id.svg'),
};
const FLAG_US_32 = require('../../../assets/flags/us32.svg');

// 0보다 크면 상승(빨강), 작으면 하락(파랑). FX-001 과 같은 규칙
function trendColor(n: number) {
  if (n > 0) return colors.rise;
  if (n < 0) return colors.fall;
  return colors.text.strong;
}

const decimalsOf = (step: number) => (String(step).split('.')[1] ?? '').length;
const pairText = (unit: number, currency: string) => `${unit} ${currency}`;

export default function FxAlertScreen() {
  const [currency, setCurrency] = useState<AlertCurrency>('PHP');
  const [setup, setSetup] = useState<FxAlertSetup | null>(null);
  const [setupError, setSetupError] = useState<string | null>(null);
  const [target, setTarget] = useState(0);
  const [presetKey, setPresetKey] = useState<string | null>(null);
  const [push, setPush] = useState(true);
  const [alerts, setAlerts] = useState<FxAlertList | null>(null);
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
      .catch((e: ApiError) => !cancelled && setSetupError(e.message));
    return () => {
      cancelled = true;
    };
  }, [currency]);

  const loadAlerts = useCallback(() => {
    getFxAlerts()
      .then(setAlerts)
      .catch(() => setAlerts({ items: [], activeCount: 0 }));
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

  const register = async () => {
    if (!setup) return;
    setSaving(true);
    try {
      await createFxAlert({ currency, target, push });
      loadAlerts();
      Alert.alert('알림을 등록했어요', `${pairText(setup.unit, currency)} = ${fmtRate(target)} KRW ${directionText}일 때 알려드려요.`);
    } catch (e) {
      Alert.alert('등록하지 못했어요', (e as ApiError).message);
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = (item: FxAlert) => {
    Alert.alert('알림 삭제', `${item.currency} 목표 환율 알림을 삭제할까요?`, [
      { text: '취소', style: 'cancel' },
      {
        text: '삭제',
        style: 'destructive',
        onPress: () => deleteFxAlert(item.id).then(loadAlerts),
      },
    ]);
  };

  // TODO(B): 목표가 현재보다 높을 때 "이상"으로 받을지 확인. 지금은 비교 결과대로 표시
  const directionText = setup && target > setup.rate ? '이상' : '이하';
  const unitPair = setup ? pairText(setup.unit, currency) : '';

  return (
    <Screen
      title="환율 알림"
      footer={
        <Button
          title="목표 환율 알림 등록하기"
          icon="checkmark-circle-outline"
          subtitle={setup ? `${unitPair} = ${fmtRate(target)} KRW ${directionText}일 때 알려드려요` : ' '}
          disabled={!setup || saving}
          onPress={register}
        />
      }
    >
      {/* 제목 */}
      <View style={s.intro}>
        <Text style={s.eyebrow}>환율 알림</Text>
        <Text style={s.title}>목표 환율 알림 설정</Text>
        <Text style={s.desc}>
          원하는 환율을 설정해 두시면, 해당 환율에 도달하는 즉시 휴대폰 푸시 알림을 보내드려요.
        </Text>
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
                {c.name} {c.code}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {/* 목표 환율 카드 */}
      <View style={[s.card, s.targetCard]}>
        {!setup ? (
          <Text style={s.stateText}>{setupError ?? '환율 정보를 불러오는 중이에요.'}</Text>
        ) : (
          <>
            <View style={s.sourceStrip}>
              <View style={s.dot} />
              <Text style={s.sourceText}>
                {setup.sourceLabel} · {fmtDate(setup.asOf)} 기준
              </Text>
            </View>

            <View style={s.cardBody}>
              <View style={s.rateRow}>
                <View style={s.rateInfo}>
                  <Text style={s.label}>기준 환율</Text>
                  <Text style={s.rate}>
                    {unitPair} = {fmtRate(setup.rate)} KRW
                  </Text>
                </View>
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
              </View>

              <View style={s.sparkBox}>
                <RateChart values={setup.sparkline} min={setup.low} max={setup.high} height={24} simple />
              </View>

              <View style={s.targetSection}>
                <Text style={s.sectionTitle}>얼마일 때 알려드릴까요?</Text>

                <View style={s.stepper}>
                  <Pressable
                    style={s.stepBtn}
                    onPress={() => stepTarget(-1)}
                    accessibilityLabel="환율 낮추기"
                    hitSlop={4}
                  >
                    <Ionicons name="remove" size={20} color={colors.text.strong} />
                  </Pressable>
                  <View style={s.targetCenter}>
                    <View style={s.targetRow}>
                      <Text style={s.targetValue}>{fmtRate(target)}</Text>
                      <Text style={s.targetUnit}>KRW {directionText}</Text>
                    </View>
                    <Text style={s.label}>{unitPair} 기준</Text>
                  </View>
                  <Pressable
                    style={s.stepBtn}
                    onPress={() => stepTarget(1)}
                    accessibilityLabel="환율 높이기"
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
                    <Text style={s.label}>최저 {fmtRate(setup.low)}</Text>
                    <Text style={s.label}>현재 {fmtRate(setup.rate)}</Text>
                    <Text style={s.label}>최고 {fmtRate(setup.high)}</Text>
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
          </>
        )}
      </View>

      {/* 알림 방식 */}
      <View style={[s.card, s.padCard]}>
        <Text style={s.sectionTitle}>알림 방식 및 옵션</Text>
        <View style={s.optionRow}>
          <View>
            <Text style={s.optionTitle}>스마트폰 앱 푸시 알림</Text>
            <Text style={s.label}>신한 SOL 앱 알림으로 받기</Text>
          </View>
          <Switch
            value={push}
            onValueChange={setPush}
            trackColor={{ true: colors.primary, false: colors.border }}
            thumbColor={colors.surface}
            ios_backgroundColor={colors.border}
          />
        </View>
      </View>

      {/* 등록된 알림 */}
      <View style={[s.card, s.padCard]}>
        <View style={s.rowBetween}>
          <Text style={s.sectionTitle}>현재 등록된 내 환율 알림</Text>
          {alerts && <Text style={s.activeCount}>{alerts.activeCount}건 활성</Text>}
        </View>
        {alerts?.items.length === 0 && <Text style={s.label}>등록된 알림이 없어요.</Text>}
        {alerts?.items.map((item) => (
          <View key={item.id} style={s.alertItem}>
            <View style={s.alertLeft}>
              <View style={s.flag32}>
                <Image
                  source={item.currency === 'USD' ? FLAG_US_32 : FLAGS[item.currency]}
                  style={s.flagImg}
                  contentFit="cover"
                />
              </View>
              <View style={s.alertTexts}>
                <View style={s.alertTitleRow}>
                  <Text style={s.optionTitle}>{item.currency}</Text>
                  <View style={s.statusBadge}>
                    <Text style={s.statusText}>알림 대기중</Text>
                  </View>
                </View>
                <Text style={s.alertTarget}>
                  목표: {pairText(item.unit, item.currency)} = {fmtRate(item.target)} KRW
                  {item.direction === 'above' ? ' 이상' : ''}
                </Text>
              </View>
            </View>
            <Pressable
              style={s.moreBtn}
              onPress={() => confirmDelete(item)}
              accessibilityLabel="알림 설정 관리"
              hitSlop={4}
            >
              <Ionicons name="ellipsis-vertical" size={16} color={colors.text.sub} />
            </Pressable>
          </View>
        ))}
      </View>
    </Screen>
  );
}

const s = StyleSheet.create({
  stateText: { ...typography.body, color: colors.text.sub, textAlign: 'center', padding: spacing.lg },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },

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
  sourceText: { ...typography.badge, color: colors.text.sub },
  cardBody: { padding: spacing.lg, gap: spacing.lg },

  rateRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  rateInfo: { gap: 2, flexShrink: 1 },
  label: { ...typography.badge, color: colors.text.sub },
  rate: { ...typography.h2, color: colors.text.strong },
  changeRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  changeText: { ...typography.body, fontFamily: fonts.bold },
  sparkBox: { backgroundColor: colors.background, borderRadius: radius.md, padding: spacing.sm, height: 40 },

  targetSection: { gap: spacing.sm, paddingTop: spacing.sm },
  sectionTitle: { ...typography.h3, color: colors.text.strong },
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
  rangeLabels: { flexDirection: 'row', justifyContent: 'space-between' },

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

  optionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 6 },
  optionTitle: { ...typography.body, fontFamily: fonts.bold, color: colors.text.strong },

  activeCount: { ...typography.badge, fontFamily: fonts.bold, color: colors.primary },
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
  alertTarget: { ...typography.body, color: colors.text.sub },
  moreBtn: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
});
