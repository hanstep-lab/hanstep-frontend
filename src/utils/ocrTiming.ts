// 등록증 OCR 구간별 시간 로그 (개발 중 Metro 터미널에만 찍힘, __DEV__ 아니면 아무것도 안 함).
// 촬영 화면(id-card)에서 start → 확인 화면 polling(useIdDocument)까지 화면을 넘어 이어서 잰다.
// 출력 예: [OCR 시간] 업로드 응답 UPLOADED/QUEUED  +1830ms (누적 2410ms)
//   +ms   : 바로 앞 기록부터 걸린 시간 (이 구간이 느린지)
//   누적  : 촬영 버튼부터 걸린 시간

let startAt: number | null = null;
let lastAt = 0;

export function ocrTimeStart(label: string) {
  if (!__DEV__) return;
  startAt = lastAt = Date.now();
  console.log(`[OCR 시간] ${label} 시작`);
}

export function ocrTimeMark(label: string) {
  if (!__DEV__ || startAt == null) return;
  const now = Date.now();
  console.log(`[OCR 시간] ${label}  +${now - lastAt}ms (누적 ${now - startAt}ms)`);
  lastAt = now;
}
