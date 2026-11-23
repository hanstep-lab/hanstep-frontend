// client.ts 응답 인터셉터의 오류 분류: 응답 없음(TIMEOUT·NETWORK)과 응답 있음(서버 code·HTTP_xxx)
// 실제 서버 대신 요청마다 adapter 로 axios 오류를 만들어 인터셉터를 그대로 거치게 한다
import { AxiosError, type AxiosResponse, type InternalAxiosRequestConfig } from 'axios';
import { client, noResponseCode } from '../client';

// adapter 가 make 로 만든 오류를 던지게 해서 요청을 보낸다
function failWith(make: (config: InternalAxiosRequestConfig) => unknown) {
  return client.get('/api/v1/test', { adapter: (config) => Promise.reject(make(config)) });
}

function response(config: InternalAxiosRequestConfig, status: number, data?: unknown): AxiosResponse {
  return { status, statusText: '', headers: {}, config, data };
}

describe('noResponseCode', () => {
  it.each([
    [{ code: 'ECONNABORTED', message: 'timeout of 30000ms exceeded' }, 'TIMEOUT'],
    [{ code: 'ETIMEDOUT', message: 'timeout of 30000ms exceeded' }, 'TIMEOUT'],
    [{ code: undefined, message: 'timeout exceeded' }, 'TIMEOUT'],
    [{ code: 'ERR_NETWORK', message: 'Network Error' }, 'NETWORK'],
    [{ code: undefined, message: undefined }, 'NETWORK'],
  ])('%o → %s', (error, expected) => {
    expect(noResponseCode(error)).toBe(expected);
  });
});

describe('client 오류 분류', () => {
  it('시간 초과(ECONNABORTED)는 TIMEOUT, message 는 axios 원래 문구', async () => {
    await expect(
      failWith((c) => new AxiosError('timeout of 30000ms exceeded', AxiosError.ECONNABORTED, c)),
    ).rejects.toEqual({ code: 'TIMEOUT', message: 'timeout of 30000ms exceeded' });
  });

  it('시간 초과(ETIMEDOUT)도 TIMEOUT', async () => {
    await expect(
      failWith((c) => new AxiosError('timeout of 10000ms exceeded', AxiosError.ETIMEDOUT, c)),
    ).rejects.toMatchObject({ code: 'TIMEOUT' });
  });

  it('응답 없는 연결 실패(ERR_NETWORK)는 NETWORK', async () => {
    await expect(
      failWith((c) => new AxiosError('Network Error', AxiosError.ERR_NETWORK, c)),
    ).rejects.toEqual({ code: 'NETWORK', message: 'Network Error' });
  });

  it('응답이 있으면 서버 code 를 쓴다(4xx)', async () => {
    await expect(
      failWith(
        (c) =>
          new AxiosError('Request failed with status code 400', AxiosError.ERR_BAD_REQUEST, c, null,
            response(c, 400, { code: 'VALIDATION_ERROR', message: 'invalid' })),
      ),
    ).rejects.toEqual({ code: 'VALIDATION_ERROR', message: 'invalid' });
  });

  it('응답에 code 가 없으면 HTTP_상태 (5xx, 시간 초과 문구가 있어도 응답이 있으면 HTTP)', async () => {
    await expect(
      failWith(
        (c) => new AxiosError('upstream timeout', AxiosError.ERR_BAD_RESPONSE, c, null, response(c, 504)),
      ),
    ).rejects.toMatchObject({ code: 'HTTP_504' });
  });
});
