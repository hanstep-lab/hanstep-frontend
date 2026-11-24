// 해외송금 화면(TR-001)의 비교 상품(쏠빠른) 견적: 어느 상품을 비교로 보여 줄지, 받는 금액 문구, 보낼 수 없는 이유
import { compareQuoteOf, compareReceiveOf, productLabel, quoteUnavailableText } from '../transfer';
import { mockQuote } from '../mock/transfer';
import { setAppLanguage } from '../../i18n';
import type { RemittanceProductQuote, TransferQuote } from '../../types/api';

afterEach(() => setAppLanguage('ko'));

// 운영 견적(Reyes, 500,000원, 2026-11-19)의 쏠빠른 값
const FAST: RemittanceProductQuote = {
  ...mockQuote(500000).quotes[1],
  product: 'SOL_FAST',
  available: true,
  unavailableReason: null,
  feeUsd: 3.5,
  sendFeeKrw: null,
  telegraphicFeeKrw: null,
  totalWithdrawKrw: 499988,
  recipientAmountUsd: 368.57,
  recipientAmountPhpRef: 23444.7,
  deliveryType: 'WESTERN_UNION',
};

const withQuotes = (quote: TransferQuote, quotes: RemittanceProductQuote[]): TransferQuote => ({ ...quote, quotes });

describe('compareQuoteOf (비교로 보여 줄 상품)', () => {
  it('기본 상품(쏠편한)이 아닌 쏠빠른 견적을 고른다', () => {
    const quote = mockQuote(500000);
    expect(quote.defaultProduct).toBe('SOL_EASY');
    expect(compareQuoteOf(quote)?.product).toBe('SOL_FAST');
  });

  it('기본 상품 견적만 있으면 비교할 상품이 없다', () => {
    const quote = mockQuote(500000);
    expect(compareQuoteOf(withQuotes(quote, quote.quotes.filter((q) => q.product === 'SOL_EASY')))).toBeNull();
  });

  it('두 상품 모두 보낼 수 없는 금액(4,700원)이면 비교하지 않는다 (안내 문구가 이미 이유를 말함)', () => {
    const quote = mockQuote(4700);
    expect(quote.quotes.every((q) => !q.available)).toBe(true);
    expect(compareQuoteOf(quote)).toBeNull();
  });

  it('쏠편한만 보낼 수 없는 금액(4,800원)이면 보낼 수 있는 쏠빠른을 보여 준다', () => {
    const quote = mockQuote(4800);
    expect(quote.quotes.map((q) => [q.product, q.available])).toEqual([
      ['SOL_EASY', false],
      ['SOL_FAST', true],
    ]);
    expect(compareQuoteOf(quote)?.product).toBe('SOL_FAST');
  });

  it('쏠편한은 되고 쏠빠른만 안 되면 쏠빠른의 보낼 수 없는 이유를 보여 준다', () => {
    const quote = mockQuote(500000);
    const fastOff = { ...quote.quotes[1], available: false, unavailableReason: 'LIMIT_EXCEEDED' as const };
    expect(compareQuoteOf(withQuotes(quote, [quote.quotes[0], fastOff]))?.available).toBe(false);
  });
});

describe('compareReceiveOf (비교 상품의 받는 분 수취 예상)', () => {
  it('PHP 참고 금액은 기본 상품 receiveAmount 처럼 소수점 아래를 버린다 (23,444.7 → 약 23,444 PHP)', () => {
    expect(compareReceiveOf(FAST, mockQuote(500000))).toEqual({ text: '약 23,444 PHP', reference: true });
  });

  it('영어 화면 문구', () => {
    setAppLanguage('en');
    expect(compareReceiveOf(FAST, mockQuote(500000))?.text).toMatch(/23,444 PHP/);
  });

  it('PHP 참고 환율이 없으면 받는 USD 금액, 참고값이 아니다', () => {
    const quote = { ...mockQuote(500000), receiveAmount: null, appliedRate: null };
    expect(compareReceiveOf({ ...FAST, recipientAmountPhpRef: null }, quote)).toEqual({ text: 'US$368.57', reference: false });
  });

  it('보낼 수 없어 금액이 없으면 null', () => {
    expect(compareReceiveOf({ ...FAST, recipientAmountPhpRef: null, recipientAmountUsd: null }, mockQuote(500000))).toBeNull();
  });
});

describe('quoteUnavailableText·productLabel', () => {
  it('보낼 수 없는 이유를 문구로, 모르는 이유는 일반 문구', () => {
    expect(quoteUnavailableText({ ...FAST, available: false, unavailableReason: 'LIMIT_EXCEEDED' })).toBe(
      '한 번에 보낼 수 있는 금액을 넘었어요.',
    );
    expect(quoteUnavailableText({ ...FAST, available: false, unavailableReason: null })).toBe('이 금액으로는 보낼 수 없어요.');
  });

  it('상품 이름 (ko·en)', () => {
    expect(productLabel('SOL_FAST')).toBe('쏠빠른 해외송금');
    setAppLanguage('en');
    expect(productLabel('SOL_EASY')).toBe('SOL Easy overseas transfer');
  });
});
