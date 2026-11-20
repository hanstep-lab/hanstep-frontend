import { StyleSheet } from 'react-native';
import { render, screen } from '@testing-library/react-native';
import AnswerText from '../AnswerText';
import { fonts } from '../../../constants/theme';

const BASE = { fontFamily: fonts.medium, fontSize: 13 };
const fontOf = (el: { props: { style?: unknown } }) => StyleSheet.flatten(el.props.style as never)?.fontFamily;

it('**…** 는 굵은 글꼴로, 별표는 보이지 않는다', async () => {
  await render(<AnswerText text={'**결론이에요.**\n- 근거 1'} style={BASE} />);
  expect(fontOf(screen.getByText('결론이에요.'))).toBe(fonts.bold);
  expect(screen.queryByText(/\*/)).toBeNull();
});

it('"- " 줄은 글머리 기호(•)와 글로 나눠 그린다', async () => {
  await render(<AnswerText text={'- 1개월 평균 1,335.92원\n- 3개월 평균 1,352.30원'} style={BASE} />);
  expect(screen.getAllByText('•')).toHaveLength(2);
  expect(screen.getByText('1개월 평균 1,335.92원')).toBeTruthy();
  expect(screen.queryByText(/^- /)).toBeNull();
});

it('스트리밍 중 닫히지 않은 ** 는 별표 없이 일반 글꼴로 보인다', async () => {
  await render(<AnswerText text={'**1,334'} style={BASE} partial />);
  const el = screen.getByText('1,334');
  expect(fontOf(el)).toBe(fonts.medium);
});

it('별표 없는 평문은 그대로', async () => {
  await render(<AnswerText text={'주요 통화 환율이에요.'} style={BASE} />);
  expect(fontOf(screen.getByText('주요 통화 환율이에요.'))).toBe(fonts.medium);
});
