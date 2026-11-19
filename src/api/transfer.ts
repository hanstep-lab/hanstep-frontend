// 해외송금 API (TRF-01·02, TR-001). 화면은 이 파일만 부르고 Mock 인지 모른다.
// 경로는 명세 기준. 송금 실행 API 는 없어서 submitTransfer 는 USE_MOCK 과 상관없이 항상 Mock.
// 필리핀도 송금 통화는 USD 다. PHP 금액·환율은 참고값이고, 실제 송금 환율은 기본 상품의 usdAppliedRate.

import { client } from './client';
import { USE_MOCK, mockDelay } from './config';
import { MOCK_TRANSFER_CONTEXT, mockQuote, mockSubmit } from './mock/transfer';
import { fmtNumber } from '../utils/format';
import type {
  RemittanceProduct,
  RemittanceProductQuote,
  TransferContext,
  TransferQuote,
  TransferRecipient,
  TransferRequest,
  TransferResult,
} from '../types/api';

// GET /api/v1/transfers/context — 받는 분·출금 계좌·송금 목적
export async function getTransferContext(): Promise<TransferContext> {
  if (USE_MOCK) {
    await mockDelay();
    return MOCK_TRANSFER_CONTEXT;
  }
  const res = await client.get<TransferContext>('/api/v1/transfers/context');
  return res.data;
}

// GET /api/v1/transfers/quote — 내 계좌에서 나갈 원화 총액(수수료 포함)에 대한 견적(추정)
// 잔액보다 크면 422 INSUFFICIENT_BALANCE, 출금 계좌가 없으면 422 INSUFFICIENT_DATA
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
// 완료 화면이 화면에서 본 값과 같도록 견적·받는 분을 그대로 넘긴다.
export async function submitTransfer(
  req: TransferRequest,
  quote: TransferQuote,
  recipient: TransferRecipient,
): Promise<TransferResult> {
  await mockDelay(600);
  return mockSubmit(req, quote, recipient);
}

// ── 화면용 문구 ─────────────────────────────────────────

const PRODUCT_LABEL: Record<RemittanceProduct, string> = {
  SOL_EASY: '쏠편한 해외송금',
  SOL_FAST: '쏠빠른 해외송금',
};
export const productLabel = (product: RemittanceProduct) => PRODUCT_LABEL[product] ?? product;

// 기본 상품(defaultProduct) 견적. receiveAmount 와 적용 송금 환율은 이 상품 기준
export const defaultQuoteOf = (quote: TransferQuote): RemittanceProductQuote | null =>
  quote.quotes.find((q) => q.product === quote.defaultProduct) ?? null;

// 기본 상품으로 이 금액을 보낼 수 있는지
export const canSendQuote = (quote: TransferQuote) => defaultQuoteOf(quote)?.available === true;

// 보낼 수 없는 이유 (quotes[].unavailableReason)
const UNAVAILABLE_TEXT: Record<NonNullable<RemittanceProductQuote['unavailableReason']>, string> = {
  AMOUNT_TOO_SMALL: '금액이 너무 작아 보낼 수 없어요. 수수료를 빼면 보낼 금액이 남지 않아요.',
  LIMIT_EXCEEDED: '한 번에 보낼 수 있는 금액을 넘었어요.',
  FEE_TABLE_UNAVAILABLE: '지금은 수수료 정보를 확인할 수 없어 보낼 수 없어요.',
};

// 참고값 안내 (referenceNotice)
const REFERENCE_NOTICE_TEXT: Record<string, string> = {
  LOCAL_PAYOUT_RATE_DIFFERS: '받는 페소 금액은 참고값이에요. 실제로는 필리핀 은행·취급점 환율로 바뀌어요.',
  PHP_REF_RATE_UNAVAILABLE: '참고 환율을 불러오지 못해 받는 페소 금액을 보여 드릴 수 없어요.',
};

// 견적 아래 안내 문구. 보낼 수 없으면 그 이유만, 아니면 USD 상한 안내와 참고값 안내
export function quoteNoticeText(quote: TransferQuote): string | null {
  const main = defaultQuoteOf(quote);
  if (main && !main.available) {
    return (main.unavailableReason && UNAVAILABLE_TEXT[main.unavailableReason]) || '이 금액으로는 보낼 수 없어요.';
  }
  const lines: string[] = [];
  if (main?.notices.includes('AMOUNT_CAPPED_AT_FEE_BOUNDARY') && main.unusedKrw) {
    lines.push(`수수료 기준(USD 5,000)에 맞춰 USD 5,000.00까지만 보내고, ${fmtNumber(main.unusedKrw)}원은 출금하지 않아요.`);
  }
  if (!quote.receiveAmount) {
    lines.push(
      quote.referenceNotice === 'PHP_REF_RATE_UNAVAILABLE'
        ? REFERENCE_NOTICE_TEXT.PHP_REF_RATE_UNAVAILABLE
        : '참고 환율을 불러오지 못했어요.',
    );
  } else if (REFERENCE_NOTICE_TEXT[quote.referenceNotice]) {
    lines.push(REFERENCE_NOTICE_TEXT[quote.referenceNotice]);
  }
  return lines.length ? lines.join('\n') : null;
}
