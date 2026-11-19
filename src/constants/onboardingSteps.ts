// 큰 단계 기준 진행 표시. 등록증·마이데이터는 1단계에 포함.
import type { StepCode } from '../types/api';

export const TOTAL_STAGES = 4;

export const ONBOARDING_STEPS = [
  { id: 'ON-001', stepCode: 'LANGUAGE' as StepCode,        route: '/onboarding/language',  stage: 1, badge: '언어 맞춤 설정',    title: '어떤 언어로\n안내해 드릴까요?' },
  { id: 'ON-002', stepCode: 'ID_DOCUMENT' as StepCode,     route: '/onboarding/id-card',    stage: 1, badge: '외국인등록증 인식', title: '외국인등록증을\n촬영해 주세요' },
  { id: 'ON-003A', stepCode: 'MYDATA_CONSENT' as StepCode, route: '/onboarding/mydata',    stage: 1, badge: '마이데이터 연결',   title: '금융 데이터를\n연결할까요?' },
  { id: 'ON-004', stepCode: 'GOALS' as StepCode,           route: '/onboarding/goal',      stage: 2, badge: '금융 목표',        title: '한국에서 이루고 싶은\n금융 목표는 무엇인가요?' },
  { id: 'ON-005', stepCode: 'GOAL_DETAILS' as StepCode,    route: '/onboarding/questions', stage: 3, badge: '맞춤 질문',        title: '선택하신 목표에 대한\n맞춤 질문이에요' },
  { id: 'ON-006', stepCode: 'SUMMARY_CONFIRM' as StepCode, route: '/onboarding/confirm',   stage: 4, badge: '마지막 단계',      title: '입력하신 정보가\n맞나요?' },
];

// 1단계 안의 세부 화면 이름. 1단계는 화면이 4개라 큰 단계 표시(1 / 4)만으로는 진행이 멈춘 것처럼 보여서,
// 진행 표시 아래에 지금 세부 화면 이름 + 작은 점으로 보여 준다. 숫자는 큰 단계와 헷갈려 쓰지 않는다
export const STAGE1_SUBSTEPS = ['언어 선택', '등록증 촬영', '등록증 확인', '마이데이터 연결'] as const;
export type Stage1SubStep = (typeof STAGE1_SUBSTEPS)[number];

// stepCode 가 속한 큰 단계(1~4). 단계 목록에 없는 세부 화면(등록증 확인·직접 입력)의 진행 표시에 쓴다.
export function stageOf(stepCode: StepCode): number {
  return ONBOARDING_STEPS.find((s) => s.stepCode === stepCode)?.stage ?? 1;
}

// 서버 stepCode → 화면 경로. index.tsx 에서 currentStep 으로 이동할 때 사용.
export function getRouteFromStepCode(stepCode: StepCode): string {
  const step = ONBOARDING_STEPS.find((s) => s.stepCode === stepCode);
  return step?.route ?? '/onboarding/language';
}