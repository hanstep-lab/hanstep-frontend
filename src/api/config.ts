// 환경변수(.env.local)를 한 곳에서 읽는다. Expo 는 EXPO_PUBLIC_ 접두사만 앱에 노출한다.

// 서버 주소. 폰에서 접속하므로 localhost 말고 PC IP (예: http://192.168.0.10:8080)
export const API_URL = process.env.EXPO_PUBLIC_API_URL ?? '';

// SOL 진입 토큰. 실제 앱에서는 SOL이 넘겨주지만 데모는 하드코딩값을 fallback으로 씀.
export const ENTRY_TOKEN = process.env.EXPO_PUBLIC_ENTRY_TOKEN ?? 'demo-e9-nguyen';

// Mock 스위치. 기본 true (명세 example 로 동작). 'false' 일 때만 실제 서버 호출.
export const USE_MOCK = process.env.EXPO_PUBLIC_USE_MOCK !== 'false';

// Mock 이 네트워크처럼 보이게 하는 짧은 지연. 로딩 화면 확인용.
export const mockDelay = (ms = 400) => new Promise<void>((resolve) => setTimeout(resolve, ms));
