// 시연 시나리오 질문 (11/27 발표 순서). 문구는 i18n chat.landing.<키>
// 첫 화면 목록과 대화 중 입력창 위 칩 줄(chat.tsx)이 같이 쓴다
export const SCENARIO_KEYS = ['s1_1', 's1_2', 's2', 's3', 's4_1', 's4_2'] as const;

export type ScenarioKey = (typeof SCENARIO_KEYS)[number];

export type ScenarioQuestion = { key: ScenarioKey; text: string };

// 대화 중 칩 줄에 보일 질문: 이미 보낸 질문(askedSet)을 빼고 시나리오 순서 그대로.
// 맨 앞이 다음 순서 질문이다. 다 보냈으면 빈 배열 → 칩 줄을 숨긴다
export function remainingScenario(
  questions: readonly ScenarioQuestion[],
  asked: ReadonlySet<string>,
): ScenarioQuestion[] {
  return questions.filter(q => !asked.has(q.text));
}
