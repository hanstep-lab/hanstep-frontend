// 필수 확보액 항목 이름(서버 label) 표시용. 앱이 만든 기본 이름은 서버에 한국어로 저장하고(같은 줄을 이름으로 다시 찾기 때문),
// 화면에서만 사용자 언어로 바꿔 보여 준다. 사용자가 고른 송금처 이름처럼 표에 없는 이름은 그대로 보여 준다.
import i18n from '../i18n';

// 서버에 저장되는 한국어 이름 → 문구 키 (값은 ko.ts commitmentLabels 와 같다)
const KNOWN = {
  월세: 'rent',
  공과금: 'utility',
  '전기 / 수도세': 'power',
  변동지출: 'variable',
  '본인 명의 계좌': 'ownAccount',
  '기타 고정비': 'otherFixed',
  기타: 'other',
  송금: 'remittance',
} as const;

export function commitmentLabel(label: string): string {
  const key = KNOWN[label as keyof typeof KNOWN];
  return key ? i18n.t(`commitmentLabels.${key}`) : label;
}
