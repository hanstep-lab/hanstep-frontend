// 체류 정보 직접 입력(PUT /api/v1/visa/profile) 칸 4개의 정리·검사.
// id-confirm.tsx와 중복, 추후 정리 (isValidDate·formatDateInput·normalize·validate·fieldErrorText 와 같은 규칙)
// 서버도 같은 검사를 하지만(400) 미리 막아서 칸 아래에 바로 안내한다.

import type { ApiError, VisaProfileFieldKey } from '../types/api';
import { ISO_ALPHA3 } from '../constants/countries';

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
  visaType: '없는 체류자격이에요. 등록증에 적힌 대로 입력해 주세요. (예: E-9, E-7-4)',
  stayExpiry: '체류 만료일을 숫자 8자리로 정확히 입력해 주세요. (예: 20271004)',
};

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
// 체류자격: 출입국관리법 시행령의 큰 분류(A-1 ~ H-2, 36개)만 허용 + 세부 코드(-숫자 1~2자리) 선택.
// 예: E-9, E-7-4, F-2-99 통과 / K-9, B-8, E-11 차단. 세부 코드가 실제 있는지는 서버가 본다(등록된 체류자격만 허용)
const VISA_RE = /^(A-[1-3]|B-[12]|C-[134]|D-([1-9]|10)|E-([1-9]|10)|F-[1-6]|G-1|H-[12])(-\d{1,2})?$/;

// 형식은 맞지만 값이 안 되는 경우의 칸별 문구 (앱 검사만)
const VISA_FIELD_INVALID = {
  nationality: '없는 국가 코드예요. 등록증에 적힌 국적 코드를 확인해 주세요. (예: PHL)',
  birthDate: '생년월일은 오늘 이전 날짜로 입력해 주세요.',
  stayExpiry: '체류 만료일이 지났어요. 등록증 뒷면의 최신 만료일을 입력해 주세요.',
};

// 오늘 날짜(기기 시간 기준) YYYY-MM-DD. 같은 모양 문자열끼리는 글자 비교 = 날짜 비교
function todayString(): string {
  const t = new Date();
  const mm = String(t.getMonth() + 1).padStart(2, '0');
  const dd = String(t.getDate()).padStart(2, '0');
  return `${t.getFullYear()}-${mm}-${dd}`;
}

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
  const today = todayString();

  if (!/^[A-Z]{3}$/.test(v.nationality)) errors.nationality = VISA_FIELD_ERROR.nationality;
  else if (!ISO_ALPHA3.has(v.nationality)) errors.nationality = VISA_FIELD_INVALID.nationality;

  if (!isValidDate(v.birthDate)) errors.birthDate = VISA_FIELD_ERROR.birthDate;
  else if (v.birthDate > today) errors.birthDate = VISA_FIELD_INVALID.birthDate; // 서버 규칙(미래 불가)과 같게

  if (!VISA_RE.test(v.visaType)) errors.visaType = VISA_FIELD_ERROR.visaType;

  if (!isValidDate(v.stayExpiry)) errors.stayExpiry = VISA_FIELD_ERROR.stayExpiry;
  // 만료일이 지났으면 체류 기간이 끝난 등록증. 서버는 아직 허용하지만 앱에서 먼저 막는다(오늘은 허용)
  else if (v.stayExpiry < today) errors.stayExpiry = VISA_FIELD_INVALID.stayExpiry;

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
