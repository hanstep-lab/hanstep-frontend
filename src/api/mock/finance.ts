// FN-001 Mock 금융 생활 진단 데이터. 실제 API 연결 시 이 파일만 교체.
// 금액은 만 원 단위. chat.ts budget 응답(235만 − 52만 − 70만 − 45만 = 68만)과 맞춤.

export const MONTHLY_FLOW = {
  income: 235,         // 월 소득
  fixedExpense: 52,    // 고정 생활비
  remittance: 70,      // 송금
  variableExpense: 45, // 변동 지출
  salaryCount12m: 12,  // 최근 12개월 급여 입금 횟수
  loanCount: 0,        // 보유 대출 수
};

export type IndicatorTone = 'primary' | 'live' | 'neutral';

export type Indicator = {
  key: 'income' | 'spending' | 'saving' | 'loan';
  label: string;
  score: number;
  maxScore: number;
  grade: string;
  tone: IndicatorTone;
  detail: string;
};

export type Mission = {
  key: 'emergency' | 'checkcard' | 'remitFee';
  title: string;
  desc: string;
  cta: string;
  icon: 'arrow-forward' | 'download-outline';
  tone: IndicatorTone;
};

export type FinanceDiagnosis = {
  userName: string;
  totalScore: number;
  maxScore: number;
  grade: string;
  headline: string;
  indicators: Indicator[];
  missions: Mission[];
};

// 여유자금 = 소득 − 고정 생활비 − 송금 − 변동 지출
export function calcSpareMoney(f = MONTHLY_FLOW): number {
  return f.income - f.fixedExpense - f.remittance - f.variableExpense;
}

function gradeOf(score: number, max: number): string {
  const ratio = score / max;
  if (ratio >= 0.85) return '우수';
  if (ratio >= 0.6) return '양호';
  return '주의';
}

function headlineOf(grade: string): string {
  if (grade === '우수') return '매우 안정적이에요';
  if (grade === '양호') return '안정적인 편이에요';
  return '조금 더 관리가 필요해요';
}

// 지표별 점수는 서버 산출값이라 가정(Mock 고정값). 합계·등급·문구만 여기서 계산.
export function getFinanceDiagnosis(): FinanceDiagnosis {
  const f = MONTHLY_FLOW;
  const spare = calcSpareMoney(f);
  const spareRatio = Math.round((spare / f.income) * 100);

  const indicators: Indicator[] = [
    {
      key: 'income',
      label: '소득 정기성',
      score: 22,
      maxScore: 25,
      grade: '',
      tone: 'primary',
      detail: `최근 12개월 급여 입금 ${f.salaryCount12m}회 · 월 평균 ${f.income}만 원`,
    },
    {
      key: 'spending',
      label: '지출 안정성',
      score: 19,
      maxScore: 25,
      grade: '',
      tone: 'live',
      detail: `고정 생활비 월 ${f.fixedExpense}만 원 · 송금 월 ${f.remittance}만 원`,
    },
    {
      key: 'saving',
      label: '저축 여력',
      score: 18,
      maxScore: 25,
      grade: '',
      tone: 'neutral',
      detail: `월 평균 여유자금 약 ${spare}만 원 · 소득 대비 약 ${spareRatio}%`,
    },
    {
      key: 'loan',
      label: '대출 상환 상태',
      score: 19,
      maxScore: 25,
      grade: '',
      tone: 'neutral',
      detail:
        f.loanCount === 0
          ? '보유 대출 없음 · 마이데이터 대출 정보 기준'
          : `보유 대출 ${f.loanCount}건 · 마이데이터 대출 정보 기준`,
    },
  ].map(i => ({ ...i, grade: gradeOf(i.score, i.maxScore) }) as Indicator);

  const totalScore = indicators.reduce((sum, i) => sum + i.score, 0);
  const maxScore = indicators.reduce((sum, i) => sum + i.maxScore, 0);
  const grade = gradeOf(totalScore, maxScore);

  const missions: Mission[] = [
    {
      key: 'emergency',
      title: '비상금 3개월치 모으기',
      desc: `고정 지출 3개월분(약 ${f.fixedExpense * 3}만 원)을 목표로 해요`,
      cta: '적금 상품 비교',
      icon: 'arrow-forward',
      tone: 'primary',
    },
    {
      key: 'checkcard',
      title: '체크카드로 생활비 결제하기',
      desc: '국내 금융 거래 이력을 꾸준히 쌓을 수 있어요',
      cta: '카드 보기',
      icon: 'arrow-forward',
      tone: 'live',
    },
    {
      key: 'remitFee',
      title: '송금 수수료 줄이기',
      desc: '정기 송금을 한 번에 묶으면 건당 수수료를 아낄 수 있어요.',
      cta: '송금 방법 보기',
      icon: 'download-outline',
      tone: 'neutral',
    },
  ];

  return {
    userName: 'Nguyen',
    totalScore,
    maxScore,
    grade,
    headline: headlineOf(grade),
    indicators,
    missions,
  };
}
