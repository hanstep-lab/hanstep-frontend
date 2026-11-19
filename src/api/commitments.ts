// 필수 확보액 API (CMT-01~03). 화면은 이 파일만 부르고 Mock 인지 모른다.
// 저장은 전체 교체라서, 화면이 남길 항목 전체를 보낸다(빠진 항목은 서버에서 비활성).

import { client } from './client';
import { USE_MOCK, mockDelay } from './config';
import { mockGetCommitments, mockRemittanceCandidates, mockSaveCommitments } from './mock/commitments';
import type {
  CommitmentListResponse,
  CommitmentSaveRequest,
  RemittanceCandidateListResponse,
} from '../types/api';

// CMT-01: 활성 항목 + 유형별 합계(서버 계산값)
export async function getCommitments(): Promise<CommitmentListResponse> {
  if (USE_MOCK) {
    await mockDelay();
    return mockGetCommitments();
  }
  const res = await client.get<CommitmentListResponse>('/api/v1/commitments');
  return res.data;
}

// CMT-02: 일괄 저장(전체 교체)
export async function saveCommitments(req: CommitmentSaveRequest): Promise<CommitmentListResponse> {
  if (USE_MOCK) {
    await mockDelay();
    return mockSaveCommitments(req);
  }
  const res = await client.put<CommitmentListResponse>('/api/v1/commitments', req);
  return res.data;
}

// CMT-03: 거래내역에서 찾은 정기 해외송금 후보(최대 3개). 마이데이터 미연결이면 빈 배열
export async function getRemittanceCandidates(): Promise<RemittanceCandidateListResponse> {
  if (USE_MOCK) {
    await mockDelay();
    return mockRemittanceCandidates();
  }
  const res = await client.get<RemittanceCandidateListResponse>('/api/v1/commitments/remittance-candidates');
  return res.data;
}
