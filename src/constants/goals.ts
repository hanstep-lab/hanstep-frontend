// 금융 목표 목록. key 는 서버 goalType 값 그대로 (화면 순서 = 저장 순서).
// 목표 선택(ON-004)과 최종 확인(ON-006)이 같이 쓴다. 이름·설명은 i18n goals, 꼬리표는 goalTags 에 둔다.
import i18n from '../i18n';
import type ko from '../i18n/ko';
import type { GoalType } from '../types/api';

export const GOALS: { key: GoalType; tag: keyof typeof ko.goalTags | null }[] = [
  { key: 'LUMP_SUM',    tag: null },
  { key: 'REMITTANCE',  tag: null },
  { key: 'LIVING_COST', tag: null },
  { key: 'CREDIT',      tag: null },
  { key: 'SETTLEMENT',  tag: 'SETTLEMENT' },
];

export const goalLabel = (type: GoalType): string =>
  GOALS.some((g) => g.key === type) ? i18n.t(`goals.${type}.label`) : type;
