

//디자인 토큰

//색상
export const colors = {
  primary: '#0046FF',               // 신한 블루 (메인 버튼, 강조)
  primarySoft: 'rgba(0, 70, 255, 0.1)', // primary 10% 투명 (아이콘 박스 배경)
  primaryLight: '#EFF3FF',          // 연파랑 (보조 버튼 배경)

  text: {
    strong: '#0F172A',  // 제목
    default: '#334155', // 본문
    sub: '#475569',     // 카드 안 설명
    muted: '#64748B',   // 흐린 라벨
    inverse: '#FFFFFF', // 파란 배경 위 흰 글자
  },

  background: '#F9F9FF', // 화면 바탕
  surface: '#FFFFFF',    // 카드
};

//폰트
export const fonts = {
  light: 'OneShinhan-Light',
  medium: 'OneShinhan-Medium',
  bold: 'OneShinhan-Bold',
};

//글자 스타일 세트 - 크기, 줄간격, 폰트, 자간을 한 세트로 
export const typography = {
  display: { fontFamily: fonts.bold, fontSize: 26, lineHeight: 36, letterSpacing: -0.65 }, // 큰 숫자 (78점)
  h2:      { fontFamily: fonts.bold, fontSize: 22, lineHeight: 28, letterSpacing: -0.55 }, // 화면 제목
  h3:      { fontFamily: fonts.bold, fontSize: 17, lineHeight: 24, letterSpacing: -0.4 },  // 섹션 제목
  button:  { fontFamily: fonts.bold, fontSize: 16, lineHeight: 24 },                       // 메인 버튼
  title:   { fontFamily: fonts.bold, fontSize: 15, lineHeight: 20, letterSpacing: -0.15 }, // 카드 제목
  body:    { fontFamily: fonts.medium, fontSize: 13, lineHeight: 18 },                     // 본문
  caption: { fontFamily: fonts.medium, fontSize: 12, lineHeight: 18 },                     // 작은 설명
  badge:   { fontFamily: fonts.medium, fontSize: 11, lineHeight: 14 },                     // 배지 (우수, 양호)
};

//여백
export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,  // 화면 좌우 여백
  xxl: 24,
};

//모서리
export const radius = {
  sm: 6,     // 배지
  md: 8,     // 작은 아이콘 박스
  lg: 12,    // 보조 버튼, 큰 아이콘 박스
  xl: 16,    // 카드, 메인 버튼
  full: 999, // 알약 / 원
};

//그림자
export const shadow = {
  card: { boxShadow: '0px 1px 2px rgba(0, 0, 0, 0.05)' },
  button: { boxShadow: '0px 4px 6px rgba(0, 0, 0, 0.1)' },
};

