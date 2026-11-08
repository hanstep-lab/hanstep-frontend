export const VISA_STATUS = {
  current: 'E-9',
  currentLabel: '비전문취업',
  target: 'E-7-4',
  targetLabel: '숙련기능인력',
  expiryDate: '2027-10-04',
  stayDuration: '3년 11개월',
  applicationNote: '체류기간 요건 확인 중',
};

export function getDday(): number {
  const expiry = new Date('2027-10-04');
  expiry.setHours(0, 0, 0, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

export const SCORE_SUMMARY = {
  total: 225,
  base: 205,
  bonus: 20,
};

export type ScoreItem = {
  label: string;
  sub: string;
  scoreText: string;
  isBonus: boolean;
  unconfirmedText?: string;
};

export const SCORE_ITEMS: ScoreItem[] = [
  {
    label: '연소득 (약 3,120만 원)',
    sub: '근로계약 연봉 기준',
    scoreText: '65점',
    isBonus: false,
  },
  {
    label: '한국어능력 (TOPIK 3급)',
    sub: '기본점수·성적 증빙 기준',
    scoreText: '80점',
    isBonus: false,
  },
  {
    label: '나이 (만 31세)',
    sub: '외국인등록증 생년월일 기준',
    scoreText: '60점',
    isBonus: false,
  },
  {
    label: '근속 가점 (3년 이상)',
    sub: '동일 사업장 3년 11개월',
    scoreText: '+20점',
    isBonus: true,
  },
  {
    label: '고용기업 추천',
    sub: '사업주 발급 필요',
    scoreText: '+50점 가능',
    isBonus: true,
    unconfirmedText: '미확보',
  },
];

export type RoadmapStatus = 'active' | 'next' | 'pending';

export type RoadmapStep = {
  step: number;
  status: RoadmapStatus;
  statusLabel: string;
  title: string;
  tag: string;
  description: string;
};

export const ROADMAP_STEPS: RoadmapStep[] = [
  {
    step: 1,
    status: 'active',
    statusLabel: '진행중',
    title: 'TOPIK 4급 취득',
    tag: '+40점 예상',
    description:
      '한국어 점수가 80점에서 120점으로 올라가요. 성적 증빙을 올리면 점수에 자동 반영돼요.',
  },
  {
    step: 2,
    status: 'next',
    statusLabel: '다음 단계',
    title: '고용기업 추천서 받기',
    tag: '사업주 요청',
    description:
      '현 사업장 추천을 받으면 가점 +50점이에요. 사업주가 발급하므로 미리 요청해 두세요.',
  },
  {
    step: 3,
    status: 'pending',
    statusLabel: '서류 준비',
    title: '소득 증빙 준비',
    tag: '마이데이터 연동',
    description:
      '근로계약 연봉 약 3,120만 원(65점 구간)이에요. 3,500만 원부터 80점 구간이며, 공식 판정은 소득금액증명원 기준이에요.',
  },
  {
    step: 4,
    status: 'pending',
    statusLabel: '신청',
    title: 'E-7-4 전환 신청',
    tag: '만료 전 신청',
    description:
      '체류기간 요건 충족을 확인한 뒤, 체류 만료일(2027.10.04) 전에 출입국·외국인관서에 신청하세요.',
  },
];
