// 챗봇 답변 말풍선 글. 줄마다 나눠 "- " 줄은 글머리 기호(•)와 들여쓰기로, **…** 는 굵은 글자로 그린다.
// 해석 규칙은 answerFormat.ts. 내가 보낸 말풍선에는 쓰지 않는다(사용자 글은 서식 없는 평문).
// 답하는 중 말풍선, 끝난 말풍선이 같은 컴포넌트를 쓴다. 대화방 다시 열기(CHT-03)를 만들 때도 이 컴포넌트로 그린다.

import { View, Text, StyleSheet, type StyleProp, type TextStyle } from 'react-native';
import { parseAnswer, type AnswerSegment } from './answerFormat';
import { fonts, spacing } from '../../constants/theme';

type Props = {
  text: string;
  style: StyleProp<TextStyle>; // 말풍선 글자 스타일(글자 크기·색·줄 높이). 굵은 조각은 글꼴만 바꾼다
  partial?: boolean; // 글이 아직 다 오지 않았으면 true (답하는 중·도중 실패)
};

function Segments({ segments }: { segments: AnswerSegment[] }) {
  return segments.map((s, i) =>
    s.bold ? (
      <Text key={i} style={styles.bold}>
        {s.text}
      </Text>
    ) : (
      s.text
    ),
  );
}

export default function AnswerText({ text, style, partial = false }: Props) {
  const lines = parseAnswer(text, { partial });
  return (
    <View>
      {lines.map((line, i) => {
        if (line.kind === 'blank') return <View key={i} style={styles.blank} />;
        if (line.kind === 'bullet') {
          return (
            <View key={i} style={styles.bulletRow}>
              <Text style={[style, styles.bulletMark]}>•</Text>
              <Text style={[style, styles.bulletText]}>
                <Segments segments={line.segments} />
              </Text>
            </View>
          );
        }
        return (
          <Text key={i} style={style}>
            <Segments segments={line.segments} />
          </Text>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bold: { fontFamily: fonts.bold },
  blank: { height: spacing.sm },
  bulletRow: { flexDirection: 'row' },
  bulletMark: { width: spacing.md }, // 글머리 기호 칸. 줄이 넘어가도 글이 이 칸 오른쪽에 맞춰진다
  bulletText: { flex: 1 },
});
