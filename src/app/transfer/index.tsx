import { useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  StyleSheet,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { colors, typography, spacing, radius, fonts } from '../../constants/theme';
import { useTransferStore } from '../../store/transferStore';
import {
  MOCK_RECIPIENT,
  MOCK_ACCOUNT,
  RATE,
  calcVND,
  fmtKRW,
} from '../../api/mock/transfer';

function preparingAlert() {
  Alert.alert('준비 중', '곧 사용할 수 있어요.');
}

export default function TransferScreen() {
  const { initialAmountKRW, setConfirmedAmount } = useTransferStore();

  const [amountStr, setAmountStr] = useState<string>(
    initialAmountKRW !== null ? String(initialAmountKRW) : '',
  );
  const inputRef = useRef<{ focus: () => void }>(null);

  const amount = parseInt(amountStr) || 0;
  const vnd = amount > 0 ? calcVND(amount) : 0;

  const handleChange = (t: string) => {
    const digits = t.replace(/[^0-9]/g, '').slice(0, 9);
    setAmountStr(digits);
  };

  const addAmount = (n: number) => {
    const next = Math.min(amount + n, MOCK_ACCOUNT.balance);
    setAmountStr(String(next));
  };

  const handleClose = () => {
    useTransferStore.getState().reset();
    router.replace('/(tabs)/chat' as any);
  };

  const handleSubmit = () => {
    setConfirmedAmount(amount);
    router.replace('/transfer/complete' as any);
  };

  return (
    <SafeAreaView style={s.safe} edges={['top', 'bottom']}>
      <View style={s.header}>
        <Pressable onPress={() => router.back()} style={s.headerBtn} hitSlop={8}>
          <Ionicons name="arrow-back" size={22} color={colors.text.strong} />
        </Pressable>
        <Text style={s.headerTitle}>해외송금</Text>
        <View style={s.headerRight}>
          <Pressable onPress={handleClose} style={s.headerBtn} hitSlop={8}>
            <Ionicons name="close" size={22} color={colors.text.strong} />
          </Pressable>
          <View style={s.avatar}>
            <Ionicons name="person" size={14} color={colors.text.inverse} />
          </View>
        </View>
      </View>

      <ScrollView
        style={s.scroll}
        contentContainerStyle={s.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* 받는 분 */}
        <View>
          <View style={s.sectionHead}>
            <Text style={s.sectionLabel}>받는 분 (해외)</Text>
            <Pressable onPress={preparingAlert}>
              <Text style={s.sectionLink}>최근/즐겨찾기 &gt;</Text>
            </Pressable>
          </View>
          <View style={s.recipientCard}>
            <View style={s.flagCircle}>
              <Text style={s.flagText}>{MOCK_RECIPIENT.countryCode}</Text>
            </View>
            <View style={s.recipientInfo}>
              <Text style={s.recipientName}>
                {MOCK_RECIPIENT.name} ({MOCK_RECIPIENT.relation})
              </Text>
              <Text style={s.recipientBank}>
                {MOCK_RECIPIENT.bank} ****{MOCK_RECIPIENT.accountLast4} · {MOCK_RECIPIENT.country}
              </Text>
            </View>
            <Pressable style={s.changeBtn} onPress={preparingAlert}>
              <Text style={s.changeBtnText}>변경</Text>
            </Pressable>
          </View>
        </View>

        {/* 보낼 금액 */}
        <View>
          <Text style={s.sectionLabel}>보낼 금액 (내 통장 출금, KRW)</Text>
          <View style={s.amountCard}>
            <Pressable
              style={s.amountRow}
              onPress={() => inputRef.current?.focus()}
            >
              <Text style={[s.amountNum, amount === 0 && s.amountDim]}>
                {fmtKRW(amount)}
              </Text>
              <Text style={s.amountUnit}> 원</Text>
              {amountStr.length > 0 && (
                <Pressable
                  onPress={() => setAmountStr('')}
                  style={s.backBtn}
                  hitSlop={8}
                >
                  <Ionicons name="backspace-outline" size={20} color={colors.text.sub} />
                </Pressable>
              )}
            </Pressable>
            <TextInput
              ref={inputRef as any}
              value={amountStr}
              onChangeText={handleChange}
              keyboardType="number-pad"
              style={s.hiddenInput}
            />
            <Text style={s.balanceText}>
              출금가능 잔액: {fmtKRW(MOCK_ACCOUNT.balance)}원
            </Text>
            <View style={s.quickRow}>
              {[100_000, 500_000, 1_000_000].map(n => (
                <Pressable key={n} style={s.quickBtn} onPress={() => addAmount(n)}>
                  <Text style={s.quickBtnText}>+{n / 10000}만</Text>
                </Pressable>
              ))}
              <Pressable
                style={s.quickBtn}
                onPress={() => setAmountStr(String(MOCK_ACCOUNT.balance))}
              >
                <Text style={s.quickBtnText}>전액</Text>
              </Pressable>
            </View>
          </View>
        </View>

        {/* 수취 예상 */}
        <View style={s.rateSection}>
          <View style={s.rateRow}>
            <Text style={s.rateLabel}>받는 분 수취 예상</Text>
            <Text style={[s.rateVND, amount === 0 && { color: colors.text.sub }]}>
              {amount > 0 ? `약 ${fmtKRW(vnd)} VND` : '—'}
            </Text>
          </View>
          <Text style={s.rateNote}>
            적용 환율 (시장 환율 참고값): {RATE.unit} VND = {RATE.krw} KRW
          </Text>
        </View>

        {/* 출금 계좌 */}
        <View>
          <Text style={s.sectionLabel}>출금 계좌</Text>
          <Pressable style={s.accountCard} onPress={preparingAlert}>
            <View style={{ flex: 1 }}>
              <Text style={s.accountName}>{MOCK_ACCOUNT.name}</Text>
              <Text style={s.accountNum}>{MOCK_ACCOUNT.number}</Text>
            </View>
            <Ionicons name="chevron-down" size={18} color={colors.text.sub} />
          </Pressable>
        </View>

        {/* 송금 목적 */}
        <Pressable style={s.purposeRow} onPress={preparingAlert}>
          <Text style={s.purposeLabel}>송금 목적</Text>
          <View style={s.purposeRight}>
            <Text style={s.purposeValue}>가족 생활비 (Family support)</Text>
            <Ionicons name="pencil-outline" size={14} color={colors.text.sub} />
          </View>
        </Pressable>
      </ScrollView>

      <View style={s.footer}>
        <Pressable
          style={[s.submitBtn, amount === 0 && s.submitBtnDisabled]}
          onPress={handleSubmit}
          disabled={amount === 0}
        >
          <Text style={s.submitBtnText}>
            {amount > 0 ? `${fmtKRW(amount)}원 해외송금하기 →` : '금액을 입력해 주세요'}
          </Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    paddingVertical: 10,
    backgroundColor: colors.surface,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  headerBtn: { padding: 4 },
  headerTitle: { flex: 1, ...typography.h3, color: colors.text.strong, marginLeft: spacing.sm },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: radius.full,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },

  scroll: { flex: 1 },
  content: { padding: spacing.xl, gap: spacing.lg, paddingBottom: spacing.xxl },

  sectionHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  sectionLabel: { ...typography.body, fontFamily: fonts.bold, color: colors.text.strong },
  sectionLink: { ...typography.badge, color: colors.primary },

  recipientCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.md,
  },
  flagCircle: {
    width: 40,
    height: 40,
    borderRadius: radius.full,
    backgroundColor: '#005df9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  flagText: { ...typography.badge, fontFamily: fonts.bold, color: colors.text.inverse },
  recipientInfo: { flex: 1, gap: 2 },
  recipientName: { ...typography.body, fontFamily: fonts.bold, color: colors.text.strong },
  recipientBank: { ...typography.badge, color: colors.text.sub },
  changeBtn: {
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border,
  },
  changeBtnText: { ...typography.badge, color: colors.text.strong },

  amountCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.xl,
    gap: spacing.md,
    marginTop: spacing.sm,
  },
  amountRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  amountNum: {
    fontSize: 34,
    fontFamily: fonts.bold,
    color: colors.primary,
    letterSpacing: -0.5,
  },
  amountDim: { color: colors.text.sub },
  amountUnit: {
    fontSize: 20,
    fontFamily: fonts.bold,
    color: colors.text.strong,
  },
  backBtn: { marginLeft: spacing.sm },
  hiddenInput: { height: 1, width: 1, opacity: 0, position: 'absolute' },
  balanceText: { ...typography.badge, color: colors.text.sub },
  quickRow: { flexDirection: 'row', gap: spacing.sm },
  quickBtn: {
    flex: 1,
    paddingVertical: 8,
    backgroundColor: colors.background,
    borderRadius: radius.md,
    alignItems: 'center',
  },
  quickBtnText: { ...typography.badge, fontFamily: fonts.bold, color: colors.text.strong },

  rateSection: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: 6,
  },
  rateRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  rateLabel: { ...typography.body, color: colors.text.sub },
  rateVND: { ...typography.subtitle, fontFamily: fonts.bold, color: colors.primary },
  rateNote: { ...typography.badge, color: colors.text.sub },

  accountCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  accountName: { ...typography.body, fontFamily: fonts.bold, color: colors.text.strong },
  accountNum: { ...typography.badge, color: colors.text.sub },

  purposeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.lg,
    paddingVertical: 14,
  },
  purposeLabel: { ...typography.body, color: colors.text.sub },
  purposeRight: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  purposeValue: { ...typography.body, fontFamily: fonts.bold, color: colors.text.strong },

  footer: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    backgroundColor: colors.background,
  },
  submitBtn: {
    backgroundColor: colors.primary,
    borderRadius: radius.lg,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitBtnDisabled: { backgroundColor: colors.disabled },
  submitBtnText: { ...typography.button, color: colors.text.inverse },
});
