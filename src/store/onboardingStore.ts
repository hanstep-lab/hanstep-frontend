//zustand

import { create } from 'zustand';

// 선택지 타입: 이 값들 중 하나만 들어갈 수 있음
export type Language = 'ko' | 'en' | 'vi' | 'zh';
export type ResidencePurpose = 'work' | 'study' | 'family';

// 저장소 모양 정의: 담을 값 + 값을 바꾸는 함수
type OnboardingState = {
  language: Language | null;          // 아직 안 골랐으면 null
  purpose: ResidencePurpose | null;
  setLanguage: (language: Language) => void;
  setPurpose: (purpose: ResidencePurpose) => void;
  reset: () => void;                  // 처음 상태로 되돌리기
};

export const useOnboardingStore = create<OnboardingState>((set) => ({
  // 초기값
  language: null,
  purpose: null,

  // 값을 바꾸는 함수들
  setLanguage: (language) => set({ language }),
  setPurpose: (purpose) => set({ purpose }),
  reset: () => set({ language: null, purpose: null }),
}));