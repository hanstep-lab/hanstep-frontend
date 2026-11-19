// 금융상품 추천 API (FP-001 / PRD-02). 화면은 이 파일만 부르고 Mock 인지 모른다.
// Mock 과 서버 모두 ProductRecommendResponse 모양을 돌려주고, 화면용 문구는 아래 toProductView 한 곳에서 만든다.
// 숫자(금리·한도·개월·여유자금)는 서버(Mock) 값을 그대로 쓰고 표시 형식만 바꾼다.
import { client } from './client';
import { USE_MOCK, mockDelay } from './config';
import { mockProductRecommendation } from './mock/products';
import { getMe } from './user';
import { getLatestAnalysis } from './finance';
import { fmtWon } from '../utils/format';
import type {
  ProductAbstainReason,
  ProductAmountRange,
  ProductRecommendItem,
  ProductRecommendResponse,
  ProductTermMonths,
} from '../types/api';

// GET /api/v1/finance/products/recommend — 쿼리 없이 예금·적금 전부
export async function getProductRecommendation(): Promise<ProductRecommendResponse> {
  if (USE_MOCK) {
    await mockDelay();
    return mockProductRecommendation();
  }
  const res = await client.get<ProductRecommendResponse>('/api/v1/finance/products/recommend');
  return res.data;
}

// ── 화면용 문구 ─────────────────────────────────────────

export type ProductView = {
  key: string;
  name: string;
  label: string; // "정기예금 · 6·12개월"
  rateText: string | null; // "기본 연 2.20%"
  rateAsOf: string | null; // "2026.10.01 기준" (rateText 와 함께 있거나 함께 null)
  meta: string | null; // "우대 조건 충족 시 최고 연 3.70% · 월 30만 원까지"
  desc: string | null; // 상품특징 원문
  note: string;
  noteHighlight: boolean;
};

export type ProductsScreenData = {
  shortName: string | null; // users/me 실패·없음이면 null
  stayText: string | null; // "약 10개월"
  spareText: string | null; // "675,317원"
  products: ProductView[];
  abstainText: string | null; // 기권일 때만
  visaNote: boolean; // notChecked 에 visa 가 있는 상품이 있으면 true
};

const KIND_LABEL: Record<string, string> = { SAVINGS: '적금', DEPOSIT: '정기예금' };

const ABSTAIN_TEXT: Record<ProductAbstainReason, string> = {
  STAY_TOO_SHORT: '남은 체류 기간 안에 만기가 끝나는 상품이 없어요',
  REQUEST_EXCEEDS_SURPLUS: '매달 넣을 금액이 여유자금보다 커요',
  NO_MATCHING_PRODUCT: '지금 조건에 맞는 상품이 없어요',
};

const withComma = (n: number) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
const fmtDot = (iso: string) => iso.replaceAll('-', '.');

function termText(t: ProductTermMonths): string | null {
  if (!t) return null;
  if (Array.isArray(t)) return t.length ? `${t.join('·')}개월` : null;
  return t.min === t.max ? `${t.min}개월` : `${t.min}~${t.max}개월`;
}

function limitText(range: ProductAmountRange | null, kind: string): string | null {
  if (!range || range.max === null) return null;
  if (range.max === 'no limit') return '한도 없음';
  return kind === 'DEPOSIT' ? `1회 최대 ${fmtWon(range.max)}` : `월 ${fmtWon(range.max)}까지`;
}

function noteOf(stayFits: boolean | null): { text: string; highlight: boolean } {
  if (stayFits === true) return { text: '만기가 체류 만료 전에 끝나요', highlight: true };
  if (stayFits === false) return { text: '만기가 체류 만료보다 늦어요', highlight: false };
  return { text: '체류 기간은 확인하지 못했어요', highlight: false };
}

function toProductView(p: ProductRecommendItem): ProductView {
  const kindLabel = KIND_LABEL[p.kind] ?? p.kind;
  const term = termText(p.termMonths);
  // 기본금리나 기준일이 없으면 금리(기본·최고 모두) 숨김
  const base = p.baseRate && p.baseRate.asOf ? p.baseRate : null;
  const rateText = base ? `기본 연 ${base.ratePct.toFixed(2)}%` : null;
  const rateAsOf = base ? `${fmtDot(base.asOf!)} 기준` : null;
  const maxText = base && p.maxRate ? `우대 조건 충족 시 최고 연 ${p.maxRate.ratePct.toFixed(2)}%` : null;
  const limit = limitText(p.kind === 'DEPOSIT' ? p.depositAmountKrw : p.monthlyAmountKrw, p.kind);
  const meta = [maxText, limit].filter(Boolean).join(' · ');
  const note = noteOf(p.stayFits);
  return {
    key: p.productId,
    name: p.nameKo,
    label: term ? `${kindLabel} · ${term}` : kindLabel,
    rateText,
    rateAsOf,
    meta: meta || null,
    desc: p.feature?.quote ?? null,
    note: note.text,
    noteHighlight: note.highlight,
  };
}

// FP-001 화면 데이터. 상품 추천이 실패하면 reject, 이름·여유자금은 실패해도 null 로 두고 계속 보여준다.
export async function getProductsScreen(): Promise<ProductsScreenData> {
  const [rec, shortName, spare] = await Promise.all([
    getProductRecommendation(),
    getMe()
      .then((me) => me.shortName || null)
      .catch(() => null),
    getLatestAnalysis()
      .then((a) => a.spare)
      .catch(() => null),
  ]);

  const abstainText =
    rec.products.length === 0
      ? ABSTAIN_TEXT[rec.abstainReason ?? 'NO_MATCHING_PRODUCT'] ?? ABSTAIN_TEXT.NO_MATCHING_PRODUCT
      : null;

  return {
    shortName,
    stayText: rec.remainingStayMonths === null ? null : `약 ${rec.remainingStayMonths}개월`,
    spareText: spare && spare.currency === 'KRW' && spare.amount >= 0 ? `${withComma(spare.amount)}원` : null,
    products: rec.products.map(toProductView),
    abstainText,
    visaNote: rec.products.some((p) => p.notChecked.includes('visa')),
  };
}
