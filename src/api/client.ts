// axios 인스턴스. 모든 실제 서버 호출은 이걸 거친다.
// - baseURL: EXPO_PUBLIC_API_URL
// - 요청마다 authStore 의 accessToken 을 Bearer 로 붙임
// - 오류는 서버 { code, message, details, requestId } 에서 code·message 만 뽑아 통일

import axios, { AxiosError } from 'axios';
import { API_URL } from './config';
import { useAuthStore } from '../store/authStore';
import type { ApiError } from '../types/api';

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

// 응답 인터셉터: 오류를 항상 { code, message } 로 바꿔서 reject
client.interceptors.response.use(
  (response) => response,
  (error: AxiosError<{ code?: string; message?: string }>) => {
    const data = error.response?.data;
    const apiError: ApiError = {
      code: data?.code ?? (error.response ? `HTTP_${error.response.status}` : 'NETWORK'),
      message: data?.message ?? error.message ?? '알 수 없는 오류가 발생했어요.',
    };
    return Promise.reject(apiError);
  },
);
