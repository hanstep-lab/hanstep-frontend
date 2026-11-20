// 금융 목표 Mock (GOL-01·02). 서버처럼 저장한 목표를 메모리에 들고 있다(앱 재시작 시 초기화).
// 처음 값은 2026-11-19 서버 응답(demo-e9-ph-reyes)을 그대로 옮겼다. monthlyRequired 는 서버 계산값이라 고정값.
// 화면은 이 파일을 직접 import 하지 않고 src/api/goals.ts 를 거친다.
import type { GoalListResponse, GoalResponse, GoalSaveRequest } from '../../types/api';

let goals: GoalResponse[] = [
  {
    id: 1,
    goalType: 'LUMP_SUM',
    targetAmount: { amount: 6000000, currency: 'KRW' },
    targetDate: '2027-09-30',
    status: 'ACTIVE',
    monthlyRequired: { amount: 600000, currency: 'KRW' },
  },
];
let nextId = 2;

export function mockGetGoals(): GoalListResponse {
  return { goals };
}

// 서버와 같은 전체 교체: 요청에 없는 목표는 빠지고(CANCELLED), 같은 종류는 id 유지
export function mockSaveGoals(req: GoalSaveRequest): GoalListResponse {
  goals = req.goals.map((item) => {
    const prev = goals.find((g) => g.goalType === item.goalType);
    const targetAmount = item.targetAmount ?? null;
    return {
      id: prev?.id ?? nextId++,
      goalType: item.goalType,
      targetAmount,
      targetDate: item.targetDate ?? null,
      status: 'ACTIVE',
      // 계산은 서버 몫이라 Mock 은 이전 값을 유지하거나 null
      monthlyRequired: targetAmount ? (prev?.monthlyRequired ?? null) : null,
    };
  });
  return { goals };
}

// 데모 초기화 Mock: 서버처럼 ACTIVE 목표를 CANCELLED 로 (조회에서 빠짐)
export function mockCancelGoals() {
  goals = [];
}
