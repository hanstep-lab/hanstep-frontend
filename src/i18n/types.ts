// ko.ts 와 같은 키 구조에 값만 문자열인 타입 (en.ts 검사용)
import type ko from './ko';

type DeepString<T> = { [K in keyof T]: T[K] extends string ? string : DeepString<T[K]> };

export type Translation = DeepString<typeof ko>;
