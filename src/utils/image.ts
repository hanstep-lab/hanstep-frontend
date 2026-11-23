// 업로드 전 등록증 사진 정리: 가이드 틀 영역만 잘라 내고 → 긴 변을 줄여 JPEG 로 저장 (원본은 지움).
// 배경(손·책상)이 빠져 OCR 이 읽을 면적이 줄고, 등록증 밖 내용이 서버에 올라가지 않는다.
// 크기 규칙: 앱 긴 변(MAX_LONG_SIDE) ≥ 서버 Worker 축소 크기(OCR_MAX_SIDE, 11/23 기준 1280px). Worker 값을 바꾸면 여기도 같이 맞춘다.
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import { File } from 'expo-file-system';

const MAX_LONG_SIDE = 1280; // 긴 변 최대. Worker 크기보다 작아지면 안 된다
const JPEG_QUALITY = 0.8; // 0~1. 1 = 압축 없음
const CROP_MARGIN = 0.05; // 가이드 틀 바깥 여유 (틀 너비·높이의 5%). 미리보기와 사진의 비율 차이로 생기는 어긋남을 덮는다

type Photo = { uri: string; width: number; height: number };

// 촬영 화면의 미리보기 상자와 가이드 틀. 단위는 화면 px
export type CropGuide = {
  viewWidth: number; // 미리보기 상자 너비
  viewHeight: number; // 미리보기 상자 높이
  inset: number; // 상자 가장자리 ~ 가이드 모서리 거리
};

type Rect = { originX: number; originY: number; width: number; height: number };

function fileSizeKB(uri: string): string {
  try {
    return `${(new File(uri).size / 1024).toFixed(1)} KB`;
  } catch {
    return '크기 확인 실패';
  }
}

// 가이드 틀(화면 좌표) → 사진 좌표의 자를 영역.
// 미리보기는 사진을 상자에 꽉 차게 키우고 넘치는 부분을 가운데 기준으로 잘라 보여 준다(cover).
// 그래서 배율 = max(상자/사진), 보이는 영역 = 사진 가운데의 상자 비율 영역.
function guideToPhotoRect(imgW: number, imgH: number, g: CropGuide): Rect {
  const scale = Math.max(g.viewWidth / imgW, g.viewHeight / imgH);
  const offsetX = (imgW - g.viewWidth / scale) / 2; // 화면 밖으로 잘린 사진 왼쪽 폭
  const offsetY = (imgH - g.viewHeight / scale) / 2;

  const guideW = (g.viewWidth - g.inset * 2) / scale;
  const guideH = (g.viewHeight - g.inset * 2) / scale;
  const marginX = guideW * CROP_MARGIN;
  const marginY = guideH * CROP_MARGIN;

  // 여유를 더한 뒤 사진 밖으로 나가지 않게 자른다
  const left = Math.max(0, offsetX + g.inset / scale - marginX);
  const top = Math.max(0, offsetY + g.inset / scale - marginY);
  const right = Math.min(imgW, offsetX + g.inset / scale + guideW + marginX);
  const bottom = Math.min(imgH, offsetY + g.inset / scale + guideH + marginY);

  return {
    originX: Math.round(left),
    originY: Math.round(top),
    width: Math.round(right - left),
    height: Math.round(bottom - top),
  };
}

// guide 가 없거나 상자 크기를 아직 모르면(0) 자르지 않고 줄이기만 한다
export async function prepareIdCardPhoto(photo: Photo, guide?: CropGuide): Promise<Photo> {
  // 한 번 읽어서 실제 픽셀 크기를 얻는다. 일부 Android 는 촬영 결과의 width·height 가
  // 회전(EXIF) 전 값이라, 그 값으로 계산하면 가로·세로가 뒤바뀐 영역을 자르게 된다
  const base = await ImageManipulator.manipulate(photo.uri).renderAsync();
  const context = ImageManipulator.manipulate(base);

  let w = base.width;
  let h = base.height;
  let cropLog = '자르기 안 함';
  if (guide && guide.viewWidth > 0 && guide.viewHeight > 0) {
    const rect = guideToPhotoRect(w, h, guide);
    context.crop(rect);
    w = rect.width;
    h = rect.height;
    cropLog = `자르기 ${w}x${h} (시작 ${rect.originX},${rect.originY})`;
  }

  // 긴 변 기준으로 줄인다. 자른 등록증은 가로가 길어서 가로 기준이면 긴 변이 기준보다 작아질 수 있다
  if (Math.max(w, h) > MAX_LONG_SIDE) {
    context.resize(w >= h ? { width: MAX_LONG_SIDE } : { height: MAX_LONG_SIDE }); // 나머지 변은 비율대로
  }
  const image = await context.renderAsync();
  const result = await image.saveAsync({ format: SaveFormat.JPEG, compress: JPEG_QUALITY });

  if (__DEV__) {
    console.log(
      `[사진 정리] 원본 ${base.width}x${base.height} ${fileSizeKB(photo.uri)}` +
        ` → ${cropLog} → 저장 ${result.width}x${result.height} ${fileSizeKB(result.uri)}`,
    );
  }

  // 원본은 캐시에 남아 용량만 차지하므로 지운다. 실패해도 진행에는 문제 없음
  try {
    new File(photo.uri).delete();
  } catch {}

  return { uri: result.uri, width: result.width, height: result.height };
}
