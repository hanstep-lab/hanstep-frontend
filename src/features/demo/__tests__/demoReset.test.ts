import { File } from 'expo-file-system';
import { resetDemoAccount } from '../demoReset';
import { entry } from '../../../api/auth';
import { resetDemo } from '../../../api/demo';
import { getOnboarding } from '../../../api/onboarding';
import { getMe } from '../../../api/user';
import { useAuthStore } from '../../../store/authStore';
import { useOnboardingStore } from '../../../store/onboardingStore';
import { useTransferStore } from '../../../store/transferStore';

jest.mock('expo-file-system', () => {
  const del = jest.fn();
  return { File: jest.fn().mockImplementation(() => ({ delete: del })), __delete: del };
});
jest.mock('../../../api/auth', () => ({ entry: jest.fn() }));
jest.mock('../../../api/demo', () => ({ resetDemo: jest.fn() }));
jest.mock('../../../api/onboarding', () => ({ getOnboarding: jest.fn() }));
jest.mock('../../../api/user', () => ({ getMe: jest.fn() }));

const mockEntry = entry as jest.Mock;
const mockResetDemo = resetDemo as jest.Mock;
const mockGetOnboarding = getOnboarding as jest.Mock;
const mockGetMe = getMe as jest.Mock;
const mockFileDelete = (jest.requireMock('expo-file-system') as { __delete: jest.Mock }).__delete;

const apiError = (code: string) => ({ code, message: 'server message' });

// 초기화 전 앱 상태: 온보딩 중간(언어 vi·거주 목적 STUDY 선택, 등록증 촬영·업로드까지)
function seedState() {
  useAuthStore.setState({ accessToken: null });
  useOnboardingStore.setState({
    language: 'vi',
    purpose: 'STUDY',
    idCardFrontUri: 'file:///cache/id-front.jpg',
    idDocumentId: 12,
  });
  useTransferStore.setState({ initialAmountKRW: 500000, result: null });
}

const snapshot = () => ({
  auth: useAuthStore.getState().accessToken,
  onboarding: (({ language, purpose, idCardFrontUri, idDocumentId }) => ({ language, purpose, idCardFrontUri, idDocumentId }))(
    useOnboardingStore.getState(),
  ),
  transfer: useTransferStore.getState().initialAmountKRW,
});

beforeEach(() => {
  jest.clearAllMocks();
  seedState();
  mockEntry.mockResolvedValue({ accessToken: 'jwt-1' });
  mockResetDemo.mockResolvedValue({ languageRestored: true });
  mockGetMe.mockResolvedValue({ preferredLanguage: 'en' });
  mockGetOnboarding.mockResolvedValue({ profile: { residencePurpose: 'WORK' } });
});

describe('resetDemoAccount 성공', () => {
  it('서버가 지운 등록증 상태를 비우고, 언어·거주 목적은 서버 값으로 다시 맞춘다', async () => {
    await expect(resetDemoAccount()).resolves.toEqual({ status: 'done' });

    expect(mockResetDemo).toHaveBeenCalledTimes(1);
    expect(File).toHaveBeenCalledWith('file:///cache/id-front.jpg');
    expect(mockFileDelete).toHaveBeenCalledTimes(1);
    expect(snapshot().onboarding).toEqual({ language: 'en', purpose: 'WORK', idCardFrontUri: null, idDocumentId: null });
  });

  it('서버 범위 밖인 송금 화면 값은 그대로 둔다', async () => {
    await resetDemoAccount();
    expect(snapshot().transfer).toBe(500000);
  });

  it('토큰이 없으면 entry 로 받고, 있으면 그대로 쓴다', async () => {
    await resetDemoAccount();
    expect(mockEntry).toHaveBeenCalledTimes(1);
    expect(useAuthStore.getState().accessToken).toBe('jwt-1');

    mockEntry.mockClear();
    await resetDemoAccount();
    expect(mockEntry).not.toHaveBeenCalled();
  });

  it('초기화 뒤 언어·거주 목적 불러오기가 실패하면 그 값만 비우고 성공으로 끝낸다', async () => {
    mockGetMe.mockRejectedValue(apiError('NETWORK'));
    await expect(resetDemoAccount()).resolves.toEqual({ status: 'done' });
    expect(snapshot().onboarding).toEqual({ language: null, purpose: 'WORK', idCardFrontUri: null, idDocumentId: null });
  });
});

describe('resetDemoAccount 실패 시 앱 상태 그대로', () => {
  it.each(['RESOURCE_NOT_FOUND', 'HTTP_404', 'FORBIDDEN', 'HTTP_403'])('%s → unavailable', async (code) => {
    useAuthStore.setState({ accessToken: 'jwt-0' });
    const before = snapshot();
    mockResetDemo.mockRejectedValue(apiError(code));

    await expect(resetDemoAccount()).resolves.toEqual({ status: 'unavailable' });
    expect(snapshot()).toEqual(before);
    expect(mockFileDelete).not.toHaveBeenCalled();
  });

  it('그 밖의 서버 오류 → failed, 오류를 그대로 돌려준다', async () => {
    useAuthStore.setState({ accessToken: 'jwt-0' });
    const before = snapshot();
    const err = apiError('HTTP_500');
    mockResetDemo.mockRejectedValue(err);

    await expect(resetDemoAccount()).resolves.toEqual({ status: 'failed', error: err });
    expect(snapshot()).toEqual(before);
  });

  it('entry 가 실패하면 초기화를 부르지 않는다', async () => {
    const before = snapshot();
    mockEntry.mockRejectedValue(apiError('NETWORK'));

    await expect(resetDemoAccount()).resolves.toMatchObject({ status: 'failed' });
    expect(mockResetDemo).not.toHaveBeenCalled();
    expect(snapshot()).toEqual(before);
  });
});

describe('중복 호출 방지', () => {
  it('요청 중에 다시 부르면 서버를 다시 부르지 않고 busy', async () => {
    let finish!: () => void;
    mockResetDemo.mockReturnValue(new Promise<void>((r) => (finish = r)));
    useAuthStore.setState({ accessToken: 'jwt-0' });

    const first = resetDemoAccount();
    await expect(resetDemoAccount()).resolves.toEqual({ status: 'busy' });
    finish();
    await expect(first).resolves.toEqual({ status: 'done' });
    expect(mockResetDemo).toHaveBeenCalledTimes(1);

    // 끝난 뒤에는 다시 부를 수 있다
    mockResetDemo.mockResolvedValue({});
    await expect(resetDemoAccount()).resolves.toEqual({ status: 'done' });
  });
});
