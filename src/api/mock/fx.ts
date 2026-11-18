// FX-001 환율 정보 Mock. 서버(GET /fx/rates, /fx/rates/{currency}/history)와 같은 모양을 돌려준다.
// 서버 역할을 대신하므로 평균·최저·최고·현재 대비·direction 같은 계산은 여기서만 한다.
// 화면 문구(통화 이름·구간 이름·요약 문장·평균 설명·안내 문구)는 서버처럼 주지 않는다 (src/api/fx.ts 가 만든다).
// 화면은 이 파일을 직접 import 하지 않고 src/api/fx.ts 를 거친다. 숫자는 전부 Mock 임시값.

import type {
  ApiError,
  FxAlertCreateRequest,
  FxAlertListResponse,
  FxAlertResponse,
  FxDirection,
  FxPeriod,
  FxPeriodAverage,
  FxRateDetailResponse,
  FxRateHistoryDetailResponse,
  FxRateHistoryResponse,
  FxRateResponse,
  FxRateSource,
} from '../../types/api';

// "데이터 부족"(1Y 평균 null, reason INSUFFICIENT_DATA) 화면을 Mock 으로 보려면 true 로 바꾼다.
// 켜면 1Y 는 데이터가 기간보다 짧은 것처럼 최근 180영업일 점만 주고 평균을 내지 않는다.
const MOCK_INSUFFICIENT_1Y = false;

const AS_OF = '2026-11-13';

// 최근 1개월(20영업일) 기준환율. 1 PHP 당 KRW. 마지막 값이 현재(기준일) 값.
// FX-002 Figma 값(최저 24.10, 최고 25.00, 현재 24.90, -0.36%)과 맞춰 둠.
const LAST_20 = [
  24.45, 24.38, 24.3, 24.22, 24.1, 24.18, 24.33, 24.41, 24.52, 24.6,
  24.71, 24.66, 24.75, 24.83, 24.88, 24.95, 25.0, 24.93, 24.99, 24.9,
];

// 기간별 영업일 수와 시작값(1개월보다 긴 기간의 앞쪽을 채울 때 씀)
const PERIODS: Record<FxPeriod, { days: number; start: number }> = {
  '1M': { days: 20, start: 24.45 },
  '3M': { days: 60, start: 24.3 },
  '6M': { days: 120, start: 24.05 },
  '1Y': { days: 240, start: 23.7 },
};
const PERIOD_KEYS = Object.keys(PERIODS) as FxPeriod[];
const INSUFFICIENT_1Y_DAYS = 180;

// FX-001 화면 통화. 서버 screenCurrencies 와 같은 순서(USD, PHP)
const RATE_CURRENCIES = {
  USD: {
    scale: 1380 / 24.9,
    source: 'KOREAEXIM' as FxRateSource,
    sourceLabel: '수출입은행 고시 매매기준율',
    hasBankRates: true,
    notices: [] as string[],
  },
  PHP: {
    scale: 1,
    source: 'MARKET_REF' as FxRateSource,
    sourceLabel: 'ECB 기준환율 기반 참고값',
    hasBankRates: false,
    notices: ['REFERENCE_RATE_ONLY'],
  },
} as const;
type MockRateCurrency = keyof typeof RATE_CURRENCIES;
const SCREEN_CURRENCIES = Object.keys(RATE_CURRENCIES) as MockRateCurrency[];

const round2 = (n: number) => Math.round(n * 100) / 100;
const round4 = (n: number) => Math.round(n * 10000) / 10000;

// 기준일에서 거꾸로 n영업일(주말 제외) 날짜 목록. 오래된 날짜가 앞.
function businessDays(n: number): string[] {
  const out: string[] = [];
  const d = new Date(`${AS_OF}T00:00:00Z`);
  while (out.length < n) {
    const day = d.getUTCDay();
    if (day !== 0 && day !== 6) out.unshift(d.toISOString().slice(0, 10));
    d.setUTCDate(d.getUTCDate() - 1);
  }
  return out;
}

// 1개월보다 긴 기간은 앞쪽을 완만한 상승 + 작은 물결로 채운다 (PHP 크기)
function rates(period: FxPeriod): number[] {
  const { days, start } = PERIODS[period];
  const older = days - LAST_20.length;
  const head = Array.from({ length: older }, (_, i) =>
    round2(start + ((LAST_20[0] - start) * i) / older + 0.15 * Math.sin(i / 4)),
  );
  return [...head, ...LAST_20];
}

// 서버처럼 화면 통화가 아니면 400 VALIDATION_ERROR
function rateCurrency(currency: string): MockRateCurrency {
  if (!(currency in RATE_CURRENCIES)) {
    throw { code: 'VALIDATION_ERROR', message: 'invalid request' } satisfies ApiError;
  }
  return currency as MockRateCurrency;
}

const insufficient = (period: FxPeriod) => MOCK_INSUFFICIENT_1Y && period === '1Y';

// 통화 크기로 늘린 기간 값. 데이터 부족이면 최근 값만 남긴다
function series(currency: MockRateCurrency, period: FxPeriod): number[] {
  const values = rates(period).map((v) => round2(v * RATE_CURRENCIES[currency].scale));
  return insufficient(period) ? values.slice(-INSUFFICIENT_1Y_DAYS) : values;
}

const average = (values: number[]) => round4(values.reduce((a, b) => a + b, 0) / values.length);

// GET /api/v1/fx/rates/{currency}/history?period=
export function mockFxHistory(currency: string, period: FxPeriod): FxRateHistoryDetailResponse {
  const code = rateCurrency(currency);
  const values = series(code, period);
  const dates = businessDays(values.length);
  const lack = insufficient(period);
  return {
    currency: code,
    period,
    points: values.map((rate, i) => ({ date: dates[i], rate })),
    min: Math.min(...values),
    max: Math.max(...values),
    avg: lack ? null : average(values),
    current: values[values.length - 1],
    businessDays: values.length,
    reason: lack ? 'INSUFFICIENT_DATA' : null,
    source: RATE_CURRENCIES[code].source,
    isMock: true,
    asOf: AS_OF,
  };
}

// 서버 규칙: ±0.10% 이내면 SAME
function directionOf(diffRate: number): FxDirection {
  if (Math.abs(diffRate) <= 0.1) return 'SAME';
  return diffRate > 0 ? 'HIGHER' : 'LOWER';
}

function periodAverage(currency: MockRateCurrency, period: FxPeriod, current: number): FxPeriodAverage {
  const { avg, businessDays: days, reason } = mockFxHistory(currency, period);
  if (avg === null) {
    return { period, avg: null, diff: null, diffRate: null, direction: null, businessDays: days, reason };
  }
  const diff = round4(current - avg);
  const diffRate = round2((diff / avg) * 100);
  return { period, avg, diff, diffRate, direction: directionOf(diffRate), businessDays: days, reason: null };
}

// GET /api/v1/fx/rates?currency=
export function mockFxRate(currency: string): FxRateDetailResponse {
  const code = rateCurrency(currency);
  const cfg = RATE_CURRENCIES[code];
  const values = series(code, '1M');
  const current = values[values.length - 1];
  const prev = values[values.length - 2];
  const change = round4(current - prev);
  return {
    currency: code,
    unit: 1,
    rate: current,
    // 은행 송금 환율은 수출입은행 고시 통화(USD)만 있다. 값은 Mock 임시값
    sendRate: cfg.hasBankRates ? round2(current * 1.01) : null,
    receiveRate: cfg.hasBankRates ? round2(current * 0.99) : null,
    change,
    changeRate: round2((change / prev) * 100),
    asOf: AS_OF,
    sourceLabel: cfg.sourceLabel,
    source: cfg.source,
    isMock: true,
    rateAt: `${AS_OF}T00:00:00+09:00`,
    fetchedAt: `${AS_OF}T11:00:00+09:00`,
    stale: false,
    notices: [...cfg.notices],
    periodAverages: PERIOD_KEYS.map((p) => periodAverage(code, p, current)),
    screenCurrencies: [...SCREEN_CURRENCIES],
  };
}

// ---------------------------------------------------------------------------
// FX-002 목표 환율 알림 Mock. 서버(GET /fx/rates, /fx/rates/{currency}/history, /fx/alerts)와 같은 모양을 돌려준다.
// 프리셋·슬라이더 step 은 서버가 주지 않아서 Mock 도 주지 않는다 (src/api/fx.ts 가 계산).
// 서버 규칙 흉내: 같은 통화·comparator 의 ACTIVE 는 1개(DUPLICATE_REQUEST), rateType 을 빼면 SEND,
// PHP 는 송금 환율이 없어 SEND 면 VALIDATION_ERROR. 숫자는 전부 Mock 임시값.
// ---------------------------------------------------------------------------

const ALERT_CURRENCIES = {
  PHP: { name: '필리핀', scale: 1, sourceLabel: 'ECB 기준환율 기반 참고값', hasSendRate: false },
  USD: { name: '미국', scale: 1380 / 24.9, sourceLabel: '수출입은행 고시 매매기준율', hasSendRate: true },
} as const;

export type MockAlertCurrency = keyof typeof ALERT_CURRENCIES;
export const MOCK_ALERT_CURRENCIES = (Object.keys(ALERT_CURRENCIES) as MockAlertCurrency[]).map(
  (code) => ({ code, name: ALERT_CURRENCIES[code].name }),
);

// 최근 1개월 흐름을 통화별 크기에 맞춰 늘린 임시값
const alertSeries = (currency: MockAlertCurrency) =>
  LAST_20.map((v) => round2(v * ALERT_CURRENCIES[currency].scale));

// GET /api/v1/fx/rates 중 알림 화면이 쓰는 필드
export function mockFxAlertRate(currency: MockAlertCurrency): FxRateResponse {
  const series = alertSeries(currency);
  const current = series[series.length - 1];
  const prev = series[series.length - 2];
  return {
    currency,
    unit: 1,
    rate: current,
    changeRate: round2(((current - prev) / prev) * 100),
    asOf: AS_OF,
    sourceLabel: ALERT_CURRENCIES[currency].sourceLabel,
  };
}

// GET /api/v1/fx/rates/{currency}/history?period=1M 중 알림 화면이 쓰는 필드
export function mockFxAlertHistory(currency: MockAlertCurrency): FxRateHistoryResponse {
  const series = alertSeries(currency);
  const dates = businessDays(series.length);
  return {
    currency,
    period: '1M',
    points: series.map((rate, i) => ({ date: dates[i], rate })),
    min: Math.min(...series),
    max: Math.max(...series),
    current: series[series.length - 1],
    asOf: AS_OF,
  };
}

// 앱을 끄기 전까지만 유지되는 임시 목록 (서버 저장 대신). 만든 시각 최신순
let alerts: FxAlertResponse[] = [
  {
    alertId: 2,
    currency: 'USD',
    rateType: 'BASE',
    comparator: 'LTE',
    targetRate: 1350,
    unitAmount: 1,
    status: 'ACTIVE',
    createdAt: '2026-11-12T10:00:00+09:00',
    triggeredAt: null,
    triggeredRate: null,
  },
  {
    // LAST_20 의 최저점(2026-10-23, 24.10)에서 도달한 예시
    alertId: 1,
    currency: 'PHP',
    rateType: 'BASE',
    comparator: 'LTE',
    targetRate: 24.15,
    unitAmount: 1,
    status: 'TRIGGERED',
    createdAt: '2026-10-20T09:00:00+09:00',
    triggeredAt: '2026-10-24T00:10:00+09:00',
    triggeredRate: 24.1,
  },
];
let nextAlertId = 3;

// 지금 시각을 서버처럼 "+09:00" 문자열로
const nowKst = () => `${new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().slice(0, 19)}+09:00`;

export function mockFxAlerts(): FxAlertListResponse {
  return { alerts: alerts.filter((a) => a.status !== 'CANCELLED') };
}

export function mockCreateFxAlert(req: FxAlertCreateRequest): FxAlertResponse {
  const rateType = req.rateType ?? 'SEND';
  const cfg = ALERT_CURRENCIES[req.currency as MockAlertCurrency];
  if (!cfg) {
    throw { code: 'FX_RATE_NOT_FOUND', message: 'exchange rate not found' } satisfies ApiError;
  }
  if (rateType === 'SEND' && !cfg.hasSendRate) {
    throw { code: 'VALIDATION_ERROR', message: 'invalid request' } satisfies ApiError;
  }
  const duplicate = alerts.some(
    (a) => a.status === 'ACTIVE' && a.currency === req.currency && a.comparator === req.comparator,
  );
  if (duplicate) {
    throw { code: 'DUPLICATE_REQUEST', message: 'duplicate request' } satisfies ApiError;
  }
  const item: FxAlertResponse = {
    alertId: nextAlertId++,
    currency: req.currency,
    rateType,
    comparator: req.comparator,
    targetRate: req.targetRate,
    unitAmount: 1,
    status: 'ACTIVE',
    createdAt: nowKst(),
    triggeredAt: null,
    triggeredRate: null,
  };
  alerts = [item, ...alerts];
  return item;
}

// 서버처럼 행을 지우지 않고 CANCELLED 로 바꿔 목록에서 뺀다
export function mockDeleteFxAlert(alertId: number) {
  alerts = alerts.map((a) => (a.alertId === alertId ? { ...a, status: 'CANCELLED' } : a));
}
