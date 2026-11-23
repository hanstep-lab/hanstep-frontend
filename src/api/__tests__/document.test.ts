// DOC-01 업로드 재시도: 응답 없이 끊긴 경우(NETWORK)만 1.5초 뒤 같은 파일로 1번 더 보낸다
import { client } from '../client';
import { UPLOAD_RETRY_DELAY_MS, uploadIdCard } from '../document';

jest.mock('../config', () => ({ USE_MOCK: false, mockDelay: jest.fn() }));
jest.mock('../client', () => ({ client: { post: jest.fn() } }));

const mockPost = client.post as jest.Mock;

const URI = 'file:///cache/ImageManipulator/front.jpg';
const DOC = { documentId: 7, status: 'UPLOADED' };
const apiError = (code: string) => ({ code, message: 'message' });

// jest 의 FormData 는 RN 것(getParts)이 아니라서, append 로 넣은 값을 직접 본다
let appendSpy: jest.SpyInstance;

// n 번째로 넣은 파트 [이름, 파일 객체]
function appended(n: number) {
  return appendSpy.mock.calls[n] as [string, { uri: string; name: string; type: string }];
}

beforeEach(() => {
  jest.useFakeTimers();
  mockPost.mockReset();
  appendSpy = jest.spyOn(FormData.prototype, 'append');
});

afterEach(() => {
  appendSpy.mockRestore();
  jest.useRealTimers();
});

it('NETWORK 이면 1.5초 뒤 같은 파일로 1번 다시 보내고, 그 결과를 돌려준다', async () => {
  mockPost.mockRejectedValueOnce(apiError('NETWORK')).mockResolvedValueOnce({ data: DOC });
  const onRetry = jest.fn();

  const result = uploadIdCard(URI, { onRetry });
  await jest.advanceTimersByTimeAsync(UPLOAD_RETRY_DELAY_MS - 1);
  expect(mockPost).toHaveBeenCalledTimes(1);
  expect(onRetry).toHaveBeenCalledTimes(1);

  await jest.advanceTimersByTimeAsync(1);
  await expect(result).resolves.toEqual(DOC);
  expect(mockPost).toHaveBeenCalledTimes(2);
  expect(mockPost.mock.calls[1][0]).toBe('/api/v1/documents');
  expect(appendSpy).toHaveBeenCalledTimes(2);
  expect(appended(1)).toEqual(appended(0));
  expect(appended(1)).toEqual(['front', { uri: URI, name: 'front.jpg', type: 'image/jpeg' }]);
});

it('다시 보낸 요청도 실패하면 그 오류로 끝난다(세 번째는 없음)', async () => {
  mockPost.mockRejectedValueOnce(apiError('NETWORK')).mockRejectedValueOnce(apiError('NETWORK'));

  const result = expect(uploadIdCard(URI)).rejects.toEqual(apiError('NETWORK'));
  await jest.advanceTimersByTimeAsync(UPLOAD_RETRY_DELAY_MS);
  await result;
  expect(mockPost).toHaveBeenCalledTimes(2);
});

it.each(['TIMEOUT', 'VALIDATION_ERROR', 'UNAUTHORIZED', 'HTTP_503'])('%s 는 다시 보내지 않는다', async (code) => {
  mockPost.mockRejectedValueOnce(apiError(code));
  const onRetry = jest.fn();

  await expect(uploadIdCard(URI, { onRetry })).rejects.toEqual(apiError(code));
  await jest.advanceTimersByTimeAsync(UPLOAD_RETRY_DELAY_MS * 2);
  expect(mockPost).toHaveBeenCalledTimes(1);
  expect(onRetry).not.toHaveBeenCalled();
});
