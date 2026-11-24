// 필리핀 국기의 해(8줄기 빛)를 react-native-svg 로 그린 정지 그림. 움직임은 쓰는 쪽(app/welcome.tsx)이 감싸서 준다.
// 국기 이미지(assets/flags/ph.svg)는 20px 아이콘이라 해 모양이 없어서 따로 그린다.

import Svg, { Circle, G, Polygon } from 'react-native-svg';

// 해: 가운데 원 + 8 방향 빛. 각 빛은 굵은 줄기 1개와 양옆 가는 줄기 2개 (국기 모양)
export function Sun({ size, color }: { size: number; color: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 200 200">
      {Array.from({ length: 8 }, (_, i) => (
        <G key={i} rotation={i * 45} origin="100, 100">
          <Polygon points="91,62 109,62 100,6" fill={color} />
          <G rotation={-13} origin="100, 100">
            <Polygon points="96,64 104,64 100,24" fill={color} />
          </G>
          <G rotation={13} origin="100, 100">
            <Polygon points="96,64 104,64 100,24" fill={color} />
          </G>
        </G>
      ))}
      <Circle cx={100} cy={100} r={38} fill={color} />
    </Svg>
  );
}
