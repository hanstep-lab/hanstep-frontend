// 필수 확보액 Mock (CMT-01~03). 서버처럼 저장한 항목을 메모리에 들고 있다(앱 재시작 시 초기화).
// 처음 값은 2026-11-19 서버 응답(demo-e9-ph-reyes)을 그대로 옮겼다.
// totals 는 서버가 계산하는 값이라, 서버 역할을 대신하는 이 Mock 에서만 계산한다(화면은 계산하지 않음).
// 화면은 이 파일을 직접 import 하지 않고 src/api/commitments.ts 를 거친다.
import type {
  CommitmentListResponse,
  CommitmentResponse,
  CommitmentSaveRequest,
  CommitmentTotals,
  CommitmentType,
  RemittanceCandidateListResponse,
} from '../../types/api';

const krw = (amount: number) => ({ amount, currency: 'KRW' });

let items: CommitmentResponse[] = [
  { id: 1, commitmentType: 'LIVING_MINIMUM', label: '고정생활비', amount: krw(520000), source: 'USER', detectedFromTxnId: null },
  { id: 2, commitmentType: 'REMITTANCE', label: '가족 송금', amount: krw(700000), source: 'USER', detectedFromTxnId: null },
  { id: 3, commitmentType: 'VARIABLE_EXPENSE', label: '변동지출', amount: krw(450000), source: 'USER', detectedFromTxnId: null },
];
let nextId = 4;

const FIXED: CommitmentType[] = ['RENT', 'UTILITY', 'TELECOM', 'LIVING_MINIMUM', 'OTHER'];

function sumOf(types: CommitmentType[]): number {
  return items.filter((i) => types.includes(i.commitmentType)).reduce((acc, i) => acc + i.amount.amount, 0);
}

function totals(): CommitmentTotals {
  const fixedLiving = sumOf(FIXED);
  const remittance = sumOf(['REMITTANCE']);
  const variableExpense = sumOf(['VARIABLE_EXPENSE']);
  return {
    fixedLiving: krw(fixedLiving),
    remittance: krw(remittance),
    variableExpense: krw(variableExpense),
    mandatorySaving: krw(sumOf(['MANDATORY_SAVING'])),
    deductibleTotal: krw(fixedLiving + remittance + variableExpense),
  };
}

export function mockGetCommitments(): CommitmentListResponse {
  return { items, totals: totals() };
}

// 서버와 같은 전체 교체: 요청에 없는 기존 항목은 빠진다(비활성)
export function mockSaveCommitments(req: CommitmentSaveRequest): CommitmentListResponse {
  items = req.items.map((i) => ({
    id: nextId++,
    commitmentType: i.commitmentType,
    label: i.label ?? null,
    amount: i.amount,
    source: i.source ?? 'USER',
    detectedFromTxnId: i.detectedFromTxnId ?? null,
  }));
  return mockGetCommitments();
}

// CMT-03 송금 이력 Top 3. 2026-11-19 서버 응답 그대로
export function mockRemittanceCandidates(): RemittanceCandidateListResponse {
  return {
    candidates: [
      {
        rank: 1,
        counterpartyName: 'LORNA REYES',
        counterpartyBank: 'BDO',
        recipientId: 1,
        avgMonthlyAmount: krw(500000),
        monthsSent: 6,
        lastSentOn: '2026-10-10',
        lastTransactionId: 90,
        sameNameAsUser: false,
      },
      {
        rank: 2,
        counterpartyName: 'MARK ANTHONY REYES',
        counterpartyBank: 'BPI',
        recipientId: 2,
        avgMonthlyAmount: krw(200000),
        monthsSent: 6,
        lastSentOn: '2026-10-10',
        lastTransactionId: 91,
        sameNameAsUser: true,
      },
    ],
    analyzedMonths: 6,
    isMock: true,
  };
}

// 데모 초기화 Mock: 서버처럼 매달 나가는 돈을 비활성으로 (조회에서 빠짐)
export function mockDeactivateCommitments() {
  items = [];
}
