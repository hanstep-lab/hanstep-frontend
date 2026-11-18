// 데모 사용자 한 명의 이름·국가. Mock 여러 곳에서 같이 쓴다 (이름을 바꿀 땐 여기만).
// 실제 서버 연결 시에는 users/me 응답의 displayName 을 쓴다.
// 데모 토큰(config.ts 의 demo-e9-ph-reyes)은 백엔드 DB 의 이 사용자(id 1)와 짝이다.
export const DEMO_USER = {
  firstName: 'Mark',
  nameEn: 'MARK ANTHONY REYES',
  nameDisplay: 'Mark Anthony Reyes',
  nameKo: '마크 앤서니 레예스',
  initials: 'MR',
  countryCode: 'PH',
  countryName: '필리핀',
};
