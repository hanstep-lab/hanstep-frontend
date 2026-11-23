// 영어 문구. ko.ts 와 키가 같아야 한다(빠진 키는 타입 오류, 실행 중에는 한국어로 대체)
import type { Translation } from './types';

const en: Translation = {
  common: {
    loading: 'Loading',
  },
};

export default en;
