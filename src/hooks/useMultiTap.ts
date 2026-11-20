// 짧은 시간 안에 같은 곳을 여러 번 누른 것을 알아챈다. 숨은 기능(SG-000 로고 3번 탭 → 데모 초기화)용.
// 판정은 registerTap 순수 함수로 따로 둬서 시각을 넣어 테스트한다.

import { useRef } from 'react';

// 지난 탭 시각들에 now 를 더해 windowMs 안에 count 번이 모였는지 본다.
// 첫 탭부터 마지막 탭까지가 windowMs 이하면 통과(hit). 통과하면 기록을 비워 4번째 탭부터 다시 센다.
export function registerTap(
  taps: number[],
  now: number,
  count: number,
  windowMs: number,
): { taps: number[]; hit: boolean } {
  const recent = [...taps, now].filter((t) => now - t <= windowMs).slice(-count);
  if (recent.length >= count) return { taps: [], hit: true };
  return { taps: recent, hit: false };
}

export function useMultiTap(onHit: () => void, count = 3, windowMs = 1500) {
  const taps = useRef<number[]>([]);
  return () => {
    const result = registerTap(taps.current, Date.now(), count, windowMs);
    taps.current = result.taps;
    if (result.hit) onHit();
  };
}
