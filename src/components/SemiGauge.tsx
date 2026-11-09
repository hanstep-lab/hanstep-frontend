import Svg, { Circle, Path } from 'react-native-svg';
import { colors } from '../constants/theme';

type SemiGaugeProps = {
  value: number; // 현재 값
  max: number;   // 최대 값
  width?: number;
  strokeWidth?: number;
  trackColor?: string;
  progressColor?: string;
};

// 왼쪽(0) → 오른쪽(max)으로 채워지는 반원 게이지. 끝에 원형 노브 표시.
export default function SemiGauge({
  value,
  max,
  width = 220,
  strokeWidth = 15,
  trackColor = colors.primarySoft,
  progressColor = '#005DF9',
}: SemiGaugeProps) {
  const ratio = Math.min(Math.max(max > 0 ? value / max : 0, 0), 1);
  const pad = strokeWidth;
  const r = width / 2 - pad;
  const cx = width / 2;
  const cy = r + pad;
  const height = cy + pad;

  // 180°(왼쪽) 에서 시계 방향으로 ratio * 180° 만큼 진행
  const angle = Math.PI * (1 - ratio);
  const endX = cx + r * Math.cos(angle);
  const endY = cy - r * Math.sin(angle);

  const track = `M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`;
  const progress = `M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${endX} ${endY}`;

  return (
    <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      <Path d={track} stroke={trackColor} strokeWidth={strokeWidth} strokeLinecap="round" fill="none" />
      {ratio > 0 && (
        <Path d={progress} stroke={progressColor} strokeWidth={strokeWidth} strokeLinecap="round" fill="none" />
      )}
      <Circle cx={endX} cy={endY} r={strokeWidth * 0.43} fill={colors.primary} stroke={colors.primary} strokeWidth={3} />
    </Svg>
  );
}
