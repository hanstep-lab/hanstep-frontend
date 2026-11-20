// 채팅 상품 추천 카드(PRODUCT_RECOMMEND_CARD)의 상품별 기간·금리·금액 줄 문구 (#60).
// 값이 null 이면 그 줄은 null(카드에서 숨김). "정보 없음" 같은 대신 문구는 쓰지 않는다.
// 숫자는 받은 값을 표시만 한다: 금리는 받은 소수 그대로(반올림·자릿수 맞춤 없음), 금액은 천 단위 쉼표.
// 앱이 금리를 계산하거나 합치지 않는다.

import { fmtNumber } from '../../../utils/format';
import type { ProductAmountRange, ProductBaseRate, ProductKind, ProductRate, ProductTermMonths } from '../../../types/api';

const DASH = '–'; // en dash. 기간 "1–60 months", 금액 "1,000 – 300,000"

const months = (n: number) => (n === 1 ? 'month' : 'months');

// 기간: [6, 12] → "6·12 months", {12, 12} → "12 months", {1, 60} → "1–60 months"
export function productTermLine(t: ProductTermMonths): string | null {
  if (!t) return null;
  if (Array.isArray(t)) {
    if (t.length === 0) return null;
    return `${t.join('·')} ${months(t.length === 1 ? t[0] : 2)}`;
  }
  return t.min === t.max ? `${t.min} ${months(t.min)}` : `${t.min}${DASH}${t.max} months`;
}

export type ProductRateLine = {
  main: string; // "Base 2.2% · Up to 3.7% with preferential terms"
  note: string | null; // 작은 글씨. "for the shortest term · as of 2026-10-01" (기본금리가 있을 때만)
};

const pct = (r: ProductRate) => `${fmtNumber(r.ratePct)}%`;

// 금리: 최고금리가 있으면 "Base … · Up to … with preferential terms", 없으면 "Base …". 둘 다 없으면 null
// 기본금리는 기간별이면 가장 짧은 기간의 값이라(카드 계약 product_recommend_card_v1.md) 작은 글씨로 알린다
export function productRateLine(base: ProductBaseRate | null, max: ProductRate | null): ProductRateLine | null {
  if (!base && !max) return null;
  const upTo = max ? `Up to ${pct(max)} with preferential terms` : null;
  const main = [base ? `Base ${pct(base)}` : null, upTo].filter(Boolean).join(' · ');
  const note = base ? ['for the shortest term', base.asOf ? `as of ${base.asOf}` : null].filter(Boolean).join(' · ') : null;
  return { main, note };
}

// 금액: 적금은 월 납입(monthlyAmountKrw), 예금은 예치(depositAmountKrw)
// {1000, 300000} → "Monthly KRW 1,000 – 300,000", max "no limit" → "Deposit from KRW 500,000"
export function productAmountLine(
  kind: ProductKind,
  monthly: ProductAmountRange | null,
  deposit: ProductAmountRange | null,
): string | null {
  const [label, range] = kind === 'SAVINGS' ? ['Monthly', monthly] : kind === 'DEPOSIT' ? ['Deposit', deposit] : [null, null];
  if (!label || !range) return null;
  const { min, max } = range;
  const krw = (n: number) => `KRW ${fmtNumber(n)}`;
  if (min != null && typeof max === 'number') return `${label} KRW ${fmtNumber(min)} ${DASH} ${fmtNumber(max)}`;
  if (min != null) return `${label} from ${krw(min)}`; // max 가 "no limit" 이거나 원문에 없음(null)
  if (typeof max === 'number') return `${label} up to ${krw(max)}`;
  return null;
}
