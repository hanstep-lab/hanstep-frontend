// 환율 API (FX-001, FX-002). 화면은 이 파일만 부르고 Mock 인지 모른다.
// 앱은 Frankfurter·ECB 를 직접 부르지 않고 항상 우리 백엔드만 부른다.

import { client } from './client';
import { USE_MOCK, mockDelay } from './config';
import {
  mockFxRate,
  mockFxHistory,
  mockFxAlertRate,
  mockFxAlertHistory,
  mockFxAlerts,
  mockCreateFxAlert,
  mockDeleteFxAlert,
  MOCK_ALERT_CURRENCIES,
  type MockAlertCurrency,
} from './mock/fx';
import { fmtRate } from '../utils/format';
import i18n from '../i18n';
import type {
  ApiError,
  FxAlertCreateRequest,
  FxAlertListResponse,
  FxAlertResponse,
  FxComparator,
  FxDirection,
  FxPeriod,
  FxPeriodAverage,
  FxRateDetailResponse,
  FxRateHistoryDetailResponse,
  FxRateHistoryResponse,
  FxRateResponse,
  FxRateType,
} from '../types/api';

// ---------------------------------------------------------------------------
// FX-001 환율 정보
// - GET /fx/rates?currency=, GET /fx/rates/{currency}/history?period=
// - Mock 과 서버 모두 서버 응답 모양을 돌려주고, 화면용 문구는 아래 to* 함수에서 만든다
//   (서버는 통화 이름·구간 이름·요약 문장·평균 설명·안내 문구를 주지 않는다)
// - 평균·최저·최고·변동률·direction 은 서버(Mock) 값을 그대로 쓴다. 평균 표시 자릿수 반올림만 여기서 한다
// ---------------------------------------------------------------------------
export type { FxPeriod };

// 서버 period 값(1M·3M·6M·1Y). 기간 탭(label)과 평균표(tableLabel) 이름은 i18n fx.period.<period>
const PERIOD_KEYS: FxPeriod[] = ['1M', '3M', '6M', '1Y'];
export const fxPeriodLabel = (p: FxPeriod) => i18n.t(`fx.period.${p}.label`);
const periodTableLabel = (p: FxPeriod) =>
  PERIOD_KEYS.includes(p) ? i18n.t(`fx.period.${p}.tableLabel`) : p;

export const FX_PERIODS = PERIOD_KEYS.map((key) => ({ key }));

// 처음 고르는 통화
export const FX_FIRST_CURRENCY = 'PHP';

// 칩 순서는 FX-002 알림 화면과 같게 PHP, USD. 칩에 넣을 통화는 서버 screenCurrencies 에 있는 것만,
// 이 목록에 없는 통화는 서버 순서대로 뒤에 붙인다
const CHIP_ORDER = ['PHP', 'USD'];
const chipRank = (code: string) => {
  const i = CHIP_ORDER.indexOf(code);
  return i === -1 ? CHIP_ORDER.length : i;
};

// 통화 이름 (i18n cards.currencyName, 채팅 환율 카드와 같은 문구). 없는 통화는 이름 없이 코드만 보여 준다
const NAMED_CURRENCIES = ['PHP', 'USD'] as const;

// 평균 표시 자릿수. 서버 평균은 소수 4자리라 화면 표시만 그 통화 환율 자릿수에 맞춘다
// (PHP 는 ECB 참고값이 소수 3자리, USD 는 수출입은행 고시가 소수 2자리). 없는 통화는 2자리
export const AVG_DECIMALS: Record<string, number> = { PHP: 3, USD: 2 };

// 안내 코드 → 문구 (i18n fx.referenceOnly). 모르는 코드는 보여 주지 않는다
const noticeText = (code: string): string | null => (code === 'REFERENCE_RATE_ONLY' ? i18n.t('fx.referenceOnly') : null);
export const fxStaleText = () => i18n.t('fx.stale');

// 한국어 요약 문장 꼬리 (summaryText 는 한국어 문법으로 조립해서 한국어 화면에서만 쓴다)
const SUMMARY_TAIL = '(과거 평균 비교이며 예측이 아니에요)';

export const fxLoadError = () => i18n.t('fx.loadError');

// 화면 색·화살표용. UP 빨강 / DOWN 파랑 / FLAT 기본색
export type FxTrend = 'UP' | 'DOWN' | 'FLAT';
const DIRECTION_TREND: Record<FxDirection, FxTrend> = { HIGHER: 'UP', LOWER: 'DOWN', SAME: 'FLAT' };

export type FxCurrencyChip = { code: string; name: string };

export type FxPeriodAverageRow = {
  period: FxPeriod;
  label: string; // "3개월(분기)"
  avgText: string; // "21.039" 또는 "데이터 부족"
  diffRateText: string; // "-0.26%" 또는 "-"
  trend: FxTrend | null; // 서버 direction. 데이터 부족이면 null
};

export type FxRate = {
  currency: string;
  pairText: string; // "필리핀 PHP / 대한민국 KRW"
  sourceLabel: string;
  rate: number;
  change: number | null; // null 이면 전일 대비 줄을 숨김
  changeRate: number | null; // null 이면 % 배지를 숨김
  changeTrend: FxTrend | null;
  asOf: string;
  sendRate: number | null;
  receiveRate: number | null;
  notices: string[]; // 안내 문구 (참고 환율, 오래된 값)
  summaryText: string;
  averageNote: string;
  periodAverages: FxPeriodAverageRow[];
  screenCurrencies: FxCurrencyChip[];
};

export type FxHistory = {
  currency: string;
  period: FxPeriod;
  points: { date: string; rate: number }[];
  min: number;
  max: number;
  current: number;
  avgText: string; // 반올림한 평균 또는 "데이터 부족"
};

export const fxCurrencyName = (code: string) =>
  (NAMED_CURRENCIES as readonly string[]).includes(code)
    ? i18n.t(`cards.currencyName.${code as (typeof NAMED_CURRENCIES)[number]}`)
    : '';
const currencyName = fxCurrencyName;
const withName = (code: string) => (currencyName(code) ? `${currencyName(code)} ${code}` : code);

// 표시용 반올림: 서버 환율·평균(소수 4자리까지)을 통화별 자릿수(AVG_DECIMALS)로 맞춰 "1,420.58" 처럼 만든다.
// 값 자체를 다시 계산하지 않고 자릿수만 줄인다. 채팅 환율 카드(FX_SUMMARY_CARD)의 기준환율·송금 환율도 이 함수로 보여 준다
export function fmtFxRateByCurrency(n: number, currency: string): string {
  const d = AVG_DECIMALS[currency] ?? 2;
  const abs = Math.round(Math.abs(n) * 10 ** d) / 10 ** d; // 음수는 절댓값으로 반올림하고 부호만 붙인다
  const [int, dec] = abs.toFixed(d).split('.');
  const body = `${int.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}.${dec}`;
  return n < 0 && abs !== 0 ? `-${body}` : body;
}

function fmtAvg(avg: number | null, currency: string): string {
  if (avg === null) return i18n.t('fx.insufficient');
  return fmtFxRateByCurrency(avg, currency);
}

// 평균표 "현재 대비" 표시: 서버 diffRate(소수 2자리)를 자릿수만 2자리로 맞춘다. 0.2 → "+0.20%", -1.1 → "-1.10%".
// 값은 다시 계산하지 않는다. 0 은 부호 없이 "0.00%", 데이터 부족(null)은 "-"
function fmtDiffRate(diffRate: number | null): string {
  if (diffRate === null) return '-';
  return `${diffRate > 0 ? '+' : ''}${diffRate.toFixed(2)}%`;
}

// 전일 대비는 서버가 direction 을 주지 않아 change 부호로 정한다 (화면이 아닌 이 계층에서). 채팅 환율 카드도 같이 쓴다
export function changeTrend(change: number | null): FxTrend | null {
  if (change === null) return null;
  if (change > 0) return 'UP';
  if (change < 0) return 'DOWN';
  return 'FLAT';
}

// 영어 요약 문장. 한국어(summaryText)와 같은 규칙(서버 direction 만 보고 고름, 데이터 부족 구간은 뺌)
const EN_PERIOD: Record<FxPeriod, string> = { '1M': '1-month', '3M': '3-month', '6M': '6-month', '1Y': '1-year' };
const joinEn = (items: string[]) =>
  items.length <= 1 ? items.join('') : `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`;

function summaryTextEn(averages: FxPeriodAverage[]): string {
  const tail = '(Compared with past averages, not a forecast)';
  const namesOf = (list: FxPeriodAverage[]) => list.map((a) => EN_PERIOD[a.period] ?? a.period);
  const valid = averages.filter((a) => a.direction !== null);
  const lacking = namesOf(averages.filter((a) => a.direction === null));
  const lackText = lacking.length ? ` ${joinEn(lacking)}: not enough data, left out of the comparison.` : '';
  if (valid.length === 0) return `Not enough data yet to compare with period averages. ${tail}`;

  const groups = [
    { dir: 'HIGHER' as const, phrase: 'higher than' },
    { dir: 'LOWER' as const, phrase: 'lower than' },
    { dir: 'SAME' as const, phrase: 'about the same as' },
  ]
    .map((g) => ({ ...g, names: namesOf(averages.filter((a) => a.direction === g.dir)) }))
    .filter((g) => g.names.length > 0);

  const part = (g: (typeof groups)[number]) =>
    `${g.phrase} the ${joinEn(g.names)} average${g.names.length > 1 ? 's' : ''}`;
  const body =
    groups.length === 1 && groups[0].names.length === FX_PERIODS.length
      ? `${groups[0].phrase} all four period averages`
      : groups.map(part).join(', and ');
  return `The current rate is ${body}.${lackText} ${tail}`;
}

// 요약 문장: 서버 direction 만 보고 고른다 (숫자 계산 없음). 데이터 부족 구간은 비교에서 뺀다
function summaryText(averages: FxPeriodAverage[]): string {
  if (i18n.language !== 'ko') return summaryTextEn(averages);
  const labelsOf = (dir: FxDirection) =>
    averages.filter((a) => a.direction === dir).map((a) => fxPeriodLabel(a.period));
  const valid = averages.filter((a) => a.direction !== null);
  const lacking = averages.filter((a) => a.direction === null).map((a) => fxPeriodLabel(a.period));
  const lackText = lacking.length ? ` ${lacking.join('·')}은 데이터가 부족해 비교에서 뺐어요.` : '';

  if (valid.length === 0) return `기간 평균과 비교할 데이터가 아직 부족해요. ${SUMMARY_TAIL}`;

  // 예) 모두 같으면 "네 구간 평균보다 모두 낮아요", 섞이면 "1개월 평균보다는 높고, 3개월·6개월·1년 평균보다는 낮아요"
  const groups = [
    { labels: labelsOf('HIGHER'), cmp: '평균보다', adj: '높', end: '아요' },
    { labels: labelsOf('LOWER'), cmp: '평균보다', adj: '낮', end: '아요' },
    { labels: labelsOf('SAME'), cmp: '평균과', adj: '비슷', end: '해요' },
  ].filter((g) => g.labels.length > 0);

  let body: string;
  if (groups.length === 1) {
    const g = groups[0];
    const target = g.labels.length === FX_PERIODS.length ? '네 구간' : g.labels.join('·');
    const all = g.labels.length > 1 ? '모두 ' : '';
    body = `${target} ${g.cmp} ${all}${g.adj}${g.end}.`;
  } else {
    const parts = groups.map((g) => `${g.labels.join('·')} ${g.cmp}는 ${g.adj}`);
    const last = groups[groups.length - 1];
    body = `${parts.join('고, ')}${last.end}.`;
  }
  return `현재 환율은 ${body}${lackText} ${SUMMARY_TAIL}`;
}

function toFxRate(r: FxRateDetailResponse): FxRate {
  const notices = r.notices.map(noticeText).filter((t): t is string => Boolean(t));
  if (r.stale) notices.push(fxStaleText());
  return {
    currency: r.currency,
    pairText: `${withName(r.currency)} / ${i18n.t('fx.quoteName')}`,
    sourceLabel: r.sourceLabel,
    rate: r.rate,
    change: r.change,
    changeRate: r.changeRate,
    changeTrend: changeTrend(r.change),
    asOf: r.asOf,
    sendRate: r.sendRate,
    receiveRate: r.receiveRate,
    notices,
    summaryText: summaryText(r.periodAverages),
    averageNote: i18n.t('fx.averageNote'),
    periodAverages: r.periodAverages.map((a) => ({
      period: a.period,
      label: periodTableLabel(a.period),
      avgText: fmtAvg(a.avg, r.currency),
      diffRateText: fmtDiffRate(a.diffRate),
      trend: a.direction ? DIRECTION_TREND[a.direction] : null,
    })),
    // sort 는 같은 순위끼리 원래(서버) 순서를 지킨다
    screenCurrencies: [...r.screenCurrencies]
      .sort((a, b) => chipRank(a) - chipRank(b))
      .map((code) => ({ code, name: currencyName(code) })),
  };
}

function toFxHistory(h: FxRateHistoryDetailResponse, period: FxPeriod): FxHistory {
  return {
    currency: h.currency,
    period,
    points: h.points,
    min: h.min,
    max: h.max,
    current: h.current,
    avgText: fmtAvg(h.avg, h.currency),
  };
}

// 기준환율, 전일 대비, 기간별 평균 비교, 화면 통화 목록
export async function getFxRate(currency: string): Promise<FxRate> {
  let data: FxRateDetailResponse;
  if (USE_MOCK) {
    await mockDelay();
    data = mockFxRate(currency);
  } else {
    data = (await client.get<FxRateDetailResponse>('/api/v1/fx/rates', { params: { currency } })).data;
  }
  return toFxRate(data);
}

// 기간별 차트 점과 최저·평균·최고·현재
export async function getFxHistory(currency: string, period: FxPeriod): Promise<FxHistory> {
  let data: FxRateHistoryDetailResponse;
  if (USE_MOCK) {
    await mockDelay(250);
    data = mockFxHistory(currency, period);
  } else {
    const res = await client.get<FxRateHistoryDetailResponse>(`/api/v1/fx/rates/${currency}/history`, {
      params: { period },
    });
    data = res.data;
  }
  return toFxHistory(data, period);
}

// ---------------------------------------------------------------------------
// FX-002 목표 환율 알림
// - 설정 카드: GET /fx/rates + GET /fx/rates/{currency}/history?period=1M 을 합친다 (서버에 setup API 없음)
// - 알림: GET·POST /fx/alerts, DELETE /fx/alerts/{alertId}
// - 비교 환율은 화면이 보여 주는 매매기준율과 같게 PHP·USD 모두 rateType 'BASE' 로 보낸다
// - Mock 과 서버 모두 서버 응답 모양을 돌려주고, 화면용 값·문구는 아래 to* 함수에서 만든다
// ---------------------------------------------------------------------------
export type AlertCurrency = MockAlertCurrency;
export const ALERT_CURRENCIES = MOCK_ALERT_CURRENCIES;

const ALERT_RATE_TYPE: FxRateType = 'BASE';

// 통화별 슬라이더·+/- 한 칸 크기
const ALERT_STEP: Record<AlertCurrency, number> = { PHP: 0.05, USD: 1 };

// 이상(GTE)·이하(LTE) 문구 (i18n fx.comparator)
export const comparatorText = (c: FxComparator) => i18n.t(`fx.comparator.${c}`);

// 목표가 현재보다 높으면 이상(GTE), 아니면 이하(LTE). 같은 값은 화면에서 등록을 막는다
export const comparatorFor = (target: number, currentRate: number): FxComparator =>
  target > currentRate ? 'GTE' : 'LTE';

export type FxAlertPreset = { key: string; label: string; value: number };

export type FxAlertSetup = {
  currency: AlertCurrency;
  unit: number;
  rate: number; // 매매기준율 (/fx/rates.rate)
  changeRate: number | null; // null 이면 화면에서 숨김
  asOf: string;
  sourceLabel: string;
  sparkline: number[]; // history.points[].rate
  low: number; // history.min
  high: number; // history.max
  slider: { min: number; max: number; step: number }; // min 은 sliderMin, max 는 history.max 그대로
  presets: FxAlertPreset[];
  defaultPresetKey: string;
};

async function getAlertRate(currency: AlertCurrency): Promise<FxRateResponse> {
  if (USE_MOCK) return mockFxAlertRate(currency);
  const res = await client.get<FxRateResponse>('/api/v1/fx/rates', { params: { currency } });
  return res.data;
}

async function getAlertHistory(currency: AlertCurrency): Promise<FxRateHistoryResponse> {
  if (USE_MOCK) return mockFxAlertHistory(currency);
  const res = await client.get<FxRateHistoryResponse>(`/api/v1/fx/rates/${currency}/history`, {
    params: { period: '1M' },
  });
  return res.data;
}

const decimalsOf = (step: number) => (String(step).split('.')[1] ?? '').length;

// 서버가 프리셋을 주지 않아 API 계층에서 계산: 현재 매매기준율의 -1/-3/-5% 를 통화별 step 단위로 반올림.
// 최저점 프리셋은 history.min 그대로
function alertPresets(rate: number, low: number, step: number): FxAlertPreset[] {
  const toStep = (n: number) => Number((Math.round(n / step) * step).toFixed(decimalsOf(step)));
  return [
    ...[1, 3, 5].map((p) => ({ key: `-${p}%`, label: `-${p}%`, value: toStep(rate * (1 - p / 100)) })),
    { key: 'low', label: i18n.t('fx.presetLow'), value: low },
  ];
}

// 서버가 슬라이더 범위를 주지 않아 API 계층에서 계산: 최솟값은 history.min 과 -5% 프리셋 중 더 낮은 값을
// step 단위로 내림해서, 모든 프리셋이 슬라이더 안에 들어오게 한다. 최댓값은 history.max 그대로
function sliderMin(low: number, presets: FxAlertPreset[], step: number): number {
  const minPreset = presets.find((p) => p.key === '-5%')?.value ?? low;
  const lowest = Math.min(low, minPreset);
  // 0.05 단위 나눗셈 오차(예: 19.95 / 0.05 = 398.99999…)를 없앤 뒤 내림
  const floored = Math.floor(Math.round((lowest / step) * 1000) / 1000) * step;
  return Number(floored.toFixed(decimalsOf(step)));
}

function toAlertSetup(
  currency: AlertCurrency,
  rate: FxRateResponse,
  history: FxRateHistoryResponse,
): FxAlertSetup {
  const step = ALERT_STEP[currency];
  const presets = alertPresets(rate.rate, history.min, step);
  return {
    currency,
    unit: rate.unit,
    rate: rate.rate,
    changeRate: rate.changeRate,
    asOf: rate.asOf,
    sourceLabel: rate.sourceLabel,
    sparkline: history.points.map((p) => p.rate),
    low: history.min,
    high: history.max,
    slider: { min: sliderMin(history.min, presets, step), max: history.max, step },
    presets,
    defaultPresetKey: '-3%',
  };
}

// 알림 설정 화면용: 기준환율, 최근 1개월 흐름, 슬라이더 범위, 프리셋
export async function getFxAlertSetup(currency: AlertCurrency): Promise<FxAlertSetup> {
  if (USE_MOCK) await mockDelay(250);
  const [rate, history] = await Promise.all([getAlertRate(currency), getAlertHistory(currency)]);
  return toAlertSetup(currency, rate, history);
}

// ── 알림 목록 ─────────────────────────────────────────

export type FxAlert = {
  alertId: number;
  currency: string;
  status: 'ACTIVE' | 'TRIGGERED';
  targetText: string; // "목표: 1 USD = 1,350.00 KRW 이하"
  triggeredText: string | null; // "2026.10.24 00:10 · 24.10 KRW에 도달했어요" (TRIGGERED 만)
};

export type FxAlertList = { items: FxAlert[]; activeCount: number };

// "2026-11-12T16:02:00+09:00" → "2026.11.12 16:02" (서버가 준 +09:00 시각 글자를 그대로 자른다)
const fmtDateTime = (iso: string) => `${iso.slice(0, 10).replaceAll('-', '.')} ${iso.slice(11, 16)}`;

function toFxAlert(a: FxAlertResponse): FxAlert {
  const unit = a.unitAmount ?? 1;
  const triggered = a.status === 'TRIGGERED';
  const when = triggered && a.triggeredAt ? fmtDateTime(a.triggeredAt) : null;
  const reached =
    a.triggeredRate !== null
      ? i18n.t('fx.reachedRate', { rate: fmtRate(a.triggeredRate) })
      : i18n.t('fx.reached');
  return {
    alertId: a.alertId,
    currency: a.currency,
    status: triggered ? 'TRIGGERED' : 'ACTIVE',
    targetText: i18n.t('fx.targetText', {
      unit,
      currency: a.currency,
      rate: fmtRate(a.targetRate),
      cmp: comparatorText(a.comparator),
    }),
    triggeredText: triggered ? (when ? `${when} · ${reached}` : reached) : null,
  };
}

// GET /fx/alerts. 서버는 ACTIVE·TRIGGERED 만 주지만, 혹시 온 CANCELLED 는 뺀다. 순서는 서버(최신순) 그대로
async function fetchFxAlerts(): Promise<FxAlertResponse[]> {
  let data: FxAlertListResponse;
  if (USE_MOCK) {
    await mockDelay(200);
    data = mockFxAlerts();
  } else {
    data = (await client.get<FxAlertListResponse>('/api/v1/fx/alerts')).data;
  }
  return data.alerts.filter((a) => a.status !== 'CANCELLED');
}

export async function getFxAlerts(): Promise<FxAlertList> {
  const alerts = await fetchFxAlerts();
  return {
    items: alerts.map(toFxAlert),
    activeCount: alerts.filter((a) => a.status === 'ACTIVE').length,
  };
}

// ── 도달 알림 (폰 상단 로컬 알림 문구) ─────────────────────
// 서버는 알림 문구를 주지 않아서 currency·comparator·targetRate·triggeredRate·triggeredAt 으로 만든다.
// 값은 서버(Mock) 그대로 표시만 하고, 날짜는 triggeredAt 글자에서 월/일만 자른다.

export type FxAlertNotice = { title: string; body: string };

// "2026-11-19T09:00:00+09:00" → "11/19"
const fmtMonthDay = (iso: string) => `${iso.slice(5, 7)}/${iso.slice(8, 10)}`;

// "20.48원 (목표 20.50원 이하 · 11/19)"
function reachedText(a: FxAlertResponse): string {
  const rate = a.triggeredRate !== null ? i18n.t('fx.noticeRate', { rate: fmtRate(a.triggeredRate) }) : '';
  const date = a.triggeredAt ? ` · ${fmtMonthDay(a.triggeredAt)}` : '';
  return `${rate}${i18n.t('fx.noticeTarget', { target: fmtRate(a.targetRate), cmp: comparatorText(a.comparator), date })}`;
}

// 1건: "PHP 목표 환율 도달 · 20.48원 (목표 20.50원 이하 · 11/19)"
// 여러 건: 제목 "목표 환율 알림 2건 도달", 본문은 통화별 한 줄씩
export function toFxAlertNotice(alerts: FxAlertResponse[]): FxAlertNotice {
  if (alerts.length === 1) {
    const a = alerts[0];
    return { title: i18n.t('fx.noticeTitle'), body: i18n.t('fx.noticeBody', { currency: a.currency, text: reachedText(a) }) };
  }
  return {
    title: i18n.t('fx.noticeTitleMany', { n: alerts.length }),
    body: alerts.map((a) => `${a.currency} ${reachedText(a)}`).join('\n'),
  };
}

// 도달(TRIGGERED)한 알림만. 앱을 켤 때·다시 열 때 확인용
export async function getTriggeredFxAlerts(): Promise<FxAlertResponse[]> {
  const alerts = await fetchFxAlerts();
  return alerts.filter((a) => a.status === 'TRIGGERED');
}

// ── 등록·삭제 ─────────────────────────────────────────

export async function createFxAlert(input: {
  currency: AlertCurrency;
  comparator: FxComparator;
  targetRate: number;
}): Promise<FxAlertResponse> {
  const body: FxAlertCreateRequest = { ...input, rateType: ALERT_RATE_TYPE };
  if (USE_MOCK) {
    await mockDelay();
    return mockCreateFxAlert(body);
  }
  const res = await client.post<FxAlertResponse>('/api/v1/fx/alerts', body);
  return res.data;
}

export async function deleteFxAlert(alertId: number): Promise<void> {
  if (USE_MOCK) {
    await mockDelay(200);
    mockDeleteFxAlert(alertId);
    return;
  }
  await client.delete(`/api/v1/fx/alerts/${alertId}`);
}

// ── 오류 문구 (서버 message 는 영어라 code 로 고른다) ────────

export type FxAlertErrorText = { title: string; message: string };

export function createErrorText(
  e: ApiError,
  currency: AlertCurrency,
  comparator: FxComparator,
): FxAlertErrorText {
  switch (e.code) {
    case 'DUPLICATE_REQUEST':
      return {
        title: i18n.t('fx.error.duplicateTitle'),
        message: i18n.t('fx.error.duplicate', { currency, cmp: comparatorText(comparator) }),
      };
    case 'VALIDATION_ERROR':
      return { title: i18n.t('fx.error.createTitle'), message: i18n.t('fx.error.checkTarget') };
    case 'FX_RATE_NOT_FOUND':
      return {
        title: i18n.t('fx.error.createTitle'),
        message: i18n.t('fx.error.noRate'),
      };
    default:
      return { title: i18n.t('fx.error.createTitle'), message: i18n.t('common.retryLater') };
  }
}

// 삭제 실패 문구. RESOURCE_NOT_FOUND 는 이미 없는 알림이라 문구 없이 목록만 새로 불러온다(null)
export function deleteErrorText(e: ApiError): FxAlertErrorText | null {
  if (e.code === 'RESOURCE_NOT_FOUND') return null;
  return { title: i18n.t('fx.error.deleteTitle'), message: i18n.t('common.retryLater') };
}

// 읽을 때마다 지금 언어 문구 (getter)
export const FX_ALERT_LOAD_ERROR = {
  get setup() {
    return i18n.t('fx.loadError');
  },
  get list() {
    return i18n.t('fx.error.list');
  },
};
