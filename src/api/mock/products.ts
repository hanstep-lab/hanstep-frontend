// FP-001 금융상품 추천 Mock. 서버(GET /api/v1/finance/products/recommend) 응답과 같은 모양·값.
// 2026-11-18 서버 응답(E-9 데모 사용자, 쿼리 없음)을 그대로 옮겼다. 화면은 src/api/products.ts 를 거친다.
import type { ProductAbstainReason, ProductRecommendItem, ProductRecommendResponse } from '../../types/api';

// 기권 화면 확인용. 값을 넣으면 products=[] 와 이 이유를 돌려준다.
const MOCK_ABSTAIN_REASON: ProductAbstainReason | null = null;

const PRODUCTS: ProductRecommendItem[] = [
  {
    productId: 'doc-a32e7bfdf57e',
    nameKo: '슈퍼SOL 웰컴 정기예금',
    kind: 'DEPOSIT',
    termMonths: [6, 12],
    monthlyAmountKrw: null,
    depositAmountKrw: { min: 500000, max: 20000000 },
    accrual: null,
    foreignerEligible: 'inferred',
    notChecked: ['visa'],
    stayFits: true,
    baseRate: {
      ratePct: 3.3,
      asOf: '2026-11-09',
      quote: '기본이자율 (2026.11.09 현재, 세전) 6개월 : 연 3.3% 12개월 : 연 3.6%',
      page: 2,
    },
    maxRate: null,
    feature: { quote: '신한 슈퍼 SOL 신규 고객 및 급여 첫 거래 고객에게 우대금리를 제공하는 정기예금', page: 1 },
    evidence: [
      { about: 'term', quote: '계약기간 6개월, 12개월', page: 1 },
      { about: 'amount', quote: '50만원 이상 2,000만원 이하', page: 1 },
      { about: 'foreigners', quote: '실명의 개인 및 개인사업자', page: 1 },
    ],
  },
  {
    productId: 'doc-6e1e33b14263',
    nameKo: '신한 My플러스 정기예금',
    kind: 'DEPOSIT',
    termMonths: [1, 3, 6, 12],
    monthlyAmountKrw: null,
    depositAmountKrw: { min: 500000, max: 100000000 },
    accrual: null,
    foreignerEligible: 'inferred',
    notChecked: ['visa', 'age'],
    stayFits: true,
    baseRate: {
      ratePct: 2.25,
      asOf: '2026-09-03',
      quote: '기본이자율 (2026.09.03 현재, 세전) 1개월 3개월 6개월 12개월 연 2.25% 연 2.45% 연 2.50% 연 2.55%',
      page: 2,
    },
    maxRate: null,
    feature: { quote: '1억원 이하의 자금에 대해 계획에 따라 가입기간을 선택하여 가입할 수 있는 정기예금', page: 1 },
    evidence: [
      { about: 'term', quote: '계약기간 1개월, 3개월, 6개월, 12개월', page: 1 },
      { about: 'amount', quote: '가입금액 50만원 이상 1억원 이내', page: 1 },
      { about: 'foreigners', quote: '가입대상 실명의 개인 (1인 1계좌)', page: 1 },
    ],
  },
  {
    productId: 'doc-b5f79d5c502c',
    nameKo: '신한 S드림(DREAM)정기예금',
    kind: 'DEPOSIT',
    termMonths: { min: 1, max: 60 },
    monthlyAmountKrw: null,
    depositAmountKrw: { min: 500000, max: 'no limit' },
    accrual: null,
    foreignerEligible: 'inferred',
    notChecked: ['visa', 'age'],
    stayFits: true,
    baseRate: {
      ratePct: 2.25,
      asOf: '2026-09-28',
      quote:
        '가입기간 1개월이상 3개월이상 6개월이상 9개월이상 12개월이상 만기지급식 연 2.25% 연 2.45% 연 2.50% 연 2.50% 연 2.55% 가입기간 24개월이상 36개월이상 48개월이상 60개월이상 만기지급식 연 2.60% 연 2.60% 연 2.65% 연 2.70%',
      page: 1,
    },
    maxRate: null,
    feature: {
      quote: '만기일을 일, 월 단위로 자유롭게 선택할 수 있으며 10년까지 자동 재예치가 가능한 다양한 기능을 갖춘 맞춤형 정기예금',
      page: 1,
    },
    evidence: [
      { about: 'term', quote: '계약기간 1개월 ~ 60개월', page: 3 },
      { about: 'amount', quote: '비대면채널을 이용하여 신규할 경우 50만원 이상', page: 4 },
      { about: 'foreigners', quote: '가입대상 제한없음', page: 5 },
    ],
  },
  {
    productId: 'doc-de733331abd3',
    nameKo: '신한 땡겨요 적금',
    kind: 'SAVINGS',
    termMonths: { min: 6, max: 6 },
    monthlyAmountKrw: { min: 1000, max: 300000 },
    depositAmountKrw: null,
    accrual: 'FLEXIBLE',
    foreignerEligible: 'inferred',
    notChecked: ['visa', 'age'],
    stayFits: true,
    baseRate: { ratePct: 2.2, asOf: '2026-10-01', quote: '기본이자율 (2026.10.01 현재, 세전) 연 2.20%', page: 1 },
    maxRate: { ratePct: 3.7, quote: '최고이자율 (2026.10.01 현재, 세전) 최고 연 3.70%', page: 2 },
    feature: {
      quote:
        '신한은행 배달앱 “땡겨요” 서비스를 이용하거나 주단위 적금 납입 미션 달성 고객에게 우대금리를 제공하는 적립식 상품',
      page: 1,
    },
    evidence: [
      { about: 'term', quote: '계약기간 6개월', page: 1 },
      { about: 'amount', quote: '최소 1천원 이상 월 30만원 이하', page: 1 },
      { about: 'accrual', quote: '상품유형 자유적립식', page: 1 },
      { about: 'foreigners', quote: '가입대상 실명의 개인 및 개인사업자', page: 1 },
    ],
  },
  {
    productId: 'doc-a976ef26deed',
    nameKo: '쏠편한 정기예금',
    kind: 'DEPOSIT',
    termMonths: { min: 1, max: 60 },
    monthlyAmountKrw: null,
    depositAmountKrw: { min: 10000, max: 'no limit' },
    accrual: null,
    foreignerEligible: 'inferred',
    notChecked: ['visa'],
    stayFits: true,
    baseRate: {
      ratePct: 2.25,
      asOf: '2026-10-01',
      quote:
        '가입기간 1개월이상 3개월이상 6개월이상 9개월이상 12개월이상 만기지급식 연2.25% 연2.45% 연2.50% 연2.50% 연2.55%',
      page: 1,
    },
    maxRate: null,
    feature: { quote: '만기일 연장서비스 및 자동재예치를 통해 자금관리를 여유롭게 할 수 있는 상품', page: 1 },
    evidence: [
      { about: 'term', quote: '계약기간 1개월 ~ 60개월', page: 1 },
      { about: 'amount', quote: '최저가입금액 1만원 이상', page: 1 },
      { about: 'foreigners', quote: '가입대상 만 14세 이상 개인고객', page: 1 },
    ],
  },
  {
    productId: 'doc-ad95d3f72e39',
    nameKo: '정기적금',
    kind: 'SAVINGS',
    termMonths: { min: 1, max: 60 },
    monthlyAmountKrw: { min: 10000, max: 'no limit' },
    depositAmountKrw: null,
    accrual: 'FIXED',
    foreignerEligible: 'inferred',
    notChecked: ['visa', 'age'],
    stayFits: true,
    baseRate: {
      ratePct: 2.2,
      asOf: '2026-09-03',
      quote:
        '기본이자율 (2026.09.03 현재, 세전) 가입기간 1개월이상 3개월미만 3개월이상 6개월미만 6개월이상 12개월미만 12개월이상 24개월미만 정기적립식 연 2.20% 연 2.25% 연 2.30% 연 2.45% 가입기간 24개월이상 36개월미만 36개월 37개월이상 60개월이하 정기적립식 연 2.55% 연 2.55% 연 2.70%',
      page: 1,
    },
    maxRate: null,
    feature: {
      quote: '일정 기간 후에 일정 금액을 지급할 것을 미리 약정하고 월 1회 일정한 일자에 일정금액을 수입하는 예금',
      page: 1,
    },
    evidence: [
      { about: 'term', quote: '1개월 이상 60개월 이하(월단위)', page: 3 },
      { about: 'amount', quote: '최저가입금액 1만원 이상', page: 5 },
      { about: 'accrual', quote: '상품유형 정기적립식', page: 3 },
      { about: 'foreigners', quote: '가입대상 제한없음', page: 5 },
    ],
  },
  {
    productId: 'doc-a5851b226169',
    nameKo: '한 달부터 적금',
    kind: 'SAVINGS',
    termMonths: { min: 1, max: 12 },
    monthlyAmountKrw: null,
    depositAmountKrw: null,
    accrual: 'FLEXIBLE',
    foreignerEligible: 'inferred',
    notChecked: ['visa', 'age', 'spareMoney'],
    stayFits: true,
    baseRate: { ratePct: 1.8, asOf: '2026-09-03', quote: '기본이자율 (2026.09.03 현재, 세전) 연 1.80%', page: 2 },
    maxRate: { ratePct: 3.8, quote: '최고이자율 (2026.09.03 현재, 세전) 연 3.80%', page: 2 },
    feature: {
      quote:
        '1 개월 이상 12 개월 이내 가입 가능한 상품으로, 납입 주기에 따른 총 납입 회차에 대해 일정 회차 이상 납입 시 우대이자율을 제공하는 적립식 예금',
      page: 1,
    },
    evidence: [
      { about: 'term', quote: '계약기간 1개월 이상 12개월 이하', page: 1 },
      { about: 'accrual', quote: '상품유형 자유적립식', page: 1 },
      { about: 'foreigners', quote: '가입대상 실명의 개인 및 개인사업자', page: 1 },
    ],
  },
];

export function mockProductRecommendation(): ProductRecommendResponse {
  return {
    asOf: '2026-11-18',
    remainingStayMonths: 10,
    rankedBy: 'catalog',
    abstainReason: MOCK_ABSTAIN_REASON,
    products: MOCK_ABSTAIN_REASON ? [] : PRODUCTS,
    excludedSummary: [
      { reason: 'recommendable', count: 1 },
      { reason: 'stayTerm', count: 5 },
    ],
    isMock: true,
  };
}
