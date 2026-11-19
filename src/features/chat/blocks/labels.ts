// 채팅 카드(CHT-04 blocks)에 쓰는 화면 문구 표. 서버는 코드값만 주고 문구는 앱이 정한다.
// 표에 없는 값은 null 을 돌려주고, 카드는 그 줄을 숨긴다 (코드값을 그대로 보여 주지 않는다).
import type { FxRateSource, RemittanceRelationship } from '../../../types/api';

// 받는 분 관계 (REMITTANCE_CONFIRM recipient.relationship). 백엔드 DB ENUM 7개 기준
const RELATIONSHIP_TEXT: Record<RemittanceRelationship, string> = {
  MOTHER: '어머니',
  FATHER: '아버지',
  SPOUSE: '배우자',
  CHILD: '자녀',
  SIBLING: '형제·자매',
  SELF: '본인',
  OTHER: '기타',
};
export const relationshipText = (code: string): string | null =>
  RELATIONSHIP_TEXT[code as RemittanceRelationship] ?? null;

// 환율 출처 (FX_SUMMARY_CARD currencies[].source). "실시간" 같은 말은 쓰지 않는다
const FX_SOURCE_TEXT: Partial<Record<FxRateSource, string>> = {
  KOREAEXIM: '수출입은행 고시',
  MARKET_REF: '시장 환율 참고값',
};
export const fxSourceText = (source: string): string | null =>
  FX_SOURCE_TEXT[source as FxRateSource] ?? null;

// 통화 기호·이름 (Figma 277:1852). 없는 통화는 코드만 보여 준다
const CURRENCY_SYMBOL: Record<string, string> = { USD: '$', PHP: '₱' };
const CURRENCY_NAME: Record<string, string> = { USD: '미국', PHP: '필리핀' };
export const currencySymbol = (code: string): string => CURRENCY_SYMBOL[code] ?? code;
export const currencyWithName = (code: string): string =>
  CURRENCY_NAME[code] ? `${CURRENCY_NAME[code]} ${code}` : code;

// E-7-4 판정 (E74_SCORE_CARD status). 서버 status 를 그대로 옮기고, 앱에서 total·required 를 비교하지 않는다.
// "승인"·"가능성" 같은 말은 쓰지 않는다
const E74_STATUS_TEXT: Record<string, string> = {
  ELIGIBLE: '모의 진단 기준 충족',
  INELIGIBLE: '모의 진단 기준 미충족',
  NEEDS_EVIDENCE: '증빙 확인이 필요해요',
  NEEDS_REVIEW: '추가 확인이 필요해요',
};
export const e74StatusText = (status: string): string | null => E74_STATUS_TEXT[status] ?? null;

// 송금 카드 버튼은 transferPath 로 이동한다. 서버 값이라 송금 화면 주소일 때만 연다
export const isTransferPath = (path: string): boolean => path === '/transfer' || path.startsWith('/transfer?');
