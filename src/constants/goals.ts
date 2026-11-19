// 금융 목표 목록. key 는 서버 goalType 값 그대로 (화면 순서 = 저장 순서).
// 목표 선택(ON-004)과 최종 확인(ON-006)이 같이 쓴다.
import type { GoalType } from '../types/api';

export const GOALS: { key: GoalType; label: string; desc: string; tag: string | null }[] = [
  { key: 'LUMP_SUM',    label: '목돈 마련',      desc: '목표 금액을 체계적으로 모으고 싶어요',      tag: null },
  { key: 'REMITTANCE',  label: '본국 송금',      desc: '가족에게 안전하고 신속하게 돈을 보내요',    tag: null },
  { key: 'LIVING_COST', label: '생활비 관리',    desc: '불필요한 지출을 스마트하게 줄이고 싶어요',   tag: null },
  { key: 'CREDIT',      label: '신용 관리',      desc: '한국에서 안전하게 신용 점수를 쌓고 싶어요',  tag: null },
  { key: 'SETTLEMENT',  label: '장기 정착 준비', desc: '전월세 보증금 및 영주·장기 비자 준비',       tag: '비자·대출' },
];

export const goalLabel = (type: GoalType): string =>
  GOALS.find((g) => g.key === type)?.label ?? type;
