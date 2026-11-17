// FP-001 금융상품 추천 Mock (Figma 정리안 560:9 기준). 서버 역할이라 여유자금·기간 비교·안내 문구는 여기서만 만든다.
// 화면은 이 파일을 직접 import 하지 않고 src/api/products.ts 를 거친다.
// 금리·한도는 각 상품설명서(2026.09~10월 기준) 세전 값. TODO(B): 상품설명서와 숫자 확인
import { MONTHLY_FLOW, calcSpareMoney } from './finance';
import { DEMO_USER } from './demoUser';

const USER_NAME = DEMO_USER.firstName;
const EXPIRY_DATE = '2027-10-04'; // VS-001 체류 만료일과 같음

const fmtDot = (iso: string) => iso.replaceAll('-', '.');

// 오늘부터 만료일까지 남은 개월 수 (내림)
function monthsUntil(iso: string): number {
  const end = new Date(`${iso}T00:00:00`);
  const now = new Date();
  let months = (end.getFullYear() - now.getFullYear()) * 12 + (end.getMonth() - now.getMonth());
  if (end.getDate() < now.getDate()) months -= 1;
  return Math.max(months, 0);
}

type ProductSeed = {
  key: string;
  name: string;
  tag: string; // "적금" / "외국인 전용"
  periodLabel: string; // "12개월", "12~36개월"
  shortestMonths: number; // 만기 비교에 쓰는 가장 짧은 가입 기간
  baseRate: string;
  maxRateText: string; // "우대 시 최고 연 5.05%" / "우대 조건 없음"
  monthlyLimit: string;
  perPerson?: string;
  desc: string;
  specialNote?: string; // 만기 비교 대신 보여줄 혜택 문구
};

const PRODUCTS: ProductSeed[] = [
  {
    key: 'hello',
    name: '신한 안녕, 반가워 적금',
    tag: '적금',
    periodLabel: '12개월',
    shortestMonths: 12,
    baseRate: '2.05%',
    maxRateText: '우대 시 최고 연 5.05%',
    monthlyLimit: '월 50만 원까지',
    perPerson: '1인 1계좌',
    desc: '신한은행과 처음 거래하는 고객이 실적에 따라 우대금리를 받는 적금이에요.',
  },
  {
    key: 'smart',
    name: '신한 스마트 적금',
    tag: '적금',
    periodLabel: '12개월',
    shortestMonths: 12,
    baseRate: '3.15%',
    maxRateText: '우대 조건 없음',
    monthlyLimit: '월 100만 원까지',
    perPerson: '1인 1계좌',
    desc: '우대 조건 없이 스마트폰뱅킹에서 바로 가입하는 적금이에요.',
  },
  {
    key: 'global',
    name: 'SOL글로벌 적금',
    tag: '외국인 전용',
    periodLabel: '12개월',
    shortestMonths: 12,
    baseRate: '2.75%',
    maxRateText: '우대 시 최고 연 3.25%',
    monthlyLimit: '월 300만 원까지',
    perPerson: '1인 1계좌',
    desc: '신한은행에서 해외송금하는 외국인을 위한 전용 적금이에요.',
    specialNote: '해외송금하는 날 해지하면 만기 전이라도 기본 금리를 받아요',
  },
  {
    key: 'ddangyo',
    name: '신한 땡겨요 적금',
    tag: '적금',
    periodLabel: '6개월',
    shortestMonths: 6,
    baseRate: '2.20%',
    maxRateText: '우대 시 최고 연 3.70%',
    monthlyLimit: '월 30만 원까지',
    desc: '매주 납입하고 배달앱 땡겨요를 쓰면 우대금리를 받는 적금이에요.',
  },
  {
    key: 'alsol',
    name: '신한 알.쏠 적금',
    tag: '적금',
    periodLabel: '12~36개월',
    shortestMonths: 12,
    baseRate: '2.90%',
    maxRateText: '우대 시 최고 연 4.20%',
    monthlyLimit: '월 300만 원까지',
    desc: '가입 기간을 고르고, 급여·카드 실적에 따라 우대금리를 받는 적금이에요.',
  },
];

// 가입 기간과 체류 만료를 비교한 안내 (서버 역할). highlight 는 사용자에게 유리한 안내일 때 true
function noteOf(p: ProductSeed, monthsLeft: number): { text: string; highlight: boolean } {
  if (p.specialNote) return { text: p.specialNote, highlight: true };
  if (p.shortestMonths <= monthsLeft) {
    return { text: `만기(${p.shortestMonths}개월)가 체류 만료 전에 끝나요`, highlight: true };
  }
  if (p.periodLabel.includes('~')) {
    return { text: `가장 짧은 ${p.shortestMonths}개월도 만기가 체류 만료보다 늦어요`, highlight: false };
  }
  return {
    text: `만기(${p.shortestMonths}개월)가 체류 만료(${fmtDot(EXPIRY_DATE)})보다 늦어요`,
    highlight: false,
  };
}

export function mockProductRecommendation() {
  const spare = calcSpareMoney(MONTHLY_FLOW); // 만 원 단위
  const emergencyGoal = MONTHLY_FLOW.fixedExpense * 3; // 비상금 = 고정지출 3개월분
  const monthsLeft = monthsUntil(EXPIRY_DATE);

  return {
    userName: USER_NAME,
    criteriaBasis: '마이데이터 최근 12개월 기준',
    criteria: [
      { key: 'spare', title: '월 여유자금', sub: '소득 − 고정지출 − 송금 − 변동지출 평균', value: `약 ${spare}만 원` },
      { key: 'stay', title: '체류 만료까지', sub: `${fmtDot(EXPIRY_DATE)} 만료`, value: `약 ${monthsLeft}개월` },
      { key: 'goal', title: '저축 목표', sub: '비상금 (고정지출 3개월분)', value: `${emergencyGoal}만 원` },
    ],
    rateBasis: '세전 · 상품설명서 기준',
    products: PRODUCTS.map((p) => {
      const note = noteOf(p, monthsLeft);
      return {
        key: p.key,
        name: p.name,
        label: `${p.tag} · ${p.periodLabel}`,
        rateText: `기본 연 ${p.baseRate}`,
        desc: p.desc,
        meta: [p.maxRateText, p.monthlyLimit, p.perPerson].filter(Boolean).join(' · '),
        note: note.text,
        noteHighlight: note.highlight,
      };
    }),
    disclaimer:
      '금리는 각 상품설명서(2026.09~10월 기준)의 세전 금리예요. 실제 금리와 가입 조건은 가입할 때 신한 SOL에서 확인해 주세요.',
  };
}
