// 금융상품 추천 API (FP-001). 화면은 이 파일만 부르고 Mock 인지 모른다.
// TODO: 명세가 오면 경로·필드 맞추기 (지금 경로는 가정값)
import { client } from './client';
import { USE_MOCK, mockDelay } from './config';
import { mockProductRecommendation } from './mock/products';

export type ProductRecommendation = ReturnType<typeof mockProductRecommendation>;

export async function getProductRecommendation(): Promise<ProductRecommendation> {
  if (USE_MOCK) {
    await mockDelay();
    return mockProductRecommendation();
  }
  const res = await client.get<ProductRecommendation>('/api/v1/finance/products/recommend');
  return res.data;
}
