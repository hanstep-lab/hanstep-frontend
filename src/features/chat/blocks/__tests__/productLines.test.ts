import { productAmountLine, productRateLine, productTermLine } from '../productLines';

const base = (ratePct: number, asOf: string | null = '2026-10-01') => ({ ratePct, asOf, quote: '', page: 1 });
const rate = (ratePct: number) => ({ ratePct, quote: '', page: 2 });

describe('기간 줄 (termMonths)', () => {
  it('배열이면 나열', () => expect(productTermLine([6, 12])).toBe('6·12 months'));
  it('{min,max} 같으면 하나', () => expect(productTermLine({ min: 12, max: 12 })).toBe('12 months'));
  it('{min,max} 다르면 범위(en dash)', () => expect(productTermLine({ min: 1, max: 60 })).toBe('1–60 months'));
  it('1개월 하나면 단수', () => {
    expect(productTermLine({ min: 1, max: 1 })).toBe('1 month');
    expect(productTermLine([1])).toBe('1 month');
  });
  it('null·빈 배열이면 줄 숨김', () => {
    expect(productTermLine(null)).toBeNull();
    expect(productTermLine([])).toBeNull();
  });
});

describe('금리 줄 (baseRate ~ maxRate)', () => {
  it('최고금리 있으면 Base · Up to, 작은 글씨에 기간 기준·기준일', () => {
    expect(productRateLine(base(2.2), rate(3.7))).toEqual({
      main: 'Base 2.2% · Up to 3.7% with preferential terms',
      note: 'for the shortest term · as of 2026-10-01',
    });
  });
  it('최고금리 없으면 Base 만', () => {
    expect(productRateLine(base(2.2, '2026-09-03'), null)).toEqual({
      main: 'Base 2.2%',
      note: 'for the shortest term · as of 2026-09-03',
    });
  });
  it('기준일이 없으면 "as of" 를 빼고 기간 기준만', () => {
    expect(productRateLine(base(1.8, null), null)?.note).toBe('for the shortest term');
  });
  it('기본금리 없이 최고금리만 있으면 Up to 만, 작은 글씨 없음', () => {
    expect(productRateLine(null, rate(3.8))).toEqual({ main: 'Up to 3.8% with preferential terms', note: null });
  });
  it('둘 다 null 이면 줄 숨김', () => expect(productRateLine(null, null)).toBeNull());
  it('받은 소수 그대로(반올림·자릿수 맞춤 없음)', () => {
    expect(productRateLine(base(2.05), rate(3.125))?.main).toBe('Base 2.05% · Up to 3.125% with preferential terms');
    expect(productRateLine(base(3), null)?.main).toBe('Base 3%');
  });
});

describe('금액 줄', () => {
  it('적금은 월 납입 범위', () => {
    expect(productAmountLine('SAVINGS', { min: 1000, max: 300000 }, null)).toBe('Monthly KRW 1,000 – 300,000');
  });
  it('예금은 예치 범위', () => {
    expect(productAmountLine('DEPOSIT', null, { min: 500000, max: 20000000 })).toBe('Deposit KRW 500,000 – 20,000,000');
  });
  it('max 가 "no limit" 이면 from', () => {
    expect(productAmountLine('DEPOSIT', null, { min: 500000, max: 'no limit' })).toBe('Deposit from KRW 500,000');
    expect(productAmountLine('SAVINGS', { min: 10000, max: 'no limit' }, null)).toBe('Monthly from KRW 10,000');
  });
  it('최소만 없으면 up to', () => {
    expect(productAmountLine('SAVINGS', { min: null, max: 300000 }, null)).toBe('Monthly up to KRW 300,000');
  });
  it('종류에 맞는 범위가 null 이거나 비었으면 줄 숨김', () => {
    expect(productAmountLine('SAVINGS', null, { min: 500000, max: 20000000 })).toBeNull();
    expect(productAmountLine('DEPOSIT', { min: 1000, max: 300000 }, null)).toBeNull();
    expect(productAmountLine('SAVINGS', { min: null, max: null }, null)).toBeNull();
  });
});
