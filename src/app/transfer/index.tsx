// TR-001 해외송금 실행. 데이터는 src/api/transfer.ts 에서만 받고, 금액 계산은 서버(Mock) 값을 그대로 쓴다.
import { useEffect, useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, type Href } from 'expo-router';
import Screen from '../../components/Screen';
import Button from '../../components/Button';
import { colors, typography, spacing, radius, fonts, shadow } from '../../constants/theme';
import { useTransferStore } from '../../store/transferStore';
import { getTransferContext, getTransferQuote, submitTransfer } from '../../api/transfer';
import { fmtNumber, fmtRate, fmtDate } from '../../utils/format';
import type { ApiError, TransferContext, TransferQuote } from '../../types/api';

function preparingAlert() {
  Alert.alert('준비 중', '곧 사용할 수 있어요.');
}

export default function TransferScreen() {
  const { initialAmountKRW, setResult } = useTransferStore();

  const [ctx, setCtx] = useState<TransferContext | null>(null);
  const [ctxError, setCtxError] = useState<string | null>(null);
  const [amount, setAmount] = useState<number>(initialAmountKRW ?? 0);
  const [quote, setQuote] = useState<TransferQuote | null>(null);
  const [quoteError, setQuoteError] = useState<string | null>(null);
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // 화면 진입 시 받는 분·계좌 정보
  useEffect(() => {
    getTransferContext()
      .then(setCtx)
      .catch((e: ApiError) => setCtxError(e.message));
  }, []);

  // 금액이 바뀌고 0.3초 동안 입력이 없으면 견적 요청 (키 누를 때마다 부르지 않으려고)
  useEffect(() => {
    setQuote(null);
    setQuoteError(null);
    if (amount <= 0) {
      setQuoteLoading(false);
      return;
    }
    setQuoteLoading(true);
    let cancelled = false;
    const timer = setTimeout(() => {
      getTransferQuote(amount)
        .then((q) => !cancelled && setQuote(q))
        .catch((e: ApiError) => !cancelled && setQuoteError(e.message))
        .finally(() => !cancelled && setQuoteLoading(false));
    }, 300);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [amount]);

  if (!ctx) {
    return (
      <Screen title="해외송금">
        <Text style={s.stateText}>{ctxError ?? '송금 정보를 불러오는 중이에요.'}</Text>
      </Screen>
    );
  }

  const balance = ctx.account.balance.amount;
  const { recipient, account, purpose } = ctx;

  const handleChange = (t: string) => {
    const digits = t.replace(/[^0-9]/g, '').slice(0, 9);
    setAmount(Number(digits) || 0);
  };

  // 빠른 금액은 잔액을 넘지 않게만 막는다 (입력 처리)
  const addAmount = (n: number) => setAmount(Math.min(amount + n, balance));

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const result = await submitTransfer({
        sendAmount: { amount, currency: 'KRW' },
        purposeCode: purpose.code,
      });
      setResult(result);
      router.replace('/transfer/complete' as Href);
    } catch (e) {
      Alert.alert('송금할 수 없어요', (e as ApiError).message);
    } finally {
      setSubmitting(false);
    }
  };

  const canSubmit = amount > 0 && !!quote && !submitting;

  return (
    <Screen
      title="해외송금"
      footer={
        <Button
          title={amount > 0 ? `${fmtNumber(amount)}원 해외송금하기` : '금액을 입력해 주세요'}
          showArrow={amount > 0}
          disabled={!canSubmit}
          onPress={handleSubmit}
        />
      }
    >
      {/* 받는 분 */}
      <View style={s.section}>
        <View style={s.sectionHead}>
          <Text style={s.sectionLabel}>받는 분 (해외)</Text>
          <Pressable style={s.linkRow} onPress={preparingAlert} hitSlop={8}>
            <Text style={s.linkText}>최근/즐겨찾기</Text>
            <Ionicons name="chevron-forward" size={10} color={colors.primary} />
          </Pressable>
        </View>
        <View style={[s.card, s.row]}>
          <View style={s.recipientLeft}>
            <View>
              <View style={s.flagCircle}>
                <Text style={s.flagText}>{recipient.countryCode}</Text>
              </View>
              <View style={s.countryBadge}>
                <Text style={s.countryBadgeText}>{recipient.country}</Text>
              </View>
            </View>
            <View style={s.flex}>
              <Text style={s.recipientName} numberOfLines={1}>
                {recipient.name} ({recipient.relation})
              </Text>
              <Text style={s.subText} numberOfLines={1}>
                {recipient.bank} ****{recipient.accountLast4} · {recipient.country}
              </Text>
            </View>
          </View>
          <Pressable style={s.pillBtn} onPress={preparingAlert}>
            <Text style={s.pillBtnText}>변경</Text>
          </Pressable>
        </View>
      </View>

      {/* 보낼 금액 */}
      <View style={s.section}>
        <Text style={s.sectionLabel}>보낼 금액 (내 통장 출금, KRW)</Text>
        <View style={[s.card, s.amountCard]}>
          <View style={s.row}>
            <View style={s.amountRow}>
              <TextInput
                value={amount > 0 ? fmtNumber(amount) : ''}
                onChangeText={handleChange}
                placeholder="0"
                placeholderTextColor={colors.text.sub}
                keyboardType="number-pad"
                style={s.amountInput}
              />
              <Text style={s.amountUnit}>원</Text>
            </View>
            {amount > 0 && (
              <Pressable style={s.clearBtn} onPress={() => setAmount(0)} hitSlop={8}>
                <Ionicons name="backspace-outline" size={16} color={colors.text.strong} />
              </Pressable>
            )}
          </View>
          <View style={s.row}>
            <Text style={s.subText}>출금가능 잔액</Text>
            <Text style={s.subText}>{fmtNumber(balance)}원</Text>
          </View>
          <View style={s.quickRow}>
            {ctx.quickAmounts.map((n) => (
              <Pressable key={n} style={s.quickBtn} onPress={() => addAmount(n)}>
                <Text style={s.quickBtnText}>+{fmtNumber(n / 10000)}만</Text>
              </Pressable>
            ))}
            <Pressable style={s.quickBtn} onPress={() => setAmount(balance)}>
              <Text style={[s.quickBtnText, s.quickBtnAll]}>전액</Text>
            </Pressable>
          </View>
        </View>
      </View>

      {/* 수취 예상: 서버 견적을 그대로 표시 */}
      <View style={s.preview}>
        <View style={s.row}>
          <Text style={s.previewLabel}>받는 분 수취 예상</Text>
          <Text style={s.previewValue}>
            {quote ? `약 ${fmtNumber(quote.receiveAmount.amount)} ${quote.receiveAmount.currency}` : '—'}
          </Text>
        </View>
        {quoteError ? (
          <Text style={s.errorText}>{quoteError}</Text>
        ) : quoteLoading ? (
          <Text style={s.rateLabel}>예상 금액을 확인하고 있어요.</Text>
        ) : quote ? (
          <View style={s.row}>
            <Text style={[s.rateLabel, s.flex]} numberOfLines={2}>
              적용 환율 ({quote.appliedRate.sourceLabel} · {fmtDate(quote.appliedRate.asOf, { short: true })} 기준)
            </Text>
            <Text style={s.rateValue}>
              {quote.appliedRate.unit} {quote.appliedRate.currency} = {fmtRate(quote.appliedRate.rate)} KRW
            </Text>
          </View>
        ) : null}
      </View>

      {/* 출금 계좌 */}
      <View style={s.section}>
        <Text style={s.sectionLabel}>출금 계좌</Text>
        <Pressable style={[s.card, s.row]} onPress={preparingAlert}>
          <View>
            <Text style={s.accountName}>{account.name}</Text>
            <Text style={s.subText}>{account.number}</Text>
          </View>
          <Ionicons name="chevron-down" size={16} color={colors.primary} />
        </Pressable>
      </View>

      {/* 송금 목적 */}
      <Pressable style={[s.card, s.row]} onPress={preparingAlert}>
        <Text style={s.purposeLabel}>송금 목적</Text>
        <View style={s.purposeRight}>
          <Text style={s.purposeValue}>{purpose.label}</Text>
          <Ionicons name="pencil" size={12} color={colors.text.strong} />
        </View>
      </Pressable>
    </Screen>
  );
}

const s = StyleSheet.create({
  flex: { flex: 1 },
  stateText: { ...typography.body, color: colors.text.sub, textAlign: 'center' },

  section: { gap: spacing.xs },
  sectionHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.xs,
  },
  sectionLabel: {
    ...typography.body,
    fontFamily: fonts.bold,
    color: colors.text.sub,
    paddingHorizontal: spacing.xs,
  },
  linkRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  linkText: { ...typography.badge, color: colors.primary },

  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: spacing.xl,
    ...shadow.card,
  },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  subText: { ...typography.body, color: colors.text.sub },

  recipientLeft: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  flagCircle: {
    width: 48,
    height: 48,
    borderRadius: radius.full,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  flagText: { ...typography.h3, fontFamily: fonts.medium, color: colors.primary },
  // Figma 는 파란 배경에 검은 글자라 읽기 어려워서 primarySoft 배경 + primary 글자로 둠 (확인 필요)
  countryBadge: {
    position: 'absolute',
    right: -spacing.xs,
    bottom: -spacing.xs,
    backgroundColor: colors.primarySoft,
    borderRadius: radius.full,
    paddingHorizontal: spacing.sm,
  },
  countryBadgeText: { ...typography.badge, color: colors.primary },
  recipientName: { ...typography.h3, color: colors.text.strong },
  pillBtn: {
    backgroundColor: colors.background,
    borderRadius: radius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  pillBtnText: { ...typography.badge, color: colors.text.sub },

  amountCard: { gap: spacing.md },
  amountRow: { flex: 1, flexDirection: 'row', alignItems: 'baseline', gap: spacing.xs },
  amountInput: { ...typography.h2, color: colors.primary, padding: 0, minWidth: 24 },
  amountUnit: { ...typography.h3, fontFamily: fonts.medium, color: colors.text.strong },
  clearBtn: {
    width: 32,
    height: 32,
    borderRadius: radius.full,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickRow: { flexDirection: 'row', gap: spacing.xs },
  quickBtn: {
    flex: 1,
    paddingVertical: spacing.sm,
    backgroundColor: colors.background,
    borderRadius: radius.lg,
    alignItems: 'center',
  },
  quickBtnText: { ...typography.badge, color: colors.text.strong },
  quickBtnAll: { color: colors.primary },

  preview: {
    backgroundColor: colors.background,
    borderRadius: radius.xl,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    gap: spacing.sm,
  },
  previewLabel: { ...typography.body, color: colors.text.strong },
  previewValue: { ...typography.h3, color: colors.primary },
  rateLabel: { ...typography.badge, fontFamily: fonts.light, color: colors.text.sub },
  rateValue: { ...typography.badge, color: colors.text.strong },
  errorText: { ...typography.badge, color: colors.error },

  accountName: { ...typography.title, color: colors.text.strong },

  purposeLabel: { ...typography.subtitle, color: colors.text.sub },
  purposeRight: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  purposeValue: { ...typography.body, fontFamily: fonts.bold, color: colors.text.strong },
});
