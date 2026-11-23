// t('키') 자동완성·오타 검사: 키는 ko.ts 기준
import 'i18next';
import type ko from './ko';

declare module 'i18next' {
  interface CustomTypeOptions {
    defaultNS: 'translation';
    resources: { translation: typeof ko };
  }
}
