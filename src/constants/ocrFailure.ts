// OCR 실패 코드(GET /documents/{id} 의 failureCode) → 사용자 안내 종류.
// 코드 목록: hanstep-AI ocr/worker/spring_client.py OcrFailureCode. 화면은 코드 문자열을 직접 보지 않고 ocrFailureGuide 만 쓴다.
//   retake    : 사진 문제 → 다시 찍기
//   temporary : 일시적인 서버 문제 → 잠시 후 다시 찍기 (실패 문서는 다시 돌릴 API 가 없어 버튼은 다시 찍기)
//   other     : 그 외·모르는 코드·코드 없음 → 다시 찍기

export type OcrFailureGuide = 'retake' | 'temporary' | 'other';

const OCR_FAILURE_GUIDE: Record<string, OcrFailureGuide> = {
  OCR_FAILED: 'retake', // 사진은 받았지만 글자를 읽지 못함
  INVALID_IMAGE: 'retake', // 이미지 파일이 깨졌거나 열 수 없음
  UNSUPPORTED_SIDE: 'retake', // 앞면이 아닌 면을 찍음
  HASH_MISMATCH: 'retake', // 받은 파일이 업로드한 파일과 다름 (전송 중 손상)
  SOURCE_MISSING: 'retake', // 원본 사진이 저장소에 없음
  SOURCE_FETCH_FAILED: 'temporary', // 저장소에서 원본을 일시적으로 못 가져옴 (재시도 가능)
  SPRING_UNAVAILABLE: 'temporary', // Worker 가 결과를 보낼 서버에 일시적으로 연결 못 함 (재시도 가능)
  SPRING_REJECTED: 'other', // 서버가 Worker 의 결과를 거절함
  WORKER_ERROR: 'other', // Worker 내부 오류
};

export function ocrFailureGuide(code: string | null | undefined): OcrFailureGuide {
  return (code && OCR_FAILURE_GUIDE[code]) || 'other';
}
