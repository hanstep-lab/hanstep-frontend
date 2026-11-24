// 이름 표시 형식. 값을 바꾸지 않고 보여 주는 모양만 정한다.

// "MARK ANTHONY REYES" → "Mark" (첫 단어, 첫 글자만 대문자)
export function firstName(displayName: string): string {
  const w = displayName.trim().split(/\s+/)[0] ?? '';
  return w ? w[0].toUpperCase() + w.slice(1).toLowerCase() : '';
}
