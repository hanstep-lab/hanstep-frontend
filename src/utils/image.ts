// 업로드 전 사진 줄이기. 카메라 원본(약 12MP, 수 MB)은 등록증 인식에 비해 너무 크다.
// 가로를 MAX_WIDTH 이하로 줄이고 JPEG 로 압축해 새 파일을 만든다(원본은 지움).

import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import { File } from 'expo-file-system';

const MAX_WIDTH = 1500; // 등록증 글자를 읽기에 충분한 해상도
const JPEG_QUALITY = 0.8; // 0~1. 1 = 압축 없음

type Photo = { uri: string; width: number; height: number };

function fileSizeKB(uri: string): string {
  try {
    return `${(new File(uri).size / 1024).toFixed(1)} KB`;
  } catch {
    return '크기 확인 실패';
  }
}

export async function resizeForUpload(photo: Photo): Promise<Photo> {
  const context = ImageManipulator.manipulate(photo.uri);
  if (photo.width > MAX_WIDTH) {
    context.resize({ width: MAX_WIDTH }); // 높이는 비율에 맞춰 자동 계산
  }
  const image = await context.renderAsync();
  const result = await image.saveAsync({ format: SaveFormat.JPEG, compress: JPEG_QUALITY });

  if (__DEV__) {
    console.log(
      `[resize] 원본 ${photo.width}x${photo.height} ${fileSizeKB(photo.uri)}` +
        ` → ${result.width}x${result.height} ${fileSizeKB(result.uri)}`,
    );
  }

  // 원본은 캐시에 남아 용량만 차지하므로 지운다. 실패해도 진행에는 문제 없음
  try {
    new File(photo.uri).delete();
  } catch {}

  return { uri: result.uri, width: result.width, height: result.height };
}
