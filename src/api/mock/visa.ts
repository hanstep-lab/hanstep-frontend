// VS-001 체류자격 전환 로드맵 Mock (Figma 정리안 550:98 기준).
// 점수·D-day·신청 가능일은 서버가 계산해서 주는 값이라 여기서만 만든다. 화면은 그대로 보여준다.
// 화면은 이 파일을 직접 import 하지 않고 src/api/visa.ts 를 거친다.
// TODO(B): E-7-4 점수 기준, 단계 순서, 준비 서류가 맞는지 확인

const EXPIRY_DATE = '2027-10-04';

// 오늘부터 만료일까지 남은 날 (서버 역할)
function daysUntil(iso: string): number {
  const end = new Date(`${iso}T00:00:00`);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.ceil((end.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

export type MockScoreState = 'default' | 'pending' | 'required';

export function mockVisaRoadmap() {
  return {
    status: {
      current: 'E-9',
      currentLabel: '비전문취업',
      stayLabel: '체류 3년 11개월차',
      target: 'E-7-4',
      targetLabel: '숙련기능인력',
      expiryDate: EXPIRY_DATE,
      dday: daysUntil(EXPIRY_DATE),
      applyFrom: '2026-12-05',
      applyNote: '체류 4년 충족',
    },
    score: {
      total: 160,
      base: 140,
      bonus: 20,
      withProofText: '소득 증빙 시 210점',
      basis: 'DRAFT 점수표 기준 · 모의 진단',
      thresholdNote: '기준 점수: 공식 확인 후 표시',
      items: [
        {
          key: 'income',
          title: '연소득 (평균 약 2,820만 원)',
          sub: '마이데이터 추정 · 증빙 필요',
          state: 'pending' as MockScoreState,
          score: '0점',
          scoreSub: '증빙 시 +50점',
        },
        {
          key: 'topik',
          title: '한국어능력 (TOPIK 3급)',
          sub: '성적 증빙 확인',
          state: 'default' as MockScoreState,
          score: '80점',
        },
        {
          key: 'age',
          title: '나이 (만 31세)',
          sub: '외국인등록증 생년월일 기준',
          state: 'default' as MockScoreState,
          score: '60점',
        },
        {
          key: 'tenure',
          title: '근속 가점 (3년 이상)',
          sub: '동일 사업장 3년 11개월',
          state: 'default' as MockScoreState,
          score: '+20점',
        },
        {
          key: 'recommend',
          title: '고용기업 추천',
          sub: '없으면 신청 불가',
          state: 'required' as MockScoreState,
          score: '미확보',
          scoreSub: '+50점 가능',
        },
      ] as { key: string; title: string; sub: string; state: MockScoreState; score: string; scoreSub?: string }[],
    },
    steps: [
      {
        step: 1,
        required: true,
        label: 'STEP 1 · 필수',
        meta: '사업주 요청',
        title: '고용기업 추천서 받기',
        desc: '추천서가 없으면 점수와 관계없이 신청할 수 없어요. 받으면 가점 +50점이 더해져요.',
        docs: ['고용기업 추천서(붙임5)', '추천자 신분증 사본'],
      },
      {
        step: 2,
        required: false,
        label: 'STEP 2 · 서류 준비',
        meta: '+50점 확정',
        title: '소득금액증명원 제출',
        desc: '최근 2년 평균 약 2,820만 원으로 50점 구간이에요. 마이데이터 추정값이라 증명원을 내야 점수가 확정돼요.',
        docs: ['소득금액증명원(최근 2년)'],
      },
      {
        step: 3,
        required: false,
        label: 'STEP 3 · 선택',
        meta: '+40점 예상',
        title: 'TOPIK 4급 취득',
        desc: '한국어 점수가 80점에서 120점으로 올라가요. 사회통합프로그램 4단계나 사전평가 81점 이상도 같은 점수예요.',
        docs: ['TOPIK 성적표'],
      },
      {
        step: 4,
        required: false,
        label: 'STEP 4 · 신청',
        meta: '12.05 ~ 만료 전',
        title: 'E-7-4 전환 신청',
        desc: '체류 4년을 채운 2026.12.05 이후, 체류 만료일(2027.10.04) 전에 출입국·외국인관서에 신청하세요.',
        docs: [] as string[],
      },
    ],
    summary: {
      rows: [
        { key: 'step12', title: 'STEP 1·2까지 마치면', sub: '고용기업 추천 +50 · 소득 증빙 +50', score: '260점' },
        { key: 'step3', title: 'STEP 3까지 모두 마치면', sub: 'TOPIK 4급 +40', score: '300점' },
      ],
      // Figma 원문의 "승인"은 금지 표현이라 바꿈
      note: '점수표는 법무부 공고 확인 전 초안이에요. 신청 시점에 기준이 바뀔 수 있고, 실제 심사 결과를 뜻하지 않아요.',
    },
  };
}
