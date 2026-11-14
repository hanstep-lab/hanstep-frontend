// FX-001 환율 정보 Mock. 서버 역할을 대신하므로 평균·최저·최고·현재 대비 같은 계산은 여기서만 한다.
// 화면은 이 파일을 직접 import 하지 않고 src/api/fx.ts 를 거친다.
// 출처는 ECB 기준환율(백엔드가 하루 1번 수집). 숫자는 전부 Mock 임시값.
// TODO: FX-01, FX-02 명세가 오면 필드 이름을 맞출 것.

const AS_OF = '2026-11-13';

// 최근 1개월(20영업일) 기준환율. 1 PHP 당 KRW. 마지막 값이 현재(기준일) 값.
// FX-002 Figma 값(최저 24.10, 최고 25.00, 현재 24.90, -0.36%)과 맞춰 둠.
const LAST_20 = [
  24.45, 24.38, 24.3, 24.22, 24.1, 24.18, 24.33, 24.41, 24.52, 24.6,
  24.71, 24.66, 24.75, 24.83, 24.88, 24.95, 25.0, 24.93, 24.99, 24.9,
];

const PERIODS = {
  '1M': { days: 20, label: '1개월', tableLabel: '1개월', start: 24.45 },
  '3M': { days: 60, label: '3개월', tableLabel: '3개월(분기)', start: 24.3 },
  '6M': { days: 120, label: '6개월', tableLabel: '6개월(반기)', start: 24.05 },
  '1Y': { days: 240, label: '1년', tableLabel: '1년', start: 23.7 },
} as const;

export type MockFxPeriod = keyof typeof PERIODS;

const round2 = (n: number) => Math.round(n * 100) / 100;
const round1 = (n: number) => Math.round(n * 10) / 10;

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

// 1개월보다 긴 기간은 앞쪽을 완만한 상승 + 작은 물결로 채운다
function rates(period: MockFxPeriod): number[] {
  const { days, start } = PERIODS[period];
  const older = days - LAST_20.length;
  const head = Array.from({ length: older }, (_, i) =>
    round2(start + ((LAST_20[0] - start) * i) / older + 0.15 * Math.sin(i / 4)),
  );
  return [...head, ...LAST_20];
}

export function mockFxHistory(currency: string, period: MockFxPeriod) {
  const values = rates(period);
  const dates = businessDays(values.length);
  return {
    currency,
    period,
    points: values.map((rate, i) => ({ date: dates[i], rate })),
    min: Math.min(...values),
    max: Math.max(...values),
    avg: round2(values.reduce((a, b) => a + b, 0) / values.length),
    current: values[values.length - 1],
  };
}

const CURRENT = LAST_20[LAST_20.length - 1];
const PREV = LAST_20[LAST_20.length - 2];

export function mockFxRate(currency: string) {
  const periodAverages = (Object.keys(PERIODS) as MockFxPeriod[]).map((p) => {
    const avg = mockFxHistory(currency, p).avg;
    return {
      period: p,
      label: PERIODS[p].tableLabel,
      avg,
      diffRate: round1(((CURRENT - avg) / avg) * 100), // 현재가 평균보다 몇 % 높은지
    };
  });

  return {
    currency,
    baseName: '필리핀 PHP',
    quoteName: '대한민국 KRW',
    unit: 1,
    rate: CURRENT,
    change: round2(CURRENT - PREV),
    changeRate: round2(((CURRENT - PREV) / PREV) * 100),
    asOf: AS_OF,
    sourceLabel: 'ECB 기준환율 기반 참고값',
    // ECB 에는 은행 송금 환율이 없어서 비워 둔다. 값이 오면 화면이 보여준다.
    sendRate: null as number | null,
    receiveRate: null as number | null,
    periodAverages,
    summaryText:
      `기간 평균과 비교하면 현재 ${CURRENT.toFixed(2)}원은 네 구간 평균보다 모두 높은 편이에요. ` +
      '급하지 않다면 분할 송금을 고려해 보세요. (과거 평균 비교이며 예측이 아니에요)',
    averageNote: '구간 평균 = 해당 기간 영업일 ECB 기준환율 평균',
  };
}

// 화면 탭 이름. 서버가 기간 목록을 주지 않으면 프론트 상수로 옮길 수 있음.
export const MOCK_FX_PERIODS = (Object.keys(PERIODS) as MockFxPeriod[]).map((key) => ({
  key,
  label: PERIODS[key].label,
}));

// ---------------------------------------------------------------------------
// FX-002 목표 환율 알림 Mock
// 프리셋(-1/-3/-5%), 슬라이더 범위, 최저·최고 같은 계산은 서버 역할이라 여기서만 한다.
// TODO(B): 통화 목록(VND 포함 여부), 슬라이더 기간, 프리셋 의미, 알림 개수 제한·삭제 방식 확인
// ---------------------------------------------------------------------------

const ALERT_CURRENCIES = {
  PHP: { name: '필리핀', unit: 1, scale: 1, step: 0.05 },
  USD: { name: '미국', unit: 1, scale: 1380 / 24.9, step: 1 },
  VND: { name: '베트남', unit: 100, scale: 5.43 / 24.9, step: 0.01 },
  IDR: { name: '인도네시아', unit: 100, scale: 8.65 / 24.9, step: 0.01 },
} as const;

export type MockAlertCurrency = keyof typeof ALERT_CURRENCIES;
export const MOCK_ALERT_CURRENCIES = (Object.keys(ALERT_CURRENCIES) as MockAlertCurrency[]).map(
  (code) => ({ code, name: ALERT_CURRENCIES[code].name }),
);

// 소수 오차 없이 step 단위로 맞추기
const toStep = (n: number, step: number, mode: 'round' | 'floor' = 'round') =>
  round2(Math[mode](Math.round((n / step) * 1000) / 1000) * step);

export function mockFxAlertSetup(currency: MockAlertCurrency) {
  const cfg = ALERT_CURRENCIES[currency];
  // 최근 1개월 흐름을 통화별 크기에 맞춰 늘린 임시값
  const series = LAST_20.map((v) => round2(v * cfg.scale));
  const current = series[series.length - 1];
  const prev = series[series.length - 2];
  const low = Math.min(...series);
  const high = Math.max(...series);

  const presets = [
    ...[1, 3, 5].map((p) => ({
      key: `-${p}%`,
      label: `-${p}%`,
      value: toStep(current * (1 - p / 100), cfg.step),
    })),
    { key: 'low', label: '최저점', value: low },
  ];

  return {
    currency,
    name: cfg.name,
    unit: cfg.unit,
    rate: current,
    changeRate: round2(((current - prev) / prev) * 100),
    asOf: AS_OF,
    sourceLabel: 'ECB 기준환율 기반 참고값',
    sparkline: series,
    low,
    high,
    slider: {
      min: toStep(Math.min(low, presets[2].value), cfg.step, 'floor'),
      max: high,
      step: cfg.step,
    },
    presets,
    defaultPresetKey: '-3%',
  };
}

type MockFxAlert = {
  id: string;
  currency: MockAlertCurrency;
  unit: number;
  target: number;
  direction: 'below' | 'above';
  push: boolean;
  status: 'waiting';
};

// 앱을 끄기 전까지만 유지되는 임시 목록 (서버 저장 대신)
let alerts: MockFxAlert[] = [
  { id: 'alert-1', currency: 'USD', unit: 1, target: 1350, direction: 'below', push: true, status: 'waiting' },
];

export function mockFxAlerts() {
  return { items: [...alerts], activeCount: alerts.length };
}

export function mockCreateFxAlert(input: { currency: MockAlertCurrency; target: number; push: boolean }) {
  const current = mockFxAlertSetup(input.currency).rate;
  const item: MockFxAlert = {
    id: `alert-${Date.now()}`,
    currency: input.currency,
    unit: ALERT_CURRENCIES[input.currency].unit,
    target: input.target,
    direction: input.target <= current ? 'below' : 'above',
    push: input.push,
    status: 'waiting',
  };
  alerts = [item, ...alerts];
  return item;
}

export function mockDeleteFxAlert(id: string) {
  alerts = alerts.filter((a) => a.id !== id);
}
