// Mock 상품 카드(3개)·기권 카드로 사용자 언어별 카드 글자 확인
import { render, screen } from '@testing-library/react-native';
import ProductRecommendCard from '../ProductRecommendCard';
import { getMockResponse } from '../../../../api/mock/chat';
import type { ChatProductRecommendBlock } from '../../../../types/api';

const block = getMockResponse('적금 추천해줘', 1).blocks![0] as ChatProductRecommendBlock;
const abstainBlock = getMockResponse('매달 100만 원 넣을 적금 추천해줘', 1).blocks![0] as ChatProductRecommendBlock;

describe('영어 사용자(en·vi·zh): 카드 글자 전부 영어', () => {
  it('상품마다 기간·금리·금액 줄, null 인 줄은 숨긴다', async () => {
    await render(<ProductRecommendCard block={block} userName="Mark" language="en" onAction={jest.fn()} />);

    expect(screen.getByText('Recommended savings for Mark')).toBeTruthy();
    expect(screen.getByText('Based on product descriptions')).toBeTruthy();
    // 1위: 6개월, 최고금리 있음, 월 1,000~300,000
    expect(screen.getByText('6 months')).toBeTruthy();
    expect(screen.getByText('Interest rate: 2.2%–3.7%')).toBeTruthy();
    expect(screen.queryByText(/as of|shortest term/)).toBeNull(); // 금리 작은 글씨 줄 없음
    expect(screen.getByText('Monthly KRW 1,000 – 300,000')).toBeTruthy();
    // 2위: 범위 기간, 최고금리 없음, 월 상한 없음
    expect(screen.getByText('1–60 months')).toBeTruthy();
    expect(screen.getByText('Interest rate: 2.2%')).toBeTruthy();
    expect(screen.getByText('from KRW 10,000')).toBeTruthy();
    // 3위: 금액 정보 없음 → 금액 줄 없음
    expect(screen.getByText('1–12 months')).toBeTruthy();
    expect(screen.getAllByText(/KRW/)).toHaveLength(2);

    expect(screen.getAllByText('Savings')).toHaveLength(3);
    expect(screen.getAllByText('Ends before your stay expires')).toHaveLength(3);
    expect(screen.getByText('Based on product descriptions.')).toBeTruthy(); // 각주
    expect(screen.queryByText(/Mock recommendation|approval/)).toBeNull();
    expect(screen.getByText('Open product recommendations')).toBeTruthy();
    // 한글이 한 글자도 없다(상품 이름 nameKo 제외)
    const names = new Set(block.products.map((p) => p.nameKo));
    const texts = screen.getAllByText(/[가-힣]/).map((el) => String(el.props.children));
    expect(texts.filter((t) => !names.has(t))).toEqual([]);
  });

  it('기권 카드도 영어 (상품이 없어 종류는 products)', async () => {
    await render(<ProductRecommendCard block={abstainBlock} language="en" onAction={jest.fn()} />);
    expect(screen.getByText('Recommended products')).toBeTruthy();
    expect(screen.getByText('No products fit your conditions right now')).toBeTruthy();
    expect(screen.getByText('The amount you want to put in each month is more than your monthly spare money.')).toBeTruthy();
    expect(screen.getByText('Excluded products')).toBeTruthy();
    expect(screen.getByText('Matures after your stay ends')).toBeTruthy();
    expect(screen.queryByText(/[가-힣]/)).toBeNull();
  });
});

describe('한국어 사용자(ko·모름): 카드 글자 전부 한국어', () => {
  it('같은 규칙의 한국어 줄', async () => {
    await render(<ProductRecommendCard block={block} userName="Mark" language="ko" onAction={jest.fn()} />);

    expect(screen.getByText('Mark 님 맞춤 적금')).toBeTruthy();
    expect(screen.getByText('6개월')).toBeTruthy();
    expect(screen.getByText('금리: 2.2%–3.7%')).toBeTruthy();
    expect(screen.queryByText(/가장 짧은 기간|2026-10-01/)).toBeNull(); // 금리 작은 글씨 줄 없음
    expect(screen.getByText('월 1,000–300,000원')).toBeTruthy();
    expect(screen.getByText('1–60개월')).toBeTruthy();
    expect(screen.getByText('월 10,000원부터')).toBeTruthy();
    expect(screen.getByText('상품설명서 기준으로 작성되었습니다')).toBeTruthy(); // 각주
    expect(screen.queryByText(/모의 추천|가입 승인/)).toBeNull();
    expect(screen.getByText('금융상품 추천 화면에서 보기')).toBeTruthy();
    expect(screen.queryByText(/months|Interest|Monthly|KRW|Savings/)).toBeNull();
    expect(screen.queryByText(/~/)).toBeNull();
  });

  it('language 를 주지 않으면 한국어', async () => {
    await render(<ProductRecommendCard block={block} onAction={jest.fn()} />);
    expect(screen.getByText('맞춤 적금')).toBeTruthy();
    expect(screen.queryByText(/months/)).toBeNull();
  });
});
