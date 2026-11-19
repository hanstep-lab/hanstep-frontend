// 마이데이터 API (MYD-01~03). 화면은 이 파일만 부르고 Mock 인지 모른다.
// 실제 금융기관 연결이 아니라 서버가 Mock 계좌·거래를 적재한다. isMock 은 타입에만 두고 화면에는 표시하지 않는다.
// 화면용 문구(기관 꼬리표·설명, 불러올 정보 이름)는 서버가 주지 않아 아래 표에서 만든다.

import { randomUUID } from 'expo-crypto';
import { client } from './client';
import { USE_MOCK, mockDelay } from './config';
import type {
  ApiError,
  ConnectionCreateRequest,
  ConnectionListResponse,
  InstitutionListResponse,
  InstitutionType,
  MydataScope,
} from '../types/api';

// 연결은 Mock 계좌·거래를 적재해서 기본(10초)보다 길게
const CONNECT_TIMEOUT_MS = 30_000;

// 조회 기간(개월). 명세 기본값과 같고, 연결 모달의 '조회 기간'도 이 값을 쓴다
export const LOOKBACK_MONTHS = 12;

// Mock: 실서버 응답 그대로 (2026-11-19 10:10 KST, 데모 계정 Reyes)
const MOCK_INSTITUTIONS: InstitutionListResponse = {
  institutions: [
    { id: 1, institutionCode: 'SHINHAN_BANK', name: 'Shinhan Bank (Mock)', nameKo: '신한은행', institutionType: 'BANK', isMock: true },
    { id: 2, institutionCode: 'SHINHAN_CARD', name: 'Shinhan Card (Mock)', nameKo: '신한카드', institutionType: 'CARD', isMock: true },
  ],
};

const MOCK_CONNECTIONS: ConnectionListResponse = {
  connected: true,
  connections: [
    {
      id: 1,
      institutionId: 1,
      institutionCode: 'SHINHAN_BANK',
      institutionName: '신한은행',
      status: 'CONNECTED',
      scopes: ['ACCOUNT_BALANCE', 'TRANSACTIONS', 'CARD_USAGE'],
      lookbackMonths: 12,
      lastSyncedAt: '2026-11-16T14:56:07.485+09:00',
      accountCount: 1,
      transactionCount: 96,
      isMock: true,
    },
    {
      id: 2,
      institutionId: 2,
      institutionCode: 'SHINHAN_CARD',
      institutionName: '신한카드',
      status: 'CONNECTED',
      scopes: ['ACCOUNT_BALANCE', 'TRANSACTIONS', 'CARD_USAGE'],
      lookbackMonths: 12,
      lastSyncedAt: '2026-11-16T14:56:07.485+09:00',
      accountCount: 1,
      transactionCount: 245,
      isMock: true,
    },
  ],
};

// GET /api/v1/mydata/institutions — 연결 가능 기관 (MVP: 신한은행·신한카드)
export async function getInstitutions(): Promise<InstitutionListResponse> {
  if (USE_MOCK) {
    await mockDelay();
    return MOCK_INSTITUTIONS;
  }
  const res = await client.get<InstitutionListResponse>('/api/v1/mydata/institutions');
  return res.data;
}

// GET /api/v1/mydata/connections — 기관별 연결 상태. 연결한 적 없으면 connected=false, connections=[]
// 지금 화면에서는 쓰지 않는다(연결 결과는 POST 응답으로 받는다). 명세대로 넣어둠
export async function getConnections(): Promise<ConnectionListResponse> {
  if (USE_MOCK) {
    await mockDelay();
    return MOCK_CONNECTIONS;
  }
  const res = await client.get<ConnectionListResponse>('/api/v1/mydata/connections');
  return res.data;
}

// POST /api/v1/mydata/connections — 고른 기관 연결 + Mock 데이터 적재. 연결 상태 전체를 돌려준다(GET 과 같은 형식).
// MYDATA·MYDATA_TERMS 동의(consents.ts saveConsents)를 먼저 저장해야 한다. 없으면 403 CONSENT_REQUIRED
// Idempotency-Key 는 필수. 누를 때마다 새 uuid (같은 키가 처리 중이면 409 DUPLICATE_REQUEST)
export async function connectInstitutions(
  institutionIds: number[],
  scopes: MydataScope[],
): Promise<ConnectionListResponse> {
  if (USE_MOCK) {
    await mockDelay(800);
    return MOCK_CONNECTIONS;
  }
  const body: ConnectionCreateRequest = { institutionIds, scopes, lookbackMonths: LOOKBACK_MONTHS };
  const res = await client.post<ConnectionListResponse>('/api/v1/mydata/connections', body, {
    headers: { 'Idempotency-Key': randomUUID() },
    timeout: CONNECT_TIMEOUT_MS,
  });
  return res.data;
}

// ── 화면용 문구 ─────────────────────────────────────────

export type InstitutionView = {
  id: number;
  name: string; // 한국어 이름, 없으면 영문
  tag: string | null; // "주거래"
  desc: string | null; // "입출금·적금 계좌, 거래내역"
  scopes: MydataScope[]; // 이 기관을 고르면 불러올 정보
};

// 기관 코드별 꼬리표·설명. 표에 없는 기관은 이름만 보여 준다
const INSTITUTION_TEXT: Record<string, { tag: string; desc: string }> = {
  SHINHAN_BANK: { tag: '주거래', desc: '입출금·적금 계좌, 거래내역' },
  SHINHAN_CARD: { tag: '카드', desc: '카드 이용내역, 결제 예정 금액' },
};

// 업권별 불러올 정보. 은행은 잔액·거래내역, 카드는 이용내역
const TYPE_SCOPES: Partial<Record<InstitutionType, MydataScope[]>> = {
  BANK: ['ACCOUNT_BALANCE', 'TRANSACTIONS'],
  CARD: ['CARD_USAGE'],
};

// 불러올 정보 이름. 이 순서대로 보내고 보여 준다
const SCOPE_LABEL: Record<string, string> = {
  ACCOUNT_BALANCE: '계좌 잔액',
  TRANSACTIONS: '거래내역',
  CARD_USAGE: '카드 이용내역',
  LOANS: '대출',
};
const SCOPE_ORDER = Object.keys(SCOPE_LABEL);

// ON-003A 기관 목록. 순서는 서버 그대로
export async function getInstitutionViews(): Promise<InstitutionView[]> {
  const { institutions } = await getInstitutions();
  return institutions.map((inst) => {
    const text = INSTITUTION_TEXT[inst.institutionCode];
    return {
      id: inst.id,
      name: inst.nameKo ?? inst.name,
      tag: text?.tag ?? null,
      desc: text?.desc ?? null,
      scopes: TYPE_SCOPES[inst.institutionType] ?? [],
    };
  });
}

// 고른 기관들의 불러올 정보를 중복 없이 모은다
export function scopesOf(selected: InstitutionView[]): MydataScope[] {
  const picked = new Set(selected.flatMap((inst) => inst.scopes));
  return SCOPE_ORDER.filter((scope) => picked.has(scope));
}

// ["ACCOUNT_BALANCE", "TRANSACTIONS"] → "계좌 잔액 · 거래내역"
export const scopeText = (scopes: MydataScope[]) =>
  scopes.map((scope) => SCOPE_LABEL[scope] ?? scope).join(' · ');

// ── 오류 문구 (서버 message 는 사용자 언어라 code 로 고른다) ────────

export const MYDATA_LOAD_ERROR = '연결할 금융기관을 불러오지 못했어요.';

// 동의 저장·연결 실패 문구
export function connectErrorText(e: ApiError): string {
  switch (e.code) {
    case 'DUPLICATE_REQUEST':
      return '연결을 처리하고 있어요. 잠시 후 다시 시도해 주세요.';
    case 'NETWORK':
      return '네트워크 연결을 확인하고 다시 시도해 주세요.';
    default:
      return '금융 데이터를 연결하지 못했어요. 잠시 후 다시 시도해 주세요.';
  }
}
