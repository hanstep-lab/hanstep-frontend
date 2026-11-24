import { remainingScenario, SCENARIO_KEYS, type ScenarioQuestion } from '../demoScenario';
import ko from '../../../i18n/ko';
import en from '../../../i18n/en';

const questionsOf = (landing: Record<string, string>): ScenarioQuestion[] =>
  SCENARIO_KEYS.map(key => ({ key, text: landing[key] }));

const KO = questionsOf(ko.chat.landing);
const texts = (qs: ScenarioQuestion[]) => qs.map(q => q.text);

describe('remainingScenario (대화 중 시나리오 칩)', () => {
  it('아무것도 안 보냈으면 4문항 전부, 시나리오 순서대로', () => {
    expect(remainingScenario(KO, new Set()).map(q => q.key)).toEqual(['s1', 's2', 's3', 's4']);
  });

  it('보낸 질문은 빼고, 남은 질문의 순서는 그대로 (맨 앞이 다음 순서)', () => {
    const asked = new Set([ko.chat.landing.s1, ko.chat.landing.s2]);
    expect(remainingScenario(KO, asked).map(q => q.key)).toEqual(['s3', 's4']);
  });

  it('순서를 건너뛰어 보내도 보낸 것만 빠진다', () => {
    const asked = new Set([ko.chat.landing.s3]);
    expect(remainingScenario(KO, asked).map(q => q.key)).toEqual(['s1', 's2', 's4']);
  });

  it('시나리오가 아닌 질문(재질의에 답한 말 등)은 영향을 주지 않는다', () => {
    const asked = new Set(['필리핀 페소로, 필리핀에 계신 엄마한테', '왜 아직 신청할 수 없나요?']);
    expect(texts(remainingScenario(KO, asked))).toEqual(texts(KO));
  });

  it('4문항을 모두 보내면 빈 배열 (칩 줄 숨김)', () => {
    expect(remainingScenario(KO, new Set(texts(KO)))).toEqual([]);
  });

  it('화면 언어의 문구로 비교한다 (영어 화면에서 영어 질문을 보냈으면 빠진다)', () => {
    const EN = questionsOf(en.chat.landing);
    const asked = new Set([en.chat.landing.s1]);
    expect(remainingScenario(EN, asked)[0]).toEqual({
      key: 's2',
      text: 'After sending money, how can I save the rest?',
    });
  });
});

describe('시나리오 문구 (ko·en)', () => {
  it.each([
    ['ko', ko.chat.landing],
    ['en', en.chat.landing],
  ])('%s: 4개 키가 모두 있고 비어 있지 않다', (_lang, landing) => {
    expect(Object.keys(landing)).toEqual([...SCENARIO_KEYS]);
    for (const key of SCENARIO_KEYS) expect((landing as Record<string, string>)[key].trim()).not.toBe('');
  });
});
