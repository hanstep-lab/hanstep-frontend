// 체류자격 로드맵 API (VS-001). 화면은 이 파일만 부르고 Mock 인지 모른다.
// TODO: 명세가 오면 경로·필드 맞추기 (지금 경로는 가정값)
import { client } from './client';
import { USE_MOCK, mockDelay } from './config';
import { mockVisaRoadmap, type MockScoreState } from './mock/visa';

export type VisaRoadmap = ReturnType<typeof mockVisaRoadmap>;
export type ScoreState = MockScoreState;

export async function getVisaRoadmap(): Promise<VisaRoadmap> {
  if (USE_MOCK) {
    await mockDelay();
    return mockVisaRoadmap();
  }
  const res = await client.get<VisaRoadmap>('/api/v1/visa/roadmap');
  return res.data;
}
