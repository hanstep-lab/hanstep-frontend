// 온보딩 화면에서 임시로 보관하는 선택값. 메모리 전용(앱 재시작 시 초기화).
// Language·ResidencePurpose 타입은 api.ts 에서 단일 관리한다.

import { create } from 'zustand';
import type { Language, ResidencePurpose } from '../types/api';

type OnboardingState = {
  language: Language | null;
  purpose: ResidencePurpose | null;
  setLanguage: (language: Language) => void;
  setPurpose: (purpose: ResidencePurpose) => void;
  reset: () => void;
};

export const useOnboardingStore = create<OnboardingState>((set) => ({
  language: null,
  purpose: null,
  setLanguage: (language) => set({ language }),
  setPurpose: (purpose) => set({ purpose }),
  reset: () => set({ language: null, purpose: null }),
}));
