// 응답 없음 오류 문구: 시간 초과(TIMEOUT)와 연결 끊김(NETWORK)을 다르게 보여 준다
import { errorText } from '../errorText';
import { connectErrorText } from '../../api/mydata';

const FALLBACK = '잠시 후 다시 시도해 주세요.';

it.each([
  ['TIMEOUT', '응답이 늦어지고 있어요. 잠시 후 다시 시도해 주세요.'],
  ['NETWORK', '네트워크 연결을 확인하고 다시 시도해 주세요.'],
  ['VALIDATION_ERROR', '입력한 값을 다시 확인해 주세요.'],
  ['HTTP_503', '잠시 후 다시 시도해 주세요.'],
])('errorText %s', (code, expected) => {
  expect(errorText({ code, message: 'Network Error' }, FALLBACK)).toBe(expected);
});

it.each([
  ['TIMEOUT', '응답이 늦어지고 있어요. 잠시 후 다시 시도해 주세요.'],
  ['NETWORK', '네트워크 연결을 확인하고 다시 시도해 주세요.'],
  ['HTTP_500', '금융 데이터를 연결하지 못했어요. 잠시 후 다시 시도해 주세요.'],
])('마이데이터 연결 connectErrorText %s', (code, expected) => {
  expect(connectErrorText({ code, message: 'message' })).toBe(expected);
});
