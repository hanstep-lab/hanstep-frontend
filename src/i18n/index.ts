// 화면 문구 번역 (i18next). 문구는 ko.ts(지금 화면 문구 그대로)·en.ts 에 키로 모은다.
// 언어는 기기 설정이 아니라 사용자가 고른 users/me preferredLanguage 를 따른다:
// ko → 한국어(지금 화면 그대로), en·vi·zh → 영어(BE·AI 와 같은 규칙), 모르면 한국어.
// 화면에서는 react-i18next 의 useTranslation() 으로 t('키') 를 쓴다.
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import type { Language } from '../types/api';
import ko from './ko';
import en from './en';

export type AppLanguage = 'ko' | 'en';

export const toAppLanguage = (language: Language | null | undefined): AppLanguage =>
  language == null || language === 'ko' ? 'ko' : 'en';

i18n.use(initReactI18next).init({
  resources: { ko: { translation: ko }, en: { translation: en } },
  lng: 'ko',
  fallbackLng: 'ko', // 영어 문구가 빠졌으면 한국어로
  interpolation: { escapeValue: false }, // React 가 이미 이스케이프한다
});

// 사용자 언어로 화면 문구를 바꾼다 (users/me 를 받았을 때, 언어를 골랐을 때)
export function setAppLanguage(language: Language | null | undefined) {
  const next = toAppLanguage(language);
  if (i18n.language !== next) i18n.changeLanguage(next);
}

export default i18n;
