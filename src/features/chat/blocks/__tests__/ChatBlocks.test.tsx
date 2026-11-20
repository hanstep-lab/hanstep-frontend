import { render, screen } from '@testing-library/react-native';
import ChatBlocks from '../ChatBlocks';

const g = globalThis as { __DEV__?: boolean };
const DEV = g.__DEV__;
afterEach(() => {
  g.__DEV__ = DEV;
});

const props = { onAction: jest.fn(), onOpenTransferPath: jest.fn() };

it('개발 빌드: 모르는 카드는 "Unsupported card: {type}" 칸으로 보인다', async () => {
  g.__DEV__ = true;
  await render(<ChatBlocks blocks={[{ type: 'UNSUPPORTED', originalType: 'NEW_CARD' }]} {...props} />);
  expect(screen.getByText('Unsupported card: NEW_CARD')).toBeTruthy();
});

it('운영 빌드: 같은 자리가 와도 아무것도 그리지 않는다', async () => {
  g.__DEV__ = false;
  await render(<ChatBlocks blocks={[{ type: 'UNSUPPORTED', originalType: 'NEW_CARD' }]} {...props} />);
  expect(screen.queryByText(/Unsupported card/)).toBeNull();
});
