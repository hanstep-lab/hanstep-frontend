// TR-001 Mock 송금 데이터. 실제 API 연결 시 이 파일만 교체.

export const MOCK_RECIPIENT = {
  name: 'Nguyen Thi Mai',
  relation: '어머니',
  bank: 'Vietcombank',
  accountLast4: '5566',
  country: '베트남',
  countryCode: 'VN',
};

export const MOCK_ACCOUNT = {
  name: '신한 주거래 우대통장',
  number: '110-382-998811',
  balance: 2_450_000,
};

// 100 VND = 5.43 KRW
export const RATE = { unit: 100, krw: 5.43 };

export function calcVND(krw: number): number {
  return Math.round((krw * RATE.unit) / RATE.krw / 1000) * 1000;
}

export function fmtKRW(n: number): string {
  return n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}
