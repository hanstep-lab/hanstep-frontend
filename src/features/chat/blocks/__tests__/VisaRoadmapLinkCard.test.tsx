// 비자 로드맵 카드(VISA_ROADMAP_LINK, 프롬프트 v4.7): 화면 언어별 글자, 신청 가능일 없음, 비자 탭 이동
import { fireEvent, render, screen } from '@testing-library/react-native';
import ChatBlocks from '../ChatBlocks';
import VisaRoadmapLinkCard from '../VisaRoadmapLinkCard';
import { getMockResponse } from '../../../../api/mock/chat';
import { setAppLanguage } from '../../../../i18n';
import type { ChatVisaRoadmapLinkBlock } from '../../../../types/api';

const block: ChatVisaRoadmapLinkBlock = {
  type: 'VISA_ROADMAP_LINK',
  roadmapId: 1,
  stepCount: 3,
  applicableFrom: '2026-12-05',
  ruleStatus: 'APPROVED',
};

afterEach(() => {
  setAppLanguage('ko');
});

it('한국어: 신청 가능일·단계 수를 서버 값 그대로 보여 주고, 버튼은 비자 탭으로 보낸다', async () => {
  setAppLanguage('ko');
  const onAction = jest.fn();
  await render(<VisaRoadmapLinkCard block={block} onAction={onAction} />);

  expect(screen.getByText('E-7-4 전환 로드맵')).toBeTruthy();
  expect(screen.getByText('2026.12.05부터 신청 가능')).toBeTruthy();
  expect(screen.getByText('준비 단계 3개')).toBeTruthy();
  expect(screen.queryByText(/APPROVED|DRAFT/)).toBeNull(); // ruleStatus 는 쓰지 않는다
  fireEvent.press(screen.getByText('비자 탭에서 로드맵 보기'));
  expect(onAction).toHaveBeenCalledWith('visa_tab');
});

it('영어 사용자(en·vi·zh): 카드 글자 전부 영어', async () => {
  setAppLanguage('en');
  await render(<VisaRoadmapLinkCard block={block} onAction={jest.fn()} />);

  expect(screen.getByText('E-7-4 roadmap')).toBeTruthy();
  expect(screen.getByText('You can apply from 2026.12.05')).toBeTruthy();
  expect(screen.getByText('Steps to prepare: 3')).toBeTruthy();
  expect(screen.getByText('See the roadmap in the Visa tab')).toBeTruthy();
  expect(screen.queryAllByText(/[가-힣]/)).toEqual([]);
});

it('신청 가능일을 판정할 수 없으면(null) 판정 보류 문구', async () => {
  setAppLanguage('ko');
  await render(<VisaRoadmapLinkCard block={{ ...block, applicableFrom: null }} onAction={jest.fn()} />);

  expect(screen.getByText('신청 가능일은 아직 판정할 수 없어요')).toBeTruthy();
  expect(screen.queryByText(/부터 신청 가능/)).toBeNull();
});

it('Mock 로드맵 질문: 로드맵 카드 뒤에 재질의 카드가 붙는다', async () => {
  setAppLanguage('ko');
  const response = getMockResponse('내 비자 로드맵 보여줘', 1);
  expect(response.blocks?.map((b) => b.type)).toEqual(['VISA_ROADMAP_LINK', 'MISSING_INPUTS']);
  await render(<ChatBlocks blocks={response.blocks!} onAction={jest.fn()} onOpenTransferPath={jest.fn()} />);

  expect(screen.getByText('E-7-4 전환 로드맵')).toBeTruthy();
  expect(screen.getByText('판정에 더 필요한 정보')).toBeTruthy();
});
