// 환율 추이 선 차트 (FX-001). react-native-svg 로 그린다.
// 최저·최고 값은 서버가 준 값을 받아서 위아래 범위로만 쓴다. 여기서 하는 계산은 점을 화면 좌표로 옮기는 것뿐.
import { useState } from 'react';
import { View, type LayoutChangeEvent } from 'react-native';
import Svg, { Path, Line, Circle } from 'react-native-svg';
import { colors } from '../constants/theme';

type RateChartProps = {
  values: number[]; // 오래된 값부터
  min: number;
  max: number;
  height?: number;
  simple?: boolean; // 선만 그리는 작은 미리보기 (FX-002). 격자·면·끝점 없음
};

// 선이 카드 위아래 끝에 붙지 않게 남기는 여백
const PAD_Y = 12;
const PAD_RIGHT = 10; // 마지막 점 강조 원이 잘리지 않게

export default function RateChart({ values, min, max, height = 144, simple = false }: RateChartProps) {
  const [width, setWidth] = useState(0);
  const onLayout = (e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width);

  const ready = width > 0 && values.length > 1;
  const range = max - min || 1;
  const padY = simple ? 2 : PAD_Y;
  const plotW = width - (simple ? 0 : PAD_RIGHT);
  const x = (i: number) => (i / (values.length - 1)) * plotW;
  const y = (v: number) => padY + ((max - v) / range) * (height - padY * 2);

  const line = values.map((v, i) => `${i === 0 ? 'M' : 'L'}${x(i)},${y(v)}`).join(' ');
  const area = `${line} L${plotW},${height} L0,${height} Z`;
  const lastX = x(values.length - 1);
  const lastY = y(values[values.length - 1]);
  const grid = [0.25, 0.5, 0.75].map((r) => height * r);

  return (
    <View style={{ height }} onLayout={onLayout}>
      {ready && (
        <Svg width={width} height={height}>
          {!simple && grid.map((gy) => (
            <Line
              key={gy}
              x1={0}
              x2={width}
              y1={gy}
              y2={gy}
              stroke={colors.border}
              strokeWidth={1}
              strokeDasharray="4 4"
            />
          ))}
          {!simple && <Path d={area} fill={colors.border} fillOpacity={0.5} />}
          <Path
            d={line}
            fill="none"
            stroke={colors.primary}
            strokeWidth={simple ? 1.5 : 2.5}
            strokeLinejoin="round"
          />
          {!simple && <Circle cx={lastX} cy={lastY} r={9} fill={colors.primarySoft} />}
          {!simple && <Circle cx={lastX} cy={lastY} r={5} fill={colors.primary} />}
        </Svg>
      )}
    </View>
  );
}
