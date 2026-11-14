// TR-001 Mock 송금 데이터. 서버 역할을 대신하므로 견적 계산은 여기서만 한다.
// 화면은 이 파일을 직접 import 하지 않고 src/api/transfer.ts 를 거친다.

import type {
  ApiError,
  AppliedRate,
  TransferContext,
  TransferQuote,
  TransferRequest,
  TransferResult,
} from '../../types/api';

// Figma TR-001(필리핀 버전) 값과 맞춤
export const MOCK_TRANSFER_CONTEXT: TransferContext = {
  recipient: {
    name: 'Lorna Reyes',
    relation: '어머니',
    bank: 'BDO',
    accountLast4: '5566',
    country: '필리핀',
    countryCode: 'PH',
  },
  account: {
    name: '신한 주거래 우대통장',
    number: '110-382-998811',
    balance: { amount: 2_450_000, currency: 'KRW' },
  },
  purpose: { code: 'FAMILY_SUPPORT', label: '가족 생활비 (Family support)' },
  quickAmounts: [100_000, 500_000, 1_000_000],
};

// 출처는 ECB 기준환율. 백엔드가 하루 1번 받아 두고 앱은 백엔드 값만 쓴다.
// 숫자는 Mock 임시값이고 FX-001 Mock(src/api/mock/fx.ts)과 같은 값으로 맞춰 둠.
const MOCK_RATE: AppliedRate = {
  currency: 'PHP',
  unit: 1,
  rate: 24.9,
  sourceLabel: 'ECB 기준환율 기반 참고값',
  asOf: '2026-11-13',
};

// 서버가 할 일을 흉내 낸다: 원화 → PHP, 1페소 단위 반올림
function mockReceive(krw: number): number {
  return Math.round((krw * MOCK_RATE.unit) / MOCK_RATE.rate);
}

function checkBalance(krw: number) {
  if (krw > MOCK_TRANSFER_CONTEXT.account.balance.amount) {
    const error: ApiError = {
      code: 'INSUFFICIENT_BALANCE',
      message: '출금가능 잔액보다 많이 보낼 수 없어요.',
    };
    throw error;
  }
}

export function mockQuote(krw: number): TransferQuote {
  checkBalance(krw);
  return {
    sendAmount: { amount: krw, currency: 'KRW' },
    receiveAmount: { amount: mockReceive(krw), currency: MOCK_RATE.currency },
    appliedRate: MOCK_RATE,
  };
}

export function mockSubmit(req: TransferRequest): TransferResult {
  const quote = mockQuote(req.sendAmount.amount);
  return {
    transferId: `MOCK-${Date.now()}`,
    sendAmount: quote.sendAmount,
    receiveAmount: quote.receiveAmount,
    appliedRate: quote.appliedRate,
    recipient: MOCK_TRANSFER_CONTEXT.recipient,
    guide: '처리 완료까지 1-2 영업일이 소요돼요.',
  };
}
