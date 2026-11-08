import { View, Text, Pressable, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { colors, typography, spacing, radius, fonts } from '../../constants/theme';
import { useTransferStore } from '../../store/transferStore';
import { MOCK_RECIPIENT, RATE, calcVND, fmtKRW } from '../../api/mock/transfer';

function SummaryRow({ label, value, highlight }: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <View style={s.summaryRow}>
      <Text style={s.summaryLabel}>{label}</Text>
      <Text style={[s.summaryValue, highlight && { color: colors.primary }]}>{value}</Text>
    </View>
  );
}

export default function TransferCompleteScreen() {
  const { confirmedAmountKRW, reset } = useTransferStore();
  const vnd = calcVND(confirmedAmountKRW);

  const handleBack = () => {
    reset();
    router.replace('/(tabs)/chat' as any);
  };

  return (
    <SafeAreaView style={s.safe} edges={['top', 'bottom']}>
      <View style={s.content}>
        <View style={s.checkCircle}>
          <Ionicons name="checkmark" size={42} color={colors.text.inverse} />
        </View>

        <Text style={s.title}>{'송금 요청이\n완료됐어요'}</Text>
        <Text style={s.subtitle}>처리 완료까지 1-2 영업일이 소요돼요.</Text>

        <View style={s.summaryCard}>
          <SummaryRow
            label="보낸 금액"
            value={`${fmtKRW(confirmedAmountKRW)} 원`}
            highlight
          />
          <View style={s.divider} />
          <SummaryRow
            label="받는 분"
            value={`${MOCK_RECIPIENT.name} (${MOCK_RECIPIENT.relation})`}
          />
          <SummaryRow
            label="수취 예상"
            value={`약 ${fmtKRW(vnd)} VND`}
          />
          <SummaryRow
            label="적용 환율"
            value={`${RATE.unit} VND = ${RATE.krw} KRW`}
          />
        </View>

        <Pressable style={s.btn} onPress={handleBack}>
          <Text style={s.btnText}>챗봇으로 돌아가기</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
    gap: spacing.lg,
  },

  checkCircle: {
    width: 80,
    height: 80,
    borderRadius: radius.full,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },

  title: {
    ...typography.h2,
    color: colors.text.strong,
    textAlign: 'center',
  },
  subtitle: {
    ...typography.body,
    color: colors.text.sub,
    textAlign: 'center',
    marginTop: -spacing.sm,
  },

  summaryCard: {
    width: '100%',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.xl,
    gap: spacing.md,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryLabel: { ...typography.body, color: colors.text.sub },
  summaryValue: { ...typography.body, fontFamily: fonts.bold, color: colors.text.strong },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
    marginVertical: spacing.xs,
  },

  btn: {
    width: '100%',
    backgroundColor: colors.primary,
    borderRadius: radius.lg,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnText: { ...typography.button, color: colors.text.inverse },
});
