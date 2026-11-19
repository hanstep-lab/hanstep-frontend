// 화면·답변 언어 목록. 언어 선택(ON-001)과 최종 확인(ON-006) 언어 칩이 같이 쓴다.
import type { Language } from '../types/api';

export const LANGUAGES: { code: Language; name: string; sub: string; flag: string }[] = [
  { code: 'ko', name: '한국어',      sub: 'Korean',     flag: '🇰🇷' },
  { code: 'vi', name: 'Tiếng Việt', sub: 'Vietnamese', flag: '🇻🇳' },
  { code: 'en', name: 'English',    sub: 'English',    flag: '🇺🇸' },
  { code: 'zh', name: '中文',        sub: 'Chinese',    flag: '🇨🇳' },
];

export const languageName = (code: Language): string =>
  LANGUAGES.find((l) => l.code === code)?.name ?? code;
