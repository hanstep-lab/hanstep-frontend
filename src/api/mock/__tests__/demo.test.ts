// Mock 모드(USE_MOCK)에서도 데모 초기화 뒤 온보딩을 처음부터 다시 돌 수 있는지
import { mockDemoReset } from '../demo';
import { getMockCurrentStep, mockCompleteStep } from '../onboarding';
import { mockGetGoals } from '../goals';
import { mockGetCommitments, mockSaveCommitments } from '../commitments';
import { mockGet, mockUpload } from '../document';

it('서버와 같은 범위(온보딩 진행·등록증·목표·매달 나가는 돈)를 되돌린다', () => {
  mockCompleteStep('LANGUAGE');
  mockUpload();
  mockSaveCommitments({ items: [{ commitmentType: 'RENT', label: '월세', amount: { amount: 450000, currency: 'KRW' } }] });

  const res = mockDemoReset();

  expect(res.languageRestored).toBe(true);
  expect(getMockCurrentStep()).toBe('LANGUAGE');
  expect(mockGetGoals().goals).toEqual([]);
  expect(mockGetCommitments().items).toEqual([]);
  expect(mockGet).toThrow(); // 문서가 없으면 조회 실패(서버 404 와 같음)
});
