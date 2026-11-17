// SSE(text/event-stream) 파서. 조각이 잘려 와도 빈 줄(\n\n) 단위로 이벤트를 꺼낸다.
// 네트워크는 이벤트 경계와 상관없이 아무 데서나 잘라 보내므로, 버퍼에 쌓았다가 다시 자른다.
export type SseEvent = { event: string; data: string };

export function createSseParser(onEvent: (e: SseEvent) => void) {
  let buffer = ''; // ① 아직 빈 줄을 못 만난 글자들 (조각이 와도 값이 남아 있음)

  return (chunk: string) => {
    // ② 붙인 "뒤에" \r\n → \n. 조각이 \r 에서 잘려도 빈 줄로 잘못 보지 않는다
    buffer = (buffer + chunk).replace(/\r\n/g, '\n');

    // ③ 빈 줄이 있는 만큼 이벤트를 꺼내고, 반쪽은 버퍼에 남겨 다음 조각을 기다린다
    let end = buffer.indexOf('\n\n');
    while (end !== -1) {
      const block = buffer.slice(0, end);
      buffer = buffer.slice(end + 2);
      const e = parseBlock(block);
      if (e) onEvent(e);
      end = buffer.indexOf('\n\n');
    }
  };
}

// "event: chat.delta\ndata: {...}" 한 덩어리 → { event, data }
function parseBlock(block: string): SseEvent | null {
  let event = 'message'; // ④ event 줄이 없으면 SSE 기본 이름
  const data: string[] = [];

  for (const line of block.split('\n')) {
    if (line.startsWith(':')) continue; // ⑤ 연결 유지 신호
    const i = line.indexOf(':');
    if (i === -1) continue;
    const field = line.slice(0, i);
    const value = line.slice(i + 1).replace(/^ /, ''); // ⑥ "data: x" 의 앞 공백 한 칸 제거
    if (field === 'event') event = value;
    else if (field === 'data') data.push(value);
  }
  // ⑦ data 없는 덩어리(핑 등)는 버린다. 모르는 이벤트 이름은 chat.ts 에서 무시
  return data.length ? { event, data: data.join('\n') } : null;
}
