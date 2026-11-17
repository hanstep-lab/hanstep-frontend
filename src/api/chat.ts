// 채팅 API (CHT). 답변을 한 번에 받지 않고 스트림(SSE)으로 조금씩 받는다.
// 스트림은 axios 로 받을 수 없어서 이 파일만 expo/fetch 를 쓴다. 나머지 API 는 그대로 axios(client.ts).
//
// TODO(백엔드 확인): 명세 CHT-04 를 받으면 아래 가정값을 맞출 것
// - 세션 만들기: POST /api/v1/chat/sessions → { sessionId }
// - 메시지 보내기: POST /api/v1/chat/sessions/{sessionId}/messages/stream, body { content }
// - SSE 한 줄 = `data: {JSON}`
//     { "type": "delta", "text": "글자 조각" }   … 여러 번
//     { "type": "done", "card"?, "suggestions"?, "suggestionsLabel"? }  … 마지막 1번
//     { "type": "error", "code", "message" }
//   JSON 이 아니면 글자 조각으로 보고, `data: [DONE]` 도 끝으로 본다

import { fetch } from 'expo/fetch';
import { API_URL, USE_MOCK, mockDelay } from './config';
import { client } from './client';
import { useAuthStore } from '../store/authStore';
import { getMockResponse, type MockChatResponse } from './mock/chat';
import type { ApiError } from '../types/api';

// 답변 전체. 글자는 스트림으로 오고, 카드·추천 질문은 마지막(done)에 온다
export type ChatReply = MockChatResponse;

type StreamOptions = {
  onDelta: (text: string) => void; // 글자 조각이 올 때마다 호출
  signal?: AbortSignal; // 새 대화 등으로 중간에 끊을 때
};

// 세션 만들기. 새 대화마다 1번
export async function createChatSession(): Promise<string> {
  if (USE_MOCK) {
    await mockDelay(100);
    return `mock-session-${Date.now()}`;
  }
  const res = await client.post<{ sessionId: string }>('/api/v1/chat/sessions');
  return res.data.sessionId;
}

// 메시지를 보내고 답변을 스트림으로 받는다. 끝나면 답변 전체를 돌려준다
export async function streamChatMessage(
  sessionId: string,
  content: string,
  { onDelta, signal }: StreamOptions,
): Promise<ChatReply> {
  if (USE_MOCK) return mockStream(content, onDelta, signal);

  const token = useAuthStore.getState().accessToken;
  let res: Awaited<ReturnType<typeof fetch>>;
  try {
    res = await fetch(`${API_URL}/api/v1/chat/sessions/${sessionId}/messages/stream`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'text/event-stream',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ content }),
      signal,
    });
  } catch {
    throw { code: 'NETWORK', message: '서버에 연결할 수 없어요.' } satisfies ApiError;
  }
  if (!res.ok || !res.body) {
    throw { code: `HTTP_${res.status}`, message: '답변을 받지 못했어요. 다시 시도해 주세요.' } satisfies ApiError;
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let text = '';
  let meta: Omit<ChatReply, 'text'> = {};

  // SSE 는 줄 단위. 조각이 줄 중간에서 잘려 올 수 있어서 마지막 줄은 buffer 에 남겨 둔다
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() ?? '';

    for (const line of lines) {
      if (!line.startsWith('data:')) continue; // event:, id:, 빈 줄 무시
      const data = line.slice(5).trim();
      if (!data || data === '[DONE]') continue;

      const event = parseEvent(data);
      if (event.type === 'delta') {
        text += event.text;
        onDelta(event.text);
      } else if (event.type === 'done') {
        meta = event.meta;
      } else {
        throw { code: event.code, message: event.message } satisfies ApiError;
      }
    }
  }

  return { text, ...meta };
}

type StreamEvent =
  | { type: 'delta'; text: string }
  | { type: 'done'; meta: Omit<ChatReply, 'text'> }
  | { type: 'error'; code: string; message: string };

function parseEvent(data: string): StreamEvent {
  try {
    const json = JSON.parse(data);
    if (json.type === 'done') {
      const { card, suggestions, suggestionsLabel } = json;
      return { type: 'done', meta: { card, suggestions, suggestionsLabel } };
    }
    if (json.type === 'error') {
      return { type: 'error', code: json.code ?? 'STREAM', message: json.message ?? '답변 중 오류가 났어요.' };
    }
    return { type: 'delta', text: String(json.text ?? '') };
  } catch {
    return { type: 'delta', text: data }; // JSON 이 아니면 글자 그대로
  }
}

// Mock: 미리 정한 답변을 2글자씩 잘라 30ms 간격으로 흘려보낸다 (서버 스트림 흉내)
let mockCallCount = 0;

async function mockStream(
  content: string,
  onDelta: (text: string) => void,
  signal?: AbortSignal,
): Promise<ChatReply> {
  mockCallCount += 1;
  const reply = getMockResponse(content, mockCallCount);
  await mockDelay(300); // 첫 글자 나오기 전 "생각하는" 시간

  const chars = Array.from(reply.text); // 한글·이모지가 깨지지 않게 글자 단위로
  for (let i = 0; i < chars.length; i += 2) {
    if (signal?.aborted) break;
    onDelta(chars.slice(i, i + 2).join(''));
    await mockDelay(30);
  }
  return reply;
}
