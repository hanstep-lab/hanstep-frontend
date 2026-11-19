import { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet, Linking, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect, useIsFocused, type Href } from 'expo-router';
import { CameraView, useCameraPermissions } from 'expo-camera';
import Header from '../../components/Header';
import { useOnboardingStore } from '../../store/onboardingStore';
import { resizeForUpload } from '../../utils/image';
import { uploadIdCard } from '../../api/document';
import { colors, typography, spacing, radius, fonts, shadow } from '../../constants/theme';
import { errorText } from '../../utils/errorText';
import OnboardingProgress from '../../components/OnboardingProgress';
import { TOTAL_STAGES, stageOf } from '../../constants/onboardingSteps';
import { ocrTimeMark, ocrTimeStart } from '../../utils/ocrTiming';

// "직접 정보 입력하기" 버튼. 사진 없이 체류 정보를 저장하는 화면(id-manual, PUT /visa/profile)으로 간다
const SHOW_MANUAL_ENTRY = true;

function CornerGuide({ pos }: { pos: 'tl' | 'tr' | 'bl' | 'br' }) {
  const isLeft = pos === 'tl' || pos === 'bl';
  const isTop  = pos === 'tl' || pos === 'tr';

  return (
    <View
      style={[
        styles.corner,
        isTop  ? { top: 8 }  : { bottom: 8 },
        isLeft ? { left: 8 } : { right: 8 },
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
  const capturingRef = useRef(false); // 두 번 눌림 즉시 잠금
  const [isCameraReady, setIsCameraReady] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);
  const setIdCardFrontUri = useOnboardingStore((s) => s.setIdCardFrontUri);
  const setIdDocumentId = useOnboardingStore((s) => s.setIdDocumentId);

  const canCapture = hasPermission && isCameraReady && !isCapturing;

  const isFocused = useIsFocused();
  const [torchOn, setTorchOn] = useState(false);

  // 화면이 가려질 때: 플래시 끄고, 카메라 준비 상태 초기화(돌아오면 다시 onCameraReady를 기다림)
  useFocusEffect(
    useCallback(() => {
      return () => {
        setTorchOn(false);
        setIsCameraReady(false);
      };
    }, []),
  );

  const handleCapture = async () => {
    if (!cameraRef.current || capturingRef.current) return;
    capturingRef.current = true;
    setIsCapturing(true);
    let uploading = false; // 어느 단계에서 실패했는지 구분해 안내 문구를 다르게
    try {
      ocrTimeStart('촬영 버튼');
      const photo = await cameraRef.current.takePictureAsync();
      ocrTimeMark(`촬영 ${photo.width}x${photo.height}`);
      const resized = await resizeForUpload(photo);
      ocrTimeMark(`리사이즈 ${resized.width}x${resized.height}`);
      setIdCardFrontUri(resized.uri);

      uploading = true;
      const doc = await uploadIdCard(resized.uri); // 저장 + OCR 작업 등록. 결과는 확인 화면에서 기다림
      ocrTimeMark(`업로드 응답 ${doc.status}/${doc.ocrJob?.status ?? '-'}`);
      setIdDocumentId(doc.documentId);
      router.push('/onboarding/id-confirm' as Href);
    } catch (e) {
      console.warn('[ON-002] 촬영·업로드 실패', e);
      if (uploading) {
        Alert.alert('사진을 보내지 못했어요', errorText(e, '잠시 후 다시 시도해 주세요.'));
      } else {
        Alert.alert('촬영하지 못했어요', '잠시 후 다시 시도해 주세요.');
      }
    } finally {
      capturingRef.current = false;
      setIsCapturing(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <Header title="외국인등록증 촬영" showBack />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.progressWrap}>
          <OnboardingProgress current={stageOf('ID_DOCUMENT')} total={TOTAL_STAGES} sub="등록증 촬영" />
        </View>

        <View style={styles.row}>
          <Pressable
            style={[styles.chip, !hasPermission && styles.chipDisabled]}
            onPress={() => setTorchOn((on) => !on)}
            disabled={!hasPermission}
          >
            <Ionicons name={torchOn ? 'flash' : 'flash-off'} size={16} color={colors.text.strong} />
            <Text style={styles.chipText}>{torchOn ? '플래시 켜짐' : '플래시 꺼짐'}</Text>
          </Pressable>
        </View>

        <View style={styles.px}>
          <View style={styles.infoCard}>
            <View style={styles.infoCardTop}>
              <Text style={styles.infoCardTitle}>외국인등록증 앞면 인식</Text>
            </View>
            <Text style={styles.infoCardDesc}>
              {'빛 반사에 유의하여 카드를 어두운 배경에 올려놓고\n사각형 가이드라인에 맞춰주세요.'}
            </Text>
          </View>
        </View>

        <View style={styles.viewfinderWrap}>
          <View style={styles.viewfinder}>
            {hasPermission ? (
              <>
                {isFocused && (
                  <CameraView
                    ref={cameraRef}
                    style={StyleSheet.absoluteFill}
                    facing="back"
                    enableTorch={torchOn}
                    onCameraReady={() => setIsCameraReady(true)}
                  />
                )}
                <CornerGuide pos="tl" />
                <CornerGuide pos="tr" />
                <CornerGuide pos="bl" />
                <CornerGuide pos="br" />
              </>
            ) : permission ? (
              <View style={styles.permissionBox}>
                <Ionicons name="camera-outline" size={28} color={colors.text.inverse} />
                <Text style={styles.permissionTitle}>카메라 권한이 필요해요</Text>
                <Text style={styles.permissionDesc}>등록증을 촬영하려면 카메라 접근을 허용해 주세요.</Text>
                <Pressable style={styles.permissionBtn} onPress={handlePermissionPress}>
                  <Text style={styles.permissionBtnText}>
                    {permission.canAskAgain ? '권한 다시 요청하기' : '설정에서 권한 허용하기'}
                  </Text>
                </Pressable>
              </View>
            ) : null}
          </View>
        </View>

        <View style={[styles.row, { justifyContent: 'center' }]}>
          <View style={styles.hintChip}>
            <Text style={styles.hintChipText}>가이드라인에 맞춘 뒤 촬영 버튼을 눌러 주세요</Text>
          </View>
        </View>

        <View style={[styles.px, styles.tipRow]}>
          {[
            { title: '조명 조절', sub: '빛 반사 피하기' },
            { title: '수평 유지', sub: '프레임 채우기' },
          ].map((t) => (
            <View key={t.title} style={styles.tipCard}>
              <Text style={styles.tipTitle}>{t.title}</Text>
              <Text style={styles.tipSub}>{t.sub}</Text>
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
                  {isCapturing ? (
                    <ActivityIndicator color={colors.primary} />
                  ) : (
                    <Ionicons name="camera" size={24} color={colors.primary} />
                  )}
                </View>
              </View>
            </View>
          </Pressable>

          {SHOW_MANUAL_ENTRY && (
            <View style={styles.manualWrap}>
              <Text style={styles.manualHint}>인식이 잘 되지 않나요?</Text>
              <Pressable style={styles.manualBtn} onPress={goToManual}>
                <Text style={styles.manualBtnText}>직접 정보 입력하기</Text>
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

  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.background,
    paddingHorizontal: 14,
    paddingVertical: spacing.xs,
    borderRadius: radius.full,
  },
  chipDisabled: { opacity: 0.4 },
  chipText: { ...typography.body, fontFamily: fonts.bold, color: colors.text.strong },

  infoCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: 14,
    gap: spacing.xs,
    ...shadow.card,
  },
  infoCardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  infoCardTitle: { ...typography.h3, color: colors.text.strong },
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
  },
  hintChipText: { ...typography.body, fontFamily: fonts.bold, color: colors.text.strong },

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
