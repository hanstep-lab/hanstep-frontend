import { cardLanguage, productAmountLine, productRateLine, productTermLine } from '../productLines';

const base = (ratePct: number, asOf: string | null = '2026-10-01') => ({ ratePct, asOf, quote: '', page: 1 });
const rate = (ratePct: number) => ({ ratePct, quote: '', page: 2 });

describe('cardLanguage (users/me preferredLanguage → 카드 언어)', () => {
  it('ko 와 모름은 한국어, 그 밖은 영어', () => {
    expect(cardLanguage('ko')).toBe('ko');
    expect(cardLanguage(null)).toBe('ko');
    expect(cardLanguage('en')).toBe('en');
    expect(cardLanguage('vi')).toBe('en');
    expect(cardLanguage('zh')).toBe('en');
  });
});

describe('기간 줄 (termMonths)', () => {
  it('en: 나열·하나·범위(en dash)·1개월 단수', () => {
    expect(productTermLine([6, 12], 'en')).toBe('6·12 months');
    expect(productTermLine({ min: 12, max: 12 }, 'en')).toBe('12 months');
    expect(productTermLine({ min: 1, max: 60 }, 'en')).toBe('1–60 months');
    expect(productTermLine({ min: 1, max: 1 }, 'en')).toBe('1 month');
    expect(productTermLine([1], 'en')).toBe('1 month');
  });
  it('ko: 나열·하나·범위', () => {
    expect(productTermLine([6, 12], 'ko')).toBe('6·12개월');
    expect(productTermLine({ min: 12, max: 12 }, 'ko')).toBe('12개월');
    expect(productTermLine({ min: 1, max: 60 }, 'ko')).toBe('1–60개월');
  });
  it('null·빈 배열이면 줄 숨김', () => {
    expect(productTermLine(null, 'en')).toBeNull();
    expect(productTermLine([], 'ko')).toBeNull();
  });
});

describe('금리 줄 (baseRate ~ maxRate)', () => {
  it('en: Interest rate: 기본–최고 / 기본만 / 최고만', () => {
    expect(productRateLine(base(2.2), rate(3.7), 'en')).toBe('Interest rate: 2.2%–3.7%');
    expect(productRateLine(base(2.2), null, 'en')).toBe('Interest rate: 2.2%');
    expect(productRateLine(null, rate(3.8), 'en')).toBe('Interest rate: up to 3.8%');
  });
  it('ko: 금리: 기본–최고 / 기본만 / 최고만', () => {
    expect(productRateLine(base(2.2), rate(3.7), 'ko')).toBe('금리: 2.2%–3.7%');
    expect(productRateLine(base(2.2), null, 'ko')).toBe('금리: 2.2%');
    expect(productRateLine(null, rate(3.8), 'ko')).toBe('금리: 최고 3.8%');
  });
  it('기준일·기간 기준 같은 덧붙임 문구는 없다', () => {
    expect(productRateLine(base(2.2, '2026-10-01'), rate(3.7), 'en')).not.toMatch(/as of|shortest|2026/);
    expect(productRateLine(base(2.2, '2026-10-01'), rate(3.7), 'ko')).not.toMatch(/기준|2026/);
  });
  it('기본과 최고가 같으면 하나만', () => {
    expect(productRateLine(base(2.5), rate(2.5), 'en')).toBe('Interest rate: 2.5%');
  });
  it('둘 다 null 이면 줄 숨김', () => {
    expect(productRateLine(null, null, 'en')).toBeNull();
    expect(productRateLine(null, null, 'ko')).toBeNull();
  });
  it('받은 소수 그대로(반올림·자릿수 맞춤 없음), 범위에 ~ 를 쓰지 않음', () => {
    expect(productRateLine(base(2.05), rate(3.125), 'en')).toBe('Interest rate: 2.05%–3.125%');
    expect(productRateLine(base(3), null, 'ko')).toBe('금리: 3%');
    expect(productRateLine(base(2.2), rate(3.7), 'ko')).not.toContain('~');
  });
});

describe('금액 줄', () => {
  it('en: 적금 Monthly, 예금 Deposit, 상한 없음 from, 최소 없음 up to', () => {
    expect(productAmountLine('SAVINGS', { min: 1000, max: 300000 }, null, 'en')).toBe('Monthly KRW 1,000 – 300,000');
    expect(productAmountLine('DEPOSIT', null, { min: 500000, max: 20000000 }, 'en')).toBe('Deposit KRW 500,000 – 20,000,000');
    expect(productAmountLine('DEPOSIT', null, { min: 500000, max: 'no limit' }, 'en')).toBe('from KRW 500,000');
    expect(productAmountLine('SAVINGS', { min: null, max: 300000 }, null, 'en')).toBe('up to KRW 300,000');
  });
  it('ko: 적금 월, 예금 예치, 상한 없음 부터, 최소 없음 까지', () => {
    expect(productAmountLine('SAVINGS', { min: 1000, max: 300000 }, null, 'ko')).toBe('월 1,000–300,000원');
    expect(productAmountLine('DEPOSIT', null, { min: 500000, max: 20000000 }, 'ko')).toBe('예치 500,000–20,000,000원');
    expect(productAmountLine('SAVINGS', { min: 10000, max: 'no limit' }, null, 'ko')).toBe('월 10,000원부터');
    expect(productAmountLine('SAVINGS', { min: null, max: 300000 }, null, 'ko')).toBe('월 300,000원까지');
  });
  it('종류에 맞는 범위가 null 이거나 비었으면 줄 숨김', () => {
    expect(productAmountLine('SAVINGS', null, { min: 500000, max: 20000000 }, 'en')).toBeNull();
    expect(productAmountLine('DEPOSIT', { min: 1000, max: 300000 }, null, 'ko')).toBeNull();
    expect(productAmountLine('SAVINGS', { min: null, max: null }, null, 'en')).toBeNull();
  });
});
