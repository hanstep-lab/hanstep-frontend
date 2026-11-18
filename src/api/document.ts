// 외국인등록증 문서·OCR API (DOC-01~04). 화면은 이 파일만 부르고 Mock 인지 모른다.
// OCR 은 비동기라 업로드 응답에는 결과가 없다 → getDocument 를 반복 조회해 status 를 본다.

import { client } from './client';
import { USE_MOCK, mockDelay } from './config';
import { mockConfirm, mockGet, mockUpdateFields, mockUpload } from './mock/document';
import type { DocumentFieldUpdateItem, DocumentResponse } from '../types/api';

// DOC-01: 앞면 사진 업로드 → OCR 작업 등록(202). 같은 사진이면 기존 문서(200)
export async function uploadIdCard(frontUri: string): Promise<DocumentResponse> {
  if (USE_MOCK) {
    await mockDelay(800);
    return mockUpload();
  }
  const form = new FormData();
  // RN 의 FormData 는 파일을 { uri, name, type } 객체로 넣는다(브라우저의 Blob 대신)
  form.append('front', { uri: frontUri, name: 'front.jpg', type: 'image/jpeg' } as any);

  const res = await client.post<DocumentResponse>('/api/v1/documents', form, {
    headers: { 'Content-Type': 'multipart/form-data' }, // 기본값(JSON)을 덮어씀. boundary 는 RN 이 붙임
    timeout: 30000, // 업로드는 기본 10초보다 여유 있게
  });
  return res.data;
}

// DOC-02: 문서·OCR 결과 조회
export async function getDocument(documentId: number): Promise<DocumentResponse> {
  if (USE_MOCK) {
    await mockDelay(300);
    return mockGet();
  }
  const res = await client.get<DocumentResponse>(`/api/v1/documents/${documentId}`);
  return res.data;
}

// OCR 작업이 큐에 못 들어갔을 때(ocrJob.retryable) 다시 보내기
export async function retryOcr(documentId: number): Promise<DocumentResponse> {
  if (USE_MOCK) {
    await mockDelay();
    return mockGet();
  }
  const res = await client.post<DocumentResponse>(`/api/v1/documents/${documentId}/ocr-retry`);
  return res.data;
}

// DOC-03: 확인 화면에서 고친 값·체류 만료일 저장
export async function updateDocumentFields(
  documentId: number,
  fields: DocumentFieldUpdateItem[],
): Promise<DocumentResponse> {
  if (USE_MOCK) {
    await mockDelay();
    return mockUpdateFields(fields);
  }
  const res = await client.patch<DocumentResponse>(`/api/v1/documents/${documentId}/fields`, {
    fields,
  });
  return res.data;
}

// DOC-04: 확정 → 체류 프로필 반영. 이후 원본 이미지와 OCR 값은 서버에서 지워진다
export async function confirmDocument(documentId: number): Promise<DocumentResponse> {
  if (USE_MOCK) {
    await mockDelay();
    return mockConfirm();
  }
  const res = await client.post<DocumentResponse>(`/api/v1/documents/${documentId}/confirm`);
  return res.data;
}
