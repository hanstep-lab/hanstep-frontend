// 온보딩 화면에서 임시로 보관하는 선택값. 메모리 전용(앱 재시작 시 초기화).
// Language·ResidencePurpose 타입은 api.ts 에서 단일 관리한다.

import { create } from 'zustand';
import type { Language, ResidencePurpose } from '../types/api';

// 온보딩을 마친 사용자의 국적·이름 (ON-006 summary 값). 환영 화면·SOL 홈 쏠 인사가 읽는다.
// 온보딩을 마친 순간에만 저장하므로 값이 있으면 "이번 실행에서 온보딩 완료"라는 뜻.
// 메모리 전용이라 앱을 다시 켜면 비워진다(/users/me 에는 국적이 없음)
export type WelcomeProfile = { nationalityCode: string | null; displayName: string };

type OnboardingState = {
  language: Language | null;
  purpose: ResidencePurpose | null;
  idCardFrontUri: string | null; // 촬영한 등록증 앞면 사진의 로컬 경로
  idDocumentId: number | null; // 업로드한 등록증 문서 id (OCR 결과 조회·확정용)
  welcomeProfile: WelcomeProfile | null;
  setLanguage: (language: Language) => void;
  setPurpose: (purpose: ResidencePurpose) => void;
  setIdCardFrontUri: (uri: string | null) => void;
  setIdDocumentId: (id: number | null) => void;
  setWelcomeProfile: (profile: WelcomeProfile | null) => void;
  reset: () => void;
};

export const useOnboardingStore = create<OnboardingState>((set) => ({
  language: null,
  purpose: null,
  idCardFrontUri: null,
  idDocumentId: null,
  welcomeProfile: null,
  setLanguage: (language) => set({ language }),
  setPurpose: (purpose) => set({ purpose }),
  setIdCardFrontUri: (idCardFrontUri) => set({ idCardFrontUri }),
  setIdDocumentId: (idDocumentId) => set({ idDocumentId }),
  setWelcomeProfile: (welcomeProfile) => set({ welcomeProfile }),
  reset: () =>
    set({ language: null, purpose: null, idCardFrontUri: null, idDocumentId: null, welcomeProfile: null }),
}));
