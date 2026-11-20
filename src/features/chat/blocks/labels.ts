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

// 상품 추천 기권 이유 (PRODUCT_RECOMMEND_CARD abstainReason). 코드 목록: hanstep-AI specs/chat/product_recommend_card_v1.md
const PRODUCT_ABSTAIN_TEXT: Record<string, string> = {
  REQUEST_EXCEEDS_SURPLUS: '매달 넣으려는 금액이 월 여유자금보다 많아요.',
  STAY_TOO_SHORT: '남은 체류 기간 안에 만기가 끝나는 상품이 없어요.',
  NO_MATCHING_PRODUCT: '지금 조건에 맞는 상품을 찾지 못했어요.',
};
export const productAbstainText = (code: string | null): string | null =>
  code ? PRODUCT_ABSTAIN_TEXT[code] ?? null : null;

// 상품 추천 제외 이유 (PRODUCT_RECOMMEND_CARD excludedSummary[].reason). 상품마다 처음 걸린 조건 하나로 센다.
// 의미 기준: hanstep-AI ai/app/products/recommender.py check_product()·failed_condition()
const PRODUCT_EXCLUDED_TEXT: Record<string, string> = {
  recommendable: '추천 대상이 아닌 상품', // 조건표에서 추천 제외(recommendable=false)이거나 조건표에 없는 문서
  kind: '찾는 종류(적금·예금)가 아닌 상품', // 요청 productType 과 다름
  foreigner: '외국인이 가입할 수 없는 상품', // foreignerEligible=false
  visa: '체류자격 조건이 맞지 않는 상품', // 사용자 비자가 상품 가입 비자 목록에 없음
  age: '나이 조건이 맞지 않는 상품', // 가입 최소·최대 나이 밖
  stayTerm: '체류 만료 뒤에 끝나는 상품', // 가장 짧은 계약 기간 > 남은 체류 개월
  spare: '월 최소 납입액이 여유자금보다 큰 상품', // 적금만. 월 최소 납입액 > 여유자금
  requestTerm: '원하는 기간에 맞지 않는 상품', // 가장 짧은 계약 기간 > 요청 최대 기간, 또는 기간 확인 불가
  requestMonthly: '원하는 월 납입액으로 넣을 수 없는 상품', // 요청액 > 여유자금, 상품 월 납입 범위 밖, 또는 범위 확인 불가
  savingType: '원하는 적립 방식이 아닌 상품', // 요청 accrual 과 다르거나 확인 불가
  requireForeignerExplicit: '외국인 가입이 명시되지 않은 상품', // 외국인 명시 상품만 요청했는데 explicit 아님
};
export const productExcludedText = (reason: string): string | null => PRODUCT_EXCLUDED_TEXT[reason] ?? null;

// 송금 카드 버튼은 transferPath 로 이동한다. 서버 값이라 송금 화면 주소일 때만 연다
export const isTransferPath = (path: string): boolean => path === '/transfer' || path.startsWith('/transfer?');
