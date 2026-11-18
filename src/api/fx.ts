// 환율 API (FX-001, FX-002). 화면은 이 파일만 부르고 Mock 인지 모른다.
// 앱은 Frankfurter·ECB 를 직접 부르지 않고 항상 우리 백엔드만 부른다.
// TODO: FX-01, FX-02 명세가 오면 경로·필드를 맞출 것. 지금 경로는 가정값.
// 타입은 명세 전까지 따로 만들지 않고 Mock 이 돌려주는 모양을 그대로 쓴다.

import { client } from './client';
import { USE_MOCK, mockDelay } from './config';
import {
  mockFxRate,
  mockFxHistory,
  MOCK_FX_PERIODS,
  type MockFxPeriod,
  mockFxAlertRate,
  mockFxAlertHistory,
  mockFxAlerts,
  mockCreateFxAlert,
  mockDeleteFxAlert,
  MOCK_ALERT_CURRENCIES,
  type MockAlertCurrency,
} from './mock/fx';
import { fmtRate } from '../utils/format';
import type {
  ApiError,
  FxAlertCreateRequest,
  FxAlertListResponse,
  FxAlertResponse,
  FxComparator,
  FxRateHistoryResponse,
  FxRateResponse,
  FxRateType,
} from '../types/api';

export type FxRate = ReturnType<typeof mockFxRate>;
export type FxHistory = ReturnType<typeof mockFxHistory>;
export type FxPeriod = MockFxPeriod;

export const FX_PERIODS = MOCK_FX_PERIODS;

// FX-01: 기준환율, 전일 대비, 기간별 평균 비교
export async function getFxRate(currency: string): Promise<FxRate> {
  if (USE_MOCK) {
    await mockDelay();
    return mockFxRate(currency);
  }
  const res = await client.get<FxRate>('/api/v1/fx/rates', { params: { currency } });
  return res.data;
}

// FX-02: 기간별 차트 점과 최저·평균·최고·현재
export async function getFxHistory(currency: string, period: FxPeriod): Promise<FxHistory> {
  if (USE_MOCK) {
    await mockDelay(250);
    return mockFxHistory(currency, period);
  }
  const res = await client.get<FxHistory>(`/api/v1/fx/rates/${currency}/history`, {
    params: { period },
  });
  return res.data;
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

export const COMPARATOR_TEXT: Record<FxComparator, string> = { GTE: '이상', LTE: '이하' };

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
    { key: 'low', label: '최저점', value: low },
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
    a.triggeredRate !== null ? `${fmtRate(a.triggeredRate)} KRW에 도달했어요` : '목표 환율에 도달했어요';
  return {
    alertId: a.alertId,
    currency: a.currency,
    status: triggered ? 'TRIGGERED' : 'ACTIVE',
    targetText: `목표: ${unit} ${a.currency} = ${fmtRate(a.targetRate)} KRW ${COMPARATOR_TEXT[a.comparator]}`,
    triggeredText: triggered ? (when ? `${when} · ${reached}` : reached) : null,
  };
}

export async function getFxAlerts(): Promise<FxAlertList> {
  let data: FxAlertListResponse;
  if (USE_MOCK) {
    await mockDelay(200);
    data = mockFxAlerts();
  } else {
    data = (await client.get<FxAlertListResponse>('/api/v1/fx/alerts')).data;
  }
  // 서버는 ACTIVE·TRIGGERED 만 주지만, 혹시 온 CANCELLED 는 뺀다. 순서는 서버(최신순) 그대로
  const alerts = data.alerts.filter((a) => a.status !== 'CANCELLED');
  return {
    items: alerts.map(toFxAlert),
    activeCount: alerts.filter((a) => a.status === 'ACTIVE').length,
  };
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
        title: '이미 등록된 알림이 있어요',
        message: `${currency} ${COMPARATOR_TEXT[comparator]} 알림이 이미 있어요. 목록에서 기존 알림을 삭제한 뒤 다시 등록해 주세요.`,
      };
    case 'VALIDATION_ERROR':
      return { title: '등록하지 못했어요', message: '목표 환율을 다시 확인해 주세요.' };
    case 'FX_RATE_NOT_FOUND':
      return {
        title: '등록하지 못했어요',
        message: '이 통화의 환율 정보가 아직 없어요. 잠시 후 다시 시도해 주세요.',
      };
    default:
      return { title: '등록하지 못했어요', message: '잠시 후 다시 시도해 주세요.' };
  }
}

// 삭제 실패 문구. RESOURCE_NOT_FOUND 는 이미 없는 알림이라 문구 없이 목록만 새로 불러온다(null)
export function deleteErrorText(e: ApiError): FxAlertErrorText | null {
  if (e.code === 'RESOURCE_NOT_FOUND') return null;
  return { title: '삭제하지 못했어요', message: '잠시 후 다시 시도해 주세요.' };
}

export const FX_ALERT_LOAD_ERROR = {
  setup: '환율 정보를 불러오지 못했어요. 잠시 후 다시 시도해 주세요.',
  list: '알림 목록을 불러오지 못했어요.',
};
