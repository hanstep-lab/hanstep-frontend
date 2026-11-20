// AI 채팅 API (CHT-04). 화면은 이 파일만 부른다.
// - 대화방 만들기: 일반 JSON 요청이라 axios(client) 사용
// - 답변 받기: 조각으로 와야 해서 expo/fetch + SSE 파서(sse.ts) 사용 (axios 는 응답이 끝나야 줌)
// - Mock(USE_MOCK)이면 서버 대신 mock/chat.ts 답을 조금씩 흘려보낸다

import { fetch } from 'expo/fetch';
import { randomUUID } from 'expo-crypto';
import type { ApiError, ChatBlock } from '../types/api';
import { useAuthStore } from '../store/authStore';
import { client, refreshAccessToken } from './client';
import { API_URL, USE_MOCK, mockDelay } from './config';
import { createSseParser } from './sse';
import { getMockResponse, type SuggestionChip } from './mock/chat';

// 앱이 모르는 카드 자리(개발 빌드 __DEV__ 에서만 생긴다). 카드 목록이 "Unsupported card: {type}" 회색 칸으로 그린다.
// 운영 빌드에서는 만들지 않고 모르는 카드를 지금처럼 버린다
export type UnsupportedBlock = { type: 'UNSUPPORTED'; originalType: string };
export type ChatCardBlock = ChatBlock | UnsupportedBlock;

// 답변이 끝났을 때 돌려주는 덧붙임(카드·추천 버튼).
// 카드(blocks)는 실서버 chat.done 과 Mock 이 같은 모양이다. 추천 버튼은 Mock 에만 있다.
export type ChatStreamResult = {
  blocks?: ChatCardBlock[];
  suggestions?: SuggestionChip[];
  suggestionsLabel?: string;
};

// 답변 도중 화면에 알려 줄 것들
export type ChatStreamHandlers = {
  onDelta: (text: string) => void;   // chat.delta: 답 글자 조각. 화면은 이어 붙인다
  onStatus?: (text: string) => void; // chat.tool_call: "재무 분석을 확인했어요" 같은 완료 문구 (도구가 끝난 뒤에 온다. 한 답변에 여러 번 올 수 있다)
  signal?: AbortSignal;              // 화면을 떠나거나 새 대화를 누르면 끊기
};

// 대화방 (CHT-01 POST /api/v1/chat/sessions 의 201 응답)
type ChatSession = {
  id: number; // 메시지 보내기·목록의 sessionId
  title: string | null;
  status: string; // ACTIVE 등
  lastMessageAt: string | null;
  createdAt: string;
};

// 대화방 만들기 → 세션 id(숫자).
// 삭제 API 가 없어 만든 대화방은 서버에 남는다. 화면은 첫 질문 때와 "새 대화" 때만 부른다.
export async function createChatSession(): Promise<number> {
  if (USE_MOCK) {
    await mockDelay();
    return Date.now();
  }
  // 본문은 생략하거나 { title: null } (Swagger). 토큰·에러 변환은 client 가 한다
  const res = await client.post<ChatSession>('/api/v1/chat/sessions', { title: null });
  return res.data.id;
}

// 질문 보내고 답변 받기.
// 글자가 올 때마다 onDelta, 다 끝나면 결과를 돌려주고, 실패하면 ApiError({ code, message })를 던진다.
export async function streamChatMessage(
  sessionId: number,
  content: string,
  handlers: ChatStreamHandlers,
): Promise<ChatStreamResult> {
  if (USE_MOCK) return mockStream(content, handlers);
  return realStream(sessionId, content, handlers);
}

// ---------------------------------------------------------------------------
// 실서버 스트림 (CHT-04 POST /api/v1/chat/sessions/{sessionId}/messages/stream)
// 이벤트: started → tool_call(0개 이상) → delta(여러 번) → sources → done 또는 error. 그 뒤 서버가 연결을 닫는다
// ---------------------------------------------------------------------------

// toolName → 완료 문구. 서버는 문구를 주지 않는다 (Swagger ChatToolCallEvent). 표에 없는 이름은 문구 없이 넘어간다
const TOOL_LABELS: Record<string, string> = {
  get_financial_analysis: '재무 분석을 확인했어요',
  get_remittance_recipients: '받는 분 정보를 확인했어요',
  quote_remittance: '송금 금액을 계산했어요',
  fx_rate_summary: '환율을 확인했어요',
  calculate_e74_score: 'E-7-4 점수를 계산했어요',
  get_fx_rate: '환율을 확인했어요',
  get_visa_roadmap: '비자 로드맵을 확인했어요',
  search_visa_policies: '비자 정책을 찾아봤어요',
  search_finance_policy: '금융 정책을 찾아봤어요',
  recommend_savings_products: '적금 상품을 찾아봤어요',
};

// 화면이 그릴 줄 아는 카드 type. 이 밖의 type 은 버린다 (Swagger: 모르는 type 은 무시)
const KNOWN_BLOCK_TYPES: ReadonlySet<string> = new Set<ChatBlock['type']>([
  'REMITTANCE_CONFIRM',
  'FX_SUMMARY_CARD',
  'E74_SCORE_CARD',
  'MISSING_INPUTS',
  'PRODUCT_RECOMMEND_CARD',
]);

const blockType = (b: object) => String((b as { type?: unknown }).type);

// chat.done 의 blocks → 카드 배열. null·배열 아님은 빈 배열, 아는 type 만 남긴다.
// 모르는 type 은 운영 빌드에서 버리고, 개발 빌드(__DEV__)에서는 UnsupportedBlock 으로 바꿔 자리를 보여 준다.
// 값은 서버가 만든 그대로 쓰고 다시 계산하지 않는다
export function parseBlocks(raw: unknown): ChatCardBlock[] {
  if (!Array.isArray(raw)) return [];
  const cards: ChatCardBlock[] = [];
  for (const b of raw) {
    if (!b || typeof b !== 'object') continue;
    const type = blockType(b);
    if (KNOWN_BLOCK_TYPES.has(type)) cards.push(b as ChatBlock);
    else if (__DEV__) cards.push({ type: 'UNSUPPORTED', originalType: type });
  }
  return cards;
}

// 개발 로그용: chat.done 에서 받은 그대로(모르는 type 포함) type 별 개수. 예: "PRODUCT_RECOMMEND_CARD(1), FX_SUMMARY_CARD(2)"
export function blockSummary(raw: unknown): string {
  const counts = new Map<string, number>();
  if (Array.isArray(raw)) {
    for (const b of raw) {
      if (b && typeof b === 'object') counts.set(blockType(b), (counts.get(blockType(b)) ?? 0) + 1);
    }
  }
  if (counts.size === 0) return 'none';
  return [...counts].map(([type, n]) => `${type}(${n})`).join(', ');
}

async function realStream(
  sessionId: number,
  content: string,
  { onDelta, onStatus, signal }: ChatStreamHandlers,
): Promise<ChatStreamResult> {
  // ① 요청. client(axios)를 못 쓰니 주소·토큰을 직접 붙인다
  // 질문마다 새 uuid. 같은 값으로 다시 보내면 409 DUPLICATE_REQUEST (401 재요청은 처리 전이라 같은 값을 쓴다)
  const body = JSON.stringify({ clientMessageId: randomUUID(), content });
  const open = async (token: string | null) => {
    try {
      return await fetch(`${API_URL}/api/v1/chat/sessions/${sessionId}/messages/stream`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // 꼭 넣는다. 없으면 Android 개발 모드의 네트워크 감시 기능이 응답을 끝까지 모았다가 넘길 수 있다
          Accept: 'text/event-stream',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body,
        signal,
      });
    } catch (e) {
      throw signal?.aborted ? aborted() : networkError(e);
    }
  };
  let res = await open(useAuthStore.getState().accessToken);

  // ② 스트림 시작 전 401: client.ts 와 같은 갱신(공유)으로 토큰을 새로 받아 1번만 다시 요청.
  //    갱신이 실패하거나 다시 401 이면 아래에서 기존 오류로 처리한다. 스트림이 시작된 뒤의 오류는 그대로
  if (res.status === 401) {
    let token: string | null = null;
    try {
      token = await refreshAccessToken();
    } catch {
      // 갱신 실패: 원래 401 오류를 보여 준다
    }
    if (token) res = await open(token);
  }

  // ③ 스트림 시작 전 오류(400·401·404·409)는 일반 JSON 오류로 온다
  if (!res.ok) throw await httpError(res);
  if (!res.body) throw networkError(new Error('응답 본문이 없어요'));

  // ④ 조각 읽기 → 파서 → 이벤트 처리
  let done = false;
  let blocks: ChatCardBlock[] = [];
  let failed: ApiError | null = null;
  const parse = createSseParser(({ event, data }) => {
    const d = parseJson(data);
    if (!d) return; // 깨진 이벤트 하나 때문에 답 전체를 버리지 않는다
    switch (event) {
      case 'chat.delta':
        if (typeof d.text === 'string') onDelta(d.text);
        break;
      case 'chat.tool_call': {
        const label = TOOL_LABELS[String(d.toolName)];
        if (label && d.status === 'SUCCEEDED') onStatus?.(label);
        break;
      }
      case 'chat.done':
        done = true;
        if (__DEV__) console.log(`[chat.done] blocks: ${blockSummary(d.blocks)}`); // 개발 빌드에서만 (Metro 터미널)
        blocks = parseBlocks(d.blocks); // 카드는 도구가 성공했을 때만 온다. 없으면 null
        break;
      case 'chat.error':
        failed = { code: String(d.code ?? 'INTERNAL_ERROR'), message: String(d.message ?? '답변을 만들지 못했어요.') };
        break;
      // chat.started(5단계에서 assistantMessageId 사용), chat.sources, 모르는 이벤트는 무시
    }
  });

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  try {
    while (!done && !failed) {
      const { done: closed, value } = await reader.read();
      if (closed) break;
      parse(decoder.decode(value, { stream: true }));
    }
  } catch (e) {
    throw signal?.aborted ? aborted() : networkError(e);
  }

  // ⑤ 끝 판단. 연결이 닫힌 것만으로는 성공이 아니다 (서버가 죽어도 닫힌다)
  if (failed) throw failed;
  if (done) return { blocks };
  throw { code: 'STREAM_INTERRUPTED', message: '답변이 중간에 끊겼어요.' } satisfies ApiError;
}

// 실패 응답 본문 { code, message, details, requestId } → ApiError. client.ts 응답 인터셉터와 같은 규칙
async function httpError(res: { status: number; json: () => Promise<unknown> }): Promise<ApiError> {
  const body = (await res.json().catch(() => null)) as { code?: string; message?: string } | null;
  return {
    code: body?.code ?? `HTTP_${res.status}`,
    message: body?.message ?? '알 수 없는 오류가 발생했어요.',
  };
}

function networkError(e: unknown): ApiError {
  return { code: 'NETWORK', message: e instanceof Error ? e.message : '네트워크 오류가 발생했어요.' };
}

// data 줄(JSON 한 줄) 읽기. 깨졌으면 null
function parseJson(data: string): Record<string, unknown> | null {
  try {
    const v = JSON.parse(data);
    return v && typeof v === 'object' ? (v as Record<string, unknown>) : null;
  } catch {
    return null;
  }
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

  return { blocks: res.blocks, suggestions: res.suggestions, suggestionsLabel: res.suggestionsLabel };
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
