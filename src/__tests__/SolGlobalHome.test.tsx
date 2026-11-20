// SG-000 홈 로고 3번 탭 → 확인 창 → 데모 초기화 결과 처리 (src/app 밖에 둔다: app 안 파일은 모두 라우트가 됨)
import { Alert } from 'react-native';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react-native';
import { router } from 'expo-router';
import SolGlobalHome from '../app/index';
import { resetDemoAccount } from '../features/demo/demoReset';
import { confirmDialog } from '../utils/confirm';
import { useToastStore } from '../store/toastStore';

jest.mock('react-native-safe-area-context', () => require('react-native-safe-area-context/jest/mock').default);
jest.mock('expo-router', () => ({ router: { push: jest.fn(), replace: jest.fn() } }));
jest.mock('../features/demo/demoReset', () => ({ resetDemoAccount: jest.fn() }));
jest.mock('../utils/confirm', () => ({ confirmDialog: jest.fn() }));

const mockReset = resetDemoAccount as jest.Mock;
const mockConfirm = confirmDialog as jest.Mock;
const mockPush = router.push as jest.Mock;

// 로고를 gaps(ms) 간격으로 누른다. 첫 탭은 바로
async function tapLogo(gaps: number[]) {
  const logo = screen.getByText('SOL Global');
  for (const gap of gaps) {
    await act(() => jest.advanceTimersByTime(gap));
    await fireEvent.press(logo);
  }
}

beforeEach(() => {
  jest.useFakeTimers({ now: new Date('2026-11-20T12:00:00+09:00') });
  jest.clearAllMocks();
  jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  useToastStore.setState({ message: null, id: 0 });
  mockConfirm.mockResolvedValue(true);
  mockReset.mockResolvedValue({ status: 'done' });
});

afterEach(() => {
  jest.useRealTimers();
});

describe('로고 탭 판정', () => {
  it('1.5초 안에 3번 탭하면 확인 창을 띄운다', async () => {
    await render(<SolGlobalHome />);
    await tapLogo([0, 500, 500]);

    expect(mockConfirm).toHaveBeenCalledTimes(1);
    expect(mockConfirm).toHaveBeenCalledWith({
      title: '데모 계정 초기화',
      message:
        '온보딩·등록증·E-7-4·비자 로드맵 기록을 지우고 금융 목표·고정 지출·목표 환율 알림을 취소한 뒤 처음 화면으로 돌아갑니다. 마이데이터와 금융 분석은 그대로 둬요.',
      cancelText: '취소',
      confirmText: '초기화',
      destructive: true,
    });
  });

  it('2번만 탭하면 아무 일 없음', async () => {
    await render(<SolGlobalHome />);
    await tapLogo([0, 300]);
    expect(mockConfirm).not.toHaveBeenCalled();
  });

  it('3번이 1.5초를 넘기면 아무 일 없음', async () => {
    await render(<SolGlobalHome />);
    await tapLogo([0, 800, 800]);
    expect(mockConfirm).not.toHaveBeenCalled();
  });

  it('로고에 버튼 역할·접근성 라벨을 붙이지 않고, 예전 "온보딩 다시 보기" 버튼은 없다', async () => {
    await render(<SolGlobalHome />);
    const logo = screen.getByText('SOL Global');
    expect(logo.props.accessibilityRole).toBeUndefined();
    expect(logo.props.accessibilityLabel).toBeUndefined();
    expect(screen.queryByText('온보딩 다시 보기')).toBeNull();
  });
});

describe('확인 창 이후', () => {
  it('취소하면 초기화하지 않는다', async () => {
    mockConfirm.mockResolvedValue(false);
    await render(<SolGlobalHome />);
    await tapLogo([0, 200, 200]);
    await waitFor(() => expect(mockConfirm).toHaveBeenCalled());
    expect(mockReset).not.toHaveBeenCalled();
  });

  it('성공하면 ON-001 로 이동하고 "초기화했어요" 토스트', async () => {
    await render(<SolGlobalHome />);
    await tapLogo([0, 200, 200]);

    await waitFor(() => expect(mockPush).toHaveBeenCalledWith('/onboarding/language'));
    expect(mockReset).toHaveBeenCalledTimes(1);
    expect(useToastStore.getState().message).toBe('초기화했어요');
  });

  it('403·404 면 "지금은 초기화할 수 없어요" 토스트, 이동 없음', async () => {
    mockReset.mockResolvedValue({ status: 'unavailable' });
    await render(<SolGlobalHome />);
    await tapLogo([0, 200, 200]);

    await waitFor(() => expect(useToastStore.getState().message).toBe('지금은 초기화할 수 없어요'));
    expect(mockPush).not.toHaveBeenCalled();
  });

  it('그 밖의 오류는 공통 오류 문구(code 기준)로 알리고 이동 없음', async () => {
    mockReset.mockResolvedValue({ status: 'failed', error: { code: 'HTTP_500', message: 'boom' } });
    await render(<SolGlobalHome />);
    await tapLogo([0, 200, 200]);

    await waitFor(() => expect(Alert.alert).toHaveBeenCalledWith('초기화하지 못했어요', '잠시 후 다시 시도해 주세요.'));
    expect(mockPush).not.toHaveBeenCalled();
    expect(useToastStore.getState().message).toBeNull();
  });
});
