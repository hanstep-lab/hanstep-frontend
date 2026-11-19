// 동의 API (CNS-01·02). 화면은 이 파일만 부르고 Mock 인지 모른다.
// ON-003A 마이데이터 연결 전에 MYDATA·MYDATA_TERMS 두 건을 granted=true 로 저장한다(하나라도 없으면 MYD-02 가 403).

import { client } from './client';
import { USE_MOCK, mockDelay } from './config';
import type { ConsentListResponse, ConsentSaveItem, ConsentSaveRequest } from '../types/api';

// Mock: 폰에서 동의 저장(POST)한 직후 실서버 GET /api/v1/consents 응답 그대로 (2026-11-19 11:05 KST, 데모 계정 Reyes).
// 백엔드는 보낸 policyVersion 을 그대로 저장하고, POST 에는 보낸 종류의 최신 상태만 돌려준다
const MOCK_CONSENTS: ConsentListResponse = {
  consents: [
    { id: 4, consentType: 'MYDATA', policyVersion: 'mydata-2026-11', status: 'GRANTED', grantedAt: '2026-11-19T11:02:41+09:00', revokedAt: null, expiresAt: null },
    { id: 5, consentType: 'MYDATA_TERMS', policyVersion: 'mydata-terms-2026-11', status: 'GRANTED', grantedAt: '2026-11-19T11:02:41+09:00', revokedAt: null, expiresAt: null },
    { id: 3, consentType: 'CREDIT_EVALUATION', policyVersion: 'mydata-2026-11', status: 'GRANTED', grantedAt: '2026-11-17T17:02:15+09:00', revokedAt: null, expiresAt: null },
  ],
};

// ON-003A 필수 동의 두 건. consentType·policyVersion 은 명세 CNS-02 예시 기준
export const MYDATA_CONSENTS: ConsentSaveItem[] = [
  { consentType: 'MYDATA', policyVersion: 'mydata-2026-11', granted: true },
  { consentType: 'MYDATA_TERMS', policyVersion: 'mydata-terms-2026-11', granted: true },
];

// GET /api/v1/consents — 종류별 최신 1건. 한 번도 동의하지 않은 종류는 목록에 없다.
// 지금 화면에서는 쓰지 않는다(동의는 ON-003A 에서 매번 직접 받는다). 명세대로 넣어둠
export async function getConsents(): Promise<ConsentListResponse> {
  if (USE_MOCK) {
    await mockDelay();
    return MOCK_CONSENTS;
  }
  const res = await client.get<ConsentListResponse>('/api/v1/consents');
  return res.data;
}

// POST /api/v1/consents — 저장한 종류의 최신 상태를 돌려준다. granted=false 는 철회(REVOKED)
export async function saveConsents(consents: ConsentSaveItem[]): Promise<ConsentListResponse> {
  if (USE_MOCK) {
    await mockDelay();
    const types = consents.map((c) => c.consentType);
    return { consents: MOCK_CONSENTS.consents.filter((c) => types.includes(c.consentType)) };
  }
  const body: ConsentSaveRequest = { consents };
  const res = await client.post<ConsentListResponse>('/api/v1/consents', body);
  return res.data;
}
