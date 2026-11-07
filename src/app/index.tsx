// 앱 진입점. 매번 entry → users/me 를 불러 토큰을 갱신하고 이동할 화면을 결정한다.
//   - 온보딩 미완료 → currentStep 에 해당하는 온보딩 화면
//   - 온보딩 완료  → /home

import { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator, StyleSheet, Pressable } from 'react-native';
import { router } from 'expo-router';
import { entry } from '../api/auth';
import { getMe } from '../api/user';
import { useAuthStore } from '../store/authStore';
import { getRouteFromStepCode } from '../constants/onboardingSteps';
import { ENTRY_TOKEN } from '../api/config';
import { colors, typography, spacing } from '../constants/theme';
import type { ApiError } from '../types/api';

type Status = 'loading' | 'error';

export default function IndexScreen() {
  const [status, setStatus] = useState<Status>('loading');
  const [errorMsg, setErrorMsg] = useState('');
  const setToken = useAuthStore((s) => s.setToken);

  const start = async () => {
    setStatus('loading');
    try {
      // 1) SOL 진입 토큰으로 JWT 발급
      const entryRes = await entry(ENTRY_TOKEN);
      setToken(entryRes.accessToken);

      // 2) 내 정보로 온보딩 진행 상황 확인
      const me = await getMe();

      if (me.onboarding.completed) {
        router.replace('/home');
      } else {
        const target = me.onboarding.currentStep
          ? getRouteFromStepCode(me.onboarding.currentStep)
          : '/onboarding/language';
        router.replace(target as any);
      }
    } catch (e) {
      const err = e as ApiError;
      setErrorMsg(err.message ?? '앱을 시작할 수 없어요. 잠시 후 다시 시도해 주세요.');
      setStatus('error');
    }
  };

  useEffect(() => { start(); }, []);

  if (status === 'loading') {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.center}>
      <Text style={styles.errorText}>{errorMsg}</Text>
      <Pressable style={styles.retryBtn} onPress={start}>
        <Text style={styles.retryLabel}>다시 시도</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  errorText: {
    ...typography.body,
    color: colors.text.sub,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  retryBtn: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xxl,
    backgroundColor: colors.primary,
    borderRadius: 8,
  },
  retryLabel: {
    ...typography.button,
    color: colors.text.inverse,
  },
});
