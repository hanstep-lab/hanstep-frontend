// accessToken 보관용 전역 상태(zustand).
// client.ts 가 요청마다 여기서 토큰을 꺼내 Authorization 헤더에 붙인다.
// P0 에서는 메모리에만 둔다. 앱을 새로 켜면 index.tsx 가 /auth/entry 를 다시 불러 토큰을 채운다.

import { create } from 'zustand';

type AuthState = {
  accessToken: string | null;
  setToken: (token: string) => void;
  clearToken: () => void;
};

export const useAuthStore = create<AuthState>((set) => ({
  accessToken: null,
  setToken: (accessToken) => set({ accessToken }),
  clearToken: () => set({ accessToken: null }),
}));
