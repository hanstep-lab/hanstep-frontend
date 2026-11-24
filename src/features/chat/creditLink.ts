// 대출·신용 질문이면 AI 답변 아래에 '대안신용 사전진단' 버튼을 붙인다 (시연 시나리오 3번).
// AI(프롬프트 v4.7)는 대출 질문에 "챗에서 대출을 추천할 수 없다"고만 답해서, 사전진단 화면(/credit)으로
// 바로 넘어갈 길을 FE 가 준다. AI 카드가 아니라 사용자 질문의 낱말로만 판단한다:
// 한국어 대출·신용, 영어 loan·credit·borrow. 신용카드·credit card 질문에도 붙는다
const CREDIT_WORDS = /대출|신용|\b(loans?|credit|borrow(ing)?)\b/i;

export function isCreditQuestion(question: string): boolean {
  return CREDIT_WORDS.test(question);
}
