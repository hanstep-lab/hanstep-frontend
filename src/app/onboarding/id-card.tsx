import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View, Text, Pressable, ScrollView, StyleSheet, Linking, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect, useIsFocused, type Href } from 'expo-router';
import { CameraView, useCameraPermissions } from 'expo-camera';
import Header from '../../components/Header';
import { useOnboardingStore } from '../../store/onboardingStore';
import { prepareIdCardPhoto } from '../../utils/image';
import { uploadIdCard } from '../../api/document';
import { colors, typography, spacing, radius, fonts, shadow } from '../../constants/theme';
import { errorText } from '../../utils/errorText';
import OnboardingProgress from '../../components/OnboardingProgress';
import { TOTAL_STAGES, stageOf } from '../../constants/onboardingSteps';
import { ocrTimeMark, ocrTimeStart } from '../../utils/ocrTiming';
import { useIdDocument } from '../../hooks/useIdDocument';
import { ocrFailureGuide } from '../../constants/ocrFailure';
import type { ApiError } from '../../types/api';

// "직접 정보 입력하기" 버튼. 사진 없이 체류 정보를 저장하는 화면(id-manual, PUT /visa/profile)으로 간다
const SHOW_MANUAL_ENTRY = true;

// 미리보기 상자 가장자리 ~ 가이드 모서리 거리(px). 촬영 후 이 틀 영역만 잘라 올린다
const GUIDE_INSET = 8;

function CornerGuide({ pos }: { pos: 'tl' | 'tr' | 'bl' | 'br' }) {
  const isLeft = pos === 'tl' || pos === 'bl';
  const isTop  = pos === 'tl' || pos === 'tr';

  return (
    <View
      style={[
        styles.corner,
        isTop  ? { top: GUIDE_INSET }  : { bottom: GUIDE_INSET },
        isLeft ? { left: GUIDE_INSET } : { right: GUIDE_INSET },
        !isLeft && { alignItems: 'flex-end' },
      ]}
    >
      {isTop  && <View style={styles.cornerH} />}
      <View style={styles.cornerV} />
      {!isTop && <View style={styles.cornerH} />}
    </View>
  );
}

export default function IdCardScreen() {
  const { t } = useTranslation();
  const goToManual = () => router.push('/onboarding/id-manual' as Href);

  const [permission, requestPermission] = useCameraPermissions();
  const hasPermission = permission?.granted === true;

  // 처음 들어왔을 때(아직 한 번도 안 물어봄)만 OS 팝업을 자동으로 띄움
  useEffect(() => {
    if (permission?.status === 'undetermined') {
      requestPermission();
    }
  }, [permission?.status, requestPermission]);

  const handlePermissionPress = () => {
    if (permission?.canAskAgain) {
      requestPermission();
    } else {
      Linking.openSettings(); // 다시 묻기가 막힌 경우 설정 앱으로
    }
  };

  const cameraRef = useRef<CameraView>(null);
  const viewSize = useRef({ width: 0, height: 0 }); // 미리보기 상자 크기. 자를 영역 계산에 쓴다 (다시 그릴 필요 없어 ref)
  const capturingRef = useRef(false); // 두 번 눌림 즉시 잠금
  const [isCameraReady, setIsCameraReady] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);
  const setIdCardFrontUri = useOnboardingStore((s) => s.setIdCardFrontUri);
  const setIdDocumentId = useOnboardingStore((s) => s.setIdDocumentId);

  // 찍은 장면에서 미리보기를 멈춘 상태. OCR 이 끝나 다음 화면으로 가거나, 실패해서 다시 찍을 때까지 유지
  const [frozen, setFrozen] = useState(false);
  // 이 화면에서 OCR 결과를 기다리는 문서. 결과가 오면 확인 화면으로 넘어간다 (확인 화면도 같은 훅이라 바로 결과를 보여 줌)
  const [waitingDocId, setWaitingDocId] = useState<number | null>(null);
  const { phase: ocrPhase, error: ocrError, failureCode, retry: retryOcrWait } = useIdDocument(waitingDocId);
  const ocrFailed = waitingDocId != null && ocrPhase === 'ocrFailed'; // OCR 실패 → 코드별 안내 + 다시 찍기
  const loadFailed = waitingDocId != null && ocrPhase === 'loadFailed'; // 조회 실패 → 다시 시도(같은 문서 재조회)
  const ocrTimeout = waitingDocId != null && ocrPhase === 'timeout';
  const failureGuide = ocrFailureGuide(failureCode);

  const canCapture = hasPermission && isCameraReady && !isCapturing && !frozen;

  const isFocused = useIsFocused();

  // 화면이 가려질 때: 카메라 준비 상태 초기화(돌아오면 다시 onCameraReady를 기다림)
  // 멈춤 상태도 풀어서, 돌아오면(뒤로가기·확인 화면의 '다시 촬영') 살아 있는 카메라로 시작한다
  useFocusEffect(
    useCallback(() => {
      return () => {
        setIsCameraReady(false);
        setFrozen(false);
        setWaitingDocId(null);
      };
    }, []),
  );

  // 멈춘 미리보기를 다시 움직인다 (다시 촬영·업로드 실패)
  const unfreeze = () => {
    setFrozen(false);
    setWaitingDocId(null);
    cameraRef.current?.resumePreview().catch(() => {});
  };

  // OCR 결과가 오면 확인 화면으로. 한 문서에 한 번만 이동
  const movedDocId = useRef<number | null>(null);
  useEffect(() => {
    if (waitingDocId == null || ocrPhase !== 'ready' || movedDocId.current === waitingDocId) return;
    movedDocId.current = waitingDocId;
    router.push('/onboarding/id-confirm' as Href);
  }, [waitingDocId, ocrPhase]);

  const handleCapture = async () => {
    if (!cameraRef.current || capturingRef.current) return;
    capturingRef.current = true;
    setIsCapturing(true);
    let uploading = false; // 어느 단계에서 실패했는지 구분해 안내 문구를 다르게
    let uploadStartedAt = 0;
    let retried = false; // 응답 없이 끊겨 1번 다시 보냈는지 (uploadIdCard 가 알려 줌)
    try {
      ocrTimeStart('촬영 버튼');
      const photo = await cameraRef.current.takePictureAsync();
      ocrTimeMark(`촬영 ${photo.width}x${photo.height}`);
      // 찍은 장면에서 미리보기를 멈춘다(촬영이 끝난 뒤에 멈춰야 한다: 멈춘 상태에서는 촬영하지 말 것, expo-camera 문서)
      setFrozen(true);
      cameraRef.current?.pausePreview().catch(() => {});
      const resized = await prepareIdCardPhoto(photo, {
        viewWidth: viewSize.current.width,
        viewHeight: viewSize.current.height,
        inset: GUIDE_INSET,
      });
      ocrTimeMark(`자르기·리사이즈 ${resized.width}x${resized.height}`);
      setIdCardFrontUri(resized.uri);

      uploading = true;
      uploadStartedAt = Date.now();
      // 저장 + OCR 작업 등록. 결과는 이 화면에서 멈춘 사진 위로 기다림
      const doc = await uploadIdCard(resized.uri, { onRetry: () => { retried = true; } });
      ocrTimeMark(`업로드 응답 ${doc.status}/${doc.ocrJob?.status ?? '-'}`);
      setIdDocumentId(doc.documentId);
      setWaitingDocId(doc.documentId);
    } catch (e) {
      unfreeze(); // 실패하면 멈춘 미리보기를 풀어 다시 찍을 수 있게
      if (uploading) {
        // 원인 구분용 한 줄(TIMEOUT·NETWORK·서버 code). 토큰·사진 경로는 남기지 않는다.
        // message 는 응답이 없으면 axios 원래 문구(Network Error·timeout of 30000ms exceeded), 있으면 서버 message
        const err = e as Partial<ApiError> | null;
        console.warn(
          `[ON-002] 업로드 실패 code=${err?.code ?? '-'} message=${err?.message ?? '-'}` +
            ` elapsedMs=${Date.now() - uploadStartedAt} retried=${retried}`,
        );
        Alert.alert(t('onboarding.idCard.uploadFailed'), errorText(e, t('common.retryLater')));
      } else {
        console.warn('[ON-002] 촬영 실패', e);
        Alert.alert(t('onboarding.idCard.captureFailed'), t('common.retryLater'));
      }
    } finally {
      capturingRef.current = false;
      setIsCapturing(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <Header title={t('onboarding.idCard.header')} showBack />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.progressWrap}>
          <OnboardingProgress current={stageOf('ID_DOCUMENT')} total={TOTAL_STAGES} sub="idCapture" />
        </View>

        <View style={styles.px}>
          <View style={styles.infoCard}>
            <View style={styles.infoCardTop}>
              <Text style={styles.infoCardTitle}>{t('onboarding.idCard.infoTitle')}</Text>
            </View>
            <Text style={styles.infoCardDesc}>
              {t('onboarding.idCard.infoDesc')}
            </Text>
          </View>
        </View>

        <View style={styles.viewfinderWrap}>
          <View
            style={styles.viewfinder}
            onLayout={(e) => {
              const { width, height } = e.nativeEvent.layout;
              viewSize.current = { width, height };
            }}
          >
            {hasPermission ? (
              <>
                {isFocused && (
                  <CameraView
                    ref={cameraRef}
                    style={StyleSheet.absoluteFill}
                    facing="back"
                    onCameraReady={() => setIsCameraReady(true)}
                  />
                )}
                <CornerGuide pos="tl" />
                <CornerGuide pos="tr" />
                <CornerGuide pos="bl" />
                <CornerGuide pos="br" />
                {frozen && (
                  <View style={styles.scanOverlay}>
                    {ocrFailed || loadFailed || ocrTimeout ? (
                      <>
                        <Text style={styles.scanTitle}>
                          {ocrFailed
                            ? t(`onboarding.ocrFailure.${failureGuide}.title`)
                            : loadFailed
                              ? t('onboarding.ocrFailure.loadFailedTitle')
                              : t('onboarding.idCard.slow')}
                        </Text>
                        <Text style={styles.scanDesc}>
                          {ocrFailed
                            ? t(`onboarding.ocrFailure.${failureGuide}.desc`)
                            : loadFailed
                              ? ocrError
                              : t('onboarding.idCard.slowDesc')}
                        </Text>
                        <View style={styles.scanBtnRow}>
                          {ocrTimeout && (
                            <Pressable style={styles.scanBtn} onPress={retryOcrWait}>
                              <Text style={styles.scanBtnText}>{t('onboarding.idCard.keepWaiting')}</Text>
                            </Pressable>
                          )}
                          {loadFailed && (
                            <Pressable style={styles.scanBtn} onPress={retryOcrWait}>
                              <Text style={styles.scanBtnText}>{t('onboarding.ocrFailure.retryButton')}</Text>
                            </Pressable>
                          )}
                          <Pressable style={styles.scanBtn} onPress={unfreeze}>
                            <Text style={styles.scanBtnText}>
                              {ocrFailed ? t('onboarding.ocrFailure.retakeButton') : t('common.retake')}
                            </Text>
                          </Pressable>
                        </View>
                      </>
                    ) : (
                      <>
                        <ActivityIndicator color={colors.text.inverse} />
                        <Text style={styles.scanTitle}>{t('onboarding.idCard.recognizing')}</Text>
                        <Text style={styles.scanDesc}>{t('onboarding.idCard.mayTake')}</Text>
                      </>
                    )}
                  </View>
                )}
              </>
            ) : permission ? (
              <View style={styles.permissionBox}>
                <Ionicons name="camera-outline" size={28} color={colors.text.inverse} />
                <Text style={styles.permissionTitle}>{t('onboarding.idCard.permissionTitle')}</Text>
                <Text style={styles.permissionDesc}>{t('onboarding.idCard.permissionDesc')}</Text>
                <Pressable style={styles.permissionBtn} onPress={handlePermissionPress}>
                  <Text style={styles.permissionBtnText}>
                    {permission.canAskAgain ? t('onboarding.idCard.permissionAskAgain') : t('onboarding.idCard.permissionSettings')}
                  </Text>
                </Pressable>
              </View>
            ) : null}
          </View>
        </View>

        <View style={[styles.row, { justifyContent: 'center' }]}>
          <View style={styles.hintChip}>
            <Text style={styles.hintChipText}>
              {frozen ? t('onboarding.idCard.hintFrozen') : t('onboarding.idCard.hintIdle')}
            </Text>
          </View>
        </View>

        <View style={[styles.px, styles.tipRow]}>
          {[
            { title: t('onboarding.idCard.tipLightTitle'), sub: t('onboarding.idCard.tipLightSub') },
            { title: t('onboarding.idCard.tipLevelTitle'), sub: t('onboarding.idCard.tipLevelSub') },
          ].map((tip) => (
            <View key={tip.title} style={styles.tipCard}>
              <Text style={styles.tipTitle}>{tip.title}</Text>
              <Text style={styles.tipSub}>{tip.sub}</Text>
            </View>
          ))}
        </View>

        <View style={styles.captureSection}>
          <Pressable
            onPress={handleCapture}
            disabled={!canCapture}
            style={[styles.captureBtn, !canCapture && styles.captureDisabled]}
          >
            <View style={styles.captureOuter}>
              <View style={styles.captureInner}>
                <View style={styles.captureCenter}>
                  {/* 진행 상태는 사진 영역의 안내(스피너·문구)가 보여 주므로 버튼은 아이콘만. 누를 수 없을 땐 흐리게 */}
                  <Ionicons name="camera" size={24} color={colors.primary} />
                </View>
              </View>
            </View>
          </Pressable>

          {SHOW_MANUAL_ENTRY && (
            <View style={styles.manualWrap}>
              <Text style={styles.manualHint}>{t('onboarding.idCard.manualHint')}</Text>
              <Pressable style={styles.manualBtn} onPress={goToManual}>
                <Text style={styles.manualBtnText}>{t('onboarding.idCard.manualButton')}</Text>
                <Ionicons name="chevron-forward" size={12} color={colors.primary} />
              </Pressable>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  content: { paddingBottom: spacing.xl, gap: spacing.sm },
  px: { paddingHorizontal: spacing.xl },
  progressWrap: { paddingHorizontal: spacing.xl, paddingTop: spacing.md },
  row: { flexDirection: 'row', paddingHorizontal: spacing.xl, paddingVertical: spacing.sm },


  infoCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: 14,
    gap: spacing.xs,
    ...shadow.card,
  },
  infoCardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  infoCardTitle: { ...typography.h3, color: colors.text.strong, flexShrink: 1 },
  infoCardDesc: { ...typography.body, color: colors.text.sub },

  viewfinderWrap: { paddingHorizontal: spacing.xl, alignItems: 'center' },
  viewfinder: {
    width: '100%',
    maxWidth: 340,
    aspectRatio: 340 / 215,
    backgroundColor: colors.idCard.bg,
    borderRadius: radius.lg,
    overflow: 'hidden',
  },
  corner: { position: 'absolute' },
  cornerH: { width: 24, height: 4, backgroundColor: colors.primary, borderRadius: radius.full },
  cornerV: { width: 4, height: 20, backgroundColor: colors.primary, borderRadius: radius.full },

  // 멈춘 사진 위 안내 (인식 중·실패·시간 초과)
  scanOverlay: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    padding: spacing.lg,
  },
  scanTitle: { ...typography.title, color: colors.text.inverse, textAlign: 'center' },
  scanDesc: { ...typography.badge, color: colors.onColor.sub, textAlign: 'center' },
  scanBtnRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.xs },
  scanBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xs,
    borderRadius: radius.full,
    flexShrink: 1,
  },
  scanBtnText: { ...typography.body, fontFamily: fonts.bold, color: colors.text.inverse, textAlign: 'center' },

  permissionBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    padding: spacing.lg,
  },
  permissionTitle: { ...typography.title, color: colors.text.inverse },
  permissionDesc: { ...typography.badge, color: colors.onColor.sub, textAlign: 'center' },
  permissionBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
  },
  permissionBtnText: { ...typography.body, fontFamily: fonts.bold, color: colors.text.inverse },

  hintChip: {
    backgroundColor: colors.background,
    paddingHorizontal: 14,
    paddingVertical: spacing.xs,
    borderRadius: radius.full,
    flexShrink: 1, // 영어 안내가 길면 줄바꿈
  },
  hintChipText: { ...typography.body, fontFamily: fonts.bold, color: colors.text.strong, textAlign: 'center' },

  tipRow: { flexDirection: 'row', gap: spacing.sm },
  tipCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.sm,
    gap: 2,
    ...shadow.card,
  },
  tipTitle: { ...typography.badge, fontFamily: fonts.bold, color: colors.text.strong },
  tipSub: { ...typography.badge, color: colors.text.sub },

  captureSection: { alignItems: 'center', gap: 14, paddingTop: spacing.sm },
  captureBtn: { width: 80, height: 80 },
  captureDisabled: { opacity: 0.4 },
  captureOuter: {
    flex: 1,
    padding: 4,
    backgroundColor: colors.background,
    borderRadius: radius.full,
  },
  captureInner: {
    flex: 1,
    backgroundColor: colors.primary,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  captureCenter: {
    width: 56,
    height: 56,
    backgroundColor: colors.surface,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },

  manualWrap: { alignItems: 'center', gap: spacing.xs },
  manualHint: { ...typography.badge, color: colors.text.sub },
  manualBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.background,
    paddingHorizontal: 14,
    paddingVertical: spacing.xs,
    borderRadius: radius.full,
  },
  manualBtnText: { ...typography.body, fontFamily: fonts.bold, color: colors.primary },
});
