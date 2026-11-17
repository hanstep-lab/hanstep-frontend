// Mock 챗봇 응답 데이터. 실제 AI API 연결 시 이 파일만 교체.
import type { ComponentProps } from 'react';
import type { Ionicons } from '@expo/vector-icons';
import { DEMO_USER } from './demoUser';

export const USER_NAME = DEMO_USER.firstName;

export type ChatCardType = 'remit_confirm' | 'remit_calc' | 'rate_info' | 'visa_roadmap';

export type SuggestionChip = {
  label: string;
  icon?: ComponentProps<typeof Ionicons>['name'];
  action?: ChatAction; // 화면 이동. 없으면 label 을 질문으로 보낸다
};

// 칩·메뉴를 누르면 이동하는 곳. 주소는 chat.tsx 의 ACTION_ROUTES 에 있다
export type ChatAction = 'visa_tab' | 'fx' | 'fx_alert' | 'products' | 'diagnosis' | 'transfer';

export type MockChatResponse = {
  text: string;
  card?: ChatCardType;
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
  '필리핀에 50만 원 보내면 얼마 받아요?',
  '이번 달 얼마까지 저축할 수 있어요?',
  '비자 만료까지 얼마나 남았어요?',
];

// action 이 없는 메뉴는 "준비 중" (대안신용 CR-001, 설정)
export type MenuItem = { label: string; desc: string; action?: ChatAction };

export const MENU_GROUPS: { section: string; items: MenuItem[] }[] = [
  {
    section: '환율·송금',
    items: [
      { label: '환율 정보', desc: '오늘 기준환율·추이·기간별 평균', action: 'fx' },
      { label: '목표 환율 알림', desc: '원하는 기준환율이 되면 알림', action: 'fx_alert' },
      { label: '해외송금', desc: 'BDO ****5566', action: 'transfer' },
    ],
  },
  {
    section: '금융 성장',
    items: [
      { label: '내 금융 분석', desc: '여유자금·송금 플랜·저축', action: 'diagnosis' },
      { label: '금융상품 추천', desc: '여유자금에 맞춘 적금 추천', action: 'products' },
      { label: '대안신용 사전진단', desc: '대안신용 점수·참고 한도' },
    ],
  },
  {
    section: '체류·비자',
    items: [{ label: '비자 로드맵', desc: 'E-9 → E-7-4 점수 사전진단', action: 'visa_tab' }],
  },
  {
    section: '설정',
    items: [
      { label: '내 정보 수정', desc: '온보딩 답변 다시 입력' },
      { label: '화면 언어', desc: '한국어·English·Filipino·中文' },
    ],
  },
];

const MOCK: Record<string, MockChatResponse> = {
  remitConfirm: {
    text: '"엄마"는 필리핀에 계신 어머니로 이해했어요. 필리핀으로 해외송금하고, 5만 원은 내 통장에서 빠져나가는 금액(KRW) 기준이 맞을까요?',
    card: 'remit_confirm',
    suggestions: [
      { label: '엄마 계좌번호 확인해줘' },
      { label: '이번 달 이 금액 보내도 괜찮아?' },
    ],
    suggestionsLabel: '추천 질문',
  },
  remitCalc: {
    text: '어머니 BDO 계좌로 50만 원을 보내면\n약 20,080 PHP를 받아요.',
    card: 'remit_calc',
    suggestions: [
      { label: '이번 달 송금해도 여유자금 괜찮아?' },
      { label: '환율이 더 좋아지면 알려줘', icon: 'alarm-outline', action: 'fx_alert' },
    ],
    suggestionsLabel: '연관 질문',
  },
  rateInfo: {
    text: '오늘의 주요 통화 기준환율이에요.\nECB 기준환율 기반 참고값이라 실제 송금할 때 적용되는 환율과는 달라요.',
    card: 'rate_info',
    suggestions: [
      { label: '환율 알림 받기', icon: 'alarm-outline', action: 'fx_alert' },
      { label: '필리핀에 50만 원 보내면 얼마 받아요?' },
    ],
  },
  budget: {
    text: '이번 달 여유자금 기준으로 최대 680,000원을 저축할 수 있어요.\n\n월 수입 2,350,000원 − 고정 지출 520,000원 − 송금 700,000원 − 변동 지출 450,000원 = 여유자금 680,000원이에요.',
    suggestions: [
      { label: '저축 계좌 추천해줘' },
      { label: '이번 달 지출 현황 보여줘' },
    ],
    suggestionsLabel: '연관 질문',
  },
  visaRoadmap: {
    text: `E-9 비자에서 장기 체류로 가는 가장 현실적인 방법은 E-7-4(숙련기능인력) 비자예요.\n\n현재 근무 기간, 소득, 한국어 점수를 합산해 신청해요. 비자 탭에서 ${USER_NAME}님의 예상 점수를 확인할 수 있어요.`,
    card: 'visa_roadmap',
    suggestions: [
      { label: '현재 점수 얼마나 돼?' },
      { label: '지금 비자 연장도 가능해?' },
    ],
    suggestionsLabel: '연관 질문',
  },
};

// AI-004 환율 조회 카드. ECB 에는 은행 송금 환율(보낼 때/받을 때)이 없어서 기준환율만 보여 준다.
// PHP 값은 FX-001 Mock(src/api/mock/fx.ts)과 맞춤: 24.90원, 전일 24.99원 대비 -0.09 (-0.36%).
// USD 는 숫자 임시값. 방향(up/down)에 따라 화면이 상승 빨강·하락 파랑으로 칠한다.
export const RATE_INFO = {
  title: '오늘 기준환율',
  asOfText: '2026.11.13 기준',
  rows: [
    { currency: 'PHP', symbol: '₱', name: '필리핀 PHP', unitText: '1 PHP', rateText: '24.90 원', changeText: '▼ 0.09 (-0.36%)', direction: 'down' },
    { currency: 'USD', symbol: '$', name: '미국 USD', unitText: '1 USD', rateText: '1,382.50 원', changeText: '▲ 3.20 (+0.23%)', direction: 'up' },
  ] as const,
  note: 'ECB 기준환율 기반 참고값 · 하루 1번 갱신. 송금할 때는 은행 송금 환율이 적용돼요.',
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

  if (t === '네, 맞아요') return MOCK.remitCalc;

  if (lower.includes('얼마 받아') || lower.includes('보내면 얼마') || lower.includes('필리핀에')) {
    return MOCK.remitCalc;
  }
  if (
    lower.includes('송금하고싶') ||
    lower.includes('보내고싶') ||
    lower.includes('보내줘') ||
    (lower.includes('엄마') && (lower.includes('송금') || lower.includes('보내'))) ||
    (lower.includes('송금') && lower.includes('5만'))
  ) {
    return MOCK.remitConfirm;
  }
  if (lower.includes('환율')) return MOCK.rateInfo;
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
