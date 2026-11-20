// 데모 계정 초기화 흐름(SG-000 로고 3번 탭). POST /demo/reset 뒤 서버가 바꾼 범위만 앱 상태에 반영한다.
// 화면 이동·토스트는 부르는 화면(src/app/index.tsx)이 결과를 보고 정한다.
//
// 서버 범위(backend Swagger, develop #150 이후)와 앱 처리
// - 지움: 온보딩 진행·등록증 문서·OCR 작업  → 등록증 사진(로컬 파일)·문서 id·OCR 시간 측정 비움
// - 지움: E-7-4 평가·비자 로드맵            → 비자 화면이 열 때마다 서버에서 불러와 비울 캐시 없음
// - CANCELLED: 목표 환율 알림·금융 목표      → 화면이 열 때마다 불러옴. 알림 표시 기록(AsyncStorage fxAlert.*)은 알림 행이 남으므로 그대로
// - 비활성: 매달 나가는 돈                   → 맞춤 질문(ON-005)이 열 때마다 불러옴
// - 시드로 되돌림(Reyes): 체류 정보·서비스 언어 → 언어는 GET /users/me 값으로 다시 맞춤
// - 그대로: 입국일·이전 체류 개월·마이데이터·금융 분석, 거주 목적 → 거주 목적은 GET /onboarding 값으로 다시 맞춤
// 토큰(authStore)·송금 화면 값(transferStore)은 서버 범위 밖이라 건드리지 않는다.

import { File } from 'expo-file-system';
import { entry } from '../../api/auth';
import { ENTRY_TOKEN } from '../../api/config';
import { resetDemo } from '../../api/demo';
import { getOnboarding } from '../../api/onboarding';
import { getMe } from '../../api/user';
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

    clearIdDocument();
    ocrTimeReset();
    await reloadKeptValues();
    return { status: 'done' };
  } catch (e) {
    return { status: 'failed', error: e };
  } finally {
    inFlight = false;
  }
}

// 등록증 문서가 지워졌으니 촬영 사진 파일과 문서 id 를 버린다. 파일 삭제 실패는 진행에 영향 없음
function clearIdDocument() {
  const { idCardFrontUri } = useOnboardingStore.getState();
  if (idCardFrontUri) {
    try {
      new File(idCardFrontUri).delete();
    } catch {}
  }
  useOnboardingStore.setState({ idCardFrontUri: null, idDocumentId: null });
}

// 서버가 지우지 않았거나 되돌린 값은 비우지 않고 서버 값으로 다시 맞춘다.
// 초기화는 이미 끝났으므로 불러오기에 실패하면 그 값만 비워 두고(ON-001 에서 다시 고름) 진행한다
async function reloadKeptValues() {
  const [me, onboarding] = await Promise.allSettled([getMe(), getOnboarding()]);
  useOnboardingStore.setState({
    language: me.status === 'fulfilled' ? me.value.preferredLanguage : null,
    purpose: onboarding.status === 'fulfilled' ? onboarding.value.profile.residencePurpose : null,
  });
}
