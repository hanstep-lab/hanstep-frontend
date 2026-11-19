// 체류 정보 직접 입력(PUT /api/v1/visa/profile) 칸 4개의 정리·검사.
// id-confirm.tsx와 중복, 추후 정리 (isValidDate·formatDateInput·normalize·validate·fieldErrorText 와 같은 규칙)
// 서버도 같은 검사를 하지만(400) 미리 막아서 칸 아래에 바로 안내한다.

import type { ApiError, VisaProfileFieldKey } from '../types/api';

export type VisaProfileValues = Record<VisaProfileFieldKey, string>;
export type VisaProfileErrors = Partial<Record<VisaProfileFieldKey, string>>;

// 서버에 보내는 순서. 400 의 "fields[1].value" 같은 경로는 이 순서로 칸을 찾는다
export const VISA_PROFILE_KEYS: VisaProfileFieldKey[] = ['nationality', 'birthDate', 'visaType', 'stayExpiry'];

export const EMPTY_VISA_PROFILE: VisaProfileValues = {
  nationality: '',
  birthDate: '',
  visaType: '',
  stayExpiry: '',
};

// 칸별 오류 문구 (앱 검사·서버 400 모두 이 문구. 서버 reason 은 영문 코드일 수 있어 쓰지 않는다)
export const VISA_FIELD_ERROR: Record<VisaProfileFieldKey, string> = {
  nationality: '영문 3자리 국가 코드로 입력해 주세요. (예: PHL)',
  birthDate: '생년월일을 숫자 8자리로 정확히 입력해 주세요. (예: 19950312)',
  visaType: '체류자격 코드를 다시 확인해 주세요. (예: E-9)',
  stayExpiry: '체류 만료일을 숫자 8자리로 정확히 입력해 주세요. (예: 20271004)',
};

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
// 체류자격 코드 모양: E-9, F-2, E-7-4 (등록된 코드인지는 서버만 안다)
const VISA_RE = /^[A-Z]-\d{1,2}(-\d{1,2})?$/;

// 형식(YYYY-MM-DD)과 실제 있는 날짜(13월·2월 30일 같은 값 제외)를 함께 본다
export function isValidDate(s: string): boolean {
  if (!DATE_RE.test(s)) return false;
  const [y, m, d] = s.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  return date.getFullYear() === y && date.getMonth() === m - 1 && date.getDate() === d;
}

// 숫자만 받아 YYYY-MM-DD 로 하이픈을 자동으로 넣는다. "20271004" → "2027-10-04"
export function formatDateInput(text: string): string {
  const d = text.replace(/\D/g, '').slice(0, 8);
  if (d.length <= 4) return d;
  if (d.length <= 6) return `${d.slice(0, 4)}-${d.slice(4)}`;
  return `${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6)}`;
}

// 보내기 전 값 정리. 공백·소문자를 서버 형식에 맞춘다
export function normalizeVisaProfile(v: VisaProfileValues): VisaProfileValues {
  const visa = v.visaType.toUpperCase().replace(/\s+/g, '');
  return {
    nationality: v.nationality.trim().toUpperCase(),
    birthDate: v.birthDate.trim(),
    // "E9" → "E-9" (하이픈을 빠뜨린 경우)
    visaType: /^[A-Z]\d/.test(visa) ? `${visa[0]}-${visa.slice(1)}` : visa,
    stayExpiry: v.stayExpiry.trim(),
  };
}

// 칸별 검사. 틀린 칸만 문구가 들어간다 (빈 객체면 통과)
export function validateVisaProfile(v: VisaProfileValues): VisaProfileErrors {
  const errors: VisaProfileErrors = {};
  if (!/^[A-Z]{3}$/.test(v.nationality)) errors.nationality = VISA_FIELD_ERROR.nationality;
  if (!isValidDate(v.birthDate)) errors.birthDate = VISA_FIELD_ERROR.birthDate;
  if (!VISA_RE.test(v.visaType)) errors.visaType = VISA_FIELD_ERROR.visaType;
  if (!isValidDate(v.stayExpiry)) errors.stayExpiry = VISA_FIELD_ERROR.stayExpiry;
  return errors;
}

// 서버 400(details.fields)을 칸별 문구로. field 는 "fields[0].value"(보낸 순서) 또는 "stayExpiry" 처럼 온다.
// 어느 칸인지 알 수 없으면 null → 화면은 버튼 위 공통 문구를 쓴다
export function visaFieldErrorsFromApi(e: unknown): VisaProfileErrors | null {
  const fields = (e as ApiError | null)?.fields;
  if (!fields || fields.length === 0) return null;
  const errors: VisaProfileErrors = {};
  fields.forEach((f) => {
    const idx = f.field.match(/^fields\[(\d+)\]/);
    const key = idx ? VISA_PROFILE_KEYS[Number(idx[1])] : VISA_PROFILE_KEYS.find((k) => f.field.includes(k));
    if (key) errors[key] = VISA_FIELD_ERROR[key];
  });
  return Object.keys(errors).length > 0 ? errors : null;
}
