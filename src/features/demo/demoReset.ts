// 데모 계정 초기화 흐름(SG-000 로고 3번 탭). POST /demo/reset 이 성공하면 온보딩을 처음부터 다시 고르도록 앱 상태를 비운다.
// 화면 이동·토스트는 부르는 화면(src/app/index.tsx)이 결과를 보고 정한다.
//
// 서버 범위(backend Swagger, develop #150 이후)와 앱 처리
// - 지움: 온보딩 진행·등록증 문서·OCR 작업  → onboardingStore.reset()(언어·거주 목적·등록증 사진·문서 id), 사진 로컬 파일 삭제, OCR 시간 측정 비움
//   ON-001 은 이 스토어 값으로 미리 채워지므로(language.tsx) 비우지 않으면 이전 선택이 남는다
// - 지움: E-7-4 평가·비자 로드맵            → 비자 화면이 열 때마다 서버에서 불러와 비울 캐시 없음
// - CANCELLED: 목표 환율 알림·금융 목표      → 화면이 열 때마다 불러옴. 알림 표시 기록(AsyncStorage fxAlert.*)은 알림 행이 남으므로 그대로
// - 비활성: 매달 나가는 돈                   → 맞춤 질문(ON-005)이 열 때마다 불러옴
// 토큰(authStore)·송금 화면 값(transferStore: 송금 화면에 들어갈 때마다 새로 정함)은 서버 범위 밖이라 건드리지 않는다.

import { File } from 'expo-file-system';
import { entry } from '../../api/auth';
import { ENTRY_TOKEN } from '../../api/config';
import { resetDemo } from '../../api/demo';
import { useAuthStore } from '../../store/authStore';
import { useOnboardingStore } from '../../store/onboardingStore';
import { ocrTimeReset } from '../../utils/ocrTiming';
import type { ApiError } from '../../types/api';

export type DemoResetResult =
  | { status: 'done' }
  | { status: 'unavailable' } // 403 데모 계정 아님, 404 서버에서 기능 꺼짐
  | { status: 'failed'; error: unknown }
  | { status: 'busy' }; // 이미 초기화 중 (중복 호출)

const UNAVAILABLE_CODES = ['FORBIDDEN', 'RESOURCE_NOT_FOUND', 'HTTP_403', 'HTTP_404'];

let inFlight = false;

export async function resetDemoAccount(): Promise<DemoResetResult> {
  if (inFlight) return { status: 'busy' };
  inFlight = true;
  try {
    // 홈은 신한걸음 진입 전이라 토큰이 없을 수 있다. 있으면 그대로 쓴다
    if (!useAuthStore.getState().accessToken) {
      const res = await entry(ENTRY_TOKEN);
      useAuthStore.getState().setToken(res.accessToken);
    }

    try {
      await resetDemo();
    } catch (e) {
      const code = (e as Partial<ApiError> | null)?.code;
      if (code && UNAVAILABLE_CODES.includes(code)) return { status: 'unavailable' };
      return { status: 'failed', error: e };
    }

    resetOnboardingState();
    ocrTimeReset();
    return { status: 'done' };
  } catch (e) {
    return { status: 'failed', error: e };
  } finally {
    inFlight = false;
  }
}

// 촬영 사진 파일을 지운 뒤(스토어를 비우면 경로를 잃음) 온보딩 스토어 전체를 비운다. 파일 삭제 실패는 진행에 영향 없음
function resetOnboardingState() {
  const { idCardFrontUri, reset } = useOnboardingStore.getState();
  if (idCardFrontUri) {
    try {
      new File(idCardFrontUri).delete();
    } catch {}
  }
  reset();
}
