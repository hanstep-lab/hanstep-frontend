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

  // 환율 상승·하락 (한국 표준: 상승 빨강, 하락 파랑)
  rise: '#BA1A1A',                    // 상승 글자 (Figma ext/negative)
  riseSoft: 'rgba(255, 218, 214, 0.6)', // 상승 % 배지 배경 (Figma)
  fall: '#0046FF',                    // 하락 글자 (primary와 같은 파랑)
  fallSoft: '#EFF3FF',                // 하락 % 배지 배경 (primaryLight와 같음)

  // 로드맵 컴포넌트 (Figma 522:2)
  box: '#F7F9FC',        // 점수 행 배경
  tagBg: '#EEF1F5',      // 서류 태그, 단계 pill 배경
  stepBorder: '#86909C', // 단계 번호 원 테두리
  required: {
    strong: '#C4320A',   // 필수 단계 번호, 필수요건 태그
    text: '#B42318',     // 필수 pill 글자, 미확보 점수
    bg: '#FFF4F3',       // 필수 점수 행 배경
    border: '#F8C9C4',   // 필수 카드·행 테두리
    pillBg: '#FDE7E4',   // 필수 pill 배경
  },
  pending: '#B54708',    // 증빙 대기 안내 글자

  errorText: '#D32F2F',  // 오류 안내 문구 (작은 글자라 error 보다 진하게)
  dim: 'rgba(15, 20, 31, 0.5)', // 모달 뒤 어둡게

  // 파란·어두운 배경 위 흰색 계열
  onColor: {
    sub: 'rgba(255, 255, 255, 0.85)',       // 보조 글자
    fill: 'rgba(255, 255, 255, 0.2)',       // 태그·체크 원 배경
    fillStrong: 'rgba(255, 255, 255, 0.3)', // 토글 트랙
  },

  // 외국인등록증 일러스트 (ON-002, ON-003)
  idCard: {
    bg: '#2A313C',
    photo: 'rgba(255, 255, 255, 0.15)',
    field: 'rgba(255, 255, 255, 0.12)',
    mrz: 'rgba(220, 220, 220, 0.5)',
  },
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
  caption: { fontFamily: fonts.medium, fontSize: 12, lineHeight: 16, letterSpacing: -0.24 }, // 태그, 점수 행 설명
  bodyLg: { fontFamily: fonts.medium, fontSize: 14, lineHeight: 22, letterSpacing: -0.28 }, // 단계 카드 설명
  titleLg: { fontFamily: fonts.bold, fontSize: 18, lineHeight: 24, letterSpacing: -0.36 }, // 단계 카드 제목
  amount: { fontFamily: fonts.bold, fontSize: 19, lineHeight: 26, letterSpacing: -0.38 }, // 금액·현재 자격 강조
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