// 해외송금 API (TR-001). 화면은 이 파일만 부르고 Mock 인지 모른다.
// TODO: 송금 API 명세가 나오면 경로·필드를 맞출 것. 지금 경로는 가정값.

import { client } from './client';
import { USE_MOCK, mockDelay } from './config';
import { MOCK_TRANSFER_CONTEXT, mockQuote, mockSubmit } from './mock/transfer';
import type {
  TransferContext,
  TransferQuote,
  TransferRequest,
  TransferResult,
} from '../types/api';

// 받는 분·출금 계좌·송금 목적
export async function getTransferContext(): Promise<TransferContext> {
  if (USE_MOCK) {
    await mockDelay();
    return MOCK_TRANSFER_CONTEXT;
  }
  const res = await client.get<TransferContext>('/api/v1/transfers/context');
  return res.data;
}

// 보낼 금액(원)에 대한 수취 예상액·적용 환율
export async function getTransferQuote(amountKRW: number): Promise<TransferQuote> {
  if (USE_MOCK) {
    await mockDelay(200);
    return mockQuote(amountKRW);
  }
  const res = await client.get<TransferQuote>('/api/v1/transfers/quote', {
    params: { amount: amountKRW, currency: 'KRW' },
  });
  return res.data;
}

// 송금 실행. 데모에서는 실제 송금을 하지 않으므로 USE_MOCK 과 상관없이 항상 Mock.
export async function submitTransfer(req: TransferRequest): Promise<TransferResult> {
  await mockDelay(600);
  return mockSubmit(req);
}
