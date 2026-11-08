// 
export const colors = {
  primary: '#0046FF',                   // 신한 블루
  primarySoft: 'rgba(0, 70, 255, 0.1)', // 배지·아이콘 박스 배경
  primaryLight: '#EFF3FF',              // 보조 버튼 배경

  text: {
    strong: '#24272D',  // 제목, 카드 제목
    default: '#24272D', // 본문
    sub: '#666666',     // 설명, 보조 문구
    muted: '#666666',   // 흐린 라벨
    inverse: '#FFFFFF', // 파란 배경 위 글자
  },

  background: '#F3F6FB', // 화면 바탕
  surface: '#FFFFFF',    // 카드
  border: '#DCDCDC',     // 구분선, 비활성 단계
  disabled: '#CBD5E1',   // 비활성 버튼
  error: '#EF4444',      // 오류, 미확보 상태
};

//폰트
export const fonts = {
  light: 'OneShinhan-Light',
  medium: 'OneShinhan-Medium',
  bold: 'OneShinhan-Bold',
};

//글자 세트
export const typography = {
  display: { fontFamily: fonts.bold, fontSize: 26, lineHeight: 36, letterSpacing: -0.52 },
  h2: { fontFamily: fonts.bold, fontSize: 22, lineHeight: 30, letterSpacing: -0.44 }, // 화면 제목
  h3: { fontFamily: fonts.bold, fontSize: 17, lineHeight: 24, letterSpacing: -0.34 }, // 섹션 제목
  button: { fontFamily: fonts.bold, fontSize: 17, lineHeight: 24, letterSpacing: -0.34 }, // 메인 버튼
  subtitle: { fontFamily: fonts.medium, fontSize: 15, lineHeight: 22, letterSpacing: -0.3 },  // 제목 아래 설명
  title: { fontFamily: fonts.bold, fontSize: 15, lineHeight: 20, letterSpacing: -0.3 },  // 카드 제목
  body: { fontFamily: fonts.medium, fontSize: 13, lineHeight: 18, letterSpacing: -0.26 }, // 본문, 카드 설명
  badge: { fontFamily: fonts.medium, fontSize: 11, lineHeight: 14, letterSpacing: -0.22 }, // 배지
};

//간격
export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20, // 화면 좌우 여백
  xxl: 24,
};

//모서리
export const radius = {
  sm: 6,
  md: 8,
  lg: 12,    // 카드, 메인 버튼
  xl: 16,
  full: 999,
};

//그림자
export const shadow = {
  card: { boxShadow: '0px 1px 2px rgba(0, 0, 0, 0.05)' },
  button: { boxShadow: '0px 4px 6px rgba(0, 0, 0, 0.1)' },
};