// TR-001 Mock 송금 데이터. 화면은 이 파일을 직접 import 하지 않고 src/api/transfer.ts 를 거친다.
// 값은 실서버 응답 그대로 (2026-11-19 12:34 KST, 데모 계정 Reyes): 화면 정보, 견적의 환율·상품 조건·출처, 잔액 초과 오류.
// 견적 금액만 입력에 따라 명세(RemittanceProductQuote) 설명의 공식으로 다시 계산한다. 700,000원·4,700원이면 실서버 응답과 같은 값이 나온다.
// USD 5,000 를 넘는 구간(쏠편한 수수료 10,000원·상한, 쏠빠른 건당 한도)은 흉내 내지 않는다.

import type {
  ApiError,
  AppliedRate,
  RemittanceProductQuote,
  RemittanceQuoteRates,
  TransferContext,
  TransferQuote,
  TransferRecipient,
  TransferRequest,
  TransferResult,
} from '../../types/api';

const LORNA: TransferRecipient = {
  recipientId: 1,
  name: 'LORNA REYES',
  relation: '어머니',
  bank: 'BDO',
  accountLast4: '5566',
  country: '필리핀',
  countryCode: 'PH',
  currency: 'PHP',
};

export const MOCK_TRANSFER_CONTEXT: TransferContext = {
  recipient: LORNA,
  recipients: [
    LORNA,
    {
      recipientId: 2,
      name: 'MARK ANTHONY REYES',
      relation: '본인 계좌',
      bank: 'BPI',
      accountLast4: '7788',
      country: '필리핀',
      countryCode: 'PH',
      currency: 'PHP',
    },
  ],
  account: {
    name: '신한 주거래 우대통장',
    number: '110-***-**4821',
    balance: { amount: 9_924_200, currency: 'KRW' },
  },
  purpose: { code: 'FAMILY_SUPPORT', label: '가족 생활비 (Family support)' },
  quickAmounts: [100_000, 500_000, 1_000_000],
  isMock: true,
};

// ── 견적: 금액과 무관한 값 (실서버 GET /transfers/quote 응답 그대로) ─────────────

const RATES: RemittanceQuoteRates = {
  usdBaseRate: 1331.1,
  usdRateDate: '2026-11-19',
  usdSource: 'KOREAEXIM',
  phpRefRate: 20.926,
  phpRateDate: '2026-11-18',
  phpSource: 'frankfurter-ecb',
  usdPhpRefRate: 63.6099,
};

const PHP_REF_RATE: AppliedRate = {
  currency: 'PHP',
  unit: 1,
  rate: 20.926,
  sourceLabel: 'ECB 기준환율 기반 참고값',
  asOf: '2026-11-18',
  isMock: false,
};

type Conditions = Pick<
  RemittanceProductQuote,
  'product' | 'spreadPct' | 'preferentialPct' | 'remittanceCount1y' | 'usdAppliedRate' | 'deliveryType' | 'notices' | 'sources'
>;
type Amounts = Pick<
  RemittanceProductQuote,
  | 'sendAmountUsd'
  | 'krwPrincipal'
  | 'fxMarginKrw'
  | 'sendFeeKrw'
  | 'telegraphicFeeKrw'
  | 'feeUsd'
  | 'totalWithdrawKrw'
  | 'unusedKrw'
  | 'recipientAmountUsd'
  | 'recipientAmountPhpRef'
>;

const SOURCE_USD_BASE = { item: 'usdBaseRate', title: '한국수출입은행 현재환율 Open API 매매기준율(USD)', approvalNo: null, checkedOn: '2026-11-19' };
const SOURCE_SPREAD = { item: 'spreadPct', title: '신한은행 국제환율 고시표 2026-11-18 09:07 11회차(매매기준율 1,331.50 / 보내실 때 1,344.20)', approvalNo: null, checkedOn: '2026-11-18' };
const SOURCE_PHP_REF = { item: 'phpRefRate', title: 'Frankfurter v2 ECB 기준환율(PHP)', approvalNo: null, checkedOn: '2026-11-18' };
const EASY_GUIDE = { title: '신한 SOL 쏠편한 해외송금 안내', approvalNo: '준법감시인 사전심사필 제2026-14794-1호(2026.09.16~2027.09.15)', checkedOn: '2026-11-18' };
const FAST_TERMS = { title: '신한 쏠빠른 해외송금 상품설명서·거래약관(제9조)', approvalNo: '준법감시인 사전심사필 제2026-12828-2호(2026.06.17~2027.06.16)', checkedOn: '2026-11-18' };

const EASY: Conditions = {
  product: 'SOL_EASY',
  spreadPct: 0.954,
  preferentialPct: 70,
  remittanceCount1y: 23,
  usdAppliedRate: 1334.91,
  deliveryType: 'SWIFT_ACCOUNT',
  notices: ['INTERMEDIARY_FEE_MAY_APPLY', 'LOCAL_PAYOUT_RATE_DIFFERS', 'FOREIGN_EXCHANGE_BANK_DESIGNATION_REQUIRED'],
  sources: [
    SOURCE_USD_BASE,
    SOURCE_SPREAD,
    { item: 'preferentialPct', ...EASY_GUIDE },
    { item: 'remittanceCount1y', title: '마이데이터 거래내역 해외송금 건수(Mock)', approvalNo: null, checkedOn: '2026-11-19' },
    { item: 'sendFeeKrw', ...EASY_GUIDE },
    { item: 'telegraphicFeeKrw', ...EASY_GUIDE },
    SOURCE_PHP_REF,
  ],
};

const FAST: Conditions = {
  product: 'SOL_FAST',
  spreadPct: 0.954,
  preferentialPct: 0,
  remittanceCount1y: null,
  usdAppliedRate: 1343.8,
  deliveryType: 'WESTERN_UNION',
  notices: ['LOCAL_PAYOUT_RATE_BY_AGENT', 'LOCAL_PAYOUT_RATE_DIFFERS', 'FOREIGN_EXCHANGE_BANK_DESIGNATION_REQUIRED'],
  sources: [
    SOURCE_USD_BASE,
    SOURCE_SPREAD,
    { item: 'feeUsd', ...FAST_TERMS },
    { item: 'perTransferLimitUsd', ...FAST_TERMS },
    SOURCE_PHP_REF,
  ],
};

const TELEGRAPHIC_FEE_KRW = 5_000; // 쏠편한 전신료 (송금수수료는 USD 5,000 이하 0원)
const FAST_FEE_USD = 3.5; // 쏠빠른 송금수수료

// 부동소수 오차를 먼저 걷어 낸 뒤 자른다: 0.01 USD 내림, 원 단위 올림, 0.01 반올림
const floor2 = (n: number) => Math.floor(n * 100 + 1e-9) / 100;
const ceilWon = (n: number) => Math.ceil(n - 1e-6);
const round2 = (n: number) => Math.round(n * 100) / 100;
const phpRef = (usd: number) => (RATES.usdPhpRefRate === null ? null : round2(usd * RATES.usdPhpRefRate));

const NO_AMOUNTS: Amounts = {
  sendAmountUsd: null,
  krwPrincipal: null,
  fxMarginKrw: null,
  sendFeeKrw: null,
  telegraphicFeeKrw: null,
  feeUsd: null,
  totalWithdrawKrw: null,
  unusedKrw: null,
  recipientAmountUsd: null,
  recipientAmountPhpRef: null,
};

// 쏠편한: 출금 총액에서 전신료를 빼고 적용 환율로 USD 를 산다
function easyAmounts(krw: number): Amounts | null {
  const usd = floor2((krw - TELEGRAPHIC_FEE_KRW) / EASY.usdAppliedRate);
  if (usd <= 0) return null;
  const principal = ceilWon(usd * EASY.usdAppliedRate);
  return {
    sendAmountUsd: usd,
    krwPrincipal: principal,
    fxMarginKrw: Math.round(usd * (EASY.usdAppliedRate - RATES.usdBaseRate)),
    sendFeeKrw: 0,
    telegraphicFeeKrw: TELEGRAPHIC_FEE_KRW,
    feeUsd: null,
    totalWithdrawKrw: principal + TELEGRAPHIC_FEE_KRW,
    unusedKrw: null,
    recipientAmountUsd: usd,
    recipientAmountPhpRef: phpRef(usd),
  };
}

// 쏠빠른: 송금 USD + 수수료 USD 를 같은 환율로 출금
function fastAmounts(krw: number): Amounts | null {
  const usd = floor2(krw / FAST.usdAppliedRate - FAST_FEE_USD);
  if (usd <= 0) return null;
  return {
    sendAmountUsd: usd,
    krwPrincipal: ceilWon(usd * FAST.usdAppliedRate),
    fxMarginKrw: Math.round(usd * (FAST.usdAppliedRate - RATES.usdBaseRate)),
    sendFeeKrw: null,
    telegraphicFeeKrw: null,
    feeUsd: FAST_FEE_USD,
    totalWithdrawKrw: ceilWon((usd + FAST_FEE_USD) * FAST.usdAppliedRate),
    unusedKrw: null,
    recipientAmountUsd: usd,
    recipientAmountPhpRef: phpRef(usd),
  };
}

function toQuote(c: Conditions, amounts: Amounts | null): RemittanceProductQuote {
  return {
    ...c,
    available: amounts !== null,
    unavailableReason: amounts ? null : 'AMOUNT_TOO_SMALL', // 수수료를 빼면 0 이하
    ...(amounts ?? NO_AMOUNTS),
  };
}

function checkBalance(krw: number) {
  if (krw > MOCK_TRANSFER_CONTEXT.account.balance.amount) {
    // 실서버 422 응답의 code·message 그대로
    const error: ApiError = { code: 'INSUFFICIENT_BALANCE', message: 'insufficient balance' };
    throw error;
  }
}

export function mockQuote(krw: number): TransferQuote {
  checkBalance(krw);
  const easy = toQuote(EASY, easyAmounts(krw));
  return {
    recipientId: LORNA.recipientId,
    sendAmount: { amount: krw, currency: 'KRW' },
    // 기본 상품(쏠편한) 기준, 1 PHP 내림. 쏠편한으로 못 보내면 null
    receiveAmount:
      easy.recipientAmountPhpRef === null ? null : { amount: Math.floor(easy.recipientAmountPhpRef), currency: 'PHP' },
    appliedRate: PHP_REF_RATE,
    isReference: true,
    referenceNotice: 'LOCAL_PAYOUT_RATE_DIFFERS',
    sendCurrency: 'USD',
    defaultProduct: 'SOL_EASY',
    isEstimated: true,
    rates: RATES,
    quotes: [easy, toQuote(FAST, fastAmounts(krw))],
  };
}

// 송금 실행 API 가 없어 화면에 보여 준 견적·받는 분으로 결과를 만든다
export function mockSubmit(
  req: TransferRequest,
  quote: TransferQuote,
  recipient: TransferRecipient,
): TransferResult {
  const main = quote.quotes.find((q) => q.product === quote.defaultProduct);
  return {
    transferId: `MOCK-${Date.now()}`,
    sendAmount: req.sendAmount,
    receiveAmount: quote.receiveAmount,
    usdAppliedRate: main?.usdAppliedRate ?? null,
    recipient,
    guide: '처리 완료까지 1-2 영업일이 소요돼요.',
  };
}
