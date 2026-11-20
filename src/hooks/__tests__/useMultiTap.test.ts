import { registerTap } from '../useMultiTap';

// 시각(ms) 목록을 차례로 탭했을 때 몇 번째 탭에서 통과했는지
function tapAt(times: number[], count = 3, windowMs = 1500): number[] {
  let taps: number[] = [];
  const hits: number[] = [];
  times.forEach((now, i) => {
    const r = registerTap(taps, now, count, windowMs);
    taps = r.taps;
    if (r.hit) hits.push(i + 1);
  });
  return hits;
}

describe('registerTap (1.5초 안에 3번)', () => {
  it('1.5초 안에 3번 누르면 3번째 탭에서 통과', () => {
    expect(tapAt([0, 400, 800])).toEqual([3]);
  });

  it('첫 탭부터 정확히 1.5초에 3번째 탭이면 통과', () => {
    expect(tapAt([0, 700, 1500])).toEqual([3]);
  });

  it('2번만 누르면 아무 일 없음', () => {
    expect(tapAt([0, 300])).toEqual([]);
  });

  it('3번이 1.5초를 넘기면 아무 일 없음', () => {
    expect(tapAt([0, 800, 1501])).toEqual([]);
  });

  it('천천히 누르다가 마지막 3번이 1.5초 안에 모이면 통과', () => {
    expect(tapAt([0, 800, 1501, 1600])).toEqual([4]);
  });

  it('통과한 뒤에는 처음부터 다시 3번을 센다', () => {
    expect(tapAt([0, 100, 200, 300, 400, 500])).toEqual([3, 6]);
  });
});
