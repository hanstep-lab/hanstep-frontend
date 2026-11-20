// 챗봇 답변 글을 줄·굵게 단위로 나눈다(그리기는 AnswerText.tsx). 마크다운 전체가 아니라 아래 서식만 다룬다.
// 기준: hanstep-AI ai/specs/chat/answer_display_v1.md "FE 표식 계약" (프롬프트 v4.6)
// - 같은 줄 안의 **…** 쌍 → 굵게. 측정 답변은 첫 줄(결론)에만 한 쌍이지만, 어느 줄이든 같은 규칙으로 읽는다
// - 줄 맨 앞 "- " → 목록 줄
// - 빈 줄 → 문단 사이 간격
// - 그 밖(#, *…*, _, 링크, 표, "1. " 숫자 목록)은 해석하지 않고 글자 그대로
// v4.5 이하 답변에는 ** 가 없어 결과가 평문과 같다. 스트림에 프롬프트 버전 신호가 없으니 모든 AI 답변에 쓴다.

export type AnswerSegment = { text: string; bold: boolean };

export type AnswerLine =
  | { kind: 'text'; segments: AnswerSegment[] }
  | { kind: 'bullet'; segments: AnswerSegment[] }
  | { kind: 'blank' };

const BOLD = '**';
const BULLET = '- ';

// 한 줄 안의 **…** 를 굵은 조각으로. 짝이 없는 ** 는 표식만 숨기고 뒤 글자는 일반 글자로 둔다
// (스트리밍 중 "**1,334" 처럼 닫히기 전 상태. 닫히면 다음 계산에서 굵게 바뀐다)
export function parseInline(line: string): AnswerSegment[] {
  const parts = line.split(BOLD);
  // parts 가 홀수 개면 ** 가 모두 짝지어졌다. 짝수 개면 마지막 ** 가 닫히지 않은 것
  const closedPairs = Math.floor((parts.length - 1) / 2);
  const segments: AnswerSegment[] = [];
  parts.forEach((text, i) => {
    if (!text) return;
    // 짝지어진 ** 사이(홀수 번째 조각)만 굵게. 닫히지 않은 마지막 조각은 일반 글자
    const bold = i % 2 === 1 && Math.ceil(i / 2) <= closedPairs;
    const last = segments[segments.length - 1];
    if (last && last.bold === bold) last.text += text;
    else segments.push({ text, bold });
  });
  return segments;
}

// partial: 글이 아직 다 오지 않았으면(답하는 중, 도중 실패) true. 끝부분이 잠깐 잘못 보이지 않게 한다
// - 끝의 '*' 하나: ** 의 앞 글자만 온 상태일 수 있어 숨긴다
// - 마지막 줄이 '-' 하나: 목록 줄("- ")이 들어오는 중이라 목록으로 미리 그린다(글자 '-' 가 보였다가 바뀌지 않게)
// - 끝의 빈 줄: 줄바꿈 뒤 다음 글자를 기다리는 중이라 그리지 않는다
export function parseAnswer(text: string, { partial = false }: { partial?: boolean } = {}): AnswerLine[] {
  let body = text;
  if (partial) {
    const trailingStars = body.length - body.replace(/\*+$/, '').length;
    if (trailingStars % 2 === 1) body = body.slice(0, -1);
  }
  if (!body) return [];

  const raw = body.split('\n');
  if (partial && raw.length > 1 && raw[raw.length - 1] === '') raw.pop();

  return raw.map((line, i): AnswerLine => {
    if (line === '') return { kind: 'blank' };
    if (line.startsWith(BULLET)) return { kind: 'bullet', segments: parseInline(line.slice(BULLET.length)) };
    if (partial && line === '-' && i === raw.length - 1) return { kind: 'bullet', segments: [] };
    return { kind: 'text', segments: parseInline(line) };
  });
}
