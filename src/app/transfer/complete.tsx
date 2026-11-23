import { useTranslation } from 'react-i18next';
import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router, Redirect, type Href } from 'expo-router';
import Button from '../../components/Button';
import { colors, typography, spacing, radius, fonts } from '../../constants/theme';
import { useTransferStore } from '../../store/transferStore';
import { fmtNumber, fmtRate } from '../../utils/format';

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
  const { result, reset } = useTransferStore();
  const { t } = useTranslation();

  // 결과 없이 들어온 경우(새로고침 등)는 송금 화면으로 돌려보냄
  if (!result) {
    return <Redirect href={'/transfer' as Href} />;
  }

  const { sendAmount, receiveAmount, usdAppliedRate, recipient } = result;

  const handleBack = () => {
    reset();
    router.replace('/(tabs)/chat' as Href);
  };

  return (
    <SafeAreaView style={s.safe} edges={['top', 'bottom']}>
      <View style={s.content}>
        <View style={s.checkCircle}>
          <Ionicons name="checkmark" size={42} color={colors.text.inverse} />
        </View>

        <Text style={s.title}>{t('transfer.complete.title')}</Text>
        <Text style={s.subtitle}>{result.guide}</Text>

        <View style={s.summaryCard}>
          <SummaryRow
            label={t('transfer.complete.withdraw')}
            value={t('transfer.complete.withdrawValue', { amount: fmtNumber(sendAmount.amount) })}
            highlight
          />
          <View style={s.divider} />
          <SummaryRow
            label={t('transfer.complete.recipient')}
            value={recipient.relation ? `${recipient.name} (${recipient.relation})` : recipient.name}
          />
          <SummaryRow
            label={t('transfer.complete.receive')}
            value={
              receiveAmount
                ? t('cards.remit.receiveAmount', { amount: fmtNumber(receiveAmount.amount), currency: receiveAmount.currency })
                : '—'
            }
          />
          {/* 송금 환율은 USD 기준(기본 상품). PHP 참고 환율은 송금에 적용하는 값이 아니라 여기서는 쓰지 않는다 */}
          {usdAppliedRate !== null ? (
            <SummaryRow label={t('transfer.complete.appliedRate')} value={`1 USD = ${fmtRate(usdAppliedRate)} KRW`} />
          ) : null}
        </View>

        <View style={s.btnWrap}>
          <Button title={t('transfer.complete.back')} onPress={handleBack} />
        </View>
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

  btnWrap: { width: '100%' },
});
