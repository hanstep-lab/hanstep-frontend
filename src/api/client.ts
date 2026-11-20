// axios 인스턴스. 모든 실제 서버 호출은 이걸 거친다.
// - baseURL: EXPO_PUBLIC_API_URL
// - 요청마다 authStore 의 accessToken 을 Bearer 로 붙임
// - 오류는 서버 { code, message, details, requestId } 에서 code·message 만 뽑아 통일
// - 401(토큰 만료 등)이면 entry 로 토큰을 갱신하고 원래 요청을 1번만 다시 보낸다 (entry 요청 자체는 제외)

import axios, { AxiosError, type InternalAxiosRequestConfig } from 'axios';
import { API_URL, ENTRY_TOKEN } from './config';
import { entry } from './auth'; // auth.ts 도 client 를 import 하지만, entry 는 401 때 실행 시점에만 불러 순환 import 문제 없음
import { useAuthStore } from '../store/authStore';
import type { ApiError, ApiFieldError } from '../types/api';

const ENTRY_PATH = '/api/v1/auth/entry';

// 진행 중인 토큰 갱신. 동시에 여러 요청이 401 이어도 entry 는 1번만 부르고 결과를 나눠 쓴다
let refreshing: Promise<string> | null = null;

// entry 로 새 토큰을 받아 authStore 에 넣고 돌려준다. client.ts 와 채팅 스트림(chat.ts)이 같이 쓴다
export function refreshAccessToken(): Promise<string> {
  if (!refreshing) {
    refreshing = entry(ENTRY_TOKEN)
      .then((res) => {
        useAuthStore.getState().setToken(res.accessToken);
        return res.accessToken;
      })
      .finally(() => {
        refreshing = null;
      });
  }
  return refreshing;
}

type RetryConfig = InternalAxiosRequestConfig & { _retried?: boolean };

export const client = axios.create({
  baseURL: API_URL,
  timeout: 10000,
  headers: { 'Content-Type': 'application/json' },
});

// 요청 인터셉터: 토큰이 있으면 Authorization 헤더 추가
client.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// 응답 인터셉터: 401 이면 토큰 갱신 후 1회 재시도, 그 밖의 오류는 항상 { code, message, fields? } 로 바꿔서 reject
client.interceptors.response.use(
  (response) => response,
  async (error: AxiosError<{ code?: string; message?: string; details?: { fields?: unknown } }>) => {
    const config = error.config as RetryConfig | undefined;
    if (error.response?.status === 401 && config && !config._retried && !config.url?.includes(ENTRY_PATH)) {
      config._retried = true; // 재시도도 401 이면 아래로 내려가 기존 오류로 처리
      let refreshed = false;
      try {
        await refreshAccessToken();
        refreshed = true;
      } catch {
        // 갱신 실패: 원래 401 오류를 그대로 보여 준다
      }
      if (refreshed) return client(config); // 요청 인터셉터가 새 토큰을 붙인다
    }

    const data = error.response?.data;
    const fields = Array.isArray(data?.details?.fields)
      ? (data.details.fields as ApiFieldError[]).filter((f) => typeof f?.field === 'string')
      : undefined;
    const apiError: ApiError = {
      code: data?.code ?? (error.response ? `HTTP_${error.response.status}` : 'NETWORK'),
      message: data?.message ?? error.message ?? '알 수 없는 오류가 발생했어요.',
      ...(fields && fields.length > 0 ? { fields } : {}),
    };
    return Promise.reject(apiError);
  },
);
