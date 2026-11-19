// 오류를 화면에 보여 줄 한국어 문구로 바꾼다.
// 서버 message 는 사용자 언어(예: Reyes 는 vi)로 올 수 있어 쓰지 않고, code 로 문구를 고른다.
// 화면이 직접 만든 오류(throw new Error('...'))는 이미 한국어라 그 message 를 그대로 쓴다.
import type { ApiError } from '../types/api';

const BY_CODE: Record<string, string> = {
  NETWORK: '네트워크 연결을 확인하고 다시 시도해 주세요.',
  HTTP_401: '접속 정보가 만료됐어요. 앱을 다시 시작해 주세요.',
  UNAUTHORIZED: '접속 정보가 만료됐어요. 앱을 다시 시작해 주세요.', // 서버가 401 때 주는 code (토큰 만료 등)
  VALIDATION_ERROR: '입력한 값을 다시 확인해 주세요.',
  INVALID_STATE: '지금은 처리할 수 없어요. 화면을 다시 열어 주세요.',
  RESOURCE_NOT_FOUND: '정보를 찾을 수 없어요. 처음부터 다시 시도해 주세요.',
  HTTP_404: '정보를 찾을 수 없어요. 처음부터 다시 시도해 주세요.',
  AI_UPSTREAM_ERROR: '잠시 후 다시 시도해 주세요.',
};

export function errorText(e: unknown, fallback: string): string {
  if (e instanceof Error) return e.message || fallback; // 화면이 만든 한국어 오류
  const code = (e as Partial<ApiError> | null)?.code;
  if (!code) return fallback;
  if (BY_CODE[code]) return BY_CODE[code];
  if (/^HTTP_5\d\d$/.test(code)) return '잠시 후 다시 시도해 주세요.';
  return fallback;
}
