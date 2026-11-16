// CR-002 SOL 글로벌론 상품 상세 Mock (Figma 447:2 기준). 화면은 이 파일을 직접 import 하지 않고 src/api/credit.ts 를 거친다.
// 상품 값은 신한은행 SOL 글로벌론 상품 안내 자료 기준. 날짜·남은 기간·한도는 계산하지 않고 완성된 글자로 둔다.
// TODO: 사용자 이름은 B의 ai-001 에서 정하면 앱 전체와 맞추기 (이 화면은 Figma 를 따라 Mark)
// 진단과 비교 구역은 CR-001 대안신용 진단이 생긴 뒤 추가.

export function mockGlobalLoan() {
  return {
    productTag: '신한은행 대출 상품',
    name: 'SOL 글로벌론',
    summary: '외국인 전용 직장인 신용대출이에요.',

    eligibility: {
      title: 'Mark님 가입 조건 확인',
      source: '마이데이터와 외국인등록증 정보로 확인했어요',
      resultLabel: '3개 모두 충족',
      conditions: [
        {
          key: 'salary',
          title: '재직·급여이체 조건',
          desc: '재직기간 3개월 이상 · 신한은행 급여이체 최근 1개월 이상',
          met: true,
        },
        {
          key: 'visa',
          title: '대상 체류자격',
          desc: 'E-9·E-7·F-2·F-5 중 하나 · Mark님 E-9',
          met: true,
        },
        {
          key: 'stay',
          title: '체류 만료까지 6개월 초과',
          desc: '2027.10.04 만료 · 약 10개월 남음',
          met: true,
        },
      ],
    },

    terms: {
      title: '상품 조건',
      basis: '신한은행 상품 안내 기준',
      rows: [
        { label: '대출 한도', value: '최대 5,000만 원' },
        { label: '대출 기간', value: '6개월 ~ 36개월' },
        { label: '신청 방법', value: '비대면 · 영업점' },
        { label: '금리·상환 방식', value: '상품설명서에서 확인' },
      ],
    },

    notice: '신한걸음 자체 진단이에요. 실제 대출 가능 여부와 금리는 은행 심사에 따라 달라요.',
  };
}
