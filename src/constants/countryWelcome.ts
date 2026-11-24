// 국적별 환영 설정 (환영 화면 /welcome, SOL 홈 쏠 인사). 국적 코드(ISO alpha-3) → 인사말·국기·문구 키·색.
// 다른 국적을 추가할 때는 COUNTRY_WELCOME 에 한 줄 넣고 i18n welcome.{textKey} 문구를 만들면 된다.
// 화면은 국적 코드를 직접 비교하지 않고 countryWelcome() 이 값을 돌려주는지만 본다.
//
// 인사말 분담: 프론트(환영 화면·홈)는 "Mabuhay"(환영합니다)만 쓴다.
// "Kumusta"(첫 답변 인사)·"Ingat!"(맺음말)은 챗봇(AI 서버) 몫이라 여기에 넣지 않는다.

import { colors } from './theme';

export type CountryWelcome = {
  greeting: string; // 현지어 환영 인사. 화면 언어와 상관없이 같은 말이라 i18n 이 아니라 여기 둔다
  flag: number; // assets/flags 국기 이미지 (require)
  textKey: 'ph'; // i18n welcome.{textKey}.message·homeLine
  palette: { sun: string; blue: string; red: string }; // 환영 화면 연출 색 (theme 토큰)
};

const COUNTRY_WELCOME: Record<string, CountryWelcome> = {
  PHL: {
    greeting: 'Mabuhay',
    flag: require('../../assets/flags/ph.svg'),
    textKey: 'ph',
    palette: colors.flag.ph,
  },
};

export function countryWelcome(code: string | null | undefined): CountryWelcome | null {
  return (code && COUNTRY_WELCOME[code]) || null;
}

// "Mabuhay, Mark!" (이름이 없으면 "Mabuhay!")
export function greetingWithName(welcome: CountryWelcome, name: string): string {
  return name ? `${welcome.greeting}, ${name}!` : `${welcome.greeting}!`;
}
