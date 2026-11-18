// 외국인등록증 OCR Mock. 서버처럼 상태가 바뀌도록 메모리에 문서 하나를 들고 있다.
// 업로드 직후 UPLOADED → 조회 2번째부터 PENDING_CONFIRMATION(OCR 결과 도착)
// 화면은 이 파일을 직접 import 하지 않고 src/api/document.ts 를 거친다.

import type {
  DocumentField,
  DocumentFieldUpdateItem,
  DocumentResponse,
} from '../../types/api';
import { DEMO_USER } from './demoUser';

const MOCK_FIELDS: DocumentField[] = [
  { fieldKey: 'nameEn', value: DEMO_USER.nameEn, confidence: 0.97, needsReview: false, status: 'EXTRACTED', isMasked: false },
  { fieldKey: 'nationality', value: 'PHL', confidence: 0.96, needsReview: false, status: 'EXTRACTED', isMasked: false },
  { fieldKey: 'birthDate', value: '1995-03-12', confidence: 0.72, needsReview: true, status: 'EXTRACTED', isMasked: false },
  { fieldKey: 'visaType', value: 'E-9', confidence: 0.93, needsReview: false, status: 'EXTRACTED', isMasked: false },
  { fieldKey: 'stayExpiry', value: null, confidence: null, needsReview: true, status: 'MISSING', isMasked: false },
  { fieldKey: 'registrationNo', value: '950312-5******', confidence: 0.95, needsReview: false, status: 'EXTRACTED', isMasked: true },
];

let doc: DocumentResponse | null = null;
let pollCount = 0;

export function mockUpload(): DocumentResponse {
  pollCount = 0;
  doc = {
    documentId: 42,
    documentType: 'ARC',
    side: 'FRONT',
    status: 'UPLOADED',
    failureCode: null,
    ocrJob: { jobId: 101, status: 'QUEUED', publishStatus: 'PUBLISHED', errorCode: null, retryable: false },
    fields: [],
    uploadedAt: new Date().toISOString(),
    confirmedAt: null,
  };
  return doc;
}

export function mockGet(): DocumentResponse {
  if (!doc) throw { code: 'NOT_FOUND', message: '문서를 찾을 수 없어요.' };
  pollCount += 1;
  if (doc.status === 'UPLOADED' && pollCount >= 2) {
    doc = {
      ...doc,
      status: 'PENDING_CONFIRMATION',
      ocrJob: { ...doc.ocrJob!, status: 'COMPLETED' },
      fields: MOCK_FIELDS.map((f) => ({ ...f })),
    };
  }
  return doc;
}

export function mockUpdateFields(items: DocumentFieldUpdateItem[]): DocumentResponse {
  if (!doc) throw { code: 'NOT_FOUND', message: '문서를 찾을 수 없어요.' };
  doc = {
    ...doc,
    fields: doc.fields.map((f) => {
      const item = items.find((i) => i.fieldKey === f.fieldKey);
      if (!item) return f;
      const same = item.value === f.value;
      return { ...f, value: item.value, needsReview: false, status: same ? 'CONFIRMED' : 'CORRECTED' };
    }),
  };
  return doc;
}

export function mockConfirm(): DocumentResponse {
  if (!doc) throw { code: 'NOT_FOUND', message: '문서를 찾을 수 없어요.' };
  doc = {
    ...doc,
    status: 'CONFIRMED',
    confirmedAt: new Date().toISOString(),
    fields: doc.fields.map((f) => ({ ...f, value: null })),
  };
  return doc;
}
