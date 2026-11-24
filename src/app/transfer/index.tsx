// TR-001 해외송금 실행. 화면 기준: Figma 876:9 (TR-001 v3 · 외국인 송금 규정 반영 개선안).
// 데이터는 src/api/transfer.ts 에서만 받고, 금액은 서버(Mock) 견적 값을 그대로 쓴다(더하거나 빼지 않음).
// Figma 와 다른 점: 공통 Header(가운데 제목·닫기) 사용, 기능 없는 '변경'·송금 목적 연필·출금 계좌 ▼ 는 넣지 않음.
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View, Text, TextInput, Pressable, StyleSheet, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams, type Href } from 'expo-router';
import Screen from '../../components/Screen';
import Button from '../../components/Button';
import { colors, typography, spacing, radius, fonts, shadow } from '../../constants/theme';
import { SkeletonCard, SkeletonGroup } from '../../components/Skeleton';
import { useTransferStore } from '../../store/transferStore';
import {
  getTransferContext,
  getTransferQuote,
  submitTransfer,
  canSendQuote,
  defaultQuoteOf,
  compareQuoteOf,
  compareReceiveOf,
  productLabel,
  quoteUnavailableText,
  quoteNoticeText,
  transferErrorText,
  recipientCountry,
} from '../../api/transfer';
import { fmtNumber, fmtRate, fmtDate } from '../../utils/format';
import type { ApiError, RemittanceProductQuote, TransferContext, TransferQuote } from '../../types/api';
import i18n from '../../i18n';

// 전달 방식 (견적 deliveryType, i18n transfer.delivery). 표에 없는 값은 줄을 숨긴다
const DELIVERY_TYPES = ['SWIFT_ACCOUNT', 'WESTERN_UNION'] as const;
const deliveryText = (type: string) =>
  (DELIVERY_TYPES as readonly string[]).includes(type)
    ? i18n.t(`transfer.delivery.${type as (typeof DELIVERY_TYPES)[number]}`)
    : null;
// 도착 예정 (deliveryType 별 안내. 송금 완료 화면 안내 '처리 완료까지 1-2 영업일'과 같음). SWIFT 만 있다
const arrivalText = (type: string) => (type === 'SWIFT_ACCOUNT' ? i18n.t('transfer.arrivalSwift') : null);
// 받는 은행 BIC(SWIFT 코드). 은행마다 정해진 공개 코드라 앱 표로 둔다. 표에 없는 은행은 BIC 를 숨긴다
const BANK_BIC: Record<string, string> = { BDO: 'BNORPHMM', BPI: 'BOPIPHMM' };

// 외국인 해외송금 확인 (시연용 고정값). 서버에 아직 값이 없다
// - 거래외국환은행: 증빙 없는 해외송금을 하려면 은행 한 곳을 지정한다. 신한 SOL 안의 서비스라 신한은행으로 둔다 (i18n transfer.designatedBank)
// - 올해 해외송금: 지정 은행 기준 무증빙 연 한도(USD 50,000) 대비 올해 보낸 금액. 서버 값이 생기기 전까지 0
const YEARLY_SENT_USD = 0;
const YEARLY_LIMIT_USD = 50_000;

// 수수료 한 줄: 송금수수료·전신료 중 0보다 큰 것만. 하나면 금액만, 둘이면 이름과 함께 나란히 (합치지 않는다)
function feeText(q: RemittanceProductQuote): string | null {
  const parts: { name: string; text: string }[] = [];
  const won = (n: number) => i18n.t('money.won', { amount: fmtNumber(n) });
  if (q.sendFeeKrw != null && q.sendFeeKrw > 0) parts.push({ name: i18n.t('transfer.sendFee'), text: won(q.sendFeeKrw) });
  else if (q.feeUsd != null && q.feeUsd > 0) parts.push({ name: i18n.t('transfer.sendFee'), text: `US$${fmtNumber(q.feeUsd)}` });
  if (q.telegraphicFeeKrw != null && q.telegraphicFeeKrw > 0)
    parts.push({ name: i18n.t('transfer.telegraphicFee'), text: won(q.telegraphicFeeKrw) });
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
  const { t } = useTranslation();
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
      .catch((e: ApiError) => setCtxError(transferErrorText(e, t('transfer.error.context'))));
  }, [t]);

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
        .catch((e: ApiError) => !cancelled && setQuoteError(transferErrorText(e, t('transfer.error.quote'))))
        .finally(() => !cancelled && setQuoteLoading(false));
    }, 300);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [amount, t]);

  if (!ctx) {
    return (
      <Screen title={t('transfer.title')} loading={!ctxError}>
        {ctxError ? (
          <Text style={s.stateText}>{ctxError}</Text>
        ) : (
          <SkeletonGroup>
            <SkeletonCard lines={2} />
            <SkeletonCard lines={1} block={48} />
            <SkeletonCard lines={3} />
            <SkeletonCard lines={3} />
          </SkeletonGroup>
        )}
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
      Alert.alert(t('transfer.error.submitTitle'), (e as ApiError).message);
    } finally {
      setSubmitting(false);
    }
  };

  // 기본 상품으로 보낼 수 없는 금액(예: 수수료보다 작음)이면 송금 버튼을 막는다
  const canSubmit = amount > 0 && !!quote && canSendQuote(quote) && !submitting;
  const mainQuote = quote ? defaultQuoteOf(quote) : null;
  // 비교 상품(쏠빠른). 견적을 다 받았을 때만 송금 내역 아래에 보여 준다
  const compareQuote = quote && !quoteLoading && !quoteError ? compareQuoteOf(quote) : null;
  const compareReceive = quote && compareQuote ? compareReceiveOf(compareQuote, quote) : null;
  const notice = quote ? quoteNoticeText(quote) : null;
  const deliveryLine = [mainQuote ? deliveryText(mainQuote.deliveryType) : null, BANK_BIC[recipient.bank] ? `BIC ${BANK_BIC[recipient.bank]}` : null]
    .filter(Boolean)
    .join(' · ');
  const fee = mainQuote ? feeText(mainQuote) : null;
  const arrival = mainQuote ? arrivalText(mainQuote.deliveryType) : null;
  const yearlyRatio = Math.min(YEARLY_SENT_USD / YEARLY_LIMIT_USD, 1);

  return (
    <Screen
      title={t('transfer.title')}
      footer={
        <Button
          title={amount > 0 ? t('transfer.sendButton', { amount: fmtNumber(amount) }) : t('transfer.enterAmount')}
          showArrow={amount > 0}
          disabled={!canSubmit}
          onPress={handleSubmit}
        />
      }
    >
      {/* 받는 분 */}
      <View style={s.section}>
        <View style={s.sectionHead}>
          <Text style={s.sectionLabel}>{t('transfer.recipient')}</Text>
        </View>
        <View style={[s.card, s.row]}>
          <View style={s.recipientLeft}>
            {/* 나라 배지는 원 아래 가운데에 살짝 겹쳐 둔다. 영어 나라 이름(Philippines)처럼 원보다 넓어도 양쪽으로 고르게 퍼진다 */}
            <View>
              <View style={s.flagCircle}>
                <Text style={s.flagText}>{recipient.countryCode}</Text>
              </View>
              <View style={s.countryBadgeWrap} pointerEvents="none">
                <View style={s.countryBadge}>
                  <Text style={s.countryBadgeText} numberOfLines={1}>
                    {recipientCountry(recipient)}
                  </Text>
                </View>
              </View>
            </View>
            <View style={s.flex}>
              <Text style={s.recipientName} numberOfLines={1}>
                {recipient.relation ? `${recipient.name} (${recipient.relation})` : recipient.name}
              </Text>
              <Text style={s.subText} numberOfLines={1}>
                {recipient.bank} ****{recipient.accountLast4} · {recipientCountry(recipient)}
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
        <Text style={s.sectionLabel}>{t('transfer.amountLabel')}</Text>
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
              <Text style={s.amountUnit}>{t('transfer.won')}</Text>
            </View>
            {amount > 0 && (
              <Pressable style={s.clearBtn} onPress={() => setAmount(0)} hitSlop={8}>
                <Ionicons name="backspace-outline" size={16} color={colors.text.strong} />
              </Pressable>
            )}
          </View>
          <View style={s.row}>
            <Text style={s.subText}>{t('transfer.balance')}</Text>
            <Text style={s.subText}>{t('money.won', { amount: fmtNumber(balance) })}</Text>
          </View>
          <View style={s.quickRow}>
            {ctx.quickAmounts.map((n) => (
              <Pressable key={n} style={s.quickBtn} onPress={() => addAmount(n)}>
                <Text style={s.quickBtnText}>{t('transfer.quick', { man: fmtNumber(n / 10000), won: fmtNumber(n) })}</Text>
              </Pressable>
            ))}
            <Pressable style={s.quickBtn} onPress={() => setAmount(balance)}>
              <Text style={[s.quickBtnText, s.quickBtnAll]}>{t('transfer.all')}</Text>
            </Pressable>
          </View>
        </View>
      </View>

      {/* 송금 내역 (예상): 서버 견적 그대로. PHP 금액은 참고값, 환율은 기본 상품(쏠편한)의 USD 적용 환율 */}
      <View style={s.section}>
        <Text style={s.sectionLabel}>{t('transfer.breakdown')}</Text>
        <View style={[s.card, s.listCard]}>
          {quote ? <Text style={s.productName}>{productLabel(quote.defaultProduct)}</Text> : null}
          <View style={s.row}>
            <Text style={s.itemLabelStrong}>
              {t('transfer.receive')}
              {quote?.isReference === false ? '' : t('transfer.referenceSuffix')}
            </Text>
            <Text style={s.receiveValue}>
              {quote?.receiveAmount
                ? t('cards.remit.receiveAmount', {
                    amount: fmtNumber(quote.receiveAmount.amount),
                    currency: quote.receiveAmount.currency,
                  })
                : '—'}
            </Text>
          </View>
          <View style={s.divider} />
          {quoteError ? (
            <Text style={s.errorText}>{quoteError}</Text>
          ) : quoteLoading ? (
            <Text style={s.itemLabel}>{t('transfer.checking')}</Text>
          ) : quote && mainQuote ? (
            <>
              <View style={s.row}>
                <Text style={[s.itemLabel, s.flex]} numberOfLines={1}>
                  {t('transfer.rateLabel', {
                    pref: mainQuote.preferentialPct > 0 ? t('transfer.preferential', { pct: mainQuote.preferentialPct }) : '',
                    date: fmtDate(quote.rates.usdRateDate, { short: true }),
                  })}
                </Text>
                <Text style={s.itemValue}>
                  {t('transfer.rateValue', { unit: 1, currency: quote.sendCurrency, rate: fmtRate(mainQuote.usdAppliedRate) })}
                </Text>
              </View>
              {fee ? (
                <View style={s.row}>
                  <Text style={s.itemLabel}>{t('transfer.fee')}</Text>
                  <Text style={s.itemValue}>{fee}</Text>
                </View>
              ) : null}
              {arrival ? (
                <View style={s.row}>
                  <Text style={s.itemLabel}>{t('transfer.arrival')}</Text>
                  <Text style={s.itemValue}>{arrival}</Text>
                </View>
              ) : null}

              {showDetail ? (
                <View style={s.detail}>
                  {mainQuote.totalWithdrawKrw != null ? (
                    <View style={s.row}>
                      <Text style={s.itemLabel}>{t('transfer.totalWithdraw')}</Text>
                      <Text style={s.itemValue}>{t('money.won', { amount: fmtNumber(mainQuote.totalWithdrawKrw) })}</Text>
                    </View>
                  ) : null}
                  {mainQuote.sendAmountUsd != null ? (
                    <View style={s.row}>
                      <Text style={s.itemLabel}>{t('transfer.sendAmount')}</Text>
                      <Text style={s.itemValue}>US${fmtNumber(mainQuote.sendAmountUsd)}</Text>
                    </View>
                  ) : null}
                  {mainQuote.sendFeeKrw != null && mainQuote.sendFeeKrw > 0 ? (
                    <View style={s.row}>
                      <Text style={s.itemLabel}>{t('transfer.sendFee')}</Text>
                      <Text style={s.itemValue}>{t('money.won', { amount: fmtNumber(mainQuote.sendFeeKrw) })}</Text>
                    </View>
                  ) : null}
                  {mainQuote.telegraphicFeeKrw != null && mainQuote.telegraphicFeeKrw > 0 ? (
                    <View style={s.row}>
                      <Text style={s.itemLabel}>{t('transfer.telegraphicFee')}</Text>
                      <Text style={s.itemValue}>{t('money.won', { amount: fmtNumber(mainQuote.telegraphicFeeKrw) })}</Text>
                    </View>
                  ) : null}
                  {mainQuote.fxMarginKrw != null && mainQuote.fxMarginKrw > 0 ? (
                    <View style={s.row}>
                      <Text style={s.itemLabel}>{t('transfer.fxMargin')}</Text>
                      <Text style={s.itemValue}>{t('money.won', { amount: fmtNumber(mainQuote.fxMarginKrw) })}</Text>
                    </View>
                  ) : null}
                  {quote.appliedRate ? (
                    <View style={s.row}>
                      <Text style={[s.itemLabel, s.flex]} numberOfLines={2}>
                        {t('transfer.refRate', {
                          source: quote.appliedRate.sourceLabel,
                          date: fmtDate(quote.appliedRate.asOf, { short: true }),
                        })}
                      </Text>
                      <Text style={s.itemValue}>
                        {t('transfer.rateValue', {
                          unit: quote.appliedRate.unit,
                          currency: quote.appliedRate.currency,
                          rate: fmtRate(quote.appliedRate.rate),
                        })}
                      </Text>
                    </View>
                  ) : null}
                </View>
              ) : null}

              <Pressable style={s.detailToggle} onPress={() => setShowDetail((v) => !v)} hitSlop={8}>
                <Text style={s.detailToggleText}>
                  {t('transfer.detailToggle', { action: showDetail ? t('transfer.collapse') : t('transfer.expand') })}
                </Text>
                <Ionicons name={showDetail ? 'chevron-up' : 'chevron-down'} size={12} color={colors.primary} />
              </Pressable>
            </>
          ) : null}
        </View>
        {notice ? <Text style={s.noticeText}>{notice}</Text> : null}

        {/* 비교 상품(쏠빠른) 견적: 서버 quotes[] 의 기본이 아닌 상품. 비교로만 보여 주고 송금은 기본 상품으로 한다 */}
        {quote && compareQuote ? (
          <View style={[s.card, s.listCard, s.compareCard]}>
            <Text style={s.productName}>{t('transfer.compare.title', { product: productLabel(compareQuote.product) })}</Text>
            {compareQuote.available ? (
              <>
                {compareReceive ? (
                  <View style={s.row}>
                    <Text style={s.itemLabel}>
                      {t('transfer.receive')}
                      {compareReceive.reference ? t('transfer.referenceSuffix') : ''}
                    </Text>
                    <Text style={[s.itemValueStrong, s.noShrink]}>{compareReceive.text}</Text>
                  </View>
                ) : null}
                {feeText(compareQuote) ? (
                  <View style={s.row}>
                    <Text style={s.itemLabel}>{t('transfer.fee')}</Text>
                    <Text style={s.itemValue}>{feeText(compareQuote)}</Text>
                  </View>
                ) : null}
                {compareQuote.totalWithdrawKrw != null ? (
                  <View style={s.row}>
                    <Text style={s.itemLabel}>{t('transfer.totalWithdraw')}</Text>
                    <Text style={s.itemValue}>{t('money.won', { amount: fmtNumber(compareQuote.totalWithdrawKrw) })}</Text>
                  </View>
                ) : null}
                {deliveryText(compareQuote.deliveryType) ? (
                  <View style={s.row}>
                    <Text style={s.itemLabel}>{t('transfer.compare.delivery')}</Text>
                    <Text style={s.itemValue}>{deliveryText(compareQuote.deliveryType)}</Text>
                  </View>
                ) : null}
              </>
            ) : (
              <Text style={s.itemLabel}>{quoteUnavailableText(compareQuote)}</Text>
            )}
            <Text style={s.compareNote}>
              {t('transfer.compare.note', { product: productLabel(quote.defaultProduct) })}
            </Text>
          </View>
        ) : null}
      </View>

      {/* 출금 계좌 */}
      <View style={s.section}>
        <Text style={s.sectionLabel}>{t('transfer.account')}</Text>
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
        <Text style={s.sectionLabel}>{t('transfer.foreignerCheck')}</Text>
        <View style={[s.card, s.listCard]}>
          <View style={s.row}>
            <Text style={s.itemLabel}>{t('transfer.fxBank')}</Text>
            <View style={s.bankBadge}>
              <Ionicons name="checkmark" size={12} color={colors.primary} />
              <Text style={s.bankBadgeText}>{t('transfer.designatedBank')}</Text>
            </View>
          </View>
          <View style={s.row}>
            <Text style={s.itemLabel}>{t('transfer.purpose')}</Text>
            <Text style={s.itemValueStrong}>{purpose.label}</Text>
          </View>
          <View style={s.row}>
            <Text style={s.itemLabel}>{t('transfer.yearly')}</Text>
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
  // gap·flexShrink: 영어처럼 긴 문구가 카드 밖으로 밀리지 않고 줄바꿈되게 (짧으면 모양 그대로)
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: spacing.md },
  subText: { ...typography.body, color: colors.text.sub },

  // gap: 원보다 넓은 나라 배지(Philippines)와 옆 글자 사이가 붙지 않게 spacing.lg
  recipientLeft: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.lg },
  flagCircle: {
    width: 48,
    height: 48,
    borderRadius: radius.full,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  flagText: { ...typography.h3, fontFamily: fonts.medium, color: colors.primary },
  // 나라 배지 자리: 원(48) 아래쪽에 걸치고, 원보다 넓은 이름(Philippines·United States)도 원 가운데 기준으로 양쪽에 퍼지게
  // 원보다 넓은 투명 칸을 겹쳐 두고 그 안에서 가운데 정렬한다. 원 칸 폭은 48 그대로라 이름 줄이 밀리지 않는다
  countryBadgeWrap: {
    position: 'absolute',
    top: 48 - spacing.sm,
    left: -spacing.xxl,
    right: -spacing.xxl,
    alignItems: 'center',
  },
  // Figma 는 파란 배경에 검은 글자라 읽기 어려워서 primaryLight 배경 + primary 글자로 둠 (확인 필요).
  // 원에 걸쳐도 비치지 않게 불투명 배경, 흰 테두리로 원과 나눈다
  countryBadge: {
    backgroundColor: colors.primaryLight,
    borderRadius: radius.full,
    borderWidth: 2,
    borderColor: colors.surface,
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
  itemLabel: { ...typography.body, color: colors.text.sub, flexShrink: 1 },
  itemLabelStrong: { ...typography.body, fontFamily: fonts.bold, color: colors.text.strong, flexShrink: 1 },
  itemValue: { ...typography.body, color: colors.text.strong, flexShrink: 1, textAlign: 'right' },
  itemValueStrong: { ...typography.body, fontFamily: fonts.bold, color: colors.text.strong, flexShrink: 1, textAlign: 'right' },
  receiveValue: { ...typography.h3, color: colors.primary, flexShrink: 0 },
  divider: { height: 1, backgroundColor: colors.background },
  detail: { gap: spacing.sm, paddingTop: spacing.xs },
  detailToggle: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: spacing.xs },
  detailToggleText: { ...typography.badge, fontFamily: fonts.bold, color: colors.primary },
  noticeText: { ...typography.badge, color: colors.text.sub, paddingHorizontal: spacing.xs },
  productName: { ...typography.badge, fontFamily: fonts.bold, color: colors.primary },
  compareCard: { marginTop: spacing.sm },
  noShrink: { flexShrink: 0 }, // 금액은 한 줄로 두고 긴 라벨(영어)이 대신 줄바꿈되게
  compareNote: { ...typography.badge, color: colors.text.sub },
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
    flexShrink: 0,
  },
  bankBadgeText: { ...typography.badge, fontFamily: fonts.bold, color: colors.primary },
  limitValue: { ...typography.body, fontFamily: fonts.bold, color: colors.primary, flexShrink: 0 },
  progressTrack: { height: 8, borderRadius: radius.full, backgroundColor: colors.background, overflow: 'hidden' },
  progressFill: { height: 8, borderRadius: radius.full, backgroundColor: colors.primary },
});
