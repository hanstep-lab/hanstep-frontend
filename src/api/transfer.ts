// 해외송금 API (TRF-01·02, TR-001). 화면은 이 파일만 부르고 Mock 인지 모른다.
// 경로는 명세 기준. 송금 실행 API 는 없어서 submitTransfer 는 USE_MOCK 과 상관없이 항상 Mock.
// 필리핀도 송금 통화는 USD 다. PHP 금액·환율은 참고값이고, 실제 송금 환율은 기본 상품의 usdAppliedRate.

import { client } from './client';
import { USE_MOCK, mockDelay } from './config';
import { MOCK_TRANSFER_CONTEXT, mockQuote, mockSubmit } from './mock/transfer';
import { fmtNumber } from '../utils/format';
import { errorText } from '../utils/errorText';
import i18n, { isKoreanUi } from '../i18n';
import type {
  ApiError,
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

// 송금 상품 이름 (i18n transfer.product)
const PRODUCTS: readonly RemittanceProduct[] = ['SOL_EASY', 'SOL_FAST'];
export const productLabel = (product: RemittanceProduct) =>
  PRODUCTS.includes(product) ? i18n.t(`transfer.product.${product}`) : product;

// 받는 분 국가명. 서버 country 는 한국어("필리핀")라 영어 화면은 countryCode 로 영어 이름을 쓴다.
// 표에 없는 코드는 서버 값 그대로 (한국어 화면은 항상 서버 값)
const COUNTRY_EN: Record<string, string> = { PH: 'Philippines', VN: 'Vietnam', CN: 'China', US: 'United States' };
export const recipientCountry = (r: Pick<TransferRecipient, 'country' | 'countryCode'>) =>
  (!isKoreanUi() && COUNTRY_EN[r.countryCode]) || r.country;

// 기본 상품(defaultProduct) 견적. receiveAmount 와 적용 송금 환율은 이 상품 기준
export const defaultQuoteOf = (quote: TransferQuote): RemittanceProductQuote | null =>
  quote.quotes.find((q) => q.product === quote.defaultProduct) ?? null;

// 기본 상품으로 이 금액을 보낼 수 있는지
export const canSendQuote = (quote: TransferQuote) => defaultQuoteOf(quote)?.available === true;

// 보낼 수 없는 이유 (quotes[].unavailableReason, i18n transfer.unavailable)
type UnavailableReason = NonNullable<RemittanceProductQuote['unavailableReason']>;
const UNAVAILABLE_REASONS: readonly UnavailableReason[] = ['AMOUNT_TOO_SMALL', 'LIMIT_EXCEEDED', 'FEE_TABLE_UNAVAILABLE'];
const unavailableText = (r: UnavailableReason | null | undefined) =>
  r && UNAVAILABLE_REASONS.includes(r) ? i18n.t(`transfer.unavailable.${r}`) : null;

// 참고값 안내 (referenceNotice, i18n transfer.reference)
const REFERENCE_NOTICES = ['LOCAL_PAYOUT_RATE_DIFFERS', 'PHP_REF_RATE_UNAVAILABLE'] as const;
const referenceNoticeText = (code: string) =>
  (REFERENCE_NOTICES as readonly string[]).includes(code)
    ? i18n.t(`transfer.reference.${code as (typeof REFERENCE_NOTICES)[number]}`)
    : null;

// 견적 아래 안내 문구. 보낼 수 없으면 그 이유만, 아니면 USD 상한 안내와 참고값 안내
export function quoteNoticeText(quote: TransferQuote): string | null {
  const main = defaultQuoteOf(quote);
  if (main && !main.available) {
    return unavailableText(main.unavailableReason) || i18n.t('transfer.cannotSend');
  }
  const lines: string[] = [];
  if (main?.notices.includes('AMOUNT_CAPPED_AT_FEE_BOUNDARY') && main.unusedKrw) {
    lines.push(i18n.t('transfer.capped', { amount: fmtNumber(main.unusedKrw) }));
  }
  if (!quote.receiveAmount) {
    lines.push(
      quote.referenceNotice === 'PHP_REF_RATE_UNAVAILABLE'
        ? i18n.t('transfer.reference.PHP_REF_RATE_UNAVAILABLE')
        : i18n.t('transfer.refRateFailed'),
    );
  } else {
    const ref = referenceNoticeText(quote.referenceNotice);
    if (ref) lines.push(ref);
  }
  return lines.length ? lines.join('\n') : null;
}

// ── 오류 문구 ─────────────────────────────────────────
// 서버 message 는 사용자 언어(예: Reyes 는 vi)로 와서 아는 code 는 한국어 문구를 고른다(utils/errorText 관례).
// 여기 없는 code 는 공통 errorText(네트워크·401·5xx 등)로 넘기고, 그래도 없으면 fallback 문구.
// 문구는 i18n transfer.error. INSUFFICIENT_DATA 는 출금 계좌 없음(NO_ACCOUNT)
const ERROR_CODES = ['INSUFFICIENT_BALANCE', 'INSUFFICIENT_DATA'] as const;

export const transferErrorText = (e: ApiError, fallback: string) =>
  (ERROR_CODES as readonly string[]).includes(e.code)
    ? i18n.t(`transfer.error.${e.code as (typeof ERROR_CODES)[number]}`)
    : errorText(e, fallback);
