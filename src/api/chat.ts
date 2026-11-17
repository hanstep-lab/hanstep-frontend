// AI 채팅 API (CHT-04). 화면은 이 파일만 부른다.
// - 대화방 만들기: 일반 JSON 요청이라 axios(client) 사용
// - 답변 받기: 조각으로 와야 해서 expo/fetch + SSE 파서(sse.ts) 사용 (axios 는 응답이 끝나야 줌)
// - Mock(USE_MOCK)이면 서버 대신 mock/chat.ts 답을 조금씩 흘려보낸다

import type { ApiError } from '../types/api';
import { USE_MOCK, mockDelay } from './config';
import { getMockResponse, type ChatCardType, type SuggestionChip } from './mock/chat';

// 답변이 끝났을 때 돌려주는 덧붙임(카드·추천 버튼).
// 실서버 1단계는 chat.done 의 blocks 가 null 이라 빈 값. Mock 은 기존 카드·버튼을 채운다.
export type ChatStreamResult = {
  card?: ChatCardType;
  suggestions?: SuggestionChip[];
  suggestionsLabel?: string;
};

// 답변 도중 화면에 알려 줄 것들
export type ChatStreamHandlers = {
  onDelta: (text: string) => void;   // chat.delta: 답 글자 조각. 화면은 이어 붙인다
  onStatus?: (text: string) => void; // chat.tool_call: "금융 분석 확인 중" 같은 상태 문구
  signal?: AbortSignal;              // 화면을 떠나거나 새 대화를 누르면 끊기
};

// 대화방 만들기 → 세션 id
export async function createChatSession(): Promise<string> {
  if (USE_MOCK) {
    await mockDelay();
    return `mock-${Date.now()}`;
  }
  throw notYet();
}

// 질문 보내고 답변 받기.
// 글자가 올 때마다 onDelta, 다 끝나면 결과를 돌려주고, 실패하면 ApiError({ code, message })를 던진다.
export async function streamChatMessage(
  sessionId: string,
  content: string,
  handlers: ChatStreamHandlers,
): Promise<ChatStreamResult> {
  if (USE_MOCK) return mockStream(content, handlers);
  throw notYet();
}

// ---------------------------------------------------------------------------
// Mock 스트림: 기존 Mock 답을 진짜 스트림처럼 조금씩 흘려보낸다
// ---------------------------------------------------------------------------

const MOCK_THINK_MS = 400; // 첫 글자가 나오기 전 "생각하는" 시간
const MOCK_CHUNK = 3;      // 한 번에 보내는 글자 수
const MOCK_CHUNK_MS = 30;  // 조각 사이 간격 (약 1초에 100자)

let mockCallCount = 0; // 모르는 질문일 때 getMockResponse 가 답을 돌려 가며 고르는 데 쓴다

async function mockStream(
  content: string,
  { onDelta, signal }: ChatStreamHandlers,
): Promise<ChatStreamResult> {
  mockCallCount += 1;
  const res = getMockResponse(content, mockCallCount);

  await wait(MOCK_THINK_MS, signal);

  // 글자 단위로 나누기. slice 로 자르면 이모지처럼 2칸짜리 글자가 반으로 잘릴 수 있다
  const chars = Array.from(res.text);
  for (let i = 0; i < chars.length; i += MOCK_CHUNK) {
    onDelta(chars.slice(i, i + MOCK_CHUNK).join(''));
    await wait(MOCK_CHUNK_MS, signal);
  }

  return { card: res.card, suggestions: res.suggestions, suggestionsLabel: res.suggestionsLabel };
}

// ms 만큼 기다린다. 기다리는 중에 signal 이 끊기면 바로 ABORTED 에러
function wait(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) return reject(aborted());
    const timer = setTimeout(() => {
      signal?.removeEventListener('abort', onAbort);
      resolve();
    }, ms);
    const onAbort = () => {
      clearTimeout(timer);
      reject(aborted());
    };
    signal?.addEventListener('abort', onAbort);
  });
}

function aborted(): ApiError {
  return { code: 'ABORTED', message: '답변을 멈췄어요.' };
}

// 3-3·3-4(실서버)에서 채운다
function notYet(): ApiError {
  return { code: 'NOT_IMPLEMENTED', message: '아직 만들지 않았어요.' };
}
