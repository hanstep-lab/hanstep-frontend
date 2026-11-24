import { isCreditQuestion } from '../creditLink';
import ko from '../../../i18n/ko';
import en from '../../../i18n/en';

describe('isCreditQuestion (대안신용 사전진단 버튼)', () => {
  it.each([
    ['ko', ko.chat.landing],
    ['en', en.chat.landing],
  ])('%s 시연 시나리오: 3번(대안신용평가)에만 붙는다', (_lang, landing) => {
    expect(isCreditQuestion(landing.s3)).toBe(true);
    expect(isCreditQuestion(landing.s1)).toBe(false);
    expect(isCreditQuestion(landing.s2)).toBe(false);
    expect(isCreditQuestion(landing.s4)).toBe(false);
  });

  it.each([
    '대출 받을 수 있어요?',
    '제 신용 점수가 궁금해요',
    'Can I get a LOAN?',
    'I have no credit history',
    'Can I borrow some money?',
    '신용카드 만들 수 있어?', // 신용카드도 신용 질문으로 본다
  ])('대출·신용 낱말이 있으면 붙인다: %s', (q) => {
    expect(isCreditQuestion(q)).toBe(true);
  });

  it.each([
    '오늘 환율 알려줘',
    '필리핀 페소로, 필리핀에 계신 엄마한테',
    'Is this school accredited?', // 낱말 일부(accredited)는 아니다
  ])('대출·신용 낱말이 없으면 붙이지 않는다: %s', (q) => {
    expect(isCreditQuestion(q)).toBe(false);
  });
});
