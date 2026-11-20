import { render, screen, act } from '@testing-library/react-native';
import ToastHost from '../Toast';
import { showToast, useToastStore } from '../../store/toastStore';

jest.mock('react-native-safe-area-context', () => require('react-native-safe-area-context/jest/mock').default);

beforeEach(() => {
  jest.useFakeTimers();
  useToastStore.setState({ message: null, id: 0 });
});

afterEach(() => {
  jest.useRealTimers();
});

it('showToast 문구를 띄우고 2초 뒤 사라진다', async () => {
  await render(<ToastHost />);
  expect(screen.queryByText('초기화했어요')).toBeNull();

  await act(() => showToast('초기화했어요'));
  expect(screen.getByText('초기화했어요')).toBeTruthy();

  await act(() => jest.advanceTimersByTime(1999));
  expect(screen.getByText('초기화했어요')).toBeTruthy();

  await act(() => jest.advanceTimersByTime(1));
  expect(screen.queryByText('초기화했어요')).toBeNull();
});
