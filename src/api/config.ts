// 환경변수(.env.local)를 한 곳에서 읽는다. Expo 는 EXPO_PUBLIC_ 접두사만 앱에 노출한다.

// 서버 주소. 폰에서 접속하므로 localhost 말고 PC IP (예: http://192.168.0.10:8080)
export const API_URL = process.env.EXPO_PUBLIC_API_URL ?? '';

// SOL 진입 토큰. 실제 앱에서는 SOL이 넘겨주지만 데모는 하드코딩값을 fallback으로 씀.
export const ENTRY_TOKEN = process.env.EXPO_PUBLIC_ENTRY_TOKEN ?? 'demo-e9-ph-reyes';

// Mock 스위치. 기본 true (명세 example 로 동작). 'false' 일 때만 실제 서버 호출.
export const USE_MOCK = process.env.EXPO_PUBLIC_USE_MOCK !== 'false';

// Mock 등록증 OCR 실패 재현 (USE_MOCK 일 때만). 값이 있으면 조회 2번째에 실패한다.
//   OCR 실패 코드(예: OCR_FAILED, SPRING_UNAVAILABLE) → 그 코드로 FAILED
//   LOAD_ERROR → 조회 요청 자체를 한 번 실패시킴 (다시 시도하면 정상 진행)
export const MOCK_OCR_FAILURE = process.env.EXPO_PUBLIC_MOCK_OCR_FAILURE ?? '';

// Mock 이 네트워크처럼 보이게 하는 짧은 지연. 로딩 화면 확인용.
export const mockDelay = (ms = 400) => new Promise<void>((resolve) => setTimeout(resolve, ms));
