// 체류 정보 칸 4개의 정리·검사. 직접 입력(PUT /api/v1/visa/profile)과 등록증 확인(DOC-03·04)이 함께 쓴다.
// 서버도 같은 검사를 하지만(400) 미리 막아서 칸 아래에 바로 안내한다.

import type { ApiError, VisaProfileFieldKey } from '../types/api';
import { ISO_ALPHA3 } from '../constants/countries';
import i18n from '../i18n';

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

// 서버에 등록된 체류자격 (2026-11-19 태건님 확인, 목록 API 없음 → 앱에 고정).
// 서비스 경로가 E-9 → E-7-4 라 다른 자격은 점수·로드맵이 동작하지 않아 서버 목록을 늘리지 않는다.
// 입력은 글자 그대로(OCR 값·직접 입력), 검사만 이 목록 기준. 실제 있는 자격이어도 여기 없으면(예: D-8 기업투자) 미지원 안내
export const SUPPORTED_VISA_TYPES: readonly string[] = ['E-9', 'E-7-4', 'H-2', 'D-2', 'F-2'];

export const isSupportedVisaType = (code: string) => SUPPORTED_VISA_TYPES.includes(code);

// 지원 목록 밖 체류자격 (앱 검사·서버 400 unknown visa type 공통). 문구는 태건님 제안 (i18n visaField.unsupported)
export const visaUnsupportedText = () => i18n.t('visaField.unsupported');

// 칸별 오류 문구 (앱 검사·서버 400 모두 이 문구. 서버 reason 은 영문 코드일 수 있어 쓰지 않는다. i18n visaField.error)
export const visaFieldError = (key: VisaProfileFieldKey) => i18n.t(`visaField.error.${key}`);

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

// 형식은 맞지만 값이 안 되는 경우의 칸별 문구 (앱 검사만. i18n visaField.invalid)
const visaFieldInvalid = (key: 'nationality' | 'birthDate' | 'stayExpiry') => i18n.t(`visaField.invalid.${key}`);

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
  return {
    nationality: v.nationality.trim().toUpperCase(),
    birthDate: v.birthDate.trim(),
    visaType: normalizeVisaType(v.visaType),
    stayExpiry: v.stayExpiry.trim(),
  };
}

// 체류자격 글자 정리. OCR 값이 칩 코드와 맞도록 공백·소문자 제거, "E9" → "E-9" (하이픈을 빠뜨린 경우)
export function normalizeVisaType(text: string): string {
  const visa = text.toUpperCase().replace(/\s+/g, '');
  return /^[A-Z]\d/.test(visa) ? `${visa[0]}-${visa.slice(1)}` : visa;
}

// 칸별 검사. 틀린 칸만 문구가 들어간다 (빈 객체면 통과)
export function validateVisaProfile(v: VisaProfileValues): VisaProfileErrors {
  const errors: VisaProfileErrors = {};
  const today = todayString();

  if (!/^[A-Z]{3}$/.test(v.nationality)) errors.nationality = visaFieldError('nationality');
  else if (!ISO_ALPHA3.has(v.nationality)) errors.nationality = visaFieldInvalid('nationality');

  if (!isValidDate(v.birthDate)) errors.birthDate = visaFieldError('birthDate');
  else if (v.birthDate > today) errors.birthDate = visaFieldInvalid('birthDate'); // 서버 규칙(미래 불가)과 같게

  if (v.visaType === '') errors.visaType = visaFieldError('visaType');
  else if (!isSupportedVisaType(v.visaType)) errors.visaType = visaUnsupportedText();

  if (!isValidDate(v.stayExpiry)) errors.stayExpiry = visaFieldError('stayExpiry');
  // 만료일이 지났으면 체류 기간이 끝난 등록증. 서버는 아직 허용하지만 앱에서 먼저 막는다(오늘은 허용)
  else if (v.stayExpiry < today) errors.stayExpiry = visaFieldInvalid('stayExpiry');

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
    if (key) errors[key] = key === 'visaType' ? visaUnsupportedText() : visaFieldError(key);
  });
  return Object.keys(errors).length > 0 ? errors : null;
}
