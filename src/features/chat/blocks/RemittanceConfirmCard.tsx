// REMITTANCE_CONFIRM (quote_remittance). 서버가 계산한 송금 견적을 그대로 보여 주고, 버튼은 transferPath 로 Mock 송금 화면을 연다.
// 받는 분 필드는 송금 API(TransferRecipient: name·bank·relation)와 이름이 달라 여기서 맞춰 읽는다.
// fees 가 없거나 null 이면(16시 이전 대화) 수수료 부분을 통째로 숨긴다. 수수료 금액은 더하거나 빼지 않는다.
import { useTranslation } from 'react-i18next';
import { View, Text, StyleSheet } from 'react-native';
import Button from '../../../components/Button';
import Tag from '../../../components/Tag';
import { colors, typography, spacing, radius, fonts } from '../../../constants/theme';
import { fmtDate, fmtNumber, fmtRate } from '../../../utils/format';
import type { ChatRemittanceConfirmBlock } from '../../../types/api';
import { isTransferPath, relationshipText } from './labels';

type Props = {
  block: ChatRemittanceConfirmBlock;
  onOpenTransferPath: (path: string) => void;
};

// 수수료 칸을 보여 줄지만 정한다. 0·null·없음은 숨긴다
const isPositive = (n: number | null | undefined): n is number => typeof n === 'number' && n > 0;

export default function RemittanceConfirmCard({ block, onOpenTransferPath }: Props) {
  const { t } = useTranslation();
  const { recipient, sendAmount, receiveAmount, appliedRate, transferPath, fees } = block;
  // nameEn → name, bankName → bank, relationship(코드) → relation(문구). 모르는 관계는 숨긴다
  const name = recipient.nameEn;
  const bank = recipient.bankName;
  const relation = relationshipText(recipient.relationship);
  // 송금수수료: 원화가 있으면 원화만, 없으면 달러. 둘 다 없으면 숨긴다
  const sendFee = !fees
    ? null
    : isPositive(fees.sendFeeKrw)
      ? t('money.won', { amount: fmtNumber(fees.sendFeeKrw) })
      : isPositive(fees.feeUsd)
        ? `US$${fmtNumber(fees.feeUsd)}`
        : null;

  return (
    <View style={s.wrap}>
      <View style={s.card}>
        <View style={s.head}>
          <Text style={s.title}>{t('cards.remit.title')}</Text>
          <View style={s.badges}>
            {appliedRate.isMock && <Tag label={t('cards.demo')} />}
            <View style={s.badge}>
              <Text style={s.badgeText}>{appliedRate.sourceLabel}</Text>
            </View>
          </View>
        </View>

        <View>
          <Text style={s.recipientName}>
            {name}
            {relation ? ` (${relation})` : ''}
          </Text>
          <Text style={s.sub}>
            {bank} ****{recipient.accountLast4}
          </Text>
        </View>

        <View style={s.row}>
          <Text style={s.rowLabel}>{t('cards.remit.sendAmount')}</Text>
          <Text style={s.rowVal}>
            {fmtNumber(sendAmount.amount)} {sendAmount.currency}
          </Text>
        </View>
        <View style={s.row}>
          <Text style={s.rowLabel}>{t('cards.remit.appliedRate')}</Text>
          <Text style={s.rowVal}>
            {appliedRate.unit} {appliedRate.currency} = {fmtRate(appliedRate.rate)} KRW
          </Text>
        </View>
        <Text style={s.asOf}>{t('cards.remit.asOf', { date: fmtDate(appliedRate.asOf) })}</Text>
        <View style={s.divider} />
        <View style={s.row}>
          <Text style={s.rowLabel}>{t('cards.remit.receive')}</Text>
          <Text style={s.total}>
            {t('cards.remit.receiveAmount', { amount: fmtNumber(receiveAmount.amount), currency: receiveAmount.currency })}
          </Text>
        </View>

        {fees && (
          <>
            <View style={s.divider} />
            {isPositive(fees.telegraphicFeeKrw) && (
              <View style={s.row}>
                <Text style={s.rowLabel}>{t('cards.remit.telegraphicFee')}</Text>
                <Text style={s.rowVal}>{t('money.won', { amount: fmtNumber(fees.telegraphicFeeKrw) })}</Text>
              </View>
            )}
            {sendFee && (
              <View style={s.row}>
                <Text style={s.rowLabel}>{t('cards.remit.sendFee')}</Text>
                <Text style={s.rowVal}>{sendFee}</Text>
              </View>
            )}
            <View style={s.row}>
              <Text style={s.rowLabel}>{t('cards.remit.fxMargin')}</Text>
              <Text style={s.rowVal}>{t('cards.remit.inRate')}</Text>
            </View>
            {typeof fees.totalWithdrawKrw === 'number' && (
              <View style={s.row}>
                <Text style={s.rowLabel}>{t('cards.remit.totalWithdraw')}</Text>
                <Text style={s.withdraw}>{t('money.won', { amount: fmtNumber(fees.totalWithdrawKrw) })}</Text>
              </View>
            )}
          </>
        )}
      </View>

      {isTransferPath(transferPath) && (
        <Button title={t('cards.remit.send')} showArrow onPress={() => onOpenTransferPath(transferPath)} />
      )}
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { gap: spacing.sm, marginTop: spacing.sm },
  card: { backgroundColor: colors.surface, borderRadius: radius.xl, padding: spacing.lg, gap: spacing.sm },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
  title: { ...typography.body, fontFamily: fonts.bold, color: colors.text.strong },
  badges: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, flexShrink: 1 },
  badge: {
    backgroundColor: colors.background,
    borderRadius: radius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    flexShrink: 1,
  },
  badgeText: { ...typography.badge, color: colors.text.sub },
  recipientName: { ...typography.title, color: colors.text.strong },
  sub: { ...typography.badge, color: colors.text.sub },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  rowLabel: { ...typography.body, color: colors.text.sub },
  rowVal: { ...typography.body, color: colors.text.strong },
  asOf: { ...typography.badge, color: colors.text.sub, textAlign: 'right' },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: colors.border },
  total: { ...typography.subtitle, fontFamily: fonts.bold, color: colors.primary },
  withdraw: { ...typography.body, fontFamily: fonts.bold, color: colors.text.strong },
});
