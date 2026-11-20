// Mock 챗봇 응답 데이터. 실제 AI API 연결 시 이 파일만 교체.
import type { ComponentProps } from 'react';
import type { Ionicons } from '@expo/vector-icons';
import type { ChatBlock } from '../../types/api';
import { DEMO_USER } from './demoUser';

export const USER_NAME = DEMO_USER.firstName;

export type SuggestionChip = {
  label: string;
  icon?: ComponentProps<typeof Ionicons>['name'];
  action?: ChatAction; // 화면 이동. 없으면 label 을 질문으로 보낸다
};

// 칩·메뉴를 누르면 이동하는 곳. 주소는 chat.tsx 의 ACTION_ROUTES 에 있다
export type ChatAction = 'visa_tab' | 'fx' | 'fx_alert' | 'products' | 'transfer' | 'credit';

export type MockChatResponse = {
  text: string;
  blocks?: ChatBlock[]; // 실서버 chat.done.blocks 와 같은 모양
  suggestions?: SuggestionChip[];
  suggestionsLabel?: string;
};

export function getVisaDday(): number {
  const expiry = new Date('2027-10-04');
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  expiry.setHours(0, 0, 0, 0);
  return Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

export const LANDING_SUGGESTIONS = [
  '한국에서 오래 살고 싶은데 어떻게 해요?',
  '본국에 50만 원 보내면 얼마 받아요?',
  '이번 달 얼마까지 저축할 수 있어요?',
  '비자 만료까지 얼마나 남았어요?',
];

// action 이 없는 메뉴는 "준비 중" (설정). hidden 이면 메뉴 목록에 보이지 않는다(항목·화면 코드는 남겨 둠)
// desc 가 없으면 설명 줄을 그리지 않는다
export type MenuItem = { label: string; desc?: string; action?: ChatAction; hidden?: boolean };

export const MENU_GROUPS: { section: string; items: MenuItem[] }[] = [
  {
    section: '환율·송금',
    items: [
      { label: '환율 정보', desc: '오늘 기준환율·추이·기간별 평균', action: 'fx' },
      { label: '목표 환율 알림', desc: '원하는 기준환율이 되면 알림', action: 'fx_alert' },
      { label: '해외송금', action: 'transfer' },
    ],
  },
  {
    section: '금융 성장',
    items: [
      { label: '금융상품 추천', desc: '여유자금에 맞춘 예금·적금 추천', action: 'products' },
      { label: '대안신용 사전진단', desc: '대안신용 점수·참고 한도', action: 'credit' },
    ],
  },
  {
    section: '체류·비자',
    items: [{ label: '비자 로드맵', desc: 'E-9 → E-7-4 점수 사전진단', action: 'visa_tab' }],
  },
  {
    section: '설정',
    items: [
      // 시연 범위 밖이라 목록에서만 숨김 (#54)
      { label: '내 정보 수정', desc: '온보딩 답변 다시 입력', hidden: true },
      { label: '화면 언어', desc: '한국어·English·Filipino·中文', hidden: true },
    ],
  },
];

// ── Mock 카드(blocks). 실서버 chat.done.blocks 와 같은 모양 ──────────────────
// 값은 Swagger 채팅 스트림 200 예시(송금·환율 카드)와 실서버 메시지 64번(E-7-4·입력 필요)을 그대로 옮겼다.
// 송금 카드 숫자(환율·수취 금액·쏠편한 수수료·출금 총액)는 송금 화면 Mock(mock/transfer.ts)의 500,000원 견적과 같다.
// 카드 버튼으로 송금 화면에 가도 숫자가 바뀌지 않게 하려는 것. mock/transfer.ts 값이 바뀌면 여기도 맞춘다.

// quote_remittance (Swagger "송금 카드" 예시 모양, 값은 mock/transfer.ts mockQuote(500000) 쏠편한)
const MOCK_REMITTANCE_BLOCK: ChatBlock = {
  type: 'REMITTANCE_CONFIRM',
  recipient: {
    recipientId: 1,
    nameEn: 'LORNA REYES',
    relationship: 'MOTHER',
    bankName: 'BDO',
    accountLast4: '5566',
    countryCode: 'PH',
    currency: 'PHP',
  },
  sendAmount: { amount: 500000, currency: 'KRW' },
  receiveAmount: { amount: 23587, currency: 'PHP' },
  appliedRate: {
    currency: 'PHP',
    unit: 1,
    rate: 20.926,
    asOf: '2026-11-18',
    sourceLabel: 'ECB 기준환율 기반 참고값',
    isMock: false,
  },
  transferPath: '/transfer?recipientId=1&amount=500000',
  fees: {
    product: 'SOL_EASY',
    sendFeeKrw: 0,
    telegraphicFeeKrw: 5000,
    feeUsd: null,
    fxMarginKrw: 1413,
    totalWithdrawKrw: 499998,
    preferentialPct: 70,
    usdAppliedRate: 1334.91,
    notices: ['INTERMEDIARY_FEE_MAY_APPLY', 'LOCAL_PAYOUT_RATE_DIFFERS', 'FOREIGN_EXCHANGE_BANK_DESIGNATION_REQUIRED'],
  },
  rateSources: { usd: 'KOREAEXIM', php: 'frankfurter-ecb' },
};

// fx_rate_summary (Swagger "환율 카드(프롬프트 v4.4부터)" 예시). USD 는 isMock·stale, PHP 는 송금 환율 없음
const MOCK_FX_SUMMARY_BLOCK: ChatBlock = {
  type: 'FX_SUMMARY_CARD',
  currencies: [
    {
      currency: 'USD',
      unit: 1,
      rate: 1406.51,
      sendRate: 1420.5751,
      receiveRate: 1392.4449,
      change: -1.08,
      changeRate: -0.08,
      source: 'KOREAEXIM',
      asOf: '2026-11-06',
      fetchedAt: '2026-11-06T11:05:00+09:00',
      periodAverages: [
        { period: '1M', avg: 1407.7735, diff: -1.2635, diffRate: -0.09, direction: 'SAME', businessDays: 23 },
        { period: '3M', avg: 1429.6566, diff: -23.1466, diffRate: -1.62, direction: 'LOWER', businessDays: 62 },
        { period: '6M', avg: 1419.9966, diff: -13.4866, diffRate: -0.95, direction: 'LOWER', businessDays: 126 },
        { period: '1Y', avg: 1418.8393, diff: -12.3293, diffRate: -0.87, direction: 'LOWER', businessDays: 246 },
      ],
      isMock: true,
      stale: true,
    },
    {
      currency: 'PHP',
      unit: 1,
      rate: 20.984,
      sendRate: null,
      receiveRate: null,
      change: 0.112,
      changeRate: 0.54,
      source: 'MARKET_REF',
      asOf: '2026-11-17',
      fetchedAt: '2026-11-18T14:13:52+09:00',
      periodAverages: [
        { period: '1M', avg: 21.0393, diff: -0.0553, diffRate: -0.26, direction: 'LOWER', businessDays: 22 },
        { period: '3M', avg: 21.5431, diff: -0.5591, diffRate: -2.6, direction: 'LOWER', businessDays: 67 },
        { period: '6M', avg: 22.9364, diff: -1.9524, diffRate: -8.51, direction: 'LOWER', businessDays: 132 },
        { period: '1Y', avg: 23.8157, diff: -2.8317, diffRate: -11.89, direction: 'LOWER', businessDays: 255 },
      ],
      isMock: false,
      stale: false,
    },
  ],
  unavailableCurrencies: [],
};

// calculate_e74_score (실서버 메시지 64번). 비자 탭 Mock(235점, INELIGIBLE)과 같은 값
const MOCK_E74_BLOCKS: ChatBlock[] = [
  {
    type: 'E74_SCORE_CARD',
    assessmentId: 3,
    status: 'INELIGIBLE',
    total: 235,
    potentialTotal: 285,
    required: 200,
    ruleVersion: 'E74-2026-v1',
    ruleStatus: 'APPROVED',
    isScenario: false,
  },
  {
    type: 'MISSING_INPUTS',
    fields: [
      { field: 'legalDeclaration.finesUnder1mCount', question: '최근 10년 안에 벌금 100만원 미만의 형을 받은 횟수' },
      { field: 'legalDeclaration.taxStayRestrictionCount', question: '최근 10년 안에 세금 체납 때문에 체류허가가 제한된 횟수' },
      { field: 'legalDeclaration.immigrationViolationCount', question: '최근 10년 안에 출입국관리법 위반으로 처분(과태료 포함)을 받은 횟수' },
      { field: 'legalDeclaration.hasFine1mOrMore', question: '최근 10년 안에 벌금 100만원 이상의 형을 받은 적이 있는지' },
      { field: 'legalDeclaration.hasCurrentTaxArrears', question: '지금 내지 않은 세금(체납)이 있는지' },
      { field: 'legalDeclaration.hasOverstay3mOrMore', question: '최근 10년 안에 3개월 이상 불법체류한 적이 있는지' },
    ],
  },
];

// 금융상품 추천 카드(PRODUCT_RECOMMEND_CARD). hanstep-AI specs/chat/product_recommend_card_v1.md 예시 1(성공)·예시 2(기권) 그대로.
// 서버가 카드를 보내기 전(AI 머지 + 운영 v4.5 전환 전)에 화면을 확인하려고 둔다
const MOCK_PRODUCT_BLOCK: ChatBlock = {
  type: 'PRODUCT_RECOMMEND_CARD',
  asOf: '2026-11-20',
  remainingStayMonths: 10,
  abstainReason: null,
  products: [
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
  ],
  excludedSummary: [
    { reason: 'recommendable', count: 1 },
    { reason: 'kind', count: 4 },
    { reason: 'stayTerm', count: 5 },
  ],
};

const MOCK_PRODUCT_ABSTAIN_BLOCK: ChatBlock = {
  type: 'PRODUCT_RECOMMEND_CARD',
  asOf: '2026-11-20',
  remainingStayMonths: 10,
  abstainReason: 'REQUEST_EXCEEDS_SURPLUS',
  products: [],
  excludedSummary: [
    { reason: 'recommendable', count: 1 },
    { reason: 'kind', count: 4 },
    { reason: 'stayTerm', count: 5 },
    { reason: 'requestMonthly', count: 3 },
  ],
};

const MOCK: Record<string, MockChatResponse> = {
  remitCalc: {
    // 답변 서식(v4.6 **굵게**·"- " 목록) 확인용. 2026-11-20 표시 규칙 측정 원문 그대로(v4.4d·ko, DK03 "엄마한테 50만 원 보내면 얼마 받아요?",
    // 표시 규칙은 v4.6 과 같음. hanstep-AI ai/specs/chat/answer_display_v1.md). 카드 숫자는 송금 화면 Mock 과 맞춘 값이라
    // 받는 금액이 측정 날짜 환율 기준인 답변(23,666 PHP)과 조금 다르다
    text: '**LORNA REYES(엄마) 계좌로 500,000원을 보내면 약 23,666필리핀 페소(PHP)가 받을 금액으로 보여요.**\n\n- 보내는 금액: 500,000원 (수수료 포함)\n- 송금 수수료: 0원\n- 전신료: 5,000원\n- 환율 마진: 약 1,413원 (환율에 포함되어 있어요)\n\n받는 금액은 참고용이에요. 필리핀 은행에서 다시 환전되고 중간 은행 수수료가 붙을 수 있어서 실제 금액은 달라질 수 있어요. 아직 송금되지 않았어요. 확인 카드에서 금액을 확인한 뒤 송금 화면에서 보내 주세요.\n\n신한은행 해외송금 수수료 안내와 한국수출입은행 고시 환율 기준(2026년 11월 19일)으로 계산한 추정치이며, 실시간 환율이 아니에요.',
    blocks: [MOCK_REMITTANCE_BLOCK],
    suggestions: [
      { label: '이번 달 송금해도 여유자금 괜찮아?' },
      { label: '환율이 더 좋아지면 알려줘', icon: 'alarm-outline', action: 'fx_alert' },
    ],
    suggestionsLabel: '연관 질문',
  },
  rateInfo: {
    text: '주요 통화 환율이에요.\n송금할 때는 은행 송금 환율이 적용돼요.',
    blocks: [MOCK_FX_SUMMARY_BLOCK],
    suggestions: [{ label: '필리핀에 50만 원 보내면 얼마 받아요?' }],
  },
  budget: {
    text: '이번 달 여유자금 기준으로 최대 680,000원을 저축할 수 있어요.\n\n월 수입 2,350,000원 − 고정 지출 520,000원 − 송금 700,000원 − 변동 지출 450,000원 = 여유자금 680,000원이에요.',
    suggestions: [
      { label: '저축 계좌 추천해줘' },
      { label: '이번 달 지출 현황 보여줘' },
    ],
    suggestionsLabel: '연관 질문',
  },
  products: {
    text: '체류 만료 전에 끝나고 월 여유자금 안에서 넣을 수 있는 적금 3개를 찾았어요.',
    blocks: [MOCK_PRODUCT_BLOCK],
  },
  productsAbstain: {
    text: '매달 100만 원은 월 여유자금보다 많아서 조건에 맞는 적금을 찾지 못했어요.',
    blocks: [MOCK_PRODUCT_ABSTAIN_BLOCK],
  },
  visaRoadmap: {
    text: `E-9 비자에서 장기 체류로 가는 가장 현실적인 방법은 E-7-4(숙련기능인력) 비자예요.\n\n현재 근무 기간, 소득, 한국어 점수를 합산해요. ${USER_NAME}님의 모의 사전진단 결과를 아래에서 확인해 보세요.`,
    blocks: MOCK_E74_BLOCKS,
    suggestions: [
      { label: '현재 점수 얼마나 돼?' },
      { label: '지금 비자 연장도 가능해?' },
    ],
    suggestionsLabel: '연관 질문',
  },
};

function getVisaDdayResponse(): MockChatResponse {
  const dday = getVisaDday();
  return {
    text: `체류 비자 만료까지 D-${dday}일 남았어요.\n\n만료일은 2027년 10월 4일이에요. E-9 비자 갱신이나 E-7-4 준비를 미리 시작하시길 추천드려요.`,
    suggestions: [
      { label: 'E-7-4 비자 준비 방법', action: 'visa_tab' },
      { label: '비자 연장 조건 알려줘' },
    ],
    suggestionsLabel: '연관 질문',
  };
}

const GENERIC_POOL = [
  '네, 도와드릴게요! 송금, 환율, 비자, 저축에 대해 질문해 보세요.',
  '아직 그 내용은 학습 중이에요. 환율이나 송금 관련 질문은 바로 답할 수 있어요!',
  '더 구체적으로 말씀해 주시면 좋겠어요.\n예: "필리핀에 50만 원 보내면 얼마 받아?"',
];

export function getMockResponse(input: string, callCount: number): MockChatResponse {
  const t = input.trim();
  const lower = t.toLowerCase();

  if (
    lower.includes('얼마 받아') ||
    lower.includes('보내면 얼마') ||
    lower.includes('필리핀에') ||
    lower.includes('본국에')
  ) {
    return MOCK.remitCalc;
  }
  if (
    lower.includes('송금하고싶') ||
    lower.includes('보내고싶') ||
    lower.includes('보내줘') ||
    (lower.includes('엄마') && (lower.includes('송금') || lower.includes('보내'))) ||
    (lower.includes('송금') && lower.includes('5만'))
  ) {
    return MOCK.remitCalc; // 의도 확인 칩(remit_confirm)은 없앴다. 서버처럼 바로 송금 카드
  }
  if (lower.includes('환율')) return MOCK.rateInfo;
  // 상품 추천 카드. '저축 계좌 추천해줘' 칩도 여기로 오도록 '저축' 검사보다 먼저 본다. 100만 원이면 기권 카드
  if (lower.includes('적금') || lower.includes('예금') || lower.includes('상품') || lower.includes('추천')) {
    return lower.includes('100만') ? MOCK.productsAbstain : MOCK.products;
  }
  if (lower.includes('저축') || lower.includes('얼마까지') || lower.includes('여유자금')) {
    return MOCK.budget;
  }
  if (
    lower.includes('만료까지') ||
    (lower.includes('만료') && lower.includes('남았')) ||
    lower.includes('d-day')
  ) {
    return getVisaDdayResponse();
  }
  if (
    lower.includes('오래 살') ||
    lower.includes('장기') ||
    lower.includes('e-7') ||
    lower.includes('로드맵')
  ) {
    return MOCK.visaRoadmap;
  }

  return {
    text: GENERIC_POOL[callCount % GENERIC_POOL.length],
    suggestions: [
      { label: '필리핀에 50만 원 보내면 얼마 받아요?' },
      { label: '오늘 환율 알려줘' },
    ],
    suggestionsLabel: '추천 질문',
  };
}
