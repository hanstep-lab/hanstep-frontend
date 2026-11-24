// 시연 시나리오 질문 (11/27 발표 순서). 문구는 i18n chat.landing.<키>
// 첫 화면 목록과 대화 중 입력창 위 칩 줄(chat.tsx)이 같이 쓴다.
export const SCENARIO_KEYS = ['s1', 's2', 's3', 's4'] as const;

// 재질의 답 칩: 그 질문을 보낸 뒤에만, 그 질문 바로 다음 순서로 대화 중 칩 줄에 나온다(첫 화면 목록에는 없다).
// 문구는 i18n chat.scenarioReply.<질문 키>. 송금(s1)은 AI 가 받는 분을 되물으면 "엄마한테"로 답한다.
// 비자 재질의 답("왜 아직 신청할 수 없나요?")은 넣지 않는다 (발표자가 직접 입력)
export const SCENARIO_REPLY_KEYS = ['s1'] as const;

export type ScenarioKey = (typeof SCENARIO_KEYS)[number];
export type ScenarioReplyKey = (typeof SCENARIO_REPLY_KEYS)[number];

// key: 질문 키(s1…) 또는 재질의 답 키(s1_reply)
export type ScenarioQuestion = { key: ScenarioKey | `${ScenarioReplyKey}_reply`; text: string };

// 대화 중 칩 줄에 보일 질문: 시나리오 순서대로, 재질의 답은 그 질문을 보낸 뒤에만 바로 다음에 끼운다.
// 이미 보낸 것(askedSet)은 뺀다. 맨 앞이 다음 순서다. 다 보냈으면 빈 배열 → 칩 줄을 숨긴다
export function remainingScenario(
  questions: readonly ScenarioQuestion[],
  asked: ReadonlySet<string>,
  replies: Partial<Record<ScenarioReplyKey, string>> = {},
): ScenarioQuestion[] {
  const chips: ScenarioQuestion[] = [];
  for (const q of questions) {
    chips.push(q);
    const reply = replies[q.key as ScenarioReplyKey];
    if (reply && asked.has(q.text)) chips.push({ key: `${q.key as ScenarioReplyKey}_reply`, text: reply });
  }
  return chips.filter(c => !asked.has(c.text));
}
