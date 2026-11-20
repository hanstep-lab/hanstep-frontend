// 채팅 상품 추천 카드(PRODUCT_RECOMMEND_CARD)의 상품별 기간·금리·금액 줄 문구 (#60).
// 카드 언어는 사용자 언어(users/me preferredLanguage)를 따른다: ko → 한국어, 그 밖(en·vi·zh) → 영어, 모르면 한국어.
// 값이 null 이면 그 줄은 null(카드에서 숨김). "정보 없음" 같은 대신 문구는 쓰지 않는다.
// 숫자는 받은 값을 표시만 한다: 금리는 받은 소수 그대로(반올림·자릿수 맞춤 없음), 금액은 천 단위 쉼표.
// 앱이 금리를 계산하거나 합치지 않는다.

import { fmtNumber } from '../../../utils/format';
import type {
  Language,
  ProductAmountRange,
  ProductBaseRate,
  ProductKind,
  ProductRate,
  ProductTermMonths,
} from '../../../types/api';

export type CardLanguage = 'ko' | 'en';

// 앱에 다국어 처리가 없어 카드만 두 벌. AI 답변 표시 규칙(ko 만 한국어, 그 밖은 en)과 같은 기준
export const cardLanguage = (lang: Language | null | undefined): CardLanguage =>
  !lang || lang === 'ko' ? 'ko' : 'en';

const DASH = '–'; // en dash. 영어 기간 "1–60 months", 금액 "1,000 – 300,000"

// 기간
// ko: [6, 12] → "6·12개월", {12, 12} → "12개월", {1, 60} → "1~60개월"
// en: "6·12 months", "12 months", "1–60 months" (1개월 하나면 "1 month")
export function productTermLine(t: ProductTermMonths, lang: CardLanguage): string | null {
  if (!t) return null;
  if (!Array.isArray(t) && t.min !== t.max) {
    return lang === 'ko' ? `${t.min}~${t.max}개월` : `${t.min}${DASH}${t.max} months`;
  }
  const values = Array.isArray(t) ? t : [t.min];
  if (values.length === 0) return null;
  if (lang === 'ko') return `${values.join('·')}개월`;
  return `${values.join('·')} ${values.length === 1 && values[0] === 1 ? 'month' : 'months'}`;
}

export type ProductRateLine = {
  main: string; // ko "기본 2.2% · 우대 조건 충족 시 최고 3.7%", en "Base 2.2% · Up to 3.7% with preferential terms"
  note: string | null; // 작은 글씨. 기본금리가 있을 때만: 가장 짧은 기간 기준 · 기준일
};

const pct = (r: ProductRate) => `${fmtNumber(r.ratePct)}%`;

// 금리: 최고금리가 있으면 기본·최고, 없으면 기본만. 둘 다 없으면 null
// 기본금리는 기간별이면 가장 짧은 기간의 값이라(카드 계약 product_recommend_card_v1.md) 작은 글씨로 알린다
export function productRateLine(
  base: ProductBaseRate | null,
  max: ProductRate | null,
  lang: CardLanguage,
): ProductRateLine | null {
  if (!base && !max) return null;
  const ko = lang === 'ko';
  const baseText = base ? (ko ? `기본 ${pct(base)}` : `Base ${pct(base)}`) : null;
  const maxText = max ? (ko ? `우대 조건 충족 시 최고 ${pct(max)}` : `Up to ${pct(max)} with preferential terms`) : null;
  const main = [baseText, maxText].filter(Boolean).join(' · ');
  if (!base) return { main, note: null };
  const shortest = ko ? '가장 짧은 기간 기준' : 'for the shortest term';
  const asOf = base.asOf ? (ko ? `${base.asOf} 기준` : `as of ${base.asOf}`) : null;
  return { main, note: [shortest, asOf].filter(Boolean).join(' · ') };
}

// 금액: 적금은 월 납입(monthlyAmountKrw), 예금은 예치(depositAmountKrw)
// ko: "월 1,000~300,000원", 상한 없음 "월 10,000원부터", 최소 없음 "월 300,000원까지" (예금은 "예치")
// en: "Monthly KRW 1,000 – 300,000" / "Deposit KRW 500,000 – 20,000,000", 상한 없음 "from KRW 500,000", 최소 없음 "up to KRW 300,000"
export function productAmountLine(
  kind: ProductKind,
  monthly: ProductAmountRange | null,
  deposit: ProductAmountRange | null,
  lang: CardLanguage,
): string | null {
  const range = kind === 'SAVINGS' ? monthly : kind === 'DEPOSIT' ? deposit : null;
  if (!range) return null;
  const { min, max } = range;
  const maxNum = typeof max === 'number' ? max : null; // "no limit"·null 은 상한 없음으로 본다
  if (lang === 'ko') {
    const label = kind === 'SAVINGS' ? '월' : '예치';
    if (min != null && maxNum != null) return `${label} ${fmtNumber(min)}~${fmtNumber(maxNum)}원`;
    if (min != null) return `${label} ${fmtNumber(min)}원부터`;
    if (maxNum != null) return `${label} ${fmtNumber(maxNum)}원까지`;
    return null;
  }
  const label = kind === 'SAVINGS' ? 'Monthly' : 'Deposit';
  if (min != null && maxNum != null) return `${label} KRW ${fmtNumber(min)} ${DASH} ${fmtNumber(maxNum)}`;
  if (min != null) return `from KRW ${fmtNumber(min)}`;
  if (maxNum != null) return `up to KRW ${fmtNumber(maxNum)}`;
  return null;
}
