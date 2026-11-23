// TR-001 해외송금 실행. 화면 기준: Figma 876:9 (TR-001 v3 · 외국인 송금 규정 반영 개선안).
// 데이터는 src/api/transfer.ts 에서만 받고, 금액은 서버(Mock) 견적 값을 그대로 쓴다(더하거나 빼지 않음).
// Figma 와 다른 점: 공통 Header(가운데 제목·닫기) 사용, 기능 없는 '변경'·송금 목적 연필·출금 계좌 ▼ 는 넣지 않음.
import { useEffect, useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams, type Href } from 'expo-router';
import Screen from '../../components/Screen';
import Button from '../../components/Button';
import { colors, typography, spacing, radius, fonts, shadow } from '../../constants/theme';
import { useTransferStore } from '../../store/transferStore';
import {
  getTransferContext,
  getTransferQuote,
  submitTransfer,
  canSendQuote,
  defaultQuoteOf,
  quoteNoticeText,
  transferErrorText,
} from '../../api/transfer';
import { fmtNumber, fmtRate, fmtDate } from '../../utils/format';
import type { ApiError, RemittanceProductQuote, TransferContext, TransferQuote } from '../../types/api';

// 전달 방식 (견적 deliveryType). 표에 없는 값은 줄을 숨긴다
const DELIVERY_TEXT: Record<string, string> = { SWIFT_ACCOUNT: 'SWIFT 계좌송금', WESTERN_UNION: '웨스턴유니온' };
// 도착 예정 (deliveryType 별 안내. 송금 완료 화면 안내 '처리 완료까지 1-2 영업일'과 같음)
const ARRIVAL_TEXT: Record<string, string> = { SWIFT_ACCOUNT: '영업일 1~2일' };
// 받는 은행 BIC(SWIFT 코드). 은행마다 정해진 공개 코드라 앱 표로 둔다. 표에 없는 은행은 BIC 를 숨긴다
const BANK_BIC: Record<string, string> = { BDO: 'BNORPHMM', BPI: 'BOPIPHMM' };

// 외국인 해외송금 확인 (시연용 고정값). 서버에 아직 값이 없다
// - 거래외국환은행: 증빙 없는 해외송금을 하려면 은행 한 곳을 지정한다. 신한 SOL 안의 서비스라 신한은행으로 둔다
// - 올해 해외송금: 지정 은행 기준 무증빙 연 한도(USD 50,000) 대비 올해 보낸 금액. 서버 값이 생기기 전까지 0
const DESIGNATED_FX_BANK = '신한은행';
const YEARLY_SENT_USD = 0;
const YEARLY_LIMIT_USD = 50_000;

// 수수료 한 줄: 송금수수료·전신료 중 0보다 큰 것만. 하나면 금액만, 둘이면 이름과 함께 나란히 (합치지 않는다)
function feeText(q: RemittanceProductQuote): string | null {
  const parts: { name: string; text: string }[] = [];
  if (q.sendFeeKrw != null && q.sendFeeKrw > 0) parts.push({ name: '송금수수료', text: `${fmtNumber(q.sendFeeKrw)}원` });
  else if (q.feeUsd != null && q.feeUsd > 0) parts.push({ name: '송금수수료', text: `US$${fmtNumber(q.feeUsd)}` });
  if (q.telegraphicFeeKrw != null && q.telegraphicFeeKrw > 0)
    parts.push({ name: '전신료', text: `${fmtNumber(q.telegraphicFeeKrw)}원` });
  if (parts.length === 0) return null;
  if (parts.length === 1) return parts[0].text;
  return parts.map((p) => `${p.name} ${p.text}`).join(' · ');
}

// 주소의 amount(원). 숫자만 1~9자리(입력칸과 같은 한도)이고 0보다 클 때만 쓴다. 아니면 null
function parseAmountParam(v: string | undefined): number | null {
  if (!v || !/^\d{1,9}$/.test(v)) return null;
  const n = Number(v);
  return n > 0 ? n : null;
}

export default function TransferScreen() {
  const { initialAmountKRW, setResult } = useTransferStore();
  // 채팅 송금 카드(CHT-04 REMITTANCE_CONFIRM)는 서버 transferPath(/transfer?recipientId=1&amount=500000)로 이 화면을 연다.
  // 예전에는 store 의 initialAmountKRW 만 읽어서 주소의 금액이 무시되고 0원으로 시작했다. 그래서 주소의 amount 를 먼저 읽는다.
  // Expo Router 문서(URL parameters): 이 화면의 쿼리는 useLocalSearchParams 로 읽고, 값은 문자열로 온다.
  // recipientId 는 아직 쓰지 않는다. 송금 화면의 받는 분이 한 명뿐이고(GET /transfers/context) id 필드가 없다.
  const params = useLocalSearchParams<{ amount?: string; recipientId?: string }>();
  const amountFromPath = parseAmountParam(params.amount);

  const [ctx, setCtx] = useState<TransferContext | null>(null);
  const [ctxError, setCtxError] = useState<string | null>(null);
  const [amount, setAmount] = useState<number>(amountFromPath ?? initialAmountKRW ?? 0);
  const [quote, setQuote] = useState<TransferQuote | null>(null);
  const [quoteError, setQuoteError] = useState<string | null>(null);
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showDetail, setShowDetail] = useState(false); // '출금 총액·수수료 내역 자세히 보기'

  // 화면 진입 시 받는 분·계좌 정보
  useEffect(() => {
    getTransferContext()
      .then(setCtx)
      .catch((e: ApiError) => setCtxError(transferErrorText(e, '송금 정보를 불러오지 못했어요. 다시 시도해 주세요.')));
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
        .catch((e: ApiError) => !cancelled && setQuoteError(transferErrorText(e, '견적을 불러오지 못했어요. 다시 시도해 주세요.')))
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
    if (!quote) return;
    setSubmitting(true);
    try {
      const result = await submitTransfer(
        { sendAmount: { amount, currency: 'KRW' }, purposeCode: purpose.code },
        quote,
        recipient,
      );
      setResult(result);
      router.replace('/transfer/complete' as Href);
    } catch (e) {
      Alert.alert('송금할 수 없어요', (e as ApiError).message);
    } finally {
      setSubmitting(false);
    }
  };

  // 기본 상품으로 보낼 수 없는 금액(예: 수수료보다 작음)이면 송금 버튼을 막는다
  const canSubmit = amount > 0 && !!quote && canSendQuote(quote) && !submitting;
  const mainQuote = quote ? defaultQuoteOf(quote) : null;
  const notice = quote ? quoteNoticeText(quote) : null;
  const deliveryLine = [mainQuote ? DELIVERY_TEXT[mainQuote.deliveryType] : null, BANK_BIC[recipient.bank] ? `BIC ${BANK_BIC[recipient.bank]}` : null]
    .filter(Boolean)
    .join(' · ');
  const fee = mainQuote ? feeText(mainQuote) : null;
  const arrival = mainQuote ? ARRIVAL_TEXT[mainQuote.deliveryType] ?? null : null;
  const yearlyRatio = Math.min(YEARLY_SENT_USD / YEARLY_LIMIT_USD, 1);

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
                {recipient.relation ? `${recipient.name} (${recipient.relation})` : recipient.name}
              </Text>
              <Text style={s.subText} numberOfLines={1}>
                {recipient.bank} ****{recipient.accountLast4} · {recipient.country}
              </Text>
              {deliveryLine ? (
                <Text style={s.deliveryText} numberOfLines={1}>
                  {deliveryLine}
                </Text>
              ) : null}
            </View>
          </View>
        </View>
      </View>

      {/* 보낼 금액 */}
      <View style={s.section}>
        <Text style={s.sectionLabel}>보낼 금액 (수수료 포함 출금 총액, KRW)</Text>
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

      {/* 송금 내역 (예상): 서버 견적 그대로. PHP 금액은 참고값, 환율은 기본 상품(쏠편한)의 USD 적용 환율 */}
      <View style={s.section}>
        <Text style={s.sectionLabel}>송금 내역 (예상)</Text>
        <View style={[s.card, s.listCard]}>
          <View style={s.row}>
            <Text style={s.itemLabelStrong}>받는 분 수취 예상{quote?.isReference === false ? '' : ' (참고)'}</Text>
            <Text style={s.receiveValue}>
              {quote?.receiveAmount
                ? `약 ${fmtNumber(quote.receiveAmount.amount)} ${quote.receiveAmount.currency}`
                : '—'}
            </Text>
          </View>
          <View style={s.divider} />
          {quoteError ? (
            <Text style={s.errorText}>{quoteError}</Text>
          ) : quoteLoading ? (
            <Text style={s.itemLabel}>예상 금액을 확인하고 있어요.</Text>
          ) : quote && mainQuote ? (
            <>
              <View style={s.row}>
                <Text style={[s.itemLabel, s.flex]} numberOfLines={1}>
                  환율 ({mainQuote.preferentialPct > 0 ? `우대 ${mainQuote.preferentialPct}% · ` : ''}
                  {fmtDate(quote.rates.usdRateDate, { short: true })} 기준)
                </Text>
                <Text style={s.itemValue}>
                  1 {quote.sendCurrency} = {fmtRate(mainQuote.usdAppliedRate)}원
                </Text>
              </View>
              {fee ? (
                <View style={s.row}>
                  <Text style={s.itemLabel}>수수료</Text>
                  <Text style={s.itemValue}>{fee}</Text>
                </View>
              ) : null}
              {arrival ? (
                <View style={s.row}>
                  <Text style={s.itemLabel}>도착 예정</Text>
                  <Text style={s.itemValue}>{arrival}</Text>
                </View>
              ) : null}

              {showDetail ? (
                <View style={s.detail}>
                  {mainQuote.totalWithdrawKrw != null ? (
                    <View style={s.row}>
                      <Text style={s.itemLabel}>출금 총액</Text>
                      <Text style={s.itemValue}>{fmtNumber(mainQuote.totalWithdrawKrw)}원</Text>
                    </View>
                  ) : null}
                  {mainQuote.sendAmountUsd != null ? (
                    <View style={s.row}>
                      <Text style={s.itemLabel}>보내는 금액</Text>
                      <Text style={s.itemValue}>US${fmtNumber(mainQuote.sendAmountUsd)}</Text>
                    </View>
                  ) : null}
                  {mainQuote.sendFeeKrw != null && mainQuote.sendFeeKrw > 0 ? (
                    <View style={s.row}>
                      <Text style={s.itemLabel}>송금수수료</Text>
                      <Text style={s.itemValue}>{fmtNumber(mainQuote.sendFeeKrw)}원</Text>
                    </View>
                  ) : null}
                  {mainQuote.telegraphicFeeKrw != null && mainQuote.telegraphicFeeKrw > 0 ? (
                    <View style={s.row}>
                      <Text style={s.itemLabel}>전신료</Text>
                      <Text style={s.itemValue}>{fmtNumber(mainQuote.telegraphicFeeKrw)}원</Text>
                    </View>
                  ) : null}
                  {mainQuote.fxMarginKrw != null && mainQuote.fxMarginKrw > 0 ? (
                    <View style={s.row}>
                      <Text style={s.itemLabel}>환전 마진 (환율에 포함, 참고)</Text>
                      <Text style={s.itemValue}>{fmtNumber(mainQuote.fxMarginKrw)}원</Text>
                    </View>
                  ) : null}
                  {quote.appliedRate ? (
                    <View style={s.row}>
                      <Text style={[s.itemLabel, s.flex]} numberOfLines={2}>
                        참고 환율 ({quote.appliedRate.sourceLabel} · {fmtDate(quote.appliedRate.asOf, { short: true })} 기준)
                      </Text>
                      <Text style={s.itemValue}>
                        {quote.appliedRate.unit} {quote.appliedRate.currency} = {fmtRate(quote.appliedRate.rate)}원
                      </Text>
                    </View>
                  ) : null}
                </View>
              ) : null}

              <Pressable style={s.detailToggle} onPress={() => setShowDetail((v) => !v)} hitSlop={8}>
                <Text style={s.detailToggleText}>출금 총액·수수료 내역 {showDetail ? '접기' : '자세히 보기'}</Text>
                <Ionicons name={showDetail ? 'chevron-up' : 'chevron-down'} size={12} color={colors.primary} />
              </Pressable>
            </>
          ) : null}
        </View>
        {notice ? <Text style={s.noticeText}>{notice}</Text> : null}
      </View>

      {/* 출금 계좌 */}
      <View style={s.section}>
        <Text style={s.sectionLabel}>출금 계좌</Text>
        <View style={[s.card, s.row]}>
          {/* 상품명이 없으면 마스킹된 계좌번호를 이름 자리에 한 번만 보여 준다 */}
          <View>
            <Text style={s.accountName}>{account.name ?? account.number}</Text>
            {account.name ? <Text style={s.subText}>{account.number}</Text> : null}
          </View>
        </View>
      </View>

      {/* 외국인 해외송금 확인 */}
      <View style={s.section}>
        <Text style={s.sectionLabel}>외국인 해외송금 확인</Text>
        <View style={[s.card, s.listCard]}>
          <View style={s.row}>
            <Text style={s.itemLabel}>거래외국환은행</Text>
            <View style={s.bankBadge}>
              <Ionicons name="checkmark" size={12} color={colors.primary} />
              <Text style={s.bankBadgeText}>{DESIGNATED_FX_BANK}</Text>
            </View>
          </View>
          <View style={s.row}>
            <Text style={s.itemLabel}>송금 목적</Text>
            <Text style={s.itemValueStrong}>{purpose.label}</Text>
          </View>
          <View style={s.row}>
            <Text style={s.itemLabel}>올해 해외송금 (무증빙 연 한도)</Text>
            <Text style={s.limitValue}>
              USD {fmtNumber(YEARLY_SENT_USD)} / {fmtNumber(YEARLY_LIMIT_USD)}
            </Text>
          </View>
          <View style={s.progressTrack}>
            <View style={[s.progressFill, { width: `${yearlyRatio * 100}%` }]} />
          </View>
        </View>
      </View>
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
  deliveryText: { ...typography.badge, color: colors.text.sub },
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

  // 송금 내역·외국인 해외송금 확인 카드: 왼쪽 이름 · 오른쪽 값 줄
  listCard: { gap: spacing.sm },
  itemLabel: { ...typography.body, color: colors.text.sub },
  itemLabelStrong: { ...typography.body, fontFamily: fonts.bold, color: colors.text.strong },
  itemValue: { ...typography.body, color: colors.text.strong },
  itemValueStrong: { ...typography.body, fontFamily: fonts.bold, color: colors.text.strong },
  receiveValue: { ...typography.h3, color: colors.primary },
  divider: { height: 1, backgroundColor: colors.background },
  detail: { gap: spacing.sm, paddingTop: spacing.xs },
  detailToggle: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: spacing.xs },
  detailToggleText: { ...typography.badge, fontFamily: fonts.bold, color: colors.primary },
  noticeText: { ...typography.badge, color: colors.text.sub, paddingHorizontal: spacing.xs },
  errorText: { ...typography.badge, color: colors.error },

  accountName: { ...typography.title, color: colors.text.strong },

  bankBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.primarySoft,
    borderRadius: radius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  bankBadgeText: { ...typography.badge, fontFamily: fonts.bold, color: colors.primary },
  limitValue: { ...typography.body, fontFamily: fonts.bold, color: colors.primary },
  progressTrack: { height: 8, borderRadius: radius.full, backgroundColor: colors.background, overflow: 'hidden' },
  progressFill: { height: 8, borderRadius: radius.full, backgroundColor: colors.primary },
});
