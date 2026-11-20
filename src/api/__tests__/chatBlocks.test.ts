// chat.done blocks 처리: 아는 카드만 남기기, 모르는 카드는 개발 빌드에서만 자리 표시, 개발 로그 요약
import { blockSummary, parseBlocks } from '../chat';

const g = globalThis as { __DEV__?: boolean };
const DEV = g.__DEV__;
afterEach(() => {
  g.__DEV__ = DEV;
});

const fx = { type: 'FX_SUMMARY_CARD', currencies: [] };
const product = { type: 'PRODUCT_RECOMMEND_CARD', products: [] };

describe('parseBlocks', () => {
  it('배열이 아니면 빈 배열', () => {
    expect(parseBlocks(null)).toEqual([]);
    expect(parseBlocks({ type: 'FX_SUMMARY_CARD' })).toEqual([]);
  });

  it('개발 빌드: 아는 카드는 그대로, 모르는 카드는 UNSUPPORTED 자리로(순서 유지)', () => {
    g.__DEV__ = true;
    expect(parseBlocks([fx, { type: 'NEW_CARD', a: 1 }, product, null, 'x'])).toEqual([
      fx,
      { type: 'UNSUPPORTED', originalType: 'NEW_CARD' },
      product,
    ]);
  });

  it('운영 빌드: 모르는 카드는 지금처럼 버린다', () => {
    g.__DEV__ = false;
    expect(parseBlocks([fx, { type: 'NEW_CARD' }, product])).toEqual([fx, product]);
  });
});

describe('blockSummary ([chat.done] 개발 로그)', () => {
  it('받은 그대로(모르는 type 포함) type 별 개수', () => {
    expect(blockSummary([product])).toBe('PRODUCT_RECOMMEND_CARD(1)');
    expect(blockSummary([fx, { type: 'NEW_CARD' }, fx])).toBe('FX_SUMMARY_CARD(2), NEW_CARD(1)');
  });

  it('카드가 없으면 none', () => {
    expect(blockSummary(null)).toBe('none');
    expect(blockSummary([])).toBe('none');
  });
});
