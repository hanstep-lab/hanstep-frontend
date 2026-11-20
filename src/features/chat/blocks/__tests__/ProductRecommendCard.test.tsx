// Mock 상품 카드(3개)로 상품별 기간·금리·금액 줄 확인
import { render, screen } from '@testing-library/react-native';
import ProductRecommendCard from '../ProductRecommendCard';
import { getMockResponse } from '../../../../api/mock/chat';
import type { ChatProductRecommendBlock } from '../../../../types/api';

const block = getMockResponse('적금 추천해줘', 1).blocks![0] as ChatProductRecommendBlock;

it('상품마다 기간·금리·금액 줄, null 인 줄은 숨긴다', async () => {
  await render(<ProductRecommendCard block={block} onAction={jest.fn()} />);

  // 1위 신한 땡겨요 적금: 6개월, 최고금리 있음, 월 1,000~300,000
  expect(screen.getByText('6 months')).toBeTruthy();
  expect(screen.getByText('Base 2.2% · Up to 3.7% with preferential terms')).toBeTruthy();
  expect(screen.getByText('for the shortest term · as of 2026-10-01')).toBeTruthy();
  expect(screen.getByText('Monthly KRW 1,000 – 300,000')).toBeTruthy();

  // 2위 정기적금: 1~60개월, 최고금리 없음, 월 상한 없음
  expect(screen.getByText('1–60 months')).toBeTruthy();
  expect(screen.getByText('Base 2.2%')).toBeTruthy();
  expect(screen.getByText('Monthly from KRW 10,000')).toBeTruthy();

  // 3위 한 달부터 적금: 금액 정보가 없어 금액 줄 없음 (금액 줄은 위 두 개뿐)
  expect(screen.getByText('1–12 months')).toBeTruthy();
  expect(screen.getAllByText(/^Monthly /)).toHaveLength(2);
  expect(screen.queryByText(/정보 없음/)).toBeNull();
});

it('이름·종류 문구는 그대로, 예전 큰 금리(최고 연 x.xx%)는 없다', async () => {
  await render(<ProductRecommendCard block={block} onAction={jest.fn()} />);
  expect(screen.getByText('신한 땡겨요 적금')).toBeTruthy();
  expect(screen.getAllByText('적금').length).toBeGreaterThan(0);
  expect(screen.queryByText(/최고 연|기본 연/)).toBeNull();
});
