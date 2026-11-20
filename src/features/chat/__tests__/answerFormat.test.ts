import { parseAnswer, parseInline, type AnswerLine } from '../answerFormat';
import { getMockResponse } from '../../../api/mock/chat';

const plain = (text: string) => [{ text, bold: false }];

describe('parseInline (한 줄 안의 **…**)', () => {
  it('짝지어진 ** 사이는 굵게, 별표는 지운다', () => {
    expect(parseInline('**오늘 환율은 1,331.10원이에요.** 참고하세요')).toEqual([
      { text: '오늘 환율은 1,331.10원이에요.', bold: true },
      { text: ' 참고하세요', bold: false },
    ]);
  });

  it('별표 없는 평문은 그대로', () => {
    expect(parseInline("메뉴의 '대안신용 사전진단'을 눌러 보세요.")).toEqual(plain("메뉴의 '대안신용 사전진단'을 눌러 보세요."));
  });

  it('닫히지 않은 ** 는 표식만 숨기고 뒤 글자는 일반 글자 (스트리밍 중 "**1,334")', () => {
    expect(parseInline('**1,334')).toEqual(plain('1,334'));
    expect(parseInline('**굵게** 그리고 **아직')).toEqual([
      { text: '굵게', bold: true },
      { text: ' 그리고 아직', bold: false },
    ]);
  });

  it('계약 밖 표식(*…*, _, #, 링크)은 해석하지 않는다', () => {
    expect(parseInline('*기울임* _밑줄_ # 제목 [링크](https://a.b)')).toEqual(plain('*기울임* _밑줄_ # 제목 [링크](https://a.b)'));
  });

  it('빈 굵게(****)는 아무것도 그리지 않는다', () => {
    expect(parseInline('****')).toEqual([]);
  });
});

describe('parseAnswer (줄 단위)', () => {
  it('결론 굵게 + 목록 + 빈 줄 + 마지막 줄', () => {
    const text = '**결론이에요.**\n- 1개월 평균 1,335.92원\n- 3개월 평균 1,352.30원\n\n한국수출입은행 고시 · 11월 19일 11:42 기준이에요.';
    expect(parseAnswer(text)).toEqual<AnswerLine[]>([
      { kind: 'text', segments: [{ text: '결론이에요.', bold: true }] },
      { kind: 'bullet', segments: plain('1개월 평균 1,335.92원') },
      { kind: 'bullet', segments: plain('3개월 평균 1,352.30원') },
      { kind: 'blank' },
      { kind: 'text', segments: plain('한국수출입은행 고시 · 11월 19일 11:42 기준이에요.') },
    ]);
  });

  it('"1. " 숫자 목록과 하이픈 뒤 공백 없는 줄은 평문 줄', () => {
    expect(parseAnswer('Next steps:\n1. Take TOPIK\n-4.82 KRW')).toEqual<AnswerLine[]>([
      { kind: 'text', segments: plain('Next steps:') },
      { kind: 'text', segments: plain('1. Take TOPIK') },
      { kind: 'text', segments: plain('-4.82 KRW') },
    ]);
  });

  it('별표 없는 예전(v4.5 이하) 답변은 줄만 나뉜 평문', () => {
    expect(parseAnswer('주요 통화 환율이에요.\n송금할 때는 은행 송금 환율이 적용돼요.')).toEqual<AnswerLine[]>([
      { kind: 'text', segments: plain('주요 통화 환율이에요.') },
      { kind: 'text', segments: plain('송금할 때는 은행 송금 환율이 적용돼요.') },
    ]);
  });

  describe('스트리밍 중(partial)', () => {
    it('끝에 * 하나만 온 상태는 숨긴다 (** 의 앞 글자)', () => {
      expect(parseAnswer('**Today*', { partial: true })).toEqual([{ kind: 'text', segments: plain('Today') }]);
      expect(parseAnswer('*', { partial: true })).toEqual([]); // 첫 조각이 '*' 하나면 아무것도 그리지 않는다
    });

    it('줄이 막 "-" 로 시작했으면 목록 줄로 미리 그린다', () => {
      expect(parseAnswer('**결론**\n-', { partial: true })).toEqual<AnswerLine[]>([
        { kind: 'text', segments: [{ text: '결론', bold: true }] },
        { kind: 'bullet', segments: [] },
      ]);
    });

    it('줄바꿈 뒤 다음 글자를 기다리는 빈 줄은 그리지 않는다', () => {
      expect(parseAnswer('첫 줄\n', { partial: true })).toEqual([{ kind: 'text', segments: plain('첫 줄') }]);
      expect(parseAnswer('첫 줄\n\n', { partial: true })).toEqual([{ kind: 'text', segments: plain('첫 줄') }, { kind: 'blank' }]);
    });

    it('다 온 글에서는 위 처리를 하지 않는다', () => {
      expect(parseAnswer('끝*')).toEqual([{ kind: 'text', segments: plain('끝*') }]);
      expect(parseAnswer('-')).toEqual([{ kind: 'text', segments: plain('-') }]);
    });
  });
});

describe('스트리밍 흉내: Mock 송금 답변(측정 원문)을 조각내 흘려보낼 때', () => {
  const full = getMockResponse('엄마한테 50만 원 보내면 얼마 받아요?', 1).text;
  const shown = (lines: AnswerLine[]) =>
    lines.map((l) => (l.kind === 'blank' ? '' : `${l.kind === 'bullet' ? '• ' : ''}${l.segments.map((s) => s.text).join('')}`));

  it.each([1, 2, 3, 5])('%i글자씩: 화면 글자에 별표·글자 "-" 가 한 번도 나오지 않고, 다 오면 완성본과 같다', (chunk) => {
    const chars = Array.from(full);
    let prev: string[] = [];
    for (let i = chunk; i < chars.length + chunk; i += chunk) {
      const lines = parseAnswer(chars.slice(0, i).join(''), { partial: true });
      const now = shown(lines);
      for (const line of now) {
        expect(line).not.toContain('*');
        expect(line).not.toMatch(/^-/); // 목록 줄이 글자 "-" 로 보였다가 "•" 로 바뀌지 않는다
      }
      // 이미 보인 줄(마지막 줄 제외)이 뒤에 바뀌지 않는다 = 깜빡이지 않는다
      prev.slice(0, -1).forEach((line, j) => expect(now[j]).toBe(line));
      prev = now;
    }
    expect(parseAnswer(full, { partial: true })).toEqual(parseAnswer(full));
  });

  it('완성본: 첫 줄은 굵게, 목록 4줄, 빈 줄 3개', () => {
    const lines = parseAnswer(full);
    expect(lines[0]).toEqual({
      kind: 'text',
      segments: [{ text: 'LORNA REYES(엄마) 계좌로 500,000원을 보내면 약 23,666필리핀 페소(PHP)가 받을 금액으로 보여요.', bold: true }],
    });
    expect(lines.filter((l) => l.kind === 'bullet')).toHaveLength(4);
    expect(lines.filter((l) => l.kind === 'blank')).toHaveLength(3);
  });
});
